// apps/api/src/modules/admin/admin.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from './admin.service';
import { logger } from '../../core/logger';

class AdminController {
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await adminService.getAdminStats();
      
      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get dashboard error:', error);
      throw error;
    }
  }
  
  async getUsers(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const users = await adminService.getUsers(request.query);
      
      reply.send({
        success: true,
        ...users
      });
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }
  
  async searchUsers(request: FastifyRequest<{
    Querystring: { q: string }
  }>, reply: FastifyReply) {
    try {
      const users = await adminService.searchUsers(request.query.q);
      
      reply.send({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('Search users error:', error);
      throw error;
    }
  }
  
  async updateUserBalance(request: FastifyRequest<{
    Body: {
      userId: number;
      amount: number;
      reason: string;
    }
  }>, reply: FastifyReply) {
    try {
      const result = await adminService.updateUserBalance({
        ...request.body,
        adminId: request.user.adminId
      });
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Update balance error:', error);
      throw error;
    }
  }
  
  async getUsersCount(request: FastifyRequest<{
    Querystring: { audience: string }
  }>, reply: FastifyReply) {
    try {
      const count = await adminService.getUsersCount(request.query);
      
      reply.send({
        success: true,
        data: count
      });
    } catch (error) {
      logger.error('Get users count error:', error);
      throw error;
    }
  }
  
  async sendBroadcast(request: FastifyRequest<{
    Body: {
      audience: string;
      message: string;
    }
  }>, reply: FastifyReply) {
    try {
      const result = await adminService.sendBroadcast({
        ...request.body,
        adminId: request.user.adminId
      });
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Send broadcast error:', error);
      throw error;
    }
  }
  
  async getSupportChats(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const chats = await adminService.getSupportChats(request.query);
      
      reply.send({
        success: true,
        data: chats
      });
    } catch (error) {
      logger.error('Get support chats error:', error);
      throw error;
    }
  }
  
  async getFinanceStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await adminService.getFinanceStats();
      
      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get finance stats error:', error);
      throw error;
    }
  }
}

export const adminController = new AdminController();