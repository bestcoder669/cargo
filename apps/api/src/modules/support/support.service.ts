// apps/api/src/modules/support/support.service.ts
import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { io } from '../../core/websocket/server';
import { SocketEvents, ChatStatus } from '@cargoexpress/shared';
import { logger } from '../../core/logger';

class SupportService {
  async createChat(userId: number, message: string, subject?: string) {
    const chat = await prisma.supportChat.create({
      data: {
        userId,
        subject: subject || 'Новое обращение',
        status: ChatStatus.WAITING,
        priority: 0
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });
    
    // Create first message
    const firstMessage = await prisma.supportMessage.create({
      data: {
        chatId: chat.id,
        fromUser: true,
        text: message
      }
    });
    
    // Store in Redis for quick access
    await redis.zadd(
      'support:waiting',
      Date.now(),
      chat.id.toString()
    );
    
    // Notify operators
    io.to('support-operators').emit(SocketEvents.SUPPORT_NEW_MESSAGE, {
      chat,
      message: firstMessage
    });
    
    logger.info(`Support chat created: ${chat.id} for user ${userId}`);
    
    return {
      ...chat,
      messages: [firstMessage]
    };
  }
  
  async getChats(filters: {
    status?: ChatStatus;
    assignedToId?: number;
    priority?: number;
    page?: number;
    limit?: number;
  }) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.priority !== undefined) {
      where.priority = filters.priority;
    }
    
    const [chats, total] = await Promise.all([
      prisma.supportChat.findMany({
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { status: 'asc' },
          { createdAt: 'asc' }
        ]
      }),
      prisma.supportChat.count({ where })
    ]);
    
    // Get unread counts
    const chatIds = chats.map(c => c.id);
    const unreadCounts = await prisma.supportMessage.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: chatIds },
        fromUser: true,
        isRead: false
      },
      _count: true
    });
    
    const unreadMap = unreadCounts.reduce((acc, curr) => {
      acc[curr.chatId] = curr._count;
      return acc;
    }, {});
    
    const enrichedChats = chats.map(chat => ({
      ...chat,
      unreadCount: unreadMap[chat.id] || 0,
      lastMessage: chat.messages[0] || null
    }));
    
    return {
      data: enrichedChats,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        stats: await this.getChatStats()
      }
    };
  }
  
  async getChat(chatId: number, markAsRead: boolean = false) {
    const chat = await prisma.supportChat.findUnique({
      where: { id: chatId },
      include: {
        user: {
          include: {
            city: true,
            _count: {
              select: { orders: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!chat) return null;
    
    // Mark messages as read
    if (markAsRead) {
      await prisma.supportMessage.updateMany({
        where: {
          chatId,
          fromUser: true,
          isRead: false
        },
        data: { isRead: true }
      });
      
      // Notify about read
      io.to(`user:${chat.userId}`).emit(SocketEvents.SUPPORT_MESSAGE_READ, {
        chatId
      });
    }
    
    return chat;
  }
  
  async sendMessage(data: {
    chatId: number;
    text: string;
    fromUser: boolean;
    operatorId?: number;
    attachments?: any[];
  }) {
    // Check chat exists
    const chat = await prisma.supportChat.findUnique({
      where: { id: data.chatId },
      include: { user: true }
    });
    
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Create message
    const message = await prisma.supportMessage.create({
      data: {
        chatId: data.chatId,
        fromUser: data.fromUser,
        operatorId: data.operatorId,
        text: data.text,
        attachments: data.attachments
      }
    });
    
    // Update chat
    await prisma.supportChat.update({
      where: { id: data.chatId },
      data: {
        updatedAt: new Date(),
        status: data.fromUser 
          ? ChatStatus.WAITING 
          : ChatStatus.IN_PROGRESS
      }
    });
    
    // Real-time notifications
    if (data.fromUser) {
      // Notify operators
      io.to('support-operators').emit(SocketEvents.SUPPORT_NEW_MESSAGE, {
        chatId: data.chatId,
        message,
        user: chat.user
      });
      
      // Update Redis queue
      await redis.zadd(
        'support:waiting',
        Date.now(),
        data.chatId.toString()
      );
    } else {
      // Notify user via bot
      io.to('bot').emit('support:reply', {
        userId: chat.userId,
        telegramId: chat.user.telegramId,
        message: data.text
      });
      
      // Notify user in web
      io.to(`user:${chat.userId}`).emit(SocketEvents.SUPPORT_NEW_MESSAGE, {
        chatId: data.chatId,
        message
      });
      
      // Remove from waiting queue
      await redis.zrem('support:waiting', data.chatId.toString());
    }
    
    logger.info(`Support message sent in chat ${data.chatId}`);
    
    return message;
  }
  
  async assignChat(chatId: number, operatorId: number) {
    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data: {
        assignedToId: operatorId,
        status: ChatStatus.IN_PROGRESS
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    // Remove from waiting queue
    await redis.zrem('support:waiting', chatId.toString());
    
    // Add to operator's active chats
    await redis.sadd(`operator:${operatorId}:chats`, chatId.toString());
    
    // Notify
    io.to('support-operators').emit(SocketEvents.SUPPORT_CHAT_ASSIGNED, {
      chatId,
      operatorId,
      user: chat.user
    });
    
    logger.info(`Chat ${chatId} assigned to operator ${operatorId}`);
    
    return chat;
  }
  
  async closeChat(chatId: number, operatorId: number | null, resolved: boolean = true) {
    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data: {
        status: resolved ? ChatStatus.RESOLVED : ChatStatus.CLOSED,
        resolvedAt: resolved ? new Date() : undefined,
        closedAt: new Date()
      }
    });
    
    // Remove from operator's active chats
    if (chat.assignedToId) {
      await redis.srem(
        `operator:${chat.assignedToId}:chats`,
        chatId.toString()
      );
    }
    
    // Remove from waiting queue
    await redis.zrem('support:waiting', chatId.toString());
    
    // Notify
    io.to('support-operators').emit(SocketEvents.SUPPORT_CHAT_CLOSED, {
      chatId,
      resolved
    });
    
    logger.info(`Chat ${chatId} closed (resolved: ${resolved})`);
    
    return chat;
  }
  
  async changePriority(chatId: number, priority: number) {
    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data: { priority }
    });
    
    // Update in Redis if waiting
    if (chat.status === ChatStatus.WAITING) {
      // Lower score = higher priority (reverse)
      const score = Date.now() - (priority * 1000000);
      await redis.zadd('support:waiting', score, chatId.toString());
    }
    
    return chat;
  }
  
  async getChatStats() {
    const [
      waiting,
      inProgress,
      todayResolved,
      avgResponseTime
    ] = await Promise.all([
      prisma.supportChat.count({
        where: { status: ChatStatus.WAITING }
      }),
      prisma.supportChat.count({
        where: { status: ChatStatus.IN_PROGRESS }
      }),
      prisma.supportChat.count({
        where: {
          status: ChatStatus.RESOLVED,
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      this.calculateAverageResponseTime()
    ]);
    
    return {
      waiting,
      inProgress,
      todayResolved,
      avgResponseTime
    };
  }
  
  async calculateAverageResponseTime() {
    const result = await prisma.$queryRaw<any[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (first_reply."createdAt" - chat."createdAt")) / 60) as avg_minutes
      FROM "SupportChat" chat
      JOIN LATERAL (
        SELECT "createdAt"
        FROM "SupportMessage"
        WHERE "chatId" = chat.id
          AND "fromUser" = false
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) first_reply ON true
      WHERE chat."createdAt" >= NOW() - INTERVAL '7 days'
    `;

    return Math.round(result[0]?.avg_minutes || 0);
  }
  
  async searchChats(query: string) {
    return prisma.supportChat.findMany({
      where: {
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
                { email: { contains: query, mode: 'insensitive' } }
              ]
            }
          },
          {
            messages: {
              some: {
                text: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      take: 20,
      orderBy: { updatedAt: 'desc' }
    });
  }
  
  async getUserChatHistory(userId: number) {
    return prisma.supportChat.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async rateChat(chatId: number, rating: number) {
    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data: { rating }
    });

    logger.info(`Chat ${chatId} rated: ${rating}`);

    return chat;
  }

  async updateChat(chatId: number, data: any) {
    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data
    });

    return chat;
  }
}

export const supportService = new SupportService();