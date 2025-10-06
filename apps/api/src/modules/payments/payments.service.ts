// apps/api/src/modules/payments/payments.service.ts
import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { 
  PaymentMethod, 
  PaymentStatus,
  OrderStatus,
  CreatePaymentDto,
  ProcessPaymentDto 
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { stripeProvider } from './providers/stripe.provider';
import { cryptoProvider } from './providers/crypto.provider';
import { sbpProvider } from './providers/sbp.provider';
import { notificationService } from '../notifications/notification.service';
import { io } from '../../core/websocket/server';
import { SocketEvents } from '@cargoexpress/shared';

class PaymentsService {
  async createPayment(data: CreatePaymentDto) {
    // Check if order exists and not paid
    if (data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== OrderStatus.PENDING) {
        throw new Error('Order is not pending payment');
      }
      
      // Set amount from order
      data.amount = Number(order.totalAmount);
    }
    
    // Check user balance if paying with balance
    if (data.method === PaymentMethod.BALANCE) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId }
      });
      
      if (!user || user.balance < data.amount) {
        throw new Error('Insufficient balance');
      }
    }
    
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        type: 'payment',
        amount: data.amount,
        currency: data.currency || 'RUB',
        method: data.method,
        status: PaymentStatus.PENDING,
        description: data.description || `Payment for order #${data.orderId}`,
        metadata: data.metadata
      }
    });
    
    // Process payment based on method
    let paymentResult;
    
    switch (data.method) {
      case PaymentMethod.CARD:
        paymentResult = await stripeProvider.createPayment({
          transactionId: transaction.id,
          amount: data.amount,
          currency: data.currency || 'RUB',
          description: transaction.description!,
          metadata: data.metadata
        });
        break;
        
      case PaymentMethod.CRYPTO:
        paymentResult = await cryptoProvider.createPayment({
          transactionId: transaction.id,
          amount: data.amount,
          currency: 'USDT',
          userId: data.userId
        });
        break;
        
      case PaymentMethod.SBP:
        paymentResult = await sbpProvider.createPayment({
          transactionId: transaction.id,
          amount: data.amount,
          phone: data.metadata?.phone
        });
        break;
        
      case PaymentMethod.BALANCE:
        paymentResult = await this.processBalancePayment(
          transaction.id,
          data.userId,
          data.amount
        );
        break;
        
      case PaymentMethod.BONUS:
        paymentResult = await this.processBonusPayment(
          transaction.id,
          data.userId,
          data.amount
        );
        break;
        
      default:
        throw new Error('Unsupported payment method');
    }
    
    // Update transaction with external ID
    if (paymentResult.externalId) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { externalId: paymentResult.externalId }
      });
    }
    
    logger.info(`Payment created: ${transaction.id} via ${data.method}`);
    
    return {
      transactionId: transaction.id,
      ...paymentResult
    };
  }
  
  async processPayment(data: ProcessPaymentDto) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: data.transactionId },
      include: { order: true, user: true }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status !== PaymentStatus.PENDING) {
      throw new Error('Transaction already processed');
    }
    
    // Update transaction
    await prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        status: data.status,
        processedAt: data.processedAt,
        metadata: {
          ...transaction.metadata,
          ...data.metadata
        }
      }
    });
    
    // Handle successful payment
    if (data.status === PaymentStatus.SUCCESS && transaction.orderId) {
      await this.handleSuccessfulPayment(
        transaction.orderId,
        transaction.userId,
        Number(transaction.amount)
      );
    }
    
    // Handle failed payment
    if (data.status === PaymentStatus.FAILED) {
      await notificationService.sendPaymentNotification(
        transaction.userId,
        transaction.orderId!,
        Number(transaction.amount),
        false
      );
    }
    
    logger.info(`Payment processed: ${data.transactionId} - ${data.status}`);
    
    return { success: true };
  }
  
  private async handleSuccessfulPayment(
    orderId: number,
    userId: number,
    amount: number
  ) {
    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date()
      }
    });
    
    // Create status history
    await prisma.statusHistory.create({
      data: {
        orderId,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PAID,
        changedBy: 'system',
        comment: 'Payment received'
      }
    });
    
    // Send notifications
    await notificationService.sendPaymentNotification(
      userId,
      orderId,
      amount,
      true
    );
    
    // Emit WebSocket event
    io.emit(SocketEvents.ORDER_PAID, {
      orderId,
      userId,
      amount
    });
    
    io.emit(SocketEvents.ORDER_STATUS_CHANGED, {
      orderId,
      oldStatus: OrderStatus.PENDING,
      newStatus: OrderStatus.PAID
    });
  }
  
  private async processBalancePayment(
    transactionId: string,
    userId: number,
    amount: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      // Check and deduct balance
      const user = await tx.user.update({
        where: { 
          id: userId,
          balance: { gte: amount }
        },
        data: {
          balance: { decrement: amount }
        }
      });
      
      if (!user) {
        throw new Error('Insufficient balance');
      }
      
      // Update transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PaymentStatus.SUCCESS,
          processedAt: new Date()
        }
      });
      
      return user;
    });
    
    return {
      success: true,
      status: PaymentStatus.SUCCESS
    };
  }
  
  private async processBonusPayment(
    transactionId: string,
    userId: number,
    amount: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      // Check and deduct bonus balance
      const user = await tx.user.update({
        where: { 
          id: userId,
          bonusBalance: { gte: amount }
        },
        data: {
          bonusBalance: { decrement: amount }
        }
      });
      
      if (!user) {
        throw new Error('Insufficient bonus balance');
      }
      
      // Update transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PaymentStatus.SUCCESS,
          processedAt: new Date()
        }
      });
      
      return user;
    });
    
    return {
      success: true,
      status: PaymentStatus.SUCCESS
    };
  }
  
  async getTransactions(filters: {
    userId?: number;
    orderId?: number;
    status?: PaymentStatus;
    method?: PaymentMethod;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.type) where.type = filters.type;
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    
    const [transactions, total, stats] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          order: {
            select: {
              id: true,
              trackNumber: true,
              type: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where: {
          ...where,
          status: PaymentStatus.SUCCESS
        },
        _sum: { amount: true },
        _count: true
      })
    ]);
    
    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        totalAmount: Number(stats._sum.amount || 0),
        successCount: stats._count
      }
    };
  }
  
  async refundPayment(transactionId: string, amount?: number, reason?: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { order: true }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status !== PaymentStatus.SUCCESS) {
      throw new Error('Transaction is not successful');
    }
    
    const refundAmount = amount || Number(transaction.amount);
    
    // Create refund transaction
    const refund = await prisma.transaction.create({
      data: {
        userId: transaction.userId,
        orderId: transaction.orderId,
        type: 'refund',
        amount: refundAmount,
        currency: transaction.currency,
        method: transaction.method,
        status: PaymentStatus.PENDING,
        description: reason || `Refund for transaction ${transactionId}`,
        metadata: {
          originalTransactionId: transactionId
        }
      }
    });
    
    // Process refund based on method
    let refundResult;
    
    switch (transaction.method) {
      case PaymentMethod.CARD:
        refundResult = await stripeProvider.refundPayment(
          transaction.externalId!,
          refundAmount
        );
        break;
        
      case PaymentMethod.CRYPTO:
        // Manual refund for crypto
        refundResult = { success: false, message: 'Manual refund required' };
        break;
        
      case PaymentMethod.SBP:
        // Manual refund for SBP
        refundResult = { success: false, message: 'Manual refund required' };
        break;
        
      case PaymentMethod.BALANCE:
      case PaymentMethod.BONUS:
        // Return to balance
        await prisma.user.update({
          where: { id: transaction.userId },
          data: {
            balance: { increment: refundAmount }
          }
        });
        refundResult = { success: true };
        break;
        
      default:
        throw new Error('Unsupported refund method');
    }
    
    // Update refund transaction
    await prisma.transaction.update({
      where: { id: refund.id },
      data: {
        status: refundResult.success 
          ? PaymentStatus.SUCCESS 
          : PaymentStatus.PROCESSING,
        processedAt: refundResult.success ? new Date() : undefined
      }
    });
    
    // Update original transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: PaymentStatus.REFUNDED
      }
    });
    
    // Update order if exists
    if (transaction.orderId) {
      await prisma.order.update({
        where: { id: transaction.orderId },
        data: {
          status: OrderStatus.REFUNDED
        }
      });
    }
    
    logger.info(`Refund processed: ${refund.id} for ${transactionId}`);
    
    return refund;
  }
  
  async getPaymentMethods(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return [
      {
        method: PaymentMethod.CARD,
        name: 'Банковская карта',
        icon: '💳',
        available: true,
        commission: 3 // 3%
      },
      {
        method: PaymentMethod.CRYPTO,
        name: 'Криптовалюта (USDT)',
        icon: '₮',
        available: true,
        commission: 0
      },
      {
        method: PaymentMethod.SBP,
        name: 'СБП (Система быстрых платежей)',
        icon: '📱',
        available: true,
        commission: 0
      },
      {
        method: PaymentMethod.BALANCE,
        name: 'С баланса',
        icon: '💰',
        available: user.balance > 0,
        balance: Number(user.balance)
      },
      {
        method: PaymentMethod.BONUS,
        name: 'Бонусный баланс',
        icon: '🎁',
        available: user.bonusBalance > 0,
        balance: Number(user.bonusBalance)
      }
    ];
  }
  
  async handleWebhook(provider: string, data: any) {
    logger.info(`Payment webhook from ${provider}:`, data);
    
    switch (provider) {
      case 'stripe':
        return stripeProvider.handleWebhook(data);
      case 'crypto':
        return cryptoProvider.handleWebhook(data);
      case 'sbp':
        return sbpProvider.handleWebhook(data);
      default:
        throw new Error('Unknown provider');
    }
  }
}

export const paymentsService = new PaymentsService();