// apps/api/src/modules/support/index.ts
import { FastifyPluginAsync } from 'fastify';
import { supportController } from './support.controller';

export const supportModule: FastifyPluginAsync = async (fastify) => {
  // User routes
  fastify.post('/chat', supportController.createChat);
  fastify.post('/chats', supportController.createChat);

  fastify.get('/chat/:id', supportController.getChat);
  fastify.get('/chats/:id', supportController.getChat);

  fastify.post('/chat/:id/message', supportController.sendMessage);
  fastify.post('/chats/:id/messages', supportController.sendMessage);

  fastify.post('/chats/:id/rate', supportController.rateChat);
  fastify.post('/chats/:id/close', supportController.closeChat);

  // Admin routes
  fastify.get('/chats', supportController.getChats);

  fastify.get('/chats/search', supportController.searchChats);

  fastify.post('/chat/:id/assign', supportController.assignChat);

  fastify.patch('/chat/:id/priority', supportController.changePriority);
  fastify.patch('/chats/:id', supportController.updateChat);

  fastify.get('/stats', supportController.getStats);

  // User history
  fastify.get('/user/:userId/history', supportController.getUserHistory);
  fastify.get('/user/:userId/chats', supportController.getUserHistory);
};