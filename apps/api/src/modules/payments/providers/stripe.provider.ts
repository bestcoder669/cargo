// apps/api/src/modules/payments/providers/stripe.provider.ts
import Stripe from 'stripe';
import { config } from '../../../core/config';
import { PaymentStatus } from '@cargoexpress/shared';
import { logger } from '../../../core/logger';

class StripeProvider {
  private stripe: Stripe | null = null;
  
  constructor() {
    if (config.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16'
      });
    }
  }
  
  async createPayment(data: {
    transactionId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: data.currency.toLowerCase(),
            product_data: {
              name: data.description
            },
            unit_amount: Math.round(data.amount * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${config.FRONTEND_URL || 'http://localhost:5173'}/payment/success?transaction_id=${data.transactionId}`,
        cancel_url: `${config.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?transaction_id=${data.transactionId}`,
        metadata: {
          transactionId: data.transactionId,
          ...data.metadata
        }
      });
      
      return {
        success: true,
        externalId: session.id,
        redirectUrl: session.url,
        status: PaymentStatus.PENDING
      };
    } catch (error) {
      logger.error('Stripe payment error:', error);
      throw error;
    }
  }
  
  async refundPayment(paymentIntentId: string, amount: number) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100)
    });
    
    return {
      success: refund.status === 'succeeded',
      externalId: refund.id
    };
  }
  
  async handleWebhook(data: any) {
    logger.info('Stripe webhook received:', data.type);
    return { received: true };
  }
}

export const stripeProvider = new StripeProvider();