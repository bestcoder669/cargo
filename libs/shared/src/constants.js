"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOJI = exports.ORDER_STATUS_LABELS = exports.CONSTANTS = void 0;
exports.CONSTANTS = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    MAX_ATTACHMENTS: 5,
    MAX_MESSAGE_LENGTH: 4096,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    ADMIN_TOKEN_TTL: 15 * 60,
    SCANNER_SESSION_TIMEOUT: 60 * 60 * 1000,
    CACHE_TTL: {
        COUNTRIES: 3600,
        CITIES: 3600,
        WAREHOUSES: 1800,
        PRODUCTS: 600,
        USER_PROFILE: 300,
        TARIFFS: 3600
    },
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
    RATE_LIMITS: {
        API_CALLS: 100,
        BOT_MESSAGES: 30,
        SCANNER_SCANS: 300,
        SUPPORT_MESSAGES: 10
    },
    VOLUMETRIC_DIVIDER: 5000,
    DEFAULT_PURCHASE_COMMISSION: 5,
    DEFAULT_SHIPPING_COMMISSION: 0,
    BOT_SCENES: {
        REGISTRATION: 'registration',
        SHIPPING: 'shipping',
        PURCHASE: 'purchase',
        SUPPORT: 'support',
        PAYMENT: 'payment',
        SETTINGS: 'settings'
    },
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
exports.ORDER_STATUS_LABELS = {
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
exports.EMOJI = {
    USA: '🇺🇸',
    CHINA: '🇨🇳',
    TURKEY: '🇹🇷',
    UK: '🇬🇧',
    GERMANY: '🇩🇪',
    JAPAN: '🇯🇵',
    KOREA: '🇰🇷',
    BACK: '⬅️',
    NEXT: '➡️',
    HOME: '🏠',
    MENU: '☰',
    CLOSE: '❌',
    ADD: '➕',
    EDIT: '✏️',
    DELETE: '🗑',
    SAVE: '💾',
    SEARCH: '🔍',
    REFRESH: '🔄',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    PACKAGE: '📦',
    SHIPPING: '✈️',
    PURCHASE: '🛍',
    SUPPORT: '💬',
    PROFILE: '👤',
    SETTINGS: '⚙️',
    BALANCE: '💰',
    CALCULATOR: '📊',
    NOTIFICATION: '🔔',
    FIRE: '🔥',
    STAR: '⭐',
    HEART: '❤️',
    PHONE: '📱',
    EMAIL: '📧',
    LOCATION: '📍',
    CALENDAR: '📅',
    CLOCK: '🕐'
};
//# sourceMappingURL=constants.js.map