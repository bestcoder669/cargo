// ==================== apps/api/src/modules/orders/orders.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { 
  CreateOrderDto, 
  UpdateOrderDto,
  OrderStatus,
  OrderType,
  PaymentStatus
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { notificationService } from '../notifications/notification.service';

class OrdersService {
  async createOrder(data: CreateOrderDto & { userId: number }) {
    // Generate track number
    const trackNumber = this.generateTrackNumber(data.type);
    
    // Create order
    const order = await prisma.order.create({
      data: {
        userId: data.userId,
        type: data.type,
        trackNumber,
        status: OrderStatus.PENDING,
        warehouseId: data.warehouseId,
        addressId: data.addressId,
        weight: data.weight,
        declaredValue: data.declaredValue,
        description: data.description,
        customerNote: data.customerNote,
        
        // Purchase fields
        productUrl: data.productUrl,
        productName: data.productName,
        productQuantity: data.productQuantity,
        productSize: data.productSize,
        productColor: data.productColor,
        productNote: data.productNote,
        purchaseCost: data.purchaseCost
      },
      include: {
        user: true,
        warehouse: {
          include: { country: true }
        },
        address: {
          include: { city: true }
        }
      }
    });
    
    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        orderId: order.id,
        toStatus: OrderStatus.PENDING,
        changedBy: 'system',
        changedById: data.userId,
        comment: 'Order created'
      }
    });
    
    // Send notification
    await notificationService.sendOrderCreatedNotification(order);
    
    logger.info(`Order created: ${order.id} (${trackNumber})`);
    
    return order;
  }
  
  async updateOrder(orderId: number, data: UpdateOrderDto, adminId?: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // If status is changing, record history
    if (data.status && data.status !== order.status) {
      await prisma.statusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: data.status,
          changedBy: adminId ? 'admin' : 'system',
          changedById: adminId,
          comment: data.adminNote
        }
      });
      
      // Send notification about status change
      await notificationService.sendOrderStatusNotification(
        order.userId,
        orderId,
        data.status
      );
    }
    
    // Update order
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...data,
        ...(data.status === OrderStatus.PAID && { paidAt: new Date() }),
        ...(data.status === OrderStatus.SHIPPED && { shippedAt: new Date() }),
        ...(data.status === OrderStatus.DELIVERED && { deliveredAt: new Date() }),
        ...(data.status === OrderStatus.CANCELLED && { cancelledAt: new Date() })
      },
      include: {
        user: true,
        warehouse: true,
        address: true
      }
    });
    
    logger.info(`Order updated: ${orderId} by ${adminId || 'system'}`);
    
    return updated;
  }
  
  async getOrders(filters: any) {
    const { 
      status, 
      type, 
      userId, 
      warehouseId,
      searchQuery,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (searchQuery) {
      where.OR = [
        { trackNumber: { contains: searchQuery, mode: 'insensitive' } },
        { externalTrackNumber: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }
    
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          warehouse: {
            include: { country: true }
          },
          address: true,
          _count: {
            select: { statusHistory: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.order.count({ where })
    ]);
    
    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getOrder(orderId: number) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        warehouse: {
          include: { country: true }
        },
        address: {
          include: { city: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        photos: true,
        transactions: true
      }
    });
  }
  
  async getOrderByTrackNumber(trackNumber: string) {
    return prisma.order.findUnique({
      where: { trackNumber },
      include: {
        warehouse: {
          include: { country: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  }
  
  async cancelOrder(orderId: number, reason?: string, userId?: number) {
    const order = await this.getOrder(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel delivered order');
    }
    
    // Update order
    await this.updateOrder(orderId, {
      status: OrderStatus.CANCELLED,
      adminNote: reason
    }, userId);
    
    // Refund if paid
    if (order.status === OrderStatus.PAID && order.totalAmount) {
      await this.createRefund(order);
    }
    
    return { success: true };
  }
  
  private async createRefund(order: any) {
    // Create refund transaction
    await prisma.transaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: 'refund',
        amount: order.totalAmount,
        status: PaymentStatus.PROCESSING,
        description: `Refund for order #${order.id}`
      }
    });
    
    // Update user balance
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        balance: { increment: order.totalAmount }
      }
    });
  }
  
  private generateTrackNumber(type: OrderType): string {
    const prefix = type === OrderType.SHIPPING ? 'CE' : 'CP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

export const ordersService = new OrdersService();

