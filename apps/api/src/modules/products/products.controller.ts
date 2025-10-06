import { FastifyRequest, FastifyReply } from 'fastify';
import { productsService } from './products.service';
import { logger } from '../../core/logger';

class ProductsController {
  async getProducts(request: FastifyRequest<{
    Querystring: {
      categoryId?: string;
      countryId?: string;
      storeId?: string;
      search?: string;
      page?: string;
      limit?: string;
    }
  }>, reply: FastifyReply) {
    try {
      const products = await productsService.getProducts(request.query);
      
      reply.send({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Get products error:', error);
      throw error;
    }
  }
  
  async getProductById(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const product = await productsService.getProductById(
        parseInt(request.params.id)
      );
      
      if (!product) {
        return reply.code(404).send({
          success: false,
          error: 'NOT_FOUND',
          message: 'Product not found'
        });
      }
      
      reply.send({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Get product error:', error);
      throw error;
    }
  }
  
  async createProduct(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const product = await productsService.createProduct(request.body);
      
      reply.code(201).send({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Create product error:', error);
      throw error;
    }
  }
  
  async updateProduct(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const product = await productsService.updateProduct(
        parseInt(request.params.id),
        request.body
      );
      
      reply.send({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Update product error:', error);
      throw error;
    }
  }
  
  async deleteProduct(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      await productsService.deleteProduct(parseInt(request.params.id));
      
      reply.send({
        success: true,
        message: 'Product deleted'
      });
    } catch (error) {
      logger.error('Delete product error:', error);
      throw error;
    }
  }
  
  async parseProductUrl(request: FastifyRequest<{
    Body: { url: string }
  }>, reply: FastifyReply) {
    try {
      const productInfo = await productsService.parseProductUrl(request.body.url);

      reply.send({
        success: true,
        data: productInfo
      });
    } catch (error) {
      logger.error('Parse product URL error:', error);
      throw error;
    }
  }

  async getCatalogCountries(request: FastifyRequest, reply: FastifyReply) {
    try {
      const countries = await productsService.getCatalogCountries();

      reply.send({
        success: true,
        data: countries
      });
    } catch (error) {
      logger.error('Get catalog countries error:', error);
      throw error;
    }
  }
}

export const productsController = new ProductsController();