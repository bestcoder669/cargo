// apps/api/src/modules/products/categories/categories.service.ts
import { prisma } from '@cargoexpress/prisma';
import { redis } from '../../../core/redis';
import { logger } from '../../../core/logger';

class CategoriesService {
  async getCategories(filters: { 
    parentId?: number;
    isActive?: boolean;
  } = {}) {
    const where: any = {};
    
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    return prisma.productCategory.findMany({
      where,
      include: {
        _count: {
          select: { products: true }
        },
        parent: true,
        children: filters.parentId === null ? true : false
      },
      orderBy: { sortOrder: 'asc' }
    });
  }
  
  async getCategoryById(id: number) {
    return prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        }
      }
    });
  }
  
  async createCategory(data: any) {
    const category = await prisma.productCategory.create({
      data: {
        name: data.name,
        nameEn: data.nameEn,
        icon: data.icon,
        description: data.description,
        parentId: data.parentId,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true
      }
    });
    
    // Clear cache
    await redis.del('cache:categories');
    
    logger.info(`Category created: ${category.id} - ${category.name}`);
    
    return category;
  }
  
  async updateCategory(id: number, data: any) {
    const category = await prisma.productCategory.update({
      where: { id },
      data
    });
    
    await redis.del('cache:categories');
    
    logger.info(`Category updated: ${category.id}`);
    
    return category;
  }
  
  async deleteCategory(id: number) {
    // Check if has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });
    
    if (productsCount > 0) {
      throw new Error('Category has products, cannot delete');
    }
    
    // Soft delete
    const category = await prisma.productCategory.update({
      where: { id },
      data: { isActive: false }
    });
    
    await redis.del('cache:categories');
    
    logger.info(`Category deleted: ${id}`);
    
    return category;
  }
}

export const categoriesService = new CategoriesService();