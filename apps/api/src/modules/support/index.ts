// apps/api/src/modules/support/index.ts
import { FastifyPluginAsync } from 'fastify';
import { supportController } from './support.controller';

export const supportModule: FastifyPluginAsync = async (fastify) => {
  // User routes
  fastify.post('/chat', {
    preHandler: [fastify.authenticate]
  }, supportController.createChat);
  
  fastify.get('/chat/:id', {
    preHandler: [fastify.authenticate]
  }, supportController.getChat);
  
  fastify.post('/chat/:id/message', {
    preHandler: [fastify.authenticate]
  }, supportController.sendMessage);
  
  // Admin routes
  fastify.get('/chats', {
    preHandler: [fastify.requireAdmin]
  }, supportController.getChats);
  
  fastify.get('/chats/search', {
    preHandler: [fastify.requireAdmin]
  }, supportController.searchChats);
  
  fastify.post('/chat/:id/assign', {
    preHandler: [fastify.requireAdmin]
  }, supportController.assignChat);
  
  fastify.post('/chat/:id/close', {
    preHandler: [fastify.requireAdmin]
  }, supportController.closeChat);
  
  fastify.patch('/chat/:id/priority', {
    preHandler: [fastify.requireAdmin]
  }, supportController.changePriority);
  
  fastify.get('/stats', {
    preHandler: [fastify.requireAdmin]
  }, supportController.getStats);
  
  // User history
  fastify.get('/user/:userId/history', {
    preHandler: [fastify.authenticate]
  }, supportController.getUserHistory);
};