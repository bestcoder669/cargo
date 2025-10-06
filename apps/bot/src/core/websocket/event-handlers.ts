// ==================== apps/bot/src/core/websocket/event-handlers.ts ====================

import { wsClient } from './client';
import { bot } from '../../main'; // Нужен экспорт bot из main.ts
import { EMOJI, ORDER_STATUS_LABELS, FormatUtils } from '@cargoexpress/shared';
import { logger } from '../logger';

export function initializeWebSocketHandlers() {
  // Обработка изменения статуса заказа
  wsClient.on('order:status_changed', async (data) => {
    try {
      const { orderId, userId, oldStatus, newStatus } = data;
      
      await bot.api.sendMessage(
        userId,
        `${EMOJI.PACKAGE} <b>Статус заказа изменен!</b>\n\n` +
        `Заказ: #${orderId}\n` +
        `Старый статус: ${ORDER_STATUS_LABELS[oldStatus]}\n` +
        `Новый статус: ${ORDER_STATUS_LABELS[newStatus]}\n\n` +
        `Подробности: /orders`
      );
      
      logger.info(`Order status notification sent: ${orderId} to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send order status notification:', error);
    }
  });
  
  // Обработка ответа от поддержки
  wsClient.on('support:admin_reply', async (data) => {
    try {
      const { userId, message, operatorName } = data;
      
      await bot.api.sendMessage(
        userId,
        `${EMOJI.SUPPORT} <b>Ответ от поддержки</b>\n` +
        `Оператор: ${operatorName}\n\n` +
        `${message}`
      );
    } catch (error) {
      logger.error('Failed to send support reply:', error);
    }
  });
  
  // Обработка массовых рассылок
  wsClient.on('broadcast:message', async (data) => {
    try {
      const { telegramId, message } = data;
      
      await bot.api.sendMessage(
        telegramId,
        `${EMOJI.INFO} <b>Уведомление</b>\n\n${message}`
      );
    } catch (error) {
      logger.error('Failed to send broadcast message:', error);
    }
  });
  
  // Обработка оплаченных заказов
  wsClient.on('order:paid', async (data) => {
    try {
      const { orderId, userId, amount } = data;
      
      await bot.api.sendMessage(
        userId,
        `${EMOJI.SUCCESS} <b>Оплата получена!</b>\n\n` +
        `Заказ #${orderId} оплачен.\n` +
        `Сумма: ${FormatUtils.formatMoney(amount)}\n\n` +
        `Мы начали обработку вашего заказа.`
      );
    } catch (error) {
      logger.error('Failed to send payment notification:', error);
    }
  });
  
  // Обработка обновлений данных
  wsClient.on('data:update', async (data) => {
    try {
      const { type, entityId } = data;
      
      switch (type) {
        case 'country':
          // Очищаем кеш стран
          await redis.del('cache:countries');
          logger.info(`Country cache cleared: ${entityId}`);
          break;
          
        case 'warehouse':
          // Очищаем кеш складов
          await redis.del(`cache:warehouses:*`);
          logger.info(`Warehouse cache cleared: ${entityId}`);
          break;
          
        case 'tariff':
          // Обновления тарифов
          logger.info(`Tariff updated: ${entityId}`);
          break;
      }
    } catch (error) {
      logger.error('Failed to handle data update:', error);
    }
  });
  
  // Статус бота для мониторинга
  setInterval(() => {
    wsClient.emit('bot:status_update', {
      status: 'online',
      timestamp: new Date(),
      metrics: {
        // Можно добавить метрики
      }
    });
  }, 30000); // Каждые 30 секунд
}

