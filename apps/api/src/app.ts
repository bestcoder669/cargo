// ==================== apps/api/src/app.ts ====================

import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { config } from './core/config';
import { errorHandler } from './core/plugins/error-handler';
import { authPlugin } from './core/plugins/auth';
import { registerModules } from './modules';
import { healthCheckRoute } from './core/routes/health';

export async function initializeApp(app: FastifyInstance) {
  // CORS
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true
  });
  
  // JWT
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN
    }
  });
  
  // File upload
  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: config.MAX_FILES
    }
  });
  
  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
    whitelist: ['127.0.0.1'],
    redis: redis
  });
  
  // WebSocket support
  await app.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      clientTracking: true
    }
  });
  
  // API Documentation
  if (config.NODE_ENV !== 'production') {
    await app.register(swagger, {
      swagger: {
        info: {
          title: 'CargoExpress API',
          description: 'International Shipping Platform API',
          version: '2.1.0'
        },
        externalDocs: {
          url: 'https://docs.cargoexpress.com',
          description: 'Find more info here'
        },
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'users', description: 'User management' },
          { name: 'orders', description: 'Order management' },
          { name: 'scanner', description: 'Scanner operations' },
          { name: 'support', description: 'Support system' }
        ],
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json']
      }
    });
    
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    });
  }
  
  // Custom plugins
  await app.register(errorHandler);
  await app.register(authPlugin);
  
  // Health check
  app.get('/health', healthCheckRoute);
  
  // Register all modules
  await registerModules(app);
  
  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: 'Route not found',
      message: `Route ${request.method} ${request.url} not found`
    });
  });
}

