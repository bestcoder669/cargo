// ==================== apps/api/src/modules/calculator/calculator.service.ts ====================

import { prisma } from '@cargoexpress/prisma';
import { CalculationUtils } from '@cargoexpress/shared';

class CalculatorService {
  async calculateShipping(params: {
    fromCountryId: number;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    declaredValue?: number;
  }) {
    // Get tariffs for country
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
    
    // Calculate volumetric weight if dimensions provided
    let volumeWeight = 0;
    if (params.length && params.width && params.height) {
      volumeWeight = CalculationUtils.calculateVolumetricWeight(
        params.length,
        params.width,
        params.height
      );
    }
    
    const chargeableWeight = Math.max(params.weight, volumeWeight);
    
    // Calculate costs for each tariff
    const options = tariffs.map(tariff => {
      const shippingCost = CalculationUtils.calculateShippingCost(
        params.weight,
        volumeWeight,
        Number(tariff.pricePerKg),
        Number(tariff.processingFee),
        Number(tariff.customsFee)
      );
      
      // Add insurance if declared value > $100
      let insurance = 0;
      if (params.declaredValue && params.declaredValue > 100) {
        insurance = params.declaredValue * 0.02; // 2% insurance
      }
      
      return {
        tariffId: tariff.id,
        name: tariff.name,
        warehouseName: tariff.warehouse.name,
        deliveryDays: tariff.deliveryDays,
        shippingCost,
        insurance,
        customsFee: Number(tariff.customsFee),
        processingFee: Number(tariff.processingFee),
        totalCost: shippingCost + insurance
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
  
  async calculatePurchase(params: {
    countryId: number;
    productCost: number;
    weight?: number;
    quantity?: number;
  }) {
    const country = await prisma.country.findUnique({
      where: { id: params.countryId }
    });
    
    if (!country) {
      throw new Error('Country not found');
    }
    
    const quantity = params.quantity || 1;
    const totalProductCost = params.productCost * quantity;
    
    // Get exchange rate (hardcoded for now, should use real API)
    const exchangeRate = this.getExchangeRate(country.currency);
    
    // Calculate commission
    const commission = CalculationUtils.calculateCommission(
      totalProductCost * exchangeRate,
      Number(country.purchaseCommission)
    );
    
    // Estimate domestic shipping
    const domesticShipping = params.weight ? params.weight * 200 : 500; // ₽200/kg or ₽500 flat
    
    const totalCost = (totalProductCost * exchangeRate) + commission + domesticShipping;
    
    return {
      productCost: params.productCost,
      quantity,
      totalProductCost,
      exchangeRate,
      commission,
      domesticShipping,
      totalCost
    };
  }
  
  private getExchangeRate(currency: string): number {
    // Should use real exchange rate API
    const rates: Record<string, number> = {
      USD: 90,
      EUR: 100,
      GBP: 115,
      CNY: 13,
      TRY: 3
    };
    
    return rates[currency] || 90;
  }
}

export const calculatorService = new CalculatorService();

