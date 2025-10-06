// ==================== apps/bot/src/handlers/inline.handler.ts ====================

import { Bot, InlineQueryResultArticle } from 'grammy';
import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { EMOJI, FormatUtils } from '@cargoexpress/shared';
import { logger } from '../core/logger';

export function handleInlineQueries(bot: Bot<MyContext>) {
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    
    if (!query) {
      // Показываем подсказки
      const results: InlineQueryResultArticle[] = [
        {
          type: 'article',
          id: 'help',
          title: '❓ Как пользоваться',
          description: 'Введите трек-номер для поиска заказа',
          input_message_content: {
            message_text: 'Введите трек-номер после @bot_username для быстрого поиска заказа'
          }
        },
        {
          type: 'article',
          id: 'calculator',
          title: '📊 Калькулятор доставки',
          description: 'Рассчитать стоимость доставки',
          input_message_content: {
            message_text: '/calculator - Калькулятор доставки'
          }
        },
        {
          type: 'article',
          id: 'support',
          title: '💬 Поддержка',
          description: 'Связаться с поддержкой',
          input_message_content: {
            message_text: '/support - Служба поддержки CargoExpress'
          }
        }
      ];
      
      await ctx.answerInlineQuery(results, {
        cache_time: 300,
        is_personal: true
      });
      return;
    }
    
    // Поиск по трек-номеру
    if (/^[A-Z0-9]{8,20}$/i.test(query)) {
      try {
        const order = await apiClient.getOrderByTrackNumber(query.toUpperCase());
        
        if (order) {
          const results: InlineQueryResultArticle[] = [{
            type: 'article',
            id: `order_${order.id}`,
            title: `📦 Заказ ${order.trackNumber}`,
            description: `Статус: ${ORDER_STATUS_LABELS[order.status]}`,
            input_message_content: {
              message_text: 
                `${EMOJI.PACKAGE} <b>Информация о заказе</b>\n\n` +
                `Трек: <code>${order.trackNumber}</code>\n` +
                `Статус: ${ORDER_STATUS_LABELS[order.status]}\n` +
                `Тип: ${order.type === 'SHIPPING' ? '✈️ Доставка' : '🛍 Выкуп'}\n` +
                `Обновлено: ${FormatUtils.formatDate(order.updatedAt)}\n\n` +
                `Для отслеживания используйте @${ctx.me.username}`,
              parse_mode: 'HTML'
            }
          }];
          
          await ctx.answerInlineQuery(results, {
            cache_time: 60,
            is_personal: true
          });
        } else {
          await ctx.answerInlineQuery([], {
            cache_time: 0,
            is_personal: true,
            switch_pm_text: 'Заказ не найден',
            switch_pm_parameter: 'start'
          });
        }
      } catch (error) {
        logger.error('Inline query error:', error);
        await ctx.answerInlineQuery([], {
          cache_time: 0,
          is_personal: true
        });
      }
    } else {
      // Поиск по другим параметрам
      const results: InlineQueryResultArticle[] = [
        {
          type: 'article',
          id: 'search',
          title: '🔍 Поиск заказов',
          description: `Поиск: ${query}`,
          input_message_content: {
            message_text: `Поиск "${query}" - используйте бота @${ctx.me.username}`
          }
        }
      ];
      
      await ctx.answerInlineQuery(results, {
        cache_time: 0,
        is_personal: true,
        switch_pm_text: 'Открыть бота',
        switch_pm_parameter: 'start'
      });
    }
  });
  
  bot.on('chosen_inline_result', async (ctx) => {
    logger.info(`Inline result chosen: ${ctx.chosenInlineResult.result_id}`);
  });
}

