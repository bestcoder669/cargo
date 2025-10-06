// apps/api/src/modules/orders/index.ts
import { FastifyPluginAsync } from 'fastify';
import { ordersController } from './orders.controller';

export const ordersModule: FastifyPluginAsync = async (fastify) => {
  // Create order (authenticated)
  fastify.post('/', ordersController.createOrder);

  // Get orders (authenticated)
  fastify.get('/', ordersController.getOrders);

  // Search orders
  fastify.get('/search', ordersController.searchOrders);

  // Statistics (admin only)
  fastify.get('/statistics', ordersController.getStatistics);

  // Track by number (public)
  fastify.get('/track/:trackNumber', ordersController.getOrderByTrackNumber);

  // Get orders by user ID
  fastify.get('/user/:userId', ordersController.getUserOrders);

  // Single order operations
  fastify.get('/:id', ordersController.getOrder);

  fastify.patch('/:id', ordersController.updateOrder);

  fastify.post('/:id/cancel', ordersController.cancelOrder);

  // Photos (admin)
  fastify.post('/:id/photos', ordersController.uploadPhoto);

  // Bulk operations (admin)
  fastify.post('/bulk/status', ordersController.bulkUpdateStatus);
};