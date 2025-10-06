// ==================== apps/api/src/modules/bot/index.ts ====================

import { FastifyPluginAsync } from 'fastify';
import { botController } from './bot.controller';

export const botModule: FastifyPluginAsync = async (fastify) => {
  // Bot authentication middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const botToken = request.headers['x-bot-token'];
    
    if (botToken !== config.BOT_TOKEN) {
      reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid bot token'
      });
    }
  });
  
  // Dynamic data endpoints
  fastify.get('/countries', botController.getCountries);
  fastify.get('/cities', botController.getCities);
  fastify.get('/warehouses/:countryId', botController.getWarehouses);
  fastify.get('/products/categories', botController.getProductCategories);
  fastify.get('/products', botController.getProducts);
  fastify.get('/tariffs/:warehouseId', botController.getTariffs);
  
  // Keyboard data
  fastify.get('/keyboards/:type', botController.getKeyboardData);
  
  // User lookup
  fastify.get('/users/telegram/:telegramId', botController.getUserByTelegramId);
  
  // Error reporting
  fastify.post('/errors', botController.reportError);
};

