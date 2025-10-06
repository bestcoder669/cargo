import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { logger } from '../logger';

export async function authPlugin(app: FastifyInstance) {
  // Декоратор для проверки аутентификации
  app.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Missing authentication token'
        });
      }
      
      const decoded = await request.jwtVerify();
      request.user = decoded;
      
    } catch (err) {
      logger.error('Auth error:', err);
      return reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      });
    }
  });
  
  // Декоратор для проверки ролей админа
  app.decorate('requireAdmin', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      await app.authenticate(request, reply);
      
      if (!request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required'
        });
      }
      
    } catch (err) {
      logger.error('Admin auth error:', err);
      return reply.code(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
  });
  
  // Декоратор для проверки конкретной роли
  app.decorate('requireRole', function(role: string) {
    return async function(request: FastifyRequest, reply: FastifyReply) {
      try {
        await app.authenticate(request, reply);
        
        if (!request.user.role || request.user.role !== role) {
          return reply.code(403).send({
            success: false,
            error: 'FORBIDDEN',
            message: `Role ${role} required`
          });
        }
        
      } catch (err) {
        logger.error('Role check error:', err);
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN',
          message: 'Insufficient permissions'
        });
      }
    };
  });
}