// ==================== apps/api/src/modules/auth/index.ts ====================

import { FastifyPluginAsync } from 'fastify';
import { authController } from './auth.controller';

export const authModule: FastifyPluginAsync = async (fastify) => {
  // User registration from bot
  fastify.post('/register', authController.register);
  
  // User login
  fastify.post('/login', authController.login);
  
  // Refresh token
  fastify.post('/refresh', authController.refresh);
  
  // Bot verification
  fastify.post('/bot/verify', authController.verifyBot);
  
  // Admin token generation
  fastify.post('/admin/token', authController.generateAdminToken);
  
  // Admin token validation
  fastify.get('/admin/token/:token', authController.validateAdminToken);
  
  // Admin refresh
  fastify.post('/admin/refresh', authController.refreshAdminToken);
  
  // Logout
  fastify.post('/logout', async (request, reply) => {
    await fastify.authenticate(request, reply);
    if (reply.sent) return;
    return authController.logout(request, reply);
  });
};

