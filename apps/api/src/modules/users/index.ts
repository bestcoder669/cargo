// apps/api/src/modules/users/index.ts
import { FastifyPluginAsync } from 'fastify';
import { usersController } from './users.controller';

export const usersModule: FastifyPluginAsync = async (fastify) => {
  // Public routes
  fastify.get('/', usersController.getUsers);
  fastify.get('/telegram/:telegramId', usersController.getUserByTelegramId);
  fastify.get('/:id/profile', usersController.getUserProfile);
  fastify.get('/:id/balance', usersController.getUserBalance);
  fastify.post('/:id/deposit', usersController.depositBalance);
  fastify.get('/:id', usersController.getUserById);
  fastify.patch('/:id', usersController.updateUser);

  // Addresses
  fastify.get('/:id/addresses', usersController.getUserAddresses);
  fastify.post('/:id/addresses', usersController.createAddress);
  fastify.patch('/:id/addresses/:addressId', usersController.updateAddress);
  fastify.delete('/:id/addresses/:addressId', usersController.deleteAddress);

  // Orders & Transactions
  fastify.get('/:id/orders', usersController.getUserOrders);
  fastify.get('/:id/transactions', usersController.getUserTransactions);

  // Admin only
  fastify.post('/:id/ban', usersController.banUser);
  fastify.post('/:id/unban', usersController.unbanUser);
};
