// apps/api/src/modules/payments/index.ts
import { FastifyPluginAsync } from 'fastify';
import { paymentsController } from './payments.controller';
import { webhooksController } from './webhooks/webhooks.controller';

export const paymentsModule: FastifyPluginAsync = async (fastify) => {
  // Payment methods
  fastify.get('/methods', paymentsController.getPaymentMethods);

  // Create payment
  fastify.post('/create', paymentsController.createPayment);

  // Get transactions
  fastify.get('/transactions', paymentsController.getTransactions);

  // Get transaction
  fastify.get('/transaction/:id', paymentsController.getTransaction);

  // Admin routes
  fastify.post('/refund', paymentsController.refundPayment);
  
  // Webhooks (no auth)
  fastify.post('/webhook/stripe', webhooksController.handleStripe);
  fastify.post('/webhook/crypto', webhooksController.handleCrypto);
  fastify.post('/webhook/sbp', webhooksController.handleSbp);
};