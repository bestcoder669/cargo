// ==================== apps/api/src/modules/admin/admin.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { logger } from '../../core/logger';
import { SocketEvents } from '@cargoexpress/shared';

class AdminService {
  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const week = new Date();
    week.setDate(week.getDate() - 7);
    
    const month = new Date();
    month.setMonth(month.getMonth() - 1);
    
    // Today stats
    const [todayOrders, todayUsers, todayRevenue] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: today },
          status: 'SUCCESS',
          type: 'payment'
        },
        _sum: { amount: true }
      })
    ]);
    
    // Week stats
    const [weekOrders, weekRevenue] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: week } }
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: week },
          status: 'SUCCESS',
          type: 'payment'
        },
        _sum: { amount: true },
        _avg: { amount: true }
      })
    ]);
    
    // Month stats
    const [monthOrders, monthRevenue] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: month } }
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: month },
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      })
    ]);
    
    // Order stats
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    });
    
    const ordersByStatus = orderStats.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count;
      return acc;
    }, {} as any);
    
    // User stats
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          orders: {
            some: {
              createdAt: { gte: week }
            }
          }
        }
      })
    ]);
    
    // Support stats
    const [openChats] = await Promise.all([
      prisma.supportChat.count({
        where: { status: 'WAITING' }
      })
    ]);
    
    return {
      today: {
        orders: todayOrders,
        users: todayUsers,
        revenue: Number(todayRevenue._sum.amount || 0)
      },
      week: {
        orders: weekOrders,
        revenue: Number(weekRevenue._sum.amount || 0),
        avgOrder: Number(weekRevenue._avg.amount || 0),
        conversion: weekOrders > 0 ? Math.round((weekOrders / activeUsers) * 100) : 0
      },
      month: {
        orders: monthOrders,
        revenue: Number(monthRevenue._sum.amount || 0),
        profit: Number(monthRevenue._sum.amount || 0) * 0.3 // 30% margin estimate
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        withOrders: await prisma.user.count({
          where: {
            orders: { some: {} }
          }
        })
      },
      orders: {
        processing: ordersByStatus.processing || 0,
        inTransit: (ordersByStatus.shipped || 0) + (ordersByStatus.in_transit || 0),
        delivered: ordersByStatus.delivered || 0
      },
      support: {
        openChats,
        averageResponseTime: 15, // minutes, hardcoded for now
        rating: 4.5 // hardcoded
      },
      delivery: {
        averageDays: 12,
        inTransit: ordersByStatus.in_transit || 0
      },
      finance: {
        revenue: Number(monthRevenue._sum.amount || 0),
        commission: Number(monthRevenue._sum.amount || 0) * 0.05,
        averageOrder: monthOrders > 0 ? Number(monthRevenue._sum.amount || 0) / monthOrders : 0
      }
    };
  }
  
  async getUsers(filters: any) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const { sortBy = 'createdAt', sortOrder = 'desc', isBanned } = filters;

    const where: any = {};
    if (isBanned !== undefined) {
      where.isBanned = isBanned === 'true' || isBanned === true;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          city: true,
          _count: {
            select: { orders: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.user.count({ where })
    ]);

    // Calculate additional stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayNew = await prisma.user.count({
      where: { createdAt: { gte: todayStart } }
    });

    return {
      data: data.map(user => ({
        ...user,
        totalSpent: 0, // Should calculate from orders
        ordersCount: user._count?.orders || 0
      })),
      meta: {
        total,
        todayNew,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTopUsers(params: any) {
    const limit = parseInt(params.limit) || 10;

    const users = await prisma.user.findMany({
      where: {
        orders: { some: {} }
      },
      include: {
        _count: {
          select: { orders: true }
        },
        orders: {
          select: {
            totalPrice: true
          }
        }
      },
      take: limit
    });

    const usersWithSpent = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      totalSpent: user.orders.reduce((sum, order) => sum + Number(order.totalPrice), 0),
      ordersCount: user._count.orders
    }));

    // Sort by totalSpent descending
    usersWithSpent.sort((a, b) => b.totalSpent - a.totalSpent);

    // Add rank
    return usersWithSpent.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
  }

  async getUsersStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const week = new Date();
    week.setDate(week.getDate() - 7);

    const [total, todayNew, weekNew, active, withOrders, banned] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({
        where: {
          orders: {
            some: {
              createdAt: { gte: week }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          orders: { some: {} }
        }
      }),
      prisma.user.count({ where: { isBanned: true } })
    ]);

    return {
      total,
      today: todayNew,
      week: weekNew,
      active,
      withOrders,
      banned
    };
  }
  
  async searchUsers(query: string) {
    const searchNumber = parseInt(query);
    const isNumber = !isNaN(searchNumber);
    
    return prisma.user.findMany({
      where: {
        OR: [
          isNumber ? { id: searchNumber } : {},
          isNumber ? { telegramId: BigInt(searchNumber) } : {},
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          {
            orders: {
              some: {
                trackNumber: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ].filter(condition => Object.keys(condition).length > 0) as any[]
      },
      include: {
        city: true,
        _count: {
          select: { orders: true }
        }
      },
      take: 10
    });
  }
  
  async updateUserBalance(data: {
    userId: number;
    amount: number;
    reason: string;
    adminId: number;
  }) {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update balance
      const user = await tx.user.update({
        where: { id: data.userId },
        data: {
          balance: { increment: data.amount }
        }
      });
      
      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: data.userId,
          type: data.amount > 0 ? 'deposit' : 'withdrawal',
          amount: Math.abs(data.amount),
          status: 'SUCCESS',
          description: data.reason,
          metadata: { adminId: data.adminId }
        }
      });
      
      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: data.adminId,
          userId: data.userId,
          action: 'BALANCE_CHANGED',
          entityType: 'user',
          entityId: data.userId.toString(),
          details: {
            amount: data.amount,
            reason: data.reason,
            newBalance: user.balance
          }
        }
      });
      
      return user;
    });
    
    return { newBalance: result.balance };
  }
  
  async getUsersCount(filters: { audience: string }) {
    let where: any = { isActive: true };

    const week = new Date();
    week.setDate(week.getDate() - 7);
    
    switch (filters.audience) {
      case 'new':
        where.createdAt = { gte: week };
        break;
      case 'balance':
        where.balance = { gt: 0 };
        break;
      case 'orders':
        where.orders = { some: {} };
        break;
    }
    
    const count = await prisma.user.count({ where });
    
    return { count };
  }
  
  async sendBroadcast(data: {
    audience: string;
    message: string;
    adminId: number;
  }) {
    const startTime = Date.now();
    
    // Get users based on audience
    let where: any = { isActive: true };
    
    const week = new Date();
    week.setDate(week.getDate() - 7);
    
    switch (data.audience) {
      case 'new':
        where.createdAt = { gte: week };
        break;
      case 'balance':
        where.balance = { gt: 0 };
        break;
      case 'orders':
        where.orders = { some: {} };
        break;
    }
    
    const users = await prisma.user.findMany({
      where,
      select: { id: true, telegramId: true }
    });
    
    // Import WebSocket io once before sending
    const { io } = await import('../../core/websocket/server');

    // Send batch to bot via WebSocket
    io.to('bot').emit(SocketEvents.BROADCAST_MESSAGE, {
      users: users.map(u => ({
        telegramId: u.telegramId.toString(),
        userId: u.id
      })),
      message: data.message
    });

    // Create notifications in database
    const notifications = await Promise.allSettled(
      users.map(user =>
        prisma.notification.create({
          data: {
            userId: user.id,
            type: 'SYSTEM',
            title: 'Уведомление',
            message: data.message,
            sentToTelegram: true
          }
        })
      )
    );

    const sent = notifications.filter(r => r.status === 'fulfilled').length;
    const failed = notifications.filter(r => r.status === 'rejected').length;

    // Log admin action (skip if adminId is invalid)
    if (data.adminId && data.adminId < 1000000) {
      try {
        await prisma.adminAction.create({
          data: {
            adminId: data.adminId,
            action: 'BROADCAST_SENT',
            details: {
              audience: data.audience,
              totalUsers: users.length,
              sent,
              failed,
              message: data.message.substring(0, 100)
            }
          }
        });
      } catch (error) {
        logger.warn('Failed to log admin action:', error);
      }
    }
    
    return {
      sent,
      failed,
      duration: Math.round((Date.now() - startTime) / 1000)
    };
  }
  
  async getSupportChats(filters: any) {
    const { status, limit = 20 } = filters;
    
    const where: any = {};
    if (status) where.status = status;
    
    const [data, stats] = await Promise.all([
      prisma.supportChat.findMany({
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: limit
      }),
      prisma.supportChat.groupBy({
        by: ['status'],
        _count: true
      })
    ]);
    
    const statsByStatus = stats.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count;
      return acc;
    }, {} as any);
    
    return {
      data,
      meta: {
        waiting: statsByStatus.waiting || 0,
        inProgress: statsByStatus.in_progress || 0,
        resolved: statsByStatus.resolved || 0,
        avgResponseTime: 15, // minutes, hardcoded
        rating: 4.5 // hardcoded
      }
    };
  }
  
  async getFinanceStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const month = new Date();
    month.setMonth(month.getMonth() - 1);
    
    // Today transactions
    const todayTx = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'SUCCESS'
      },
      _sum: { amount: true },
      _count: true
    });
    
    // Month transactions
    const monthTx = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: month },
        status: 'SUCCESS'
      },
      _sum: { amount: true },
      _avg: { amount: true }
    });
    
    // User balances
    const balances = await prisma.user.aggregate({
      _sum: {
        balance: true,
        bonusBalance: true
      }
    });
    
    // Pending transactions
    const pending = await prisma.transaction.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true }
    });
    
    // Payment methods breakdown
    const methods = await prisma.transaction.groupBy({
      by: ['method'],
      where: {
        createdAt: { gte: month },
        status: 'SUCCESS'
      },
      _sum: { amount: true },
      _count: true
    });
    
    const methodTotals = methods.reduce((acc, curr) => {
      if (curr.method) {
        acc[curr.method.toLowerCase()] = Number(curr._sum.amount || 0);
      }
      return acc;
    }, {} as any);
    
    const totalMethodAmount = Object.values(methodTotals).reduce((a: any, b: any) => a + b, 0) as number;
    
    return {
      today: {
        revenue: Number(todayTx._sum.amount || 0),
        expenses: 0, // Should calculate from actual expenses
        profit: Number(todayTx._sum.amount || 0) * 0.3,
        transactions: todayTx._count
      },
      month: {
        revenue: Number(monthTx._sum.amount || 0),
        expenses: 0,
        profit: Number(monthTx._sum.amount || 0) * 0.3,
        avgOrder: Number(monthTx._avg.amount || 0)
      },
      balances: {
        users: Number(balances._sum.balance || 0),
        bonuses: Number(balances._sum.bonusBalance || 0),
        pending: Number(pending._sum.amount || 0)
      },
      methods: {
        card: methodTotals.card || 0,
        cardPercent: totalMethodAmount > 0 ? Math.round((methodTotals.card || 0) / totalMethodAmount * 100) : 0,
        crypto: methodTotals.crypto || 0,
        cryptoPercent: totalMethodAmount > 0 ? Math.round((methodTotals.crypto || 0) / totalMethodAmount * 100) : 0,
        sbp: methodTotals.sbp || 0,
        sbpPercent: totalMethodAmount > 0 ? Math.round((methodTotals.sbp || 0) / totalMethodAmount * 100) : 0
      }
    };
  }

  async cancelOrder(orderId: number, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update order status to cancelled
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    // Create status history
    await prisma.statusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        changedBy: 'admin',
        comment: reason || 'Cancelled by admin'
      }
    });

    // Create refund if order was paid
    if (order.status === 'PAID' || order.status === 'IN_TRANSIT') {
      await prisma.payment.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.totalPrice,
          currency: order.currency,
          status: 'PENDING',
          type: 'REFUND',
          method: 'BALANCE'
        }
      });

      // Refund to user balance
      await prisma.user.update({
        where: { id: order.userId },
        data: {
          balance: {
            increment: order.totalPrice
          }
        }
      });
    }

    // Send notification to user
    const { io } = await import('../../core/websocket/server');
    io.to(`user_${order.userId}`).emit('order:cancelled', {
      orderId: order.id,
      reason: reason || 'Cancelled by admin'
    });

    return updatedOrder;
  }

  async sendMessageToUser(userId: number, message: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Send via WebSocket to bot
    const { io } = await import('../../core/websocket/server');
    io.to('bot').emit('admin:message', {
      userId,
      telegramId: user.telegramId.toString(),
      message
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Сообщение от администратора',
        message,
        sentToTelegram: true
      }
    });

    return { success: true };
  }
}

export const adminService = new AdminService();

