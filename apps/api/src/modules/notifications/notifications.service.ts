// ==================== apps/api/src/modules/notifications/notification.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { 
  NotificationType,
  OrderStatus,
  ORDER_STATUS_LABELS 
} from '@cargoexpress/shared';
import { logger } from '../../core/logger';

class NotificationService {
  async sendOrderCreatedNotification(order: any) {
    const notification = await prisma.notification.create({
      data: {
        userId: order.userId,
        type: NotificationType.ORDER_STATUS,
        title: 'Заказ создан',
        message: `Ваш заказ #${order.id} успешно создан. Трек-номер: ${order.trackNumber}`,
        data: { orderId: order.id, trackNumber: order.trackNumber }
      }
    });
    
    // Send to bot via Redis
    await this.sendToBot(order.user.telegramId, notification);
    
    return notification;
  }
  
  async sendOrderStatusNotification(
    userId: number,
    orderId: number,
    newStatus: OrderStatus
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.ORDER_STATUS,
        title: 'Статус заказа изменен',
        message: `Заказ #${orderId}: ${ORDER_STATUS_LABELS[newStatus]}`,
        data: { orderId, status: newStatus }
      }
    });
    
    await this.sendToBot(user.telegramId, notification);
    
    return notification;
  }
  
  async sendPaymentNotification(
    userId: number,
    orderId: number,
    amount: number,
    success: boolean
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.PAYMENT,
        title: success ? 'Оплата прошла успешно' : 'Ошибка оплаты',
        message: success 
          ? `Заказ #${orderId} оплачен. Сумма: ${amount}₽`
          : `Не удалось оплатить заказ #${orderId}`,
        data: { orderId, amount, success }
      }
    });
    
    await this.sendToBot(user.telegramId, notification);
    
    return notification;
  }
  
  async sendSupportReply(chatId: number, message: string) {
    const chat = await prisma.supportChat.findUnique({
      where: { id: chatId },
      include: { user: true }
    });
    
    if (!chat) return;
    
    const notification = await prisma.notification.create({
      data: {
        userId: chat.userId,
        type: NotificationType.SUPPORT,
        title: 'Ответ от поддержки',
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        data: { chatId }
      }
    });
    
    await this.sendToBot(chat.user.telegramId, notification);
    
    return notification;
  }
  
  private async sendToBot(telegramId: bigint, notification: any) {
    try {
      // Publish to Redis channel that bot listens to
      await redis.publish('bot:notifications', JSON.stringify({
        telegramId: telegramId.toString(),
        notification
      }));
    } catch (error) {
      logger.error('Failed to send notification to bot:', error);
    }
  }
}

export const notificationService = new NotificationService();