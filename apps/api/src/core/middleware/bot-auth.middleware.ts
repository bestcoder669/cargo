// apps/api/src/core/middleware/bot-auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';

export async function botAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const botToken = request.headers['x-bot-token'] as string;

  // Allow bot requests with valid token
  if (botToken && botToken === config.BOT_TOKEN) {
    // Bot requests - create a fake user context
    (request as any).user = {
      id: 0,
      adminId: null,
      role: 'bot'
    };
    return;
  }

  // For now, allow all requests (no auth required)
  // TODO: Implement proper JWT authentication
  (request as any).user = {
    id: 1, // Default user
    adminId: null,
    role: 'user'
  };
}
