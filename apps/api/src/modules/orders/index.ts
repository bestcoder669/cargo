// apps/api/src/modules/orders/index.ts
import { FastifyPluginAsync } from 'fastify';
import { ordersController } from './orders.controller';

export const ordersModule: FastifyPluginAsync = async (fastify) => {
  // Create order (authenticated)
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, ordersController.createOrder);
  
  // Get orders (authenticated)
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, ordersController.getOrders);
  
  // Search orders
  fastify.get('/search', {
    preHandler: [fastify.authenticate]
  }, ordersController.searchOrders);
  
  // Statistics (admin only)
  fastify.get('/statistics', {
    preHandler: [fastify.requireAdmin]
  }, ordersController.getStatistics);
  
  // Track by number (public)
  fastify.get('/track/:trackNumber', ordersController.getOrderByTrackNumber);
  
  // Single order operations
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, ordersController.getOrder);
  
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate]
  }, ordersController.updateOrder);
  
  fastify.post('/:id/cancel', {
    preHandler: [fastify.authenticate]
  }, ordersController.cancelOrder);
  
  // Photos (admin)
  fastify.post('/:id/photos', {
    preHandler: [fastify.requireAdmin]
  }, ordersController.uploadPhoto);
  
  // Bulk operations (admin)
  fastify.post('/bulk/status', {
    preHandler: [fastify.requireAdmin]
  }, ordersController.bulkUpdateStatus);
};