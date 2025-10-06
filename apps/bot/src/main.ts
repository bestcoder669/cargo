// ==================== apps/bot/src/main.ts ====================

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
import { registerCommands } from './commands';
import { registerHandlers } from './handlers';
import { registerConversations } from './conversations';
import { logger } from './core/logger';
import { prisma } from '@cargoexpress/prisma';

// Initialize Redis
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD
});

// Create bot instance
const bot = new Bot<MyContext>(config.BOT_TOKEN);

// Initialize session storage
const storage = new RedisAdapter({ instance: redis });

// Apply middlewares
bot.use(sequentialize((ctx) => ctx.from?.id.toString()));
bot.use(session({
  storage,
  getSessionKey: (ctx) => `session:${ctx.from?.id}`,
  initial: () => ({})
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
    logger.info('Starting CargoExpress Bot...');
    
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');
    
    // Connect to WebSocket server
    await wsClient.connect();
    logger.info('WebSocket connected');
    
    // Register conversations
    registerConversations(bot);
    
    // Register commands
    registerCommands(bot);
    
    // Register handlers
    registerHandlers(bot);
    
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
    
    // Start bot
    run(bot, {
      runner: {
        fetch: {
          allowed_updates: ['message', 'callback_query', 'inline_query']
        }
      }
    });
    
    // Update bot status
    await redis.set('bot:status', 'online');
    wsClient.emit('bot:status_update', { status: 'online' });
    
    logger.info('Bot started successfully!');
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', async () => {
  logger.info('Shutting down bot...');
  await redis.set('bot:status', 'offline');
  wsClient.emit('bot:status_update', { status: 'offline' });
  await bot.stop();
  await prisma.$disconnect();
  wsClient.disconnect();
  redis.disconnect();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Shutting down bot...');
  await redis.set('bot:status', 'offline');
  wsClient.emit('bot:status_update', { status: 'offline' });
  await bot.stop();
  await prisma.$disconnect();
  wsClient.disconnect();
  redis.disconnect();
  process.exit(0);
});

// Start the bot
bootstrap();

