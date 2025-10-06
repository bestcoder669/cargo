// ==================== apps/api/src/modules/admin/admin.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { logger } from '../../core/logger';

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
    const [openChats, avgResponseTime] = await Promise.all([
      prisma.supportChat.count({
        where: { status: 'WAITING' }
      }),
      // Simple calculation, should be improved
      prisma.supportChat.aggregate({
        where: { status: 'RESOLVED' },
        _avg: { resolvedAt: true }
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
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    
    const [data, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count()
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
        totalSpent: 0 // Should calculate from orders
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
        ].filter(condition => Object.keys(condition).length > 0)
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
    
    const today = new Date();
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
    
    let sent = 0;
    let failed = 0;
    
    // Send notifications
    for (const user of users) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'SYSTEM',
            title: 'Уведомление',
            message: data.message,
            sentToTelegram: true
          }
        });
        
        // Emit to bot via Redis pub/sub
        await redis.publish('bot:broadcast', JSON.stringify({
          telegramId: user.telegramId.toString(),
          message: data.message
        }));
        
        sent++;
      } catch (error) {
        failed++;
        logger.error(`Broadcast failed for user ${user.id}:`, error);
      }
    }
    
    // Log admin action
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
}

export const adminService = new AdminService();

