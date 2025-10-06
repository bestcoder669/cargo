// apps/api/src/modules/products/index.ts
import { FastifyPluginAsync } from 'fastify';
import { productsController } from './products.controller';
import { categoriesController } from './categories/categories.controller';

export const productsModule: FastifyPluginAsync = async (fastify) => {
  // Products
  fastify.get('/', productsController.getProducts);
  fastify.get('/catalog/countries', productsController.getCatalogCountries);
  fastify.get('/:id', productsController.getProductById);
  fastify.post('/parse-url', productsController.parseProductUrl);

  // Admin routes
  fastify.post('/', productsController.createProduct);

  fastify.patch('/:id', productsController.updateProduct);

  fastify.delete('/:id', productsController.deleteProduct);
  
  // Categories
  fastify.register(async (fastify) => {
    fastify.get('/', categoriesController.getCategories);
    fastify.get('/:id', categoriesController.getCategoryById);
    
    // Admin routes
    fastify.post('/', categoriesController.createCategory);

    fastify.patch('/:id', categoriesController.updateCategory);

    fastify.delete('/:id', categoriesController.deleteCategory);
  }, { prefix: '/categories' });
};