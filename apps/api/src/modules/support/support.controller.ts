// apps/api/src/modules/support/support.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { supportService } from './support.service';
import { logger } from '../../core/logger';

class SupportController {
  async createChat(request: FastifyRequest<{
    Body: {
      userId?: number;
      message?: string;
      initialMessage?: string;
      subject?: string;
    }
  }>, reply: FastifyReply) {
    try {
      // Bot sends userId, initialMessage; Web sends message
      const isBot = request.user.role === 'bot';
      const userId = isBot ? (request.body.userId || 0) : request.user.id;
      const message = request.body.initialMessage || request.body.message || '';

      if (!message) {
        return reply.code(400).send({
          success: false,
          error: 'MESSAGE_REQUIRED'
        });
      }

      const chat = await supportService.createChat(
        userId,
        message,
        request.body.subject
      );

      reply.code(201).send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Create chat error:', error);
      throw error;
    }
  }
  
  async getChats(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const chats = await supportService.getChats(request.query);
      
      reply.send({
        success: true,
        ...chats
      });
    } catch (error) {
      logger.error('Get chats error:', error);
      throw error;
    }
  }
  
  async getChat(request: FastifyRequest<{
    Params: { id: string };
    Querystring: { markAsRead?: string }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const markAsRead = request.query.markAsRead === 'true';
      
      const chat = await supportService.getChat(chatId, markAsRead);
      
      if (!chat) {
        return reply.code(404).send({
          success: false,
          error: 'CHAT_NOT_FOUND'
        });
      }
      
      // Check access
      if (chat.userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Get chat error:', error);
      throw error;
    }
  }
  
  async sendMessage(request: FastifyRequest<{
    Params: { id: string };
    Body: {
      text: string;
      attachments?: any[];
    }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      
      // Check access
      const chat = await supportService.getChat(chatId);
      if (!chat) {
        return reply.code(404).send({
          success: false,
          error: 'CHAT_NOT_FOUND'
        });
      }
      
      const fromUser = !request.user.adminId;
      
      if (fromUser && chat.userId !== request.user.id) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const message = await supportService.sendMessage({
        chatId,
        text: request.body.text,
        fromUser,
        operatorId: request.user.adminId,
        attachments: request.body.attachments
      });
      
      reply.send({
        success: true,
        data: message
      });
    } catch (error) {
      logger.error('Send message error:', error);
      throw error;
    }
  }
  
  async assignChat(request: FastifyRequest<{
    Params: { id: string };
    Body: { operatorId?: number }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const operatorId = request.body.operatorId || request.user.adminId;
      
      const chat = await supportService.assignChat(chatId, operatorId);
      
      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Assign chat error:', error);
      throw error;
    }
  }
  
  async closeChat(request: FastifyRequest<{
    Params: { id: string };
    Body: { resolved?: boolean }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const resolved = request.body.resolved !== false;

      // If request is from bot, close on behalf of user (no operatorId)
      // Otherwise use adminId
      const operatorId = request.user.role === 'bot' ? null : request.user.adminId;

      const chat = await supportService.closeChat(
        chatId,
        operatorId,
        resolved
      );

      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Close chat error:', error);
      throw error;
    }
  }
  
  async changePriority(request: FastifyRequest<{
    Params: { id: string };
    Body: { priority: number }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const chat = await supportService.changePriority(
        chatId,
        request.body.priority
      );
      
      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Change priority error:', error);
      throw error;
    }
  }
  
  async searchChats(request: FastifyRequest<{
    Querystring: { q: string }
  }>, reply: FastifyReply) {
    try {
      const chats = await supportService.searchChats(request.query.q);
      
      reply.send({
        success: true,
        data: chats
      });
    } catch (error) {
      logger.error('Search chats error:', error);
      throw error;
    }
  }
  
  async getUserHistory(request: FastifyRequest<{
    Params: { userId: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.userId);

      // Allow bot or check access
      const isBot = request.user.role === 'bot';
      if (!isBot && userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }

      const history = await supportService.getUserChatHistory(userId);

      reply.send({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Get user history error:', error);
      throw error;
    }
  }
  
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await supportService.getChatStats();

      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      throw error;
    }
  }

  async rateChat(request: FastifyRequest<{
    Params: { id: string };
    Body: { rating: number }
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const chat = await supportService.rateChat(chatId, request.body.rating);

      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Rate chat error:', error);
      throw error;
    }
  }

  async updateChat(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const chatId = parseInt(request.params.id);
      const chat = await supportService.updateChat(chatId, request.body);

      reply.send({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Update chat error:', error);
      throw error;
    }
  }
}

export const supportController = new SupportController();