// ==================== apps/api/src/modules/bot/bot.controller.ts ====================

import { FastifyRequest, FastifyReply } from 'fastify';
import { botService } from './bot.service';
import { logger } from '../../core/logger';

class BotController {
  async getCountries(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const countries = await botService.getActiveCountries();
      
      reply.send({
        success: true,
        data: countries
      });
    } catch (error) {
      logger.error('Get countries error:', error);
      throw error;
    }
  }
  
  async getCities(
    request: FastifyRequest<{
      Querystring: { countryCode?: string; popular?: boolean }
    }>,
    reply: FastifyReply
  ) {
    try {
      const cities = await botService.getCities(
        request.query.countryCode,
        request.query.popular
      );
      
      reply.send({
        success: true,
        data: cities
      });
    } catch (error) {
      logger.error('Get cities error:', error);
      throw error;
    }
  }
  
  async getWarehouses(
    request: FastifyRequest<{ Params: { countryId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const warehouses = await botService.getWarehousesByCountry(
        parseInt(request.params.countryId)
      );
      
      reply.send({
        success: true,
        data: warehouses
      });
    } catch (error) {
      logger.error('Get warehouses error:', error);
      throw error;
    }
  }
  
  async getProductCategories(
    request: FastifyRequest<{
      Querystring: { countryId?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const categories = await botService.getProductCategories(
        request.query.countryId ? parseInt(request.query.countryId) : undefined
      );
      
      reply.send({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Get product categories error:', error);
      throw error;
    }
  }
  
  async getProducts(
    request: FastifyRequest<{
      Querystring: {
        categoryId?: string;
        countryId?: string;
        storeId?: string;
        search?: string;
        page?: string;
        limit?: string;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const products = await botService.getProducts({
        categoryId: request.query.categoryId ? parseInt(request.query.categoryId) : undefined,
        countryId: request.query.countryId ? parseInt(request.query.countryId) : undefined,
        storeId: request.query.storeId ? parseInt(request.query.storeId) : undefined,
        search: request.query.search,
        page: request.query.page ? parseInt(request.query.page) : 1,
        limit: request.query.limit ? parseInt(request.query.limit) : 10
      });
      
      reply.send({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Get products error:', error);
      throw error;
    }
  }
  
  async getTariffs(
    request: FastifyRequest<{ Params: { warehouseId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const tariffs = await botService.getTariffsByWarehouse(
        parseInt(request.params.warehouseId)
      );
      
      reply.send({
        success: true,
        data: tariffs
      });
    } catch (error) {
      logger.error('Get tariffs error:', error);
      throw error;
    }
  }
  
  async getKeyboardData(
    request: FastifyRequest<{
      Params: { type: string };
      Querystring: Record<string, string>;
    }>,
    reply: FastifyReply
  ) {
    try {
      const keyboardData = await botService.getKeyboardData(
        request.params.type,
        request.query
      );
      
      reply.send({
        success: true,
        data: keyboardData
      });
    } catch (error) {
      logger.error('Get keyboard data error:', error);
      throw error;
    }
  }
  
  async getUserByTelegramId(
    request: FastifyRequest<{ Params: { telegramId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = await botService.getUserByTelegramId(
        parseInt(request.params.telegramId)
      );
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      }
      
      reply.send({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get user by telegram ID error:', error);
      throw error;
    }
  }
  
  async reportError(
    request: FastifyRequest<{
      Body: {
        error: string;
        stack?: string;
        context?: any;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      logger.error('Bot error report:', request.body);
      
      // Log error for analysis
      // TODO: Create BotError table in Prisma schema if needed
      // await prisma.botError.create({
      //   data: {
      //     message: request.body.error,
      //     stack: request.body.stack,
      //     context: request.body.context,
      //     createdAt: new Date()
      //   }
      // });
      
      reply.send({
        success: true,
        message: 'Error reported'
      });
    } catch (error) {
      logger.error('Error reporting failed:', error);
      throw error;
    }
  }
}

export const botController = new BotController();