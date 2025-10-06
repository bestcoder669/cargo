// apps/api/src/modules/countries/index.ts
import { FastifyPluginAsync } from 'fastify';
import { countriesController } from './countries.controller';
import { warehousesController } from './warehouses/warehouses.controller';
import { tariffsController } from './tariffs/tariffs.controller';

export const countriesModule: FastifyPluginAsync = async (fastify) => {
  // Countries
  fastify.get('/', countriesController.getCountries);
  fastify.get('/:id', countriesController.getCountry);
  
  // Admin routes for countries
  fastify.post('/', {
    preHandler: [fastify.requireAdmin]
  }, countriesController.createCountry);
  
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin]
  }, countriesController.updateCountry);
  
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin]
  }, countriesController.deleteCountry);
  
  // Warehouses
  fastify.register(async (fastify) => {
    fastify.get('/', warehousesController.getWarehouses);
    fastify.get('/:id', warehousesController.getWarehouseById);
    
    // Admin routes
    fastify.post('/', {
      preHandler: [fastify.requireAdmin]
    }, warehousesController.createWarehouse);
    
    fastify.patch('/:id', {
      preHandler: [fastify.requireAdmin]
    }, warehousesController.updateWarehouse);
    
    fastify.delete('/:id', {
      preHandler: [fastify.requireAdmin]
    }, warehousesController.deleteWarehouse);
  }, { prefix: '/warehouses' });
  
  // Tariffs
  fastify.register(async (fastify) => {
    fastify.get('/', tariffsController.getTariffs);
    fastify.post('/calculate', tariffsController.calculateShipping);
    
    // Admin routes
    fastify.post('/', {
      preHandler: [fastify.requireAdmin]
    }, tariffsController.createTariff);
    
    fastify.patch('/:id', {
      preHandler: [fastify.requireAdmin]
    }, tariffsController.updateTariff);
    
    fastify.delete('/:id', {
      preHandler: [fastify.requireAdmin]
    }, tariffsController.deleteTariff);
  }, { prefix: '/tariffs' });
};