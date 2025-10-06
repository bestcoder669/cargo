// ==================== apps/api/src/modules/auth/auth.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../core/config';
import { 
  CreateUserDto, 
  AdminRole,
  getPermissionsByRole 
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

class AuthService {
  async register(data: CreateUserDto) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(data.telegramId) }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Generate referral code
    const referralCode = this.generateReferralCode();
    
    // Check referrer
    let referredById: number | undefined;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode }
      });
      
      if (referrer) {
        referredById = referrer.id;
        // Add bonus to referrer
        await prisma.user.update({
          where: { id: referrer.id },
          data: { 
            bonusBalance: { increment: 100 } // 100 bonus for referral
          }
        });
      }
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        telegramId: BigInt(data.telegramId),
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        cityId: data.cityId,
        referralCode,
        referredById,
        language: data.language || 'ru',
        bonusBalance: referredById ? 50 : 0 // Bonus for using referral
      },
      include: {
        city: true
      }
    });
    
    // Create default address
    if (data.address) {
      await prisma.userAddress.create({
        data: {
          userId: user.id,
          name: 'Основной',
          cityId: data.cityId,
          address: data.address,
          postalCode: data.postalCode,
          phone: data.phone,
          isDefault: true
        }
      });
    }
    
    // Send welcome notification
    await this.sendWelcomeNotification(user.id);
    
    logger.info(`User registered: ${user.id} (${data.telegramId})`);
    
    return user;
  }
  
  async getUserByTelegramId(telegramId: number) {
    return prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        city: true,
        addresses: true,
        _count: {
          select: { orders: true }
        }
      }
    });
  }
  
  async generateAdminToken(data: { telegramId: number }) {
    // Check if admin
    const admin = await prisma.admin.findUnique({
      where: { telegramId: BigInt(data.telegramId) }
    });
    
    if (!admin) {
      throw new Error('Not authorized as admin');
    }
    
    const token = jwt.sign(
      {
        telegramId: data.telegramId,
        adminId: admin.id,
        role: admin.role,
        permissions: admin.permissions
      },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Store token in Redis with TTL
    await redis.setex(
      `admin_token:${token}`,
      900, // 15 minutes
      JSON.stringify({
        adminId: admin.id,
        telegramId: data.telegramId
      })
    );
    
    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'TOKEN_GENERATED',
        details: { timestamp: new Date() }
      }
    });
    
    return token;
  }
  
  async validateAdminToken(token: string) {
    // Check Redis
    const cached = await redis.get(`admin_token:${token}`);
    if (!cached) {
      throw new Error('Token expired or invalid');
    }
    
    // Verify JWT
    const payload = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Get admin info
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId }
    });
    
    if (!admin || !admin.isActive) {
      throw new Error('Admin not found or inactive');
    }
    
    // Delete one-time token
    await redis.del(`admin_token:${token}`);
    
    // Generate session token
    const sessionToken = jwt.sign(
      {
        adminId: admin.id,
        role: admin.role,
        permissions: admin.permissions
      },
      config.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Store session
    await redis.setex(
      `admin_session:${admin.id}`,
      8 * 3600,
      sessionToken
    );
    
    return {
      sessionToken,
      admin: {
        id: admin.id,
        telegramId: admin.telegramId.toString(),
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions
      }
    };
  }
  
  async verifyAdminToken(token: string) {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as any;
      
      const admin = await prisma.admin.findUnique({
        where: { id: payload.adminId }
      });
      
      if (!admin || !admin.isActive) {
        throw new Error('Invalid admin');
      }
      
      return admin;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  async verifyUserToken(token: string) {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });
      
      if (!user || !user.isActive) {
        throw new Error('Invalid user');
      }
      
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  private async sendWelcomeNotification(userId: number) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Добро пожаловать в CargoExpress!',
        message: 'Спасибо за регистрацию! Теперь вы можете отправлять посылки и заказывать товары со всего мира.',
        sentToTelegram: true
      }
    });
  }
}

export const authService = new AuthService();

