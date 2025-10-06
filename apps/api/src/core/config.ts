// ==================== apps/api/src/core/config.ts ====================

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  WS_PORT: z.coerce.number().default(3001),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Bot
  BOT_TOKEN: z.string(),
  BOT_WEBHOOK_SECRET: z.string().optional(),
  
  // CORS
  CORS_ORIGINS: z.string().transform(s => s.split(',')).default('*'),
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  MAX_FILES: z.coerce.number().default(5),
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000), // 1 minute
  
  // Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CRYPTO_API_KEY: z.string().optional(),
  SBP_MERCHANT_ID: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@cargoexpress.com'),
  
  // SMS
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER: z.string().default('CargoExpress'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Body size
  MAX_BODY_SIZE: z.coerce.number().default(50 * 1024 * 1024) // 50MB
});

export const config = configSchema.parse(process.env);

