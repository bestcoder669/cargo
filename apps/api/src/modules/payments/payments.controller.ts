// apps/api/src/modules/payments/payments.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentsService } from './payments.service';
import { CreatePaymentDto } from '@cargoexpress/shared';
import { logger } from '../../core/logger';

class PaymentsController {
  async getPaymentMethods(request: FastifyRequest, reply: FastifyReply) {
    try {
      const methods = await paymentsService.getPaymentMethods(request.user.id);
      
      reply.send({
        success: true,
        data: methods
      });
    } catch (error) {
      logger.error('Get payment methods error:', error);
      throw error;
    }
  }
  
  async createPayment(request: FastifyRequest<{
    Body: CreatePaymentDto
  }>, reply: FastifyReply) {
    try {
      const payment = await paymentsService.createPayment({
        ...request.body,
        userId: request.user.id
      });
      
      reply.send({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Create payment error:', error);
      
      if (error.message === 'Insufficient balance') {
        return reply.code(400).send({
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: error.message
        });
      }
      
      throw error;
    }
  }
  
  async getTransactions(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const filters = { ...request.query };
      
      // If not admin, filter by user
      if (!request.user.adminId) {
        filters.userId = request.user.id;
      }
      
      const transactions = await paymentsService.getTransactions(filters);
      
      reply.send({
        success: true,
        ...transactions
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      throw error;
    }
  }
  
  async getTransaction(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: request.params.id },
        include: {
          user: true,
          order: true
        }
      });
      
      if (!transaction) {
        return reply.code(404).send({
          success: false,
          error: 'TRANSACTION_NOT_FOUND'
        });
      }
      
      // Check ownership
      if (transaction.userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      reply.send({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Get transaction error:', error);
      throw error;
    }
  }
  
  async refundPayment(request: FastifyRequest<{
    Body: {
      transactionId: string;
      amount?: number;
      reason?: string;
    }
  }>, reply: FastifyReply) {
    try {
      const refund = await paymentsService.refundPayment(
        request.body.transactionId,
        request.body.amount,
        request.body.reason
      );
      
      reply.send({
        success: true,
        data: refund
      });
    } catch (error) {
      logger.error('Refund payment error:', error);
      throw error;
    }
  }
}

export const paymentsController = new PaymentsController();