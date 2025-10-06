// ==================== apps/bot/src/main.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ) ====================

import { Bot } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { run, sequentialize } from '@grammyjs/runner';
import { hydrateReply, parseMode } from '@grammyjs/parse-mode';
import { limit } from '@grammyjs/ratelimiter';
import Redis from 'ioredis';
import { config } from './core/config';
import { MyContext } from './core/types';
import { errorHandler } from './core/middleware/error.middleware';
import { authMiddleware } from './core/middleware/auth.middleware';
import { loggerMiddleware } from './core/middleware/logger.middleware';
import { metricsMiddleware } from './core/middleware/metrics.middleware';
import { i18nMiddleware } from './core/middleware/i18n.middleware';
import { wsClient } from './core/websocket/client';
import { initializeWebSocketHandlers } from './core/websocket/event-handlers';
import { registerCommands } from './commands';
import { registerHandlers } from './handlers';
import { registerConversations } from './conversations';
import { registerAdminModule } from './modules/admin/admin.module';
import { handlePreCheckout } from './handlers/payment.handler';
import { logger } from './core/logger';
import { prisma } from '@cargoexpress/prisma';

// Initialize Redis
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Create bot instance - EXPORT для использования в других модулях
export const bot = new Bot<MyContext>(config.BOT_TOKEN);

// Initialize session storage
const storage = new RedisAdapter({ instance: redis });

// Apply middlewares
bot.use(sequentialize((ctx) => ctx.from?.id.toString()));
bot.use(session({
  storage,
  getSessionKey: (ctx) => ctx.from?.id ? `session:${ctx.from.id}` : undefined,
  initial: () => ({
    messageIds: []
  })
}));

// Rate limiting
bot.use(limit({
  timeFrame: 60 * 1000, // 1 minute
  limit: 30,
  onLimitExceeded: async (ctx) => {
    await ctx.reply('⚠️ Слишком много запросов. Пожалуйста, подождите минуту.');
  }
}));

// Parse mode
bot.use(hydrateReply);
bot.api.config.use(parseMode('HTML'));

// Custom middlewares
bot.use(loggerMiddleware);
bot.use(metricsMiddleware);
bot.use(authMiddleware);
bot.use(i18nMiddleware);

// Conversations
bot.use(conversations());

// Error handling
bot.catch(errorHandler);

// Initialize modules
async function bootstrap() {
  try {
    logger.info('🚀 Starting CargoExpress Bot...');
    
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');
    
    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');
    
    // Connect to WebSocket server
    try {
      await wsClient.connect();
      initializeWebSocketHandlers();
      logger.info('✅ WebSocket connected');
    } catch (wsError) {
      logger.warn('⚠️ WebSocket connection failed, running without real-time features');
    }
    
    // Register conversations
    registerConversations(bot);
    
    // Register admin module
    registerAdminModule(bot);
    
    // Register commands
    registerCommands(bot);
    
    // Register handlers
    registerHandlers(bot);
    
    // Register payment handlers
    handlePreCheckout(bot);
    
    // Set bot commands menu
    await bot.api.setMyCommands([
      { command: 'start', description: '🚀 Начать работу' },
      { command: 'profile', description: '👤 Мой профиль' },
      { command: 'orders', description: '📦 Мои заказы' },
      { command: 'shipping', description: '✈️ Отправить посылку' },
      { command: 'purchase', description: '🛍 Заказать товар' },
      { command: 'calculator', description: '📊 Калькулятор доставки' },
      { command: 'support', description: '💬 Поддержка' },
      { command: 'help', description: '❓ Помощь' },
      { command: 'settings', description: '⚙️ Настройки' }
    ]);
    
    // Admin commands for admin users
    await bot.api.setMyCommands([
      { command: 'start', description: '🚀 Начать работу' },
      { command: 'admin', description: '🔧 Админ-панель' },
      { command: 'profile', description: '👤 Мой профиль' },
      { command: 'orders', description: '📦 Мои заказы' },
      { command: 'shipping', description: '✈️ Отправить посылку' },
      { command: 'purchase', description: '🛍 Заказать товар' },
      { command: 'calculator', description: '📊 Калькулятор доставки' },
      { command: 'support', description: '💬 Поддержка' },
      { command: 'help', description: '❓ Помощь' },
      { command: 'settings', description: '⚙️ Настройки' }
    ], {
      scope: { type: 'all_chat_administrators' }
    });
    
    // Start bot
    run(bot, {
      runner: {
        fetch: {
          allowed_updates: [
            'message',
            'callback_query',
            'inline_query',
            'chosen_inline_result',
            'pre_checkout_query',
            'successful_payment'
          ]
        }
      }
    });
    
    // Update bot status
    await redis.set('bot:status', 'online');
    if (wsClient.isConnected()) {
      wsClient.emit('bot:status_update', { status: 'online' });
    }
    
    logger.info('✅ Bot started successfully!');
    logger.info(`🤖 Bot username: @${(await bot.api.getMe()).username}`);
    
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Health check endpoint (optional)
if (config.NODE_ENV === 'production') {
  const http = require('http');
  const healthServer = http.createServer((req: any, res: any) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  healthServer.listen(3001, () => {
    logger.info('Health check server running on port 3001');
  });
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`⚠️ ${signal} received, shutting down gracefully...`);
  
  try {
    // Update bot status
    await redis.set('bot:status', 'offline');
    if (wsClient.isConnected()) {
      wsClient.emit('bot:status_update', { status: 'offline' });
    }
    
    // Stop bot
    await bot.stop();
    logger.info('✅ Bot stopped');
    
    // Close database
    await prisma.$disconnect();
    logger.info('✅ Database disconnected');
    
    // Close WebSocket
    wsClient.disconnect();
    logger.info('✅ WebSocket disconnected');
    
    // Close Redis
    redis.disconnect();
    logger.info('✅ Redis disconnected');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
bootstrap();