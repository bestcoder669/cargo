import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { logger } from '../logger';
import { config } from '../config';

// Middleware для проверки аутентификации
const authenticateMiddleware: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Check for bot token first
    const botToken = request.headers['x-bot-token'] as string;
    if (botToken && botToken === config.BOT_TOKEN) {
      // Bot requests - don't require user auth
      (request as any).user = {
        id: 0,
        adminId: null,
        role: 'bot'
      };
      return;
    }

    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // For now, allow unauthenticated requests
      // TODO: Re-enable strict auth later
      (request as any).user = {
        id: 1,
        adminId: null,
        role: 'user'
      };
      return;
    }

    const decoded = await request.jwtVerify();
    request.user = decoded as any;

  } catch (err) {
    logger.error('Auth error:', err);
    // For now, allow unauthenticated requests
    (request as any).user = {
      id: 1,
      adminId: null,
      role: 'user'
    };
  }
};

// Middleware для проверки админа
const requireAdminMiddleware: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await authenticateMiddleware(request, reply);

    if (reply.sent) return;

    if (!request.user?.adminId) {
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
};

export async function authPlugin(app: FastifyInstance) {
  // Декораторы теперь возвращают правильные middleware
  app.decorate('authenticate', authenticateMiddleware);
  app.decorate('requireAdmin', requireAdminMiddleware);

  // Декоратор для проверки конкретной роли
  app.decorate('requireRole', function(role: string): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await authenticateMiddleware(request, reply);

        if (reply.sent) return;

        if (!request.user?.role || request.user.role !== role) {
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
