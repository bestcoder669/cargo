// apps/api/src/modules/admin/index.ts
import { FastifyPluginAsync } from 'fastify';
import { adminController } from './admin.controller';

export const adminModule: FastifyPluginAsync = async (fastify) => {
  // All routes require admin
  fastify.addHook('onRequest', fastify.requireAdmin);
  
  // Dashboard
  fastify.get('/dashboard', adminController.getDashboard);
  
  // Users management
  fastify.get('/users', adminController.getUsers);
  fastify.get('/users/search', adminController.searchUsers);
  fastify.post('/users/balance', adminController.updateUserBalance);
  
  // Broadcast
  fastify.get('/broadcast/count', adminController.getUsersCount);
  fastify.post('/broadcast/send', adminController.sendBroadcast);
  
  // Support overview
  fastify.get('/support/chats', adminController.getSupportChats);
  
  // Finance
  fastify.get('/finance/stats', adminController.getFinanceStats);
};