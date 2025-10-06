import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../../core/redis';
import { logger } from '../../../core/logger';
import { io } from '../../../core/websocket/server';
import { SocketEvents } from '@cargoexpress/shared';

class WarehousesService {
  private readonly CACHE_TTL = 3600;
  
  async getWarehouses(filters: {
    countryId?: string;
    active?: boolean;
  } = {}) {
    const where: any = {};
    
    if (filters.countryId) {
      where.countryId = parseInt(filters.countryId);
    }
    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }
    
    return prisma.warehouse.findMany({
      where,
      include: {
        country: true,
        tariffs: {
          where: { isActive: true },
          orderBy: { pricePerKg: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }
  
  async getWarehouseById(id: number) {
    return prisma.warehouse.findUnique({
      where: { id },
      include: {
        country: true,
        tariffs: {
          where: { isActive: true }
        }
      }
    });
  }
  
  async createWarehouse(data: any) {
    const warehouse = await prisma.warehouse.create({
      data: {
        countryId: data.countryId,
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        phone: data.phone,
        email: data.email,
        workingHours: data.workingHours,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0
      },
      include: {
        country: true
      }
    });
    
    // Clear cache
    await this.clearCache();
    
    // Notify via WebSocket
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'warehouse',
      action: 'create',
      entityId: warehouse.id
    });
    
    logger.info(`Warehouse created: ${warehouse.id} - ${warehouse.name}`);
    
    return warehouse;
  }
  
  async updateWarehouse(id: number, data: any) {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data,
      include: {
        country: true
      }
    });
    
    await this.clearCache();
    
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'warehouse',
      action: 'update',
      entityId: warehouse.id
    });
    
    await redis.publish('bot:update:warehouses', JSON.stringify(warehouse));
    
    logger.info(`Warehouse updated: ${warehouse.id}`);
    
    return warehouse;
  }
  
  async deleteWarehouse(id: number) {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { isActive: false }
    });
    
    await this.clearCache();
    
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'warehouse',
      action: 'delete',
      entityId: id
    });
    
    logger.info(`Warehouse deleted: ${id}`);
    
    return warehouse;
  }
  
  private async clearCache() {
    const keys = await redis.keys('cache:warehouses:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const warehousesService = new WarehousesService();