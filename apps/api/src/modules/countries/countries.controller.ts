import { FastifyRequest, FastifyReply } from 'fastify';
import { countriesService } from './countries.service';
import { logger } from '../../core/logger';

class CountriesController {
  async getCountries(request: FastifyRequest<{
    Querystring: { active?: boolean; shipping?: boolean; purchase?: boolean }
  }>, reply: FastifyReply) {
    try {
      const countries = await countriesService.getCountries(request.query);
      
      reply.send({
        success: true,
        data: countries
      });
    } catch (error) {
      logger.error('Get countries error:', error);
      throw error;
    }
  }
  
  async getCountry(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const country = await countriesService.getCountryById(parseInt(request.params.id));
      
      if (!country) {
        return reply.code(404).send({
          success: false,
          error: 'NOT_FOUND',
          message: 'Country not found'
        });
      }
      
      reply.send({
        success: true,
        data: country
      });
    } catch (error) {
      logger.error('Get country error:', error);
      throw error;
    }
  }
  
  async createCountry(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const country = await countriesService.createCountry(request.body);
      
      reply.code(201).send({
        success: true,
        data: country
      });
    } catch (error) {
      logger.error('Create country error:', error);
      throw error;
    }
  }
  
  async updateCountry(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const country = await countriesService.updateCountry(
        parseInt(request.params.id),
        request.body
      );
      
      reply.send({
        success: true,
        data: country
      });
    } catch (error) {
      logger.error('Update country error:', error);
      throw error;
    }
  }
  
  async deleteCountry(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      await countriesService.deleteCountry(parseInt(request.params.id));
      
      reply.send({
        success: true,
        message: 'Country deleted'
      });
    } catch (error) {
      logger.error('Delete country error:', error);
      throw error;
    }
  }
}

export const countriesController = new CountriesController();