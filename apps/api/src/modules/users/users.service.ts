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
    
    if (!user) return null;
    
    // Calculate statistics
    const [totalSpent, activeOrders, lastOrder] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: id,
          type: 'payment',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      }),
      prisma.order.count({
        where: {
          userId: id,
          status: {
            notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED']
          }
        }
      }),
      prisma.order.findFirst({
        where: { userId: id },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    return {
      ...user,
      stats: {
        totalSpent: Number(totalSpent._sum.amount || 0),
        activeOrders,
        lastOrderDate: lastOrder?.createdAt
      }
    };
  }
  
  async updateUser(id: number, data: UpdateUserDto) {
    // Clear cache
    await redis.del(`user:${id}`);
    
    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        city: true,
        addresses: true
      }
    });
    
    logger.info(`User updated: ${id}`);
    
    return user;
  }
  
  async getUserAddresses(userId: number) {
    return prisma.userAddress.findMany({
      where: { userId },
      include: { city: true },
      orderBy: { isDefault: 'desc' }
    });
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
}

export const usersService = new UsersService();