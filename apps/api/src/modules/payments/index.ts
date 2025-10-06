// apps/api/src/modules/payments/index.ts
import { FastifyPluginAsync } from 'fastify';
import { paymentsController } from './payments.controller';
import { webhooksController } from './webhooks/webhooks.controller';

export const paymentsModule: FastifyPluginAsync = async (fastify) => {
  // Payment methods
  fastify.get('/methods', {
    preHandler: [fastify.authenticate]
  }, paymentsController.getPaymentMethods);
  
  // Create payment
  fastify.post('/create', {
    preHandler: [fastify.authenticate]
  }, paymentsController.createPayment);
  
  // Get transactions
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate]
  }, paymentsController.getTransactions);
  
  // Get transaction
  fastify.get('/transaction/:id', {
    preHandler: [fastify.authenticate]
  }, paymentsController.getTransaction);
  
  // Admin routes
  fastify.post('/refund', {
    preHandler: [fastify.requireAdmin]
  }, paymentsController.refundPayment);
  
  // Webhooks (no auth)
  fastify.post('/webhook/stripe', webhooksController.handleStripe);
  fastify.post('/webhook/crypto', webhooksController.handleCrypto);
  fastify.post('/webhook/sbp', webhooksController.handleSbp);
};