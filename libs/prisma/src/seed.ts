// ==================== libs/prisma/src/seed.ts ====================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Country" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "City" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Admin" CASCADE`;

  // Create countries
  const countries = await Promise.all([
    prisma.country.create({
      data: {
        name: 'США',
        nameEn: 'USA',
        code: 'US',
        flagEmoji: '🇺🇸',
        phoneCode: '+1',
        currency: 'USD',
        isActive: true,
        shippingAvailable: true,
        purchaseAvailable: true,
        purchaseCommission: 5.0,
        popularityScore: 100,
        sortOrder: 1
      }
    }),
    prisma.country.create({
      data: {
        name: 'Китай',
        nameEn: 'China',
        code: 'CN',
        flagEmoji: '🇨🇳',
        phoneCode: '+86',
        currency: 'CNY',
        isActive: true,
        shippingAvailable: true,
        purchaseAvailable: true,
        purchaseCommission: 4.0,
        popularityScore: 90,
        sortOrder: 2
      }
    }),
    prisma.country.create({
      data: {
        name: 'Турция',
        nameEn: 'Turkey',
        code: 'TR',
        flagEmoji: '🇹🇷',
        phoneCode: '+90',
        currency: 'TRY',
        isActive: true,
        shippingAvailable: true,
        purchaseAvailable: true,
        purchaseCommission: 4.5,
        popularityScore: 85,
        sortOrder: 3
      }
    }),
    prisma.country.create({
      data: {
        name: 'Великобритания',
        nameEn: 'United Kingdom',
        code: 'GB',
        flagEmoji: '🇬🇧',
        phoneCode: '+44',
        currency: 'GBP',
        isActive: true,
        shippingAvailable: true,
        purchaseAvailable: true,
        purchaseCommission: 5.5,
        popularityScore: 70,
        sortOrder: 4
      }
    }),
    prisma.country.create({
      data: {
        name: 'Германия',
        nameEn: 'Germany',
        code: 'DE',
        flagEmoji: '🇩🇪',
        phoneCode: '+49',
        currency: 'EUR',
        isActive: true,
        shippingAvailable: true,
        purchaseAvailable: true,
        purchaseCommission: 5.0,
        popularityScore: 75,
        sortOrder: 5
      }
    })
  ]);

  console.log(`✅ Created ${countries.length} countries`);

  // Create warehouses
  const warehouses = await Promise.all([
    // USA warehouses
    prisma.warehouse.create({
      data: {
        countryId: countries[0].id,
        name: 'Delaware Warehouse',
        code: 'US-DE',
        address: '123 Commerce Way, Wilmington, DE 19801',
        city: 'Wilmington',
        postalCode: '19801',
        phone: '+1-302-123-4567',
        email: 'delaware@cargoexpress.com',
        workingHours: 'Mon-Fri: 9AM-6PM EST',
        instructions: 'Please include customer ID #USER_ID on all packages',
        isActive: true
      }
    }),
    prisma.warehouse.create({
      data: {
        countryId: countries[0].id,
        name: 'New Jersey Warehouse',
        code: 'US-NJ',
        address: '456 Logistics Blvd, Newark, NJ 07102',
        city: 'Newark',
        postalCode: '07102',
        phone: '+1-973-987-6543',
        email: 'newjersey@cargoexpress.com',
        workingHours: 'Mon-Sat: 8AM-8PM EST',
        instructions: 'Tax-free state, ideal for expensive items',
        isActive: true
      }
    }),
    // China warehouses
    prisma.warehouse.create({
      data: {
        countryId: countries[1].id,
        name: 'Guangzhou Warehouse',
        code: 'CN-GZ',
        address: '789 Export Avenue, Guangzhou, Guangdong 510000',
        city: 'Guangzhou',
        postalCode: '510000',
        phone: '+86-20-1234-5678',
        email: 'guangzhou@cargoexpress.com',
        workingHours: 'Mon-Sun: 9AM-9PM CST',
        instructions: 'Best for electronics and wholesale goods',
        isActive: true
      }
    }),
    // Turkey warehouse
    prisma.warehouse.create({
      data: {
        countryId: countries[2].id,
        name: 'Istanbul Warehouse',
        code: 'TR-IST',
        address: '321 Bosphorus Trade Center, Istanbul 34000',
        city: 'Istanbul',
        postalCode: '34000',
        phone: '+90-212-987-6543',
        email: 'istanbul@cargoexpress.com',
        workingHours: 'Mon-Sat: 9AM-7PM TRT',
        instructions: 'Ideal for textiles and fashion items',
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // Create shipping tariffs
  const tariffs = await Promise.all([
    // USA tariffs
    prisma.shippingTariff.create({
      data: {
        warehouseId: warehouses[0].id,
        countryId: countries[0].id,
        name: 'Express Air (7-10 days)',
        description: 'Fast air delivery with tracking',
        pricePerKg: 12.0,
        minWeight: 0.1,
        maxWeight: 30.0,
        volumetricDivider: 5000,
        processingFee: 5.0,
        customsFee: 0.0,
        deliveryDays: '7-10 days',
        isActive: true
      }
    }),
    prisma.shippingTariff.create({
      data: {
        warehouseId: warehouses[0].id,
        countryId: countries[0].id,
        name: 'Standard Air (12-18 days)',
        description: 'Regular air delivery with tracking',
        pricePerKg: 8.0,
        minWeight: 0.5,
        maxWeight: 50.0,
        volumetricDivider: 5000,
        processingFee: 3.0,
        customsFee: 0.0,
        deliveryDays: '12-18 days',
        isActive: true
      }
    }),
    // China tariffs
    prisma.shippingTariff.create({
      data: {
        warehouseId: warehouses[2].id,
        countryId: countries[1].id,
        name: 'Sea Freight (25-35 days)',
        description: 'Economical sea shipping for heavy items',
        pricePerKg: 3.5,
        minWeight: 10.0,
        maxWeight: 1000.0,
        volumetricDivider: 6000,
        processingFee: 10.0,
        customsFee: 5.0,
        deliveryDays: '25-35 days',
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${tariffs.length} tariffs`);

  // Create Russian cities
  const cities = await Promise.all([
    prisma.city.create({
      data: {
        name: 'Москва',
        nameEn: 'Moscow',
        region: 'Московская область',
        countryCode: 'RU',
        isPopular: true,
        population: 12000000,
        sortOrder: 1,
        isActive: true
      }
    }),
    prisma.city.create({
      data: {
        name: 'Санкт-Петербург',
        nameEn: 'Saint Petersburg',
        region: 'Ленинградская область',
        countryCode: 'RU',
        isPopular: true,
        population: 5000000,
        sortOrder: 2,
        isActive: true
      }
    }),
    prisma.city.create({
      data: {
        name: 'Новосибирск',
        nameEn: 'Novosibirsk',
        region: 'Новосибирская область',
        countryCode: 'RU',
        isPopular: true,
        population: 1600000,
        sortOrder: 3,
        isActive: true
      }
    }),
    prisma.city.create({
      data: {
        name: 'Екатеринбург',
        nameEn: 'Yekaterinburg',
        region: 'Свердловская область',
        countryCode: 'RU',
        isPopular: true,
        population: 1500000,
        sortOrder: 4,
        isActive: true
      }
    }),
    prisma.city.create({
      data: {
        name: 'Казань',
        nameEn: 'Kazan',
        region: 'Республика Татарстан',
        countryCode: 'RU',
        isPopular: true,
        population: 1200000,
        sortOrder: 5,
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${cities.length} cities`);

  // Create product categories
  const categories = await Promise.all([
    prisma.productCategory.create({
      data: {
        name: 'Электроника',
        nameEn: 'Electronics',
        icon: '📱',
        description: 'Смартфоны, ноутбуки, гаджеты',
        sortOrder: 1,
        isActive: true
      }
    }),
    prisma.productCategory.create({
      data: {
        name: 'Одежда и обувь',
        nameEn: 'Clothing & Shoes',
        icon: '👕',
        description: 'Модная одежда и обувь',
        sortOrder: 2,
        isActive: true
      }
    }),
    prisma.productCategory.create({
      data: {
        name: 'Косметика',
        nameEn: 'Cosmetics',
        icon: '💄',
        description: 'Косметика и парфюмерия',
        sortOrder: 3,
        isActive: true
      }
    }),
    prisma.productCategory.create({
      data: {
        name: 'Дом и сад',
        nameEn: 'Home & Garden',
        icon: '🏠',
        description: 'Товары для дома и сада',
        sortOrder: 4,
        isActive: true
      }
    }),
    prisma.productCategory.create({
      data: {
        name: 'Спорт',
        nameEn: 'Sports',
        icon: '⚽',
        description: 'Спортивные товары',
        sortOrder: 5,
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${categories.length} product categories`);

  // Create test admin
  const adminTelegramId = process.env.SUPER_ADMIN_IDS?.split(',')[0];
  if (adminTelegramId) {
    await prisma.admin.create({
      data: {
        telegramId: BigInt(adminTelegramId),
        username: 'admin',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        isActive: true
      }
    });
    console.log(`✅ Created test admin with Telegram ID: ${adminTelegramId}`);
  }

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      telegramId: BigInt('123456789'),
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      phone: '+79991234567',
      email: 'test@example.com',
      cityId: cities[0].id,
      balance: 1000.00,
      bonusBalance: 100.00,
      referralCode: 'TESTCODE',
      isActive: true
    }
  });

  console.log(`✅ Created test user: ${testUser.email}`);

  // Create test address
  await prisma.userAddress.create({
    data: {
      userId: testUser.id,
      name: 'Домашний адрес',
      cityId: cities[0].id,
      address: 'ул. Тверская, д. 1, кв. 1',
      postalCode: '125009',
      phone: '+79991234567',
      isDefault: true
    }
  });

  console.log('✅ Created test address');

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
