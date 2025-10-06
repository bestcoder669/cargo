import { prisma } from '@cargoexpress/prisma';
import { CalculationUtils, CONSTANTS } from '@cargoexpress/shared';
import { logger } from '../../../core/logger';

class TariffsService {
  async getTariffs(filters: {
    countryId?: string;
    warehouseId?: string;
    weight?: string;
  } = {}) {
    const where: any = { isActive: true };
    
    if (filters.countryId) {
      where.countryId = parseInt(filters.countryId);
    }
    if (filters.warehouseId) {
      where.warehouseId = parseInt(filters.warehouseId);
    }
    if (filters.weight) {
      const weight = parseFloat(filters.weight);
      where.minWeight = { lte: weight };
      where.OR = [
        { maxWeight: null },
        { maxWeight: { gte: weight } }
      ];
    }
    
    return prisma.shippingTariff.findMany({
      where,
      include: {
        country: true,
        warehouse: true
      },
      orderBy: { pricePerKg: 'asc' }
    });
  }
  
  async calculateShipping(params: {
    fromCountryId: number;
    toCountryId?: number;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    declaredValue?: number;
  }) {
    // Get applicable tariffs
    const tariffs = await prisma.shippingTariff.findMany({
      where: {
        countryId: params.fromCountryId,
        isActive: true,
        minWeight: { lte: params.weight },
        OR: [
          { maxWeight: null },
          { maxWeight: { gte: params.weight } }
        ]
      },
      include: {
        warehouse: true
      },
      orderBy: { pricePerKg: 'asc' }
    });
    
    if (tariffs.length === 0) {
      throw new Error('No tariffs available for this route');
    }
    
    // Calculate volumetric weight
    let volumeWeight = 0;
    if (params.length && params.width && params.height) {
      volumeWeight = CalculationUtils.calculateVolumetricWeight(
        params.length,
        params.width,
        params.height
      );
    }
    
    const chargeableWeight = Math.max(params.weight, volumeWeight);
    
    // Calculate for each tariff
    const options = tariffs.map(tariff => {
      const shippingCost = CalculationUtils.calculateShippingCost(
        params.weight,
        volumeWeight,
        Number(tariff.pricePerKg),
        Number(tariff.processingFee),
        Number(tariff.customsFee)
      );
      
      // Insurance
      let insurance = 0;
      if (params.declaredValue && params.declaredValue > 100) {
        insurance = params.declaredValue * 0.02; // 2%
      }
      
      // Customs duty (if value > $200)
      let customsDuty = 0;
      if (params.declaredValue && params.declaredValue > 200) {
        customsDuty = (params.declaredValue - 200) * 0.3; // 30% on amount over $200
      }
      
      return {
        tariffId: tariff.id,
        name: tariff.name,
        warehouseName: tariff.warehouse.name,
        warehouseId: tariff.warehouseId,
        deliveryDays: `${tariff.minDeliveryDays}-${tariff.maxDeliveryDays} дней`,
        shippingCost,
        insurance,
        customsDuty,
        customsFee: Number(tariff.customsFee),
        processingFee: Number(tariff.processingFee),
        totalCost: shippingCost + insurance + customsDuty
      };
    });
    
    return {
      weight: params.weight,
      volumeWeight,
      chargeableWeight,
      declaredValue: params.declaredValue,
      options
    };
  }
  
  async createTariff(data: any) {
    const tariff = await prisma.shippingTariff.create({
      data: {
        countryId: data.countryId,
        warehouseId: data.warehouseId,
        name: data.name,
        description: data.description,
        pricePerKg: data.pricePerKg,
        minWeight: data.minWeight,
        maxWeight: data.maxWeight,
        minDeliveryDays: data.minDeliveryDays,
        maxDeliveryDays: data.maxDeliveryDays,
        customsFee: data.customsFee ?? 0,
        processingFee: data.processingFee ?? 0,
        insuranceRate: data.insuranceRate ?? 0.02,
        isActive: data.isActive ?? true
      }
    });
    
    logger.info(`Tariff created: ${tariff.id} - ${tariff.name}`);
    
    return tariff;
  }
  
  async updateTariff(id: number, data: any) {
    const tariff = await prisma.shippingTariff.update({
      where: { id },
      data
    });
    
    logger.info(`Tariff updated: ${tariff.id}`);
    
    return tariff;
  }
  
  async deleteTariff(id: number) {
    const tariff = await prisma.shippingTariff.update({
      where: { id },
      data: { isActive: false }
    });
    
    logger.info(`Tariff deleted: ${id}`);
    
    return tariff;
  }
}

export const tariffsService = new TariffsService();