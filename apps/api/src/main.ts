// ==================== apps/api/src/main.ts ====================

import fastify from 'fastify';
import { config } from './core/config';
import { initializeApp } from './app';
import { logger } from './core/logger';
import { prisma } from '@cargoexpress/prisma';
import { redis } from './core/redis';
import { initializeWebSocket } from './core/websocket/server';

// Fix BigInt serialization
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

async function bootstrap() {
  try {
    logger.info('Starting CargoExpress API Server...');
    
    // Create Fastify instance
    const app = fastify({
      logger: {
        level: config.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      },
      trustProxy: true,
      bodyLimit: config.MAX_BODY_SIZE
    });
    
    // Initialize app with plugins and routes
    await initializeApp(app);
    
    // Initialize WebSocket server
    const io = await initializeWebSocket(app.server);
    
    // Store io instance for global access
    app.decorate('io', io);
    
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');
    
    // Connect to Redis
    await redis.ping();
    logger.info('Redis connected');
    
    // Start server
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0'
    });
    
    logger.info(`API Server running on port ${config.PORT}`);
    logger.info(`WebSocket Server running on port ${config.WS_PORT}`);
    
    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        
        await app.close();
        await prisma.$disconnect();
        redis.disconnect();
        io.close();
        
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

