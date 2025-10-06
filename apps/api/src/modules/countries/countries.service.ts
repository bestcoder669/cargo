import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { logger } from '../../core/logger';
import { io } from '../../core/websocket/server';
import { SocketEvents } from '@cargoexpress/shared';

class CountriesService {
  private readonly CACHE_TTL = 3600; // 1 hour
  
  async getCountries(filters: {
    active?: boolean;
    shipping?: boolean;
    purchase?: boolean;
  } = {}) {
    const cacheKey = `countries:${JSON.stringify(filters)}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const where: any = {};
    
    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }
    if (filters.shipping) {
      where.shippingAvailable = true;
    }
    if (filters.purchase) {
      where.purchaseAvailable = true;
    }
    
    const countries = await prisma.country.findMany({
      where,
      include: {
        _count: {
          select: { 
            warehouses: true,
            tariffs: true,
            products: true 
          }
        }
      },
      orderBy: [
        { popularityScore: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(countries));
    
    return countries;
  }
  
  async getCountryById(id: number) {
    return prisma.country.findUnique({
      where: { id },
      include: {
        warehouses: {
          where: { isActive: true }
        },
        tariffs: {
          where: { isActive: true }
        }
      }
    });
  }
  
  async createCountry(data: any) {
    const country = await prisma.country.create({
      data: {
        name: data.name,
        code: data.code,
        flagEmoji: data.flagEmoji,
        currency: data.currency,
        shippingAvailable: data.shippingAvailable ?? false,
        purchaseAvailable: data.purchaseAvailable ?? false,
        purchaseCommission: data.purchaseCommission ?? 5.0,
        popularityScore: data.popularityScore ?? 0,
        sortOrder: data.sortOrder ?? 0
      }
    });
    
    // Clear cache
    await this.clearCache();
    
    // Notify via WebSocket
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'country',
      action: 'create',
      entityId: country.id
    });
    
    logger.info(`Country created: ${country.id} - ${country.name}`);
    
    return country;
  }
  
  async updateCountry(id: number, data: any) {
    const country = await prisma.country.update({
      where: { id },
      data
    });
    
    await this.clearCache();
    
    // Notify via WebSocket
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'country',
      action: 'update',
      entityId: country.id
    });
    
    // Notify bot via Redis
    await redis.publish('bot:update:countries', JSON.stringify(country));
    
    logger.info(`Country updated: ${country.id} - ${country.name}`);
    
    return country;
  }
  
  async deleteCountry(id: number) {
    // Soft delete
    const country = await prisma.country.update({
      where: { id },
      data: { isActive: false }
    });
    
    await this.clearCache();
    
    io.emit(SocketEvents.DATA_UPDATE, {
      type: 'country',
      action: 'delete',
      entityId: id
    });
    
    logger.info(`Country deleted: ${id}`);
    
    return country;
  }
  
  private async clearCache() {
    const keys = await redis.keys('countries:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const countriesService = new CountriesService();