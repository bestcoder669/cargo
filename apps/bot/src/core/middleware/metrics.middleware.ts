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
      updateType: ctx.updateType,
      duration,
      success: true
    });
    
  } catch (error) {
    const duration = Date.now() - start;
    
    wsClient.emit('bot:metrics', {
      type: 'update_failed',
      userId: ctx.from?.id,
      updateType: ctx.updateType,
      duration,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}

