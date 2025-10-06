// ==================== apps/api/src/modules/orders/orders.service.ts ====================
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../../core/config';
import { prisma } from '@cargoexpress/prisma';
import { 
  CreateOrderDto, 
  UpdateOrderDto,
  OrderStatus,
  OrderType,
  PaymentStatus
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { notificationService } from '../notifications/notifications.service';

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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    
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
  
  async searchOrders(query: string, userId?: number) {
    const where: any = {
      OR: [
        { trackNumber: { contains: query, mode: 'insensitive' } },
        { externalTrackNumber: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { productName: { contains: query, mode: 'insensitive' } }
      ]
    };
    
    if (userId) {
      where.userId = userId;
    }
    
    return prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        warehouse: {
          include: { country: true }
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async bulkUpdateStatus(data: {
    orderIds: number[];
    status: OrderStatus;
    adminId: number;
    comment?: string;
  }) {
    const results = [];
    
    for (const orderId of data.orderIds) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId }
        });
        
        if (!order) {
          results.push({
            orderId,
            success: false,
            error: 'Order not found'
          });
          continue;
        }
        
        await this.updateOrder(orderId, {
          status: data.status,
          adminNote: data.comment
        }, data.adminId);
        
        results.push({
          orderId,
          success: true
        });
        
        // Send notification
        await notificationService.sendOrderStatusNotification(
          order.userId,
          orderId,
          data.status
        );
        
      } catch (error) {
        results.push({
          orderId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async uploadOrderPhoto(orderId: number, file: any, uploadedBy: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Save file
    const filename = `order_${orderId}_${Date.now()}_${file.filename}`;
    const filepath = path.join(config.UPLOAD_PATH, 'orders', filename);
    
    await pipeline(file.file, fs.createWriteStream(filepath));
    
    // Save to DB
    const photo = await prisma.orderPhoto.create({
      data: {
        orderId,
        url: `/uploads/orders/${filename}`,
        type: 'package',
        uploadedBy
      }
    });
    
    logger.info(`Photo uploaded for order ${orderId}`);
    
    return photo;
  }
  
  async getOrderStatistics(filters: any) {
    const where: any = {};
    
    if (filters.dateFrom) {
      where.createdAt = { gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };
    }
    if (filters.warehouseId) {
      where.warehouseId = parseInt(filters.warehouseId);
    }
    
    const [
      total,
      statuses,
      revenue,
      avgDeliveryDays
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.groupBy({
        where,
        by: ['status'],
        _count: true
      }),
      prisma.order.aggregate({
        where: {
          ...where,
          status: 'DELIVERED'
        },
        _sum: { totalAmount: true }
      }),
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(DAY FROM (delivered_at - shipped_at))) as avg_days
        FROM "Order"
        WHERE delivered_at IS NOT NULL 
          AND shipped_at IS NOT NULL
          ${filters.warehouseId ? `AND warehouse_id = ${filters.warehouseId}` : ''}
      `
    ]);
    
    const statusCounts = statuses.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count;
      return acc;
    }, {});
    
    return {
      total,
      pending: statusCounts.pending || 0,
      processing: (statusCounts.processing || 0) +
                  (statusCounts.purchasing || 0) +
                  (statusCounts.packing || 0),
      shipped: (statusCounts.shipped || 0) +
               (statusCounts.in_transit || 0) +
               (statusCounts.customs_clearance || 0),
      delivered: statusCounts.delivered || 0,
      cancelled: statusCounts.cancelled || 0,
      revenue: Number(revenue._sum.totalAmount || 0),
      averageDeliveryDays: avgDeliveryDays[0]?.avg_days || 0
    };
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

