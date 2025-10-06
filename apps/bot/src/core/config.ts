// ==================== apps/bot/src/core/config.ts ====================
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
  // Bot
  BOT_TOKEN: z.string(),
  BOT_USERNAME: z.string().optional(),

  // API
  API_URL: z.string().url(),
  API_KEY: z.string().optional(),

  // WebSocket
  WS_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379), // 👈 изменено на coerce
  REDIS_PASSWORD: z.string().optional(),

  // Admin
  ADMIN_URL: z.string().url(),
  ADMIN_IDS: z.string().transform(s => s.split(',').map(Number)),
  SUPER_ADMIN_IDS: z.string().transform(s => s.split(',').map(Number)),

  // Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  CRYPTO_PAYMENT_KEY: z.string().optional(),
  SBP_MERCHANT_ID: z.string().optional(),

  // Files
  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 👈 изменено на coerce

  // Other
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string(),

  // Limits
  MAX_MESSAGE_LENGTH: z.coerce.number().default(4096), // 👈 тоже лучше изменить
  SESSION_TIMEOUT: z.coerce.number().default(30 * 60 * 1000), // 👈 и это тоже
});

export const config = configSchema.parse(process.env);