// apps/api/src/modules/payments/providers/stripe.provider.ts
import Stripe from 'stripe';
import { config } from '../../../core/config';
import { paymentsService } from '../payments.service';
import { PaymentStatus } from '@cargoexpress/shared';

class StripeProvider {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }
  
  async createPayment(data: {
    transactionId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: data.currency.toLowerCase(),
          product_data: {
            name: data.description
          },
          unit_amount: Math.round(data.amount * 100) // in cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${config.FRONTEND_URL}/payment/success?transaction_id=${data.transactionId}`,
      cancel_url: `${config.FRONTEND_URL}/payment/cancel?transaction_id=${data.transactionId}`,
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
  }
  
  async refundPayment(paymentIntentId: string, amount: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100)
    });
    
    return {
      success: refund.status === 'succeeded',
      externalId: refund.id
    };
  }
  
  async handleWebhook(event: any) {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await paymentsService.processPayment({
          transactionId: session.metadata.transactionId,
          externalId: session.payment_intent,
          status: PaymentStatus.SUCCESS,
          processedAt: new Date(),
          metadata: {
            stripeSessionId: session.id,
            paymentIntentId: session.payment_intent
          }
        });
        break;
        
      case 'payment_intent.payment_failed':
        const intent = event.data.object;
        if (intent.metadata?.transactionId) {
          await paymentsService.processPayment({
            transactionId: intent.metadata.transactionId,
            externalId: intent.id,
            status: PaymentStatus.FAILED,
            processedAt: new Date(),
            metadata: {
              error: intent.last_payment_error?.message
            }
          });
        }
        break;
    }
    
    return { received: true };
  }
}

export const stripeProvider = new StripeProvider();