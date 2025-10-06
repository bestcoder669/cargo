// apps/api/src/modules/products/categories/categories.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { categoriesService } from './categories.service';
import { logger } from '../../../core/logger';

class CategoriesController {
  async getCategories(request: FastifyRequest<{
    Querystring: { parentId?: string; isActive?: string }
  }>, reply: FastifyReply) {
    try {
      const filters: any = {};
      
      if (request.query.parentId !== undefined) {
        filters.parentId = request.query.parentId === 'null' 
          ? null 
          : parseInt(request.query.parentId);
      }
      if (request.query.isActive !== undefined) {
        filters.isActive = request.query.isActive === 'true';
      }
      
      const categories = await categoriesService.getCategories(filters);
      
      reply.send({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      throw error;
    }
  }
  
  async getCategoryById(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const category = await categoriesService.getCategoryById(
        parseInt(request.params.id)
      );
      
      if (!category) {
        return reply.code(404).send({
          success: false,
          error: 'CATEGORY_NOT_FOUND'
        });
      }
      
      reply.send({
        success: true,
        data: category
      });
    } catch (error) {
      logger.error('Get category error:', error);
      throw error;
    }
  }
  
  async createCategory(request: FastifyRequest<{
    Body: any
  }>, reply: FastifyReply) {
    try {
      const category = await categoriesService.createCategory(request.body);
      
      reply.code(201).send({
        success: true,
        data: category
      });
    } catch (error) {
      logger.error('Create category error:', error);
      throw error;
    }
  }
  
  async updateCategory(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const category = await categoriesService.updateCategory(
        parseInt(request.params.id),
        request.body
      );
      
      reply.send({
        success: true,
        data: category
      });
    } catch (error) {
      logger.error('Update category error:', error);
      throw error;
    }
  }
  
  async deleteCategory(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      await categoriesService.deleteCategory(parseInt(request.params.id));
      
      reply.send({
        success: true,
        message: 'Category deleted'
      });
    } catch (error) {
      logger.error('Delete category error:', error);
      
      if (error.message === 'Category has products, cannot delete') {
        return reply.code(409).send({
          success: false,
          error: 'CATEGORY_HAS_PRODUCTS',
          message: error.message
        });
      }
      
      throw error;
    }
  }
}

export const categoriesController = new CategoriesController();