// ==================== apps/bot/src/core/middleware/metrics.middleware.ts ====================

import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { wsClient } from '../websocket/client';

export async function metricsMiddleware(ctx: MyContext, next: NextFunction) {
  const start = Date.now();
  
  try {
    await next();
    
    const duration = Date.now() - start;
    
    // Send metrics via WebSocket
    wsClient.emit('bot:metrics', {
      type: 'update_processed',
      userId: ctx.from?.id,
      updateType: ctx.update.update_id.toString(),
      duration,
      success: true
    });
    
  } catch (error) {
    const duration = Date.now() - start;
    
    wsClient.emit('bot:metrics', {
      type: 'update_failed',
      userId: ctx.from?.id,
      updateType: ctx.update.update_id.toString(),
      duration,
      success: false,
      error: (error as Error).message
    });

    throw error;
  }
}

