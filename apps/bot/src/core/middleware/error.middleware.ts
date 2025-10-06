// ==================== apps/bot/src/core/middleware/error.middleware.ts ====================

import { ErrorHandler } from 'grammy';
import { MyContext } from '../types';
import { logger } from '../logger';
import { EMOJI } from '@cargoexpress/shared';

export const errorHandler: ErrorHandler<MyContext> = async (err) => {
  const { ctx, error } = err;
  
  logger.error('Bot error:', {
    error: error.message,
    stack: error.stack,
    update: ctx.update,
    userId: ctx.from?.id,
    username: ctx.from?.username
  });
  
  // Notify user about error
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery(
        'Произошла ошибка. Попробуйте еще раз.',
        { show_alert: true }
      );
    } else {
      await ctx.reply(
        `${EMOJI.ERROR} Произошла ошибка.\n` +
        `Попробуйте еще раз или обратитесь в поддержку.`
      );
    }
  } catch (replyError) {
    logger.error('Failed to send error message:', replyError);
  }
  
  // Report to monitoring service
  if (process.env.NODE_ENV === 'production') {
    try {
      await apiClient.reportError({
        message: error.message,
        stack: error.stack,
        context: {
          userId: ctx.from?.id,
          username: ctx.from?.username,
          updateType: ctx.updateType,
          text: ctx.message?.text,
          callbackData: ctx.callbackQuery?.data
        }
      });
    } catch (reportError) {
      logger.error('Failed to report error:', reportError);
    }
  }
};

