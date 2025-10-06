// ==================== libs/shared/src/constants.ts ====================
import { OrderStatus } from './enums';

export const CONSTANTS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS: 5,
  MAX_MESSAGE_LENGTH: 4096,
  
  // Timeouts
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ADMIN_TOKEN_TTL: 15 * 60, // 15 minutes in seconds
  SCANNER_SESSION_TIMEOUT: 60 * 60 * 1000, // 60 minutes
  
  // Cache TTL
  CACHE_TTL: {
    COUNTRIES: 3600, // 1 hour
    CITIES: 3600,
    WAREHOUSES: 1800, // 30 minutes
    PRODUCTS: 600, // 10 minutes
    USER_PROFILE: 300, // 5 minutes
    TARIFFS: 3600
  },
  
  // Redis Keys
  REDIS_KEYS: {
    USER_SESSION: 'session:user:',
    ADMIN_SESSION: 'session:admin:',
    ADMIN_TOKEN: 'admin_token:',
    SCANNER_SESSION: 'scanner:session:',
    RATE_LIMIT: 'rate_limit:',
    CACHE: 'cache:',
    NOTIFICATION_QUEUE: 'queue:notifications',
    BOT_STATUS: 'bot:status'
  },
  
  // Rate Limits
  RATE_LIMITS: {
    API_CALLS: 100, // per minute
    BOT_MESSAGES: 30, // per minute
    SCANNER_SCANS: 300, // per minute
    SUPPORT_MESSAGES: 10 // per minute
  },
  
  // Volumetric divider
  VOLUMETRIC_DIVIDER: 5000,
  
  // Commission rates
  DEFAULT_PURCHASE_COMMISSION: 5, // 5%
  DEFAULT_SHIPPING_COMMISSION: 0, // 0%
  
  // Bot
  BOT_SCENES: {
    REGISTRATION: 'registration',
    SHIPPING: 'shipping',
    PURCHASE: 'purchase',
    SUPPORT: 'support',
    PAYMENT: 'payment',
    SETTINGS: 'settings'
  },
  
  // Admin permissions
  PERMISSIONS: {
    SUPER_ADMIN: ['*'],
    ORDER_MANAGER: [
      'orders.view',
      'orders.edit',
      'orders.status',
      'users.view',
      'scanner.use'
    ],
    SUPPORT_OPERATOR: [
      'support.view',
      'support.reply',
      'users.view'
    ],
    WAREHOUSE_OPERATOR: [
      'scanner.use',
      'orders.view',
      'orders.status',
      'inventory.view',
      'inventory.edit'
    ],
    CONTENT_MANAGER: [
      'products.view',
      'products.edit',
      'countries.edit',
      'notifications.send'
    ],
    FINANCE_MANAGER: [
      'transactions.view',
      'reports.view',
      'refunds.process',
      'users.balance'
    ]
  }
};

export const ORDER_STATUS_LABELS = {
  [OrderStatus.PENDING]: '⏳ Ожидает оплаты',
  [OrderStatus.PAID]: '✅ Оплачен',
  [OrderStatus.PROCESSING]: '⚙️ В обработке',
  [OrderStatus.PURCHASING]: '🛍 Покупается',
  [OrderStatus.WAREHOUSE_RECEIVED]: '📦 Принят на складе',
  [OrderStatus.PACKING]: '📦 Упаковывается',
  [OrderStatus.SHIPPED]: '✈️ Отправлен',
  [OrderStatus.IN_TRANSIT]: '🚚 В пути',
  [OrderStatus.CUSTOMS_CLEARANCE]: '🏛 Таможенное оформление',
  [OrderStatus.ARRIVED]: '📍 Прибыл в страну',
  [OrderStatus.LOCAL_DELIVERY]: '🚚 Местная доставка',
  [OrderStatus.READY_FOR_PICKUP]: '📬 Готов к выдаче',
  [OrderStatus.DELIVERED]: '✅ Доставлен',
  [OrderStatus.CANCELLED]: '❌ Отменен',
  [OrderStatus.REFUNDED]: '💰 Возвращен'
};

export const EMOJI = {
  // Countries
  USA: '🇺🇸',
  CHINA: '🇨🇳',
  TURKEY: '🇹🇷',
  UK: '🇬🇧',
  GERMANY: '🇩🇪',
  JAPAN: '🇯🇵',
  KOREA: '🇰🇷',
  
  // Navigation
  BACK: '⬅️',
  NEXT: '➡️',
  HOME: '🏠',
  MENU: '☰',
  CLOSE: '❌',
  
  // Actions
  ADD: '➕',
  EDIT: '✏️',
  DELETE: '🗑',
  SAVE: '💾',
  SEARCH: '🔍',
  REFRESH: '🔄',
  
  // Status
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  
  // Features
  PACKAGE: '📦',
  SHIPPING: '✈️',
  PURCHASE: '🛍',
  SUPPORT: '💬',
  PROFILE: '👤',
  SETTINGS: '⚙️',
  BALANCE: '💰',
  CALCULATOR: '📊',
  NOTIFICATION: '🔔',
  
  // Other
  FIRE: '🔥',
  STAR: '⭐',
  HEART: '❤️',
  PHONE: '📱',
  EMAIL: '📧',
  LOCATION: '📍',
  CALENDAR: '📅',
  CLOCK: '🕐'
};