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
  fastify.post('/', countriesController.createCountry);

  fastify.patch('/:id', countriesController.updateCountry);

  fastify.delete('/:id', countriesController.deleteCountry);
  
  // Warehouses
  fastify.register(async (fastify) => {
    fastify.get('/', warehousesController.getWarehouses);
    fastify.get('/:id', warehousesController.getWarehouseById);
    
    // Admin routes
    fastify.post('/', warehousesController.createWarehouse);

    fastify.patch('/:id', warehousesController.updateWarehouse);

    fastify.delete('/:id', warehousesController.deleteWarehouse);
  }, { prefix: '/warehouses' });
  
  // Tariffs
  fastify.register(async (fastify) => {
    fastify.get('/', tariffsController.getTariffs);
    fastify.post('/calculate', tariffsController.calculateShipping);
    
    // Admin routes
    fastify.post('/', tariffsController.createTariff);

    fastify.patch('/:id', tariffsController.updateTariff);

    fastify.delete('/:id', tariffsController.deleteTariff);
  }, { prefix: '/tariffs' });
};