import { FastifyRequest, FastifyReply } from 'fastify';
import { calculatorService } from './calculator.service';
import { logger } from '../../core/logger';

class CalculatorController {
  async calculateShipping(
    request: FastifyRequest<{
      Body: {
        fromCountryId: number;
        weight: number;
        length?: number;
        width?: number;
        height?: number;
        declaredValue?: number;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await calculatorService.calculateShipping(request.body);

      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Calculate shipping error:', error);
      throw error;
    }
  }

  async calculatePurchase(
    request: FastifyRequest<{
      Body: {
        countryId: number;
        productCost: number;
        weight?: number;
        quantity?: number;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await calculatorService.calculatePurchase(request.body);

      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Calculate purchase error:', error);
      throw error;
    }
  }
}

export const calculatorController = new CalculatorController();
