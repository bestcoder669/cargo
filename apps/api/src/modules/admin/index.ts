// apps/api/src/modules/admin/index.ts
import { FastifyPluginAsync } from 'fastify';
import { adminController } from './admin.controller';
import { scannerController } from '../scanner/scanner.controller';

export const adminModule: FastifyPluginAsync = async (fastify) => {
  // Dashboard & Stats
  fastify.get('/dashboard', adminController.getDashboard);
  fastify.get('/stats', adminController.getDashboard); // Alias for dashboard

  // Users management
  fastify.get('/users', adminController.getUsers);
  fastify.get('/users/search', adminController.searchUsers);
  fastify.get('/users/top', adminController.getTopUsers);
  fastify.get('/users/stats', adminController.getUsersStats);
  fastify.post('/users/balance', adminController.updateUserBalance);

  // Broadcast
  fastify.get('/users/count', adminController.getUsersCount);
  fastify.post('/broadcast', adminController.sendBroadcast);
  
  // Support overview
  fastify.get('/support/chats', adminController.getSupportChats);
  
  // Finance
  fastify.get('/finance/stats', adminController.getFinanceStats);

  // Scanner
  fastify.get('/scanner/sessions', scannerController.getSessions);
  fastify.post('/scanner/scan', scannerController.scan);
  fastify.post('/scanner/session/start', scannerController.startSession);
  fastify.post('/scanner/session/:id/end', scannerController.endSession);

  // Admin actions on orders
  fastify.post('/orders/:id/cancel', adminController.cancelOrder);

  // Admin messages to users
  fastify.post('/users/:id/message', adminController.sendMessage);
};