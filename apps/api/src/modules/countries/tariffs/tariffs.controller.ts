import { FastifyRequest, FastifyReply } from 'fastify';
import { tariffsService } from './tariffs.service';
import { logger } from '../../../core/logger';

class TariffsController {
  async getTariffs(request: FastifyRequest<{
    Querystring: {
      countryId?: string;
      warehouseId?: string;
      weight?: string;
    }
  }>, reply: FastifyReply) {
    try {
      const tariffs = await tariffsService.getTariffs(request.query);
      
      reply.send({
        success: true,
        data: tariffs
      });
    } catch (error) {
      logger.error('Get tariffs error:', error);
      throw error;
    }
  }
  
  async calculateShipping(request: FastifyRequest<{
    Body: {
      fromCountryId: number;
      toCountryId?: number;
      weight: number;
      length?: number;
      width?: number;
      height?: number;
      declaredValue?: number;
    }
  }>, reply: FastifyReply) {
    try {
      const calculation = await tariffsService.calculateShipping(request.body);
      
      reply.send({
        success: true,
        data: calculation
      });
    } catch (error) {
      logger.error('Calculate shipping error:', error);
      throw error;
    }
  }
  
  async createTariff(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const tariff = await tariffsService.createTariff(request.body);
      
      reply.code(201).send({
        success: true,
        data: tariff
      });
    } catch (error) {
      logger.error('Create tariff error:', error);
      throw error;
    }
  }
  
  async updateTariff(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const tariff = await tariffsService.updateTariff(
        parseInt(request.params.id),
        request.body
      );
      
      reply.send({
        success: true,
        data: tariff
      });
    } catch (error) {
      logger.error('Update tariff error:', error);
      throw error;
    }
  }
  
  async deleteTariff(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      await tariffsService.deleteTariff(parseInt(request.params.id));
      
      reply.send({
        success: true,
        message: 'Tariff deleted'
      });
    } catch (error) {
      logger.error('Delete tariff error:', error);
      throw error;
    }
  }
}

export const tariffsController = new TariffsController();