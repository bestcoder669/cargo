// apps/api/src/modules/products/index.ts
import { FastifyPluginAsync } from 'fastify';
import { productsController } from './products.controller';
import { categoriesController } from './categories/categories.controller';

export const productsModule: FastifyPluginAsync = async (fastify) => {
  // Products
  fastify.get('/', productsController.getProducts);
  fastify.get('/:id', productsController.getProductById);
  fastify.post('/parse-url', productsController.parseProductUrl);
  
  // Admin routes
  fastify.post('/', {
    preHandler: [fastify.requireAdmin]
  }, productsController.createProduct);
  
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin]
  }, productsController.updateProduct);
  
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin]
  }, productsController.deleteProduct);
  
  // Categories
  fastify.register(async (fastify) => {
    fastify.get('/', categoriesController.getCategories);
    fastify.get('/:id', categoriesController.getCategoryById);
    
    // Admin routes
    fastify.post('/', {
      preHandler: [fastify.requireAdmin]
    }, categoriesController.createCategory);
    
    fastify.patch('/:id', {
      preHandler: [fastify.requireAdmin]
    }, categoriesController.updateCategory);
    
    fastify.delete('/:id', {
      preHandler: [fastify.requireAdmin]
    }, categoriesController.deleteCategory);
  }, { prefix: '/categories' });
};