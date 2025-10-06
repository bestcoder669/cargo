// ==================== apps/api/src/modules/bot/bot.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { KeyboardData } from '@cargoexpress/shared';

class BotService {
  async getActiveCountries() {
    const cached = await redis.get('cache:countries');
    if (cached) {
      return JSON.parse(cached);
    }
    
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: [
        { popularityScore: 'desc' },
        { sortOrder: 'asc' }
      ]
    });
    
    // Cache for 1 hour
    await redis.setex('cache:countries', 3600, JSON.stringify(countries));
    
    return countries;
  }
  
  async getCities(countryCode: string = 'RU', popular?: boolean) {
    const cacheKey = `cache:cities:${countryCode}:${popular}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const cities = await prisma.city.findMany({
      where: {
        countryCode,
        isActive: true,
        ...(popular && { isPopular: true })
      },
      orderBy: [
        { isPopular: 'desc' },
        { population: 'desc' },
        { sortOrder: 'asc' }
      ],
      take: popular ? 20 : 100
    });
    
    await redis.setex(cacheKey, 3600, JSON.stringify(cities));
    
    return cities;
  }
  
  async getWarehousesByCountry(countryId: number): Promise<any[]> {
    return prisma.warehouse.findMany({
      where: {
        countryId,
        isActive: true
      },
      include: {
        country: true,
        tariffs: {
          where: { isActive: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }
  
  async getProductCategories(_countryId?: number) {
    return prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }
  
  async getProducts(params: any): Promise<{ items: any[]; total: number; page: number; limit: number; pages: number }> {
    const { categoryId, countryId, storeId, search, page = 1, limit = 10 } = params;

    const where: any = { isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (countryId) where.countryId = countryId;
    if (storeId) where.storeId = storeId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          country: true,
          store: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { soldCount: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }
  
  async getTariffsByWarehouse(warehouseId: number): Promise<any[]> {
    return prisma.shippingTariff.findMany({
      where: {
        warehouseId,
        isActive: true
      },
      orderBy: { pricePerKg: 'asc' }
    });
  }
  
  async getKeyboardData(type: string, params: any): Promise<KeyboardData> {
    let buttons: any[] = [];
    let columns = 2;
    
    switch (type) {
      case 'countries':
        const countries = await this.getActiveCountries();
        buttons = countries.map((c: any) => ({
          id: c.id,
          text: `${c.flagEmoji} ${c.name}`,
          callbackData: `country_${c.id}`,
          emoji: c.flagEmoji
        }));
        break;

      case 'cities':
        const cities = await this.getCities(params.countryCode, params.popular);
        buttons = cities.map((c: any) => ({
          id: c.id,
          text: c.name,
          callbackData: `city_${c.id}`
        }));
        columns = 3;
        break;
        
      case 'warehouses':
        const warehouses = await this.getWarehousesByCountry(parseInt(params.countryId));
        buttons = warehouses.map(w => ({
          id: w.id,
          text: `${w.name}`,
          callbackData: `warehouse_${w.id}`,
          badge: w.tariffs.length > 0 ? `от ${w.tariffs[0].pricePerKg}₽/кг` : ''
        }));
        columns = 1;
        break;
        
      case 'categories':
        const categories = await this.getProductCategories();
        buttons = categories.map(c => ({
          id: c.id,
          text: `${c.icon} ${c.name}`,
          callbackData: `category_${c.id}`,
          emoji: c.icon
        }));
        columns = 2;
        break;
        
      default:
        break;
    }
    
    return { buttons, columns };
  }
  
  async getUserByTelegramId(telegramId: number): Promise<any> {
    return prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        city: true,
        addresses: true,
        _count: {
          select: {
            orders: true
          }
        }
      }
    });
  }
}

export const botService = new BotService();

