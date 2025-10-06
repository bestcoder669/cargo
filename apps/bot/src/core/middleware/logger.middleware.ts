// ==================== apps/bot/src/core/middleware/logger.middleware.ts ====================

import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { logger } from '../logger';

export async function loggerMiddleware(ctx: MyContext, next: NextFunction) {
  const start = Date.now();

  try {
    // Log incoming update
    const updateType = ctx.update.update_id.toString();
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    logger.debug(`[${updateType}] from ${userId} (@${username})`);
    
    if (ctx.message?.text) {
      logger.debug(`Text: ${ctx.message.text.substring(0, 100)}`);
    } else if (ctx.callbackQuery?.data) {
      logger.debug(`Callback: ${ctx.callbackQuery.data}`);
    }
    
    // Process update
    await next();
    
    // Log processing time
    const duration = Date.now() - start;
    logger.debug(`Processed in ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Error after ${duration}ms:`, error);
    throw error;
  }
}

