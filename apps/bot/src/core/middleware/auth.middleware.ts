// ==================== apps/bot/src/core/middleware/auth.middleware.ts ====================

import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { apiClient } from '../api/client';
import { logger } from '../logger';

export async function authMiddleware(ctx: MyContext, next: NextFunction) {
  try {
    // Skip for non-message updates
    if (!ctx.from) {
      return next();
    }
    
    // Check session
    if (!ctx.session.userId && ctx.from.id) {
      // Try to load user from database
      try {
        const user = await apiClient.getUserByTelegramId(ctx.from.id);
        
        if (user) {
          ctx.session.userId = user.id;
          ctx.session.isRegistered = true;
          ctx.user = user;
          
          logger.debug(`User ${user.id} loaded from database`);
        }
      } catch (error) {
        logger.error('Failed to load user:', error);
      }
    }
    
    // Set user context
    if (ctx.session.userId) {
      ctx.user = ctx.user || { id: ctx.session.userId };
    }
    
    // Check admin status
    if (ctx.from.id && config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.isAdmin = true;
      
      if (config.SUPER_ADMIN_IDS.includes(ctx.from.id)) {
        ctx.adminRole = 'SUPER_ADMIN';
      } else {
        ctx.adminRole = 'ORDER_MANAGER';
      }
    }
    
    return next();
    
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next();
  }
}

