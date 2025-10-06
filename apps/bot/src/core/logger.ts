// ==================== apps/bot/src/core/logger.ts ====================

import winston from 'winston';
import { config } from './config';

// Safe JSON stringifier that handles circular references
const safeStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name
      };
    }
    return value;
  }, 2);
};

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? safeStringify(meta) : ''
    }`;
  })
);

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

if (config.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/production.log',
    format: winston.format.json()
  }));
}