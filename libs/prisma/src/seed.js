"use strict";
// ==================== libs/prisma/src/seed.ts ====================
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var countries, warehouses, tariffs, cities, categories, adminTelegramId, testUser;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🌱 Starting seed...');
                    // Clear existing data
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["TRUNCATE TABLE \"User\" CASCADE"], ["TRUNCATE TABLE \"User\" CASCADE"])))];
                case 1:
                    // Clear existing data
                    _b.sent();
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["TRUNCATE TABLE \"Country\" CASCADE"], ["TRUNCATE TABLE \"Country\" CASCADE"])))];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["TRUNCATE TABLE \"City\" CASCADE"], ["TRUNCATE TABLE \"City\" CASCADE"])))];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["TRUNCATE TABLE \"Admin\" CASCADE"], ["TRUNCATE TABLE \"Admin\" CASCADE"])))];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 5:
                    countries = _b.sent();
                    console.log("\u2705 Created ".concat(countries.length, " countries"));
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 6:
                    warehouses = _b.sent();
                    console.log("\u2705 Created ".concat(warehouses.length, " warehouses"));
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 7:
                    tariffs = _b.sent();
                    console.log("\u2705 Created ".concat(tariffs.length, " tariffs"));
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 8:
                    cities = _b.sent();
                    console.log("\u2705 Created ".concat(cities.length, " cities"));
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 9:
                    categories = _b.sent();
                    console.log("\u2705 Created ".concat(categories.length, " product categories"));
                    adminTelegramId = (_a = process.env.SUPER_ADMIN_IDS) === null || _a === void 0 ? void 0 : _a.split(',')[0];
                    if (!adminTelegramId) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma.admin.create({
                            data: {
                                telegramId: BigInt(adminTelegramId),
                                username: 'admin',
                                firstName: 'Super',
                                lastName: 'Admin',
                                role: 'SUPER_ADMIN',
                                permissions: ['*'],
                                isActive: true
                            }
                        })];
                case 10:
                    _b.sent();
                    console.log("\u2705 Created test admin with Telegram ID: ".concat(adminTelegramId));
                    _b.label = 11;
                case 11: return [4 /*yield*/, prisma.user.create({
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
                    })];
                case 12:
                    testUser = _b.sent();
                    console.log("\u2705 Created test user: ".concat(testUser.email));
                    // Create test address
                    return [4 /*yield*/, prisma.userAddress.create({
                            data: {
                                userId: testUser.id,
                                name: 'Домашний адрес',
                                cityId: cities[0].id,
                                address: 'ул. Тверская, д. 1, кв. 1',
                                postalCode: '125009',
                                phone: '+79991234567',
                                isDefault: true
                            }
                        })];
                case 13:
                    // Create test address
                    _b.sent();
                    console.log('✅ Created test address');
                    console.log('🌱 Seed completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
