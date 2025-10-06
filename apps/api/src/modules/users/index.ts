// apps/api/src/modules/users/index.ts
import { FastifyPluginAsync } from 'fastify';
import { usersController } from './users.controller';

export const usersModule: FastifyPluginAsync = async (fastify) => {
  // Public routes
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, usersController.getUsers);
  
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, usersController.getUserById);
  
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate]
  }, usersController.updateUser);
  
  // Addresses
  fastify.get('/:id/addresses', {
    preHandler: [fastify.authenticate]
  }, usersController.getUserAddresses);
  
  fastify.post('/:id/addresses', {
    preHandler: [fastify.authenticate]
  }, usersController.createAddress);
  
  fastify.patch('/:id/addresses/:addressId', {
    preHandler: [fastify.authenticate]
  }, usersController.updateAddress);
  
  fastify.delete('/:id/addresses/:addressId', {
    preHandler: [fastify.authenticate]
  }, usersController.deleteAddress);
  
  // Orders & Transactions
  fastify.get('/:id/orders', {
    preHandler: [fastify.authenticate]
  }, usersController.getUserOrders);
  
  fastify.get('/:id/transactions', {
    preHandler: [fastify.authenticate]
  }, usersController.getUserTransactions);
  
  // Admin only
  fastify.post('/:id/ban', {
    preHandler: [fastify.requireAdmin]
  }, usersController.banUser);
  
  fastify.post('/:id/unban', {
    preHandler: [fastify.requireAdmin]
  }, usersController.unbanUser);
};