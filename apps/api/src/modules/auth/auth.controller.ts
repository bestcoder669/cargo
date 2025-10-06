// ==================== apps/api/src/modules/auth/auth.controller.ts ====================

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { CreateUserDto, LoginDto, AdminTokenDto } from './auth.dto';
import { logger } from '../../core/logger';

class AuthController {
  async register(
    request: FastifyRequest<{ Body: CreateUserDto }>,
    reply: FastifyReply
  ) {
    try {
      const user = await authService.register(request.body);
      
      reply.code(201).send({
        success: true,
        data: user,
        message: 'User registered successfully'
      });
    } catch (error) {
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
    request: FastifyRequest<{ Body: LoginDto }>,
    reply: FastifyReply
  ) {
    try {
      const result = await authService.login(request.body);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      logger.error('Bot verification error:', error);
      
      return reply.code(404).send({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }
  }
  
  async generateAdminToken(
    request: FastifyRequest<{ Body: AdminTokenDto }>,
    reply: FastifyReply
  ) {
    try {
      const token = await authService.generateAdminToken(request.body);
      
      reply.send({
        success: true,
        data: { token }
      });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      logger.error('Admin refresh error:', error);
      
      return reply.code(401).send({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
  }
  
  async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await authService.revokeToken(token);
      }
      
      reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}

export const authController = new AuthController();

