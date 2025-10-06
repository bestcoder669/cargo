// ==================== apps/bot/src/commands/start.command.ts ====================

import { CommandContext } from 'grammy';
import { MyContext } from '../core/types';
import { apiClient } from '../core/api/client';
import { InlineKeyboard } from 'grammy';
import { EMOJI, ORDER_STATUS_LABELS, FormatUtils } from '@cargoexpress/shared';
import { logger } from '../core/logger';

export async function handleStart(ctx: CommandContext<MyContext>) {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) return;
    
    // Check if user exists
    let user = null;
    try {
      user = await apiClient.getUserByTelegramId(userId);
    } catch (error) {
      // User doesn't exist
    }
    
    if (user) {
      // User already registered
      ctx.session.isRegistered = true;
      ctx.session.userId = user.id;
      
      const mainKeyboard = new InlineKeyboard()
        .text(`${EMOJI.SHIPPING} Отправить посылку`, 'shipping').row()
        .text(`${EMOJI.PURCHASE} Заказать товар`, 'purchase').row()
        .text(`${EMOJI.CALCULATOR} Калькулятор`, 'calculator')
        .text(`${EMOJI.SUPPORT} Поддержка`, 'support').row()
        .text(`${EMOJI.PROFILE} Профиль`, 'profile')
        .text(`${EMOJI.PACKAGE} Заказы`, 'my_orders');
      
      await ctx.reply(
        `${EMOJI.FIRE} <b>С возвращением, ${user.firstName}!</b>\n\n` +
        
        `🆔 Ваш ID: <code>${user.id}</code>\n` +
        `📦 Активных заказов: ${user.activeOrders || 0}\n` +
        `💰 Баланс: ${user.balance || 0} ₽\n\n` +
        
        `<b>Что вы хотите сделать?</b>`,
        { reply_markup: mainKeyboard }
      );
    } else {
      // New user - start registration
      const startKeyboard = new InlineKeyboard()
        .text(`${EMOJI.SUCCESS} Начать регистрацию`, 'start_registration')
        .row()
        .text(`${EMOJI.INFO} Узнать больше`, 'about_service');
      
      await ctx.reply(
        `${EMOJI.FIRE} <b>Добро пожаловать в CargoExpress!</b>\n\n` +
        
        `Мы - надежный сервис международной доставки товаров.\n\n` +
        
        `<b>Наши услуги:</b>\n` +
        `${EMOJI.SHIPPING} Доставка посылок из США, Китая, Турции и Европы\n` +
        `${EMOJI.PURCHASE} Выкуп товаров с любых зарубежных сайтов\n` +
        `${EMOJI.CALCULATOR} Точный расчет стоимости доставки\n` +
        `${EMOJI.SUPPORT} Поддержка 24/7\n\n` +
        
        `<b>Преимущества:</b>\n` +
        `✅ Низкие цены - от 8$/кг\n` +
        `✅ Быстрая доставка - от 7 дней\n` +
        `✅ Страхование посылок\n` +
        `✅ Отслеживание в реальном времени\n` +
        `✅ Бесплатное хранение 30 дней\n\n` +
        
        `Для начала работы необходимо зарегистрироваться.`,
        { reply_markup: startKeyboard }
      );
    }
    
    // Handle deep link parameters
    const startParam = ctx.match;
    if (startParam) {
      // Handle referral codes, order tracking, etc.
      if (startParam.startsWith('ref_')) {
        const refCode = startParam.replace('ref_', '');
        ctx.session.tempData = { referralCode: refCode };
        await ctx.reply(
          `${EMOJI.STAR} Вы пришли по реферальной ссылке!\n` +
          `Код ${refCode} будет применен при регистрации.`
        );
      } else if (startParam.startsWith('track_')) {
        const trackNumber = startParam.replace('track_', '');
        // Show order tracking
        await handleTrackOrder(ctx, trackNumber);
      }
    }
    
  } catch (error) {
    logger.error('Start command error:', error);
    await ctx.reply(
      `${EMOJI.ERROR} Произошла ошибка.\n` +
      `Попробуйте еще раз или обратитесь в поддержку.`
    );
  }
}

async function handleTrackOrder(ctx: MyContext, trackNumber: string) {
  try {
    const order = await apiClient.getOrderByTrackNumber(trackNumber);
    
    if (!order) {
      await ctx.reply(
        `${EMOJI.ERROR} Заказ с треком ${trackNumber} не найден.`
      );
      return;
    }
    
    // Show public tracking info
    await ctx.reply(
      `${EMOJI.PACKAGE} <b>Отслеживание посылки</b>\n\n` +
      `Трек: <code>${trackNumber}</code>\n` +
      `Статус: ${ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}\n` +
      `Обновлено: ${FormatUtils.formatDate(order.updatedAt)}\n\n` +
      `Для получения детальной информации войдите в систему.`
    );
    
  } catch (error) {
    logger.error('Track order error:', error);
    await ctx.reply(`${EMOJI.ERROR} Не удалось загрузить информацию о заказе.`);
  }
}

