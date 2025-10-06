// ==================== apps/bot/src/handlers/message.handler.ts ====================

import { Bot } from 'grammy';
import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { EMOJI } from '@cargoexpress/shared';
import { logger } from '../core/logger';

export function handleMessages(bot: Bot<MyContext>) {
  // Обработка трек-номеров
  bot.hears(/^[A-Z0-9]{8,20}$/i, async (ctx) => {
    const trackNumber = ctx.message.text.toUpperCase();
    
    try {
      const order = await apiClient.getOrderByTrackNumber(trackNumber);
      
      if (order) {
        await ctx.reply(
          `${EMOJI.PACKAGE} <b>Заказ найден!</b>\n\n` +
          `Трек: <code>${trackNumber}</code>\n` +
          `Статус: ${ORDER_STATUS_LABELS[order.status]}\n` +
          `Обновлено: ${FormatUtils.formatDate(order.updatedAt)}\n\n` +
          `Для подробностей нажмите /orders`
        );
      } else {
        await ctx.reply(
          `${EMOJI.ERROR} Заказ с треком ${trackNumber} не найден.\n` +
          `Проверьте правильность трек-номера.`
        );
      }
    } catch (error) {
      logger.error('Track search error:', error);
    }
  });
  
  // Обработка телефонов
  bot.hears(/^\+?[0-9\s\-\(\)]+$/, async (ctx) => {
    if (ctx.message.text.length >= 10 && ctx.message.text.length <= 20) {
      if (ctx.session.scene === 'registration') return; // Skip if in registration
      
      await ctx.reply(
        `${EMOJI.INFO} Похоже, вы отправили номер телефона.\n` +
        `Если хотите изменить телефон в профиле, используйте /settings`
      );
    }
  });
  
  // Обработка email
  bot.hears(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, async (ctx) => {
    if (ctx.session.scene === 'registration') return;
    
    await ctx.reply(
      `${EMOJI.INFO} Похоже, вы отправили email.\n` +
      `Если хотите изменить email в профиле, используйте /settings`
    );
  });
  
  // Обработка ссылок на товары
  bot.hears(/^https?:\/\/.+/, async (ctx) => {
    const url = ctx.message.text;
    
    // Проверяем популярные магазины
    const stores = {
      'amazon': '🛒 Amazon',
      'ebay': '🛍 eBay',
      'aliexpress': '🏪 AliExpress',
      'taobao': '🇨🇳 Taobao',
      'wildberries': '🇷🇺 Wildberries',
      'ozon': '🇷🇺 OZON'
    };
    
    let storeName = null;
    for (const [key, name] of Object.entries(stores)) {
      if (url.toLowerCase().includes(key)) {
        storeName = name;
        break;
      }
    }
    
    if (storeName) {
      await ctx.reply(
        `${EMOJI.PURCHASE} <b>Товар из ${storeName}</b>\n\n` +
        `Хотите заказать этот товар?\n` +
        `Используйте команду /purchase и выберите "По ссылке"`,
        {
          reply_markup: new InlineKeyboard()
            .text('🛍 Заказать товар', 'purchase')
            .text('📊 Рассчитать стоимость', 'calculator')
        }
      );
    }
  });
  
  // Обработка фото
  bot.on('message:photo', async (ctx) => {
    if (ctx.session.scene === 'support') return; // Support handles its own photos
    
    await ctx.reply(
      `${EMOJI.INFO} Фото получено.\n` +
      `Если это связано с заказом, обратитесь в /support`
    );
  });
  
  // Обработка документов
  bot.on('message:document', async (ctx) => {
    if (ctx.session.scene === 'support') return;
    
    const doc = ctx.message.document;
    const fileSize = doc.file_size || 0;
    
    if (fileSize > 20 * 1024 * 1024) { // 20MB
      await ctx.reply(`${EMOJI.ERROR} Файл слишком большой (максимум 20MB)`);
      return;
    }
    
    await ctx.reply(
      `${EMOJI.INFO} Документ получен: ${doc.file_name}\n` +
      `Если это связано с заказом, обратитесь в /support`
    );
  });
  
  // Обработка голосовых сообщений
  bot.on('message:voice', async (ctx) => {
    await ctx.reply(
      `${EMOJI.INFO} Голосовое сообщение получено.\n` +
      `К сожалению, бот не обрабатывает голосовые сообщения.\n` +
      `Пожалуйста, напишите текстом или обратитесь в /support`
    );
  });
  
  // Обработка стикеров
  bot.on('message:sticker', async (ctx) => {
    const stickers = ['👍', '❤️', '😊', '🎉', '🙏'];
    const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
    await ctx.reply(randomSticker);
  });
  
  // Обработка локации
  bot.on('message:location', async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    
    await ctx.reply(
      `${EMOJI.LOCATION} Локация получена.\n` +
      `Координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\n` +
      `Для изменения адреса доставки используйте /settings`
    );
  });
  
  // Обработка контактов
  bot.on('message:contact', async (ctx) => {
    if (ctx.session.scene === 'registration') return;
    
    const contact = ctx.message.contact;
    await ctx.reply(
      `${EMOJI.PROFILE} Контакт получен: ${contact.first_name}\n` +
      `Телефон: ${contact.phone_number}`
    );
  });
  
  // Неизвестные команды
  bot.on('message:text').filter(
    ctx => ctx.message?.text?.startsWith('/'),
    async (ctx) => {
      await ctx.reply(
        `${EMOJI.ERROR} Неизвестная команда.\n` +
        `Используйте /help для списка команд.`
      );
    }
  );
  
  // Все остальные текстовые сообщения
  bot.on('message:text', async (ctx) => {
    // Если пользователь в каком-то процессе, не мешаем
    if (ctx.session.scene) return;
    
    const text = ctx.message.text.toLowerCase();
    
    // Ключевые слова
    const keywords = {
      'цена\|стоимость\|сколько\|тариф': 'calculator',
      'доставка\|отправить\|посылка': 'shipping',
      'купить\|заказать\|товар': 'purchase',
      'помощь\|поддержка\|проблема': 'support',
      'профиль\|баланс\|данные': 'profile',
      'заказ\|трек\|отследить': 'orders'
    };
    
    for (const [pattern, command] of Object.entries(keywords)) {
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        await ctx.reply(
          `${EMOJI.INFO} Возможно, вам нужна команда /${command}\n` +
          `Или используйте /help для полного списка команд.`
        );
        return;
      }
    }
    
    // Если ничего не подошло
    await ctx.reply(
      `Я не понимаю ваше сообщение.\n` +
      `Используйте кнопки меню или команды:\n\n` +
      `/start - Главное меню\n` +
      `/help - Помощь\n` +
      `/support - Поддержка`
    );
  });
}

