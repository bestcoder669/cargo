// apps/api/src/modules/payments/webhooks/webhooks.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentsService } from '../payments.service';
import { logger } from '../../../core/logger';
import { config } from '../../../core/config';
import crypto from 'crypto';

class WebhooksController {
  async handleStripe(request: FastifyRequest<{
    Body: any;
    Headers: {
      'stripe-signature': string;
    }
  }>, reply: FastifyReply) {
    try {
      // Verify webhook signature
      const signature = request.headers['stripe-signature'];
      
      // Stripe signature verification
      const stripe = require('stripe')(config.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        config.STRIPE_WEBHOOK_SECRET
      );
      
      const result = await paymentsService.handleWebhook('stripe', event);
      
      reply.send(result);
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      reply.code(400).send({ error: error.message });
    }
  }
  
  async handleCrypto(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      // Verify signature if needed
      const result = await paymentsService.handleWebhook('crypto', request.body);
      
      reply.send(result);
    } catch (error) {
      logger.error('Crypto webhook error:', error);
      reply.code(400).send({ error: error.message });
    }
  }
  
  async handleSbp(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const result = await paymentsService.handleWebhook('sbp', request.body);
      
      reply.send(result);
    } catch (error) {
      logger.error('SBP webhook error:', error);
      reply.code(400).send({ error: error.message });
    }
  }
}

export const webhooksController = new WebhooksController();