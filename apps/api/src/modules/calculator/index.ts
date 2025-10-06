import { FastifyPluginAsync } from 'fastify';
import { calculatorController } from './calculator.controller';

export const calculatorModule: FastifyPluginAsync = async (fastify) => {
  // Public calculator endpoints
  fastify.post('/shipping', calculatorController.calculateShipping);
  fastify.post('/purchase', calculatorController.calculatePurchase);
};
