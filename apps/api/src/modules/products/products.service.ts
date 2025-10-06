import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../core/redis';
import { logger } from '../../core/logger';
import axios from 'axios';

class ProductsService {
  async getProducts(params: {
    categoryId?: string;
    countryId?: string;
    storeId?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const skip = (page - 1) * limit;
    
    const where: any = { isActive: true };
    
    if (params.categoryId) {
      where.categoryId = parseInt(params.categoryId);
    }
    if (params.countryId) {
      where.countryId = parseInt(params.countryId);
    }
    if (params.storeId) {
      where.storeId = parseInt(params.storeId);
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } }
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
        skip,
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { soldCount: 'desc' },
          { rating: 'desc' }
        ]
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
  
  async getProductById(id: number) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        country: true,
        store: true,
        images: true,
        variants: true
      }
    });
  }
  
  async createProduct(data: any) {
    const product = await prisma.product.create({
      data: {
        categoryId: data.categoryId,
        countryId: data.countryId,
        storeId: data.storeId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        price: data.price,
        oldPrice: data.oldPrice,
        currency: data.currency,
        imageUrl: data.imageUrl,
        productUrl: data.productUrl,
        weight: data.weight,
        dimensions: data.dimensions,
        rating: data.rating ?? 0,
        reviewCount: data.reviewCount ?? 0,
        soldCount: data.soldCount ?? 0,
        stock: data.stock ?? 0,
        isFeatured: data.isFeatured ?? false,
        isActive: data.isActive ?? true,
        metadata: data.metadata
      },
      include: {
        category: true,
        country: true
      }
    });
    
    logger.info(`Product created: ${product.id} - ${product.name}`);
    
    return product;
  }
  
  async updateProduct(id: number, data: any) {
    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        country: true
      }
    });
    
    logger.info(`Product updated: ${product.id}`);
    
    return product;
  }
  
  async deleteProduct(id: number) {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
    
    logger.info(`Product deleted: ${id}`);
    
    return product;
  }
  
  async parseProductUrl(url: string) {
    // Simple parser for popular stores
    const parsers = {
      amazon: this.parseAmazon,
      ebay: this.parseEbay,
      aliexpress: this.parseAliExpress,
      taobao: this.parseTaobao
    };
    
    let store = null;
    for (const [key, parser] of Object.entries(parsers)) {
      if (url.toLowerCase().includes(key)) {
        store = key;
        return parser.call(this, url);
      }
    }
    
    // Default parser
    return this.parseDefault(url);
  }
  
  private async parseAmazon(url: string) {
    // Simplified Amazon parser
    try {
      // Extract ASIN from URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      const asin = asinMatch ? asinMatch[1] : null;
      
      return {
        store: 'Amazon',
        sku: asin,
        url,
        name: 'Amazon Product',
        price: null,
        currency: 'USD',
        imageUrl: null,
        available: true
      };
    } catch (error) {
      logger.error('Amazon parse error:', error);
      return null;
    }
  }
  
  private async parseEbay(url: string) {
    // Simplified eBay parser
    try {
      const itemIdMatch = url.match(/\/itm\/(\d+)/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      
      return {
        store: 'eBay',
        sku: itemId,
        url,
        name: 'eBay Item',
        price: null,
        currency: 'USD',
        imageUrl: null,
        available: true
      };
    } catch (error) {
      logger.error('eBay parse error:', error);
      return null;
    }
  }
  
  private async parseAliExpress(url: string) {
    // Simplified AliExpress parser
    try {
      const itemIdMatch = url.match(/item\/(\d+)\.html/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      
      return {
        store: 'AliExpress',
        sku: itemId,
        url,
        name: 'AliExpress Product',
        price: null,
        currency: 'USD',
        imageUrl: null,
        available: true
      };
    } catch (error) {
      logger.error('AliExpress parse error:', error);
      return null;
    }
  }
  
  private async parseTaobao(url: string) {
    // Simplified Taobao parser
    try {
      const itemIdMatch = url.match(/id=(\d+)/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      
      return {
        store: 'Taobao',
        sku: itemId,
        url,
        name: 'Taobao Product',
        price: null,
        currency: 'CNY',
        imageUrl: null,
        available: true
      };
    } catch (error) {
      logger.error('Taobao parse error:', error);
      return null;
    }
  }
  
  private async parseDefault(url: string) {
    return {
      store: 'Unknown',
      sku: null,
      url,
      name: 'Product',
      price: null,
      currency: 'USD',
      imageUrl: null,
      available: true
    };
  }

  async getCatalogCountries() {
    // Get countries that have products
    const countries = await prisma.country.findMany({
      where: {
        products: {
          some: {
            isActive: true
          }
        }
      },
      select: {
        id: true,
        code: true,
        name: true,
        flagEmoji: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return countries.map(country => ({
      ...country,
      productsCount: country._count.products
    }));
  }
}

export const productsService = new ProductsService();