// ==================== apps/bot/src/modules/registration/registration.middleware.ts ====================

import { NextFunction } from 'grammy';
import { MyContext } from '../../core/types';
import { apiClient } from '../../core/api/client';
import { EMOJI } from '@cargoexpress/shared';

export async function checkRegistration(ctx: MyContext, next: NextFunction) {
  // Skip for certain commands
  const skipCommands = ['/start', '/help', '/admin'];
  const text = ctx.message?.text || '';
  
  if (skipCommands.some(cmd => text.startsWith(cmd))) {
    return next();
  }
  
  // Check if user is registered
  if (!ctx.session.isRegistered && ctx.from) {
    try {
      const user = await apiClient.getUserByTelegramId(ctx.from.id);
      
      if (user) {
        ctx.session.isRegistered = true;
        ctx.session.userId = user.id;
        ctx.user = user;
      } else {
        // User not registered
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery(
            'Сначала нужно зарегистрироваться!',
            { show_alert: true }
          );
        }
        
        await ctx.reply(
          `${EMOJI.WARNING} <b>Требуется регистрация</b>\n\n` +
          `Для использования этой функции необходимо зарегистрироваться.\n` +
          `Это займет всего 2-3 минуты!\n\n` +
          `Нажмите /start для регистрации.`
        );
        return;
      }
    } catch (error) {
      // API error, continue anyway
    }
  }
  
  return next();
}