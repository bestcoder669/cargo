// ==================== apps/api/src/modules/auth/auth.controller.ts ====================

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { config } from '../../core/config';
import { CreateUserDto } from '@cargoexpress/shared';
import { logger } from '../../core/logger';


class AuthController {
  async register(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const user = await authService.register(request.body as CreateUserDto);

      reply.code(201).send({
        success: true,
        data: user,
        message: 'User registered successfully'
      });
    } catch (error: any) {
      logger.error('Registration error:', error);

      if (error.message === 'User already exists') {
        return reply.code(409).send({
          success: false,
          error: 'USER_EXISTS',
          message: 'User with this telegram ID already exists'
        });
      }
      
      throw error;
    }
  }
  
  async login(
    request: FastifyRequest<{ Body: { phone: string; password?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const result = await authService.login(request.body);

      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Login error:', error);

      if (error.message === 'Invalid credentials') {
        return reply.code(401).send({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }
      
      throw error;
    }
  }
  
  async refresh(
    request: FastifyRequest<{ Body: { refreshToken: string } }>,
    reply: FastifyReply
  ) {
    try {
      const result = await authService.refreshToken(request.body.refreshToken);

      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Refresh token error:', error);

      return reply.code(401).send({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
  }

  async verifyBot(
    request: FastifyRequest<{ Body: { telegramId: number } }>,
    reply: FastifyReply
  ) {
    try {
      // Verify bot token
      const botToken = request.headers['x-bot-token'];

      if (botToken !== config.BOT_TOKEN) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid bot token'
        });
      }

      const user = await authService.getUserByTelegramId(request.body.telegramId);

      reply.send({
        success: true,
        data: user
      });
    } catch (error: any) {
      logger.error('Bot verification error:', error);

      return reply.code(404).send({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }
  }

  async generateAdminToken(
    request: FastifyRequest<{ Body: { telegramId: number } }>,
    reply: FastifyReply
  ) {
    try {
      const token = await authService.generateAdminToken(request.body);

      reply.send({
        success: true,
        data: { token }
      });
    } catch (error: any) {
      logger.error('Admin token generation error:', error);

      return reply.code(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: 'Not authorized as admin'
      });
    }
  }

  async validateAdminToken(
    request: FastifyRequest<{ Params: { token: string } }>,
    reply: FastifyReply
  ) {
    try {
      const result = await authService.validateAdminToken(request.params.token);

      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Admin token validation error:', error);

      return reply.code(401).send({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }
  }

  async refreshAdminToken(
    request: FastifyRequest<{ Body: { refreshToken: string } }>,
    reply: FastifyReply
  ) {
    try {
      const result = await authService.refreshAdminToken(request.body.refreshToken);

      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Admin refresh error:', error);

      return reply.code(401).send({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
  }

  async logout(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Just acknowledge logout - tokens are stateless
      reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}

export const authController = new AuthController();

