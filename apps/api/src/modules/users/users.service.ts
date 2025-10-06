// apps/api/src/modules/users/users.service.ts
import { prisma } from '@cargoexpress/prisma';
import { UpdateUserDto } from '@cargoexpress/shared';
import { redis } from '../../core/redis';
import { logger } from '../../core/logger';

class UsersService {
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    cityId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = { isActive: true };
    
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } }
      ];
    }
    
    if (params.cityId) {
      where.cityId = params.cityId;
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          city: true,
          _count: {
            select: {
              orders: true,
              addresses: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        city: true,
        addresses: true,
        referredBy: true,
        _count: {
          select: {
            orders: true,
            referrals: true
          }
        }
      }
    });

    return user;
  }

  async getUserByTelegramId(telegramId: bigint) {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        city: true,
        addresses: true,
        _count: {
          select: {
            orders: true,
            referrals: true
          }
        }
      }
    });

    return user;
  }

  async getUserProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        city: true,
        addresses: true,
        referredBy: true,
        _count: {
          select: {
            orders: true,
            referrals: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    // Get statistics
    const [ordersStats, balance] = await Promise.all([
      prisma.order.aggregate({
        where: { userId },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.transaction.aggregate({
        where: { userId },
        _sum: { amount: true }
      })
    ]);

    return {
      ...user,
      statistics: {
        ordersCount: ordersStats._count,
        totalSpent: ordersStats._sum.totalAmount || 0,
        balance: balance._sum.amount || 0,
        referralsCount: user._count.referrals
      }
    };
  }
  
  async updateUser(id: number, data: UpdateUserDto) {
    // Clear cache
    await redis.del(`user:${id}`);

    logger.info(`Updating user ${id} with data:`, JSON.stringify(data));

    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        city: true,
        addresses: true
      }
    });

    logger.info(`User updated: ${id}, new firstName: ${user.firstName}`);

    return user;
  }
  
  async getUserAddresses(userId: number) {
    const addresses = await prisma.userAddress.findMany({
      where: { userId },
      include: { city: true },
      orderBy: { isDefault: 'desc' }
    });

    // Add cityName for backwards compatibility
    return addresses.map(addr => ({
      ...addr,
      cityName: addr.city?.name
    }));
  }
  
  async createAddress(userId: number, data: any) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }
    
    return prisma.userAddress.create({
      data: {
        ...data,
        userId
      },
      include: { city: true }
    });
  }
  
  async updateAddress(id: number, userId: number, data: any) {
    // Check ownership
    const address = await prisma.userAddress.findFirst({
      where: { id, userId }
    });
    
    if (!address) {
      throw new Error('Address not found');
    }
    
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false }
      });
    }
    
    return prisma.userAddress.update({
      where: { id },
      data,
      include: { city: true }
    });
  }
  
  async deleteAddress(id: number, userId: number) {
    const address = await prisma.userAddress.findFirst({
      where: { id, userId }
    });
    
    if (!address) {
      throw new Error('Address not found');
    }
    
    await prisma.userAddress.delete({
      where: { id }
    });
    
    return { success: true };
  }
  
  async getUserOrders(userId: number, params: any) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    
    if (params.status) {
      where.status = params.status;
    }
    if (params.type) {
      where.type = params.type;
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          warehouse: {
            include: { country: true }
          },
          address: true,
          _count: {
            select: { statusHistory: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    
    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getUserTransactions(userId: number, params: any) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    
    if (params.type) {
      where.type = params.type;
    }
    if (params.status) {
      where.status = params.status;
    }
    
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          order: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);
    
    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async banUser(userId: number, reason: string, adminId: number) {
    await prisma.$transaction(async (tx) => {
      // Ban user
      await tx.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason
        }
      });
      
      // Cancel active orders
      await tx.order.updateMany({
        where: {
          userId,
          status: {
            notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED']
          }
        },
        data: {
          status: 'CANCELLED',
          adminNote: `Cancelled due to user ban: ${reason}`,
          cancelledAt: new Date()
        }
      });
      
      // Log action
      await tx.adminAction.create({
        data: {
          adminId,
          userId,
          action: 'USER_BANNED',
          entityType: 'user',
          entityId: userId.toString(),
          details: { reason }
        }
      });
    });
    
    // Clear cache
    await redis.del(`user:${userId}`);
    
    logger.warn(`User banned: ${userId}, reason: ${reason}`);
    
    return { success: true };
  }
  
  async unbanUser(userId: number, adminId: number) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null
        }
      });

      await tx.adminAction.create({
        data: {
          adminId,
          userId,
          action: 'USER_UNBANNED',
          entityType: 'user',
          entityId: userId.toString()
        }
      });
    });

    await redis.del(`user:${userId}`);

    logger.info(`User unbanned: ${userId}`);

    return { success: true };
  }

  async getUserBalance(userId: number) {
    const result = await prisma.transaction.aggregate({
      where: { userId },
      _sum: { amount: true }
    });

    return {
      balance: result._sum.amount || 0,
      currency: 'RUB'
    };
  }

  async depositBalance(userId: number, amount: number, method: string) {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        currency: 'RUB',
        status: 'COMPLETED',
        method,
        description: `Пополнение баланса через ${method}`
      }
    });

    logger.info(`Balance deposited: ${userId}, amount: ${amount}`);

    return transaction;
  }
}

export const usersService = new UsersService();