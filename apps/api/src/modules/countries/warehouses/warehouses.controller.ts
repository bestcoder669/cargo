import { FastifyRequest, FastifyReply } from 'fastify';
import { warehousesService } from './warehouses.service';
import { logger } from '../../../core/logger';

class WarehousesController {
  async getWarehouses(request: FastifyRequest<{
    Querystring: { countryId?: string; active?: boolean }
  }>, reply: FastifyReply) {
    try {
      const warehouses = await warehousesService.getWarehouses(request.query);
      
      reply.send({
        success: true,
        data: warehouses
      });
    } catch (error) {
      logger.error('Get warehouses error:', error);
      throw error;
    }
  }
  
  async getWarehouseById(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const warehouse = await warehousesService.getWarehouseById(
        parseInt(request.params.id)
      );
      
      if (!warehouse) {
        return reply.code(404).send({
          success: false,
          error: 'NOT_FOUND',
          message: 'Warehouse not found'
        });
      }
      
      reply.send({
        success: true,
        data: warehouse
      });
    } catch (error) {
      logger.error('Get warehouse error:', error);
      throw error;
    }
  }
  
  async createWarehouse(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const warehouse = await warehousesService.createWarehouse(request.body);
      
      reply.code(201).send({
        success: true,
        data: warehouse
      });
    } catch (error) {
      logger.error('Create warehouse error:', error);
      throw error;
    }
  }
  
  async updateWarehouse(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const warehouse = await warehousesService.updateWarehouse(
        parseInt(request.params.id),
        request.body
      );
      
      reply.send({
        success: true,
        data: warehouse
      });
    } catch (error) {
      logger.error('Update warehouse error:', error);
      throw error;
    }
  }
  
  async deleteWarehouse(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      await warehousesService.deleteWarehouse(parseInt(request.params.id));
      
      reply.send({
        success: true,
        message: 'Warehouse deleted'
      });
    } catch (error) {
      logger.error('Delete warehouse error:', error);
      throw error;
    }
  }
}

export const warehousesController = new WarehousesController();