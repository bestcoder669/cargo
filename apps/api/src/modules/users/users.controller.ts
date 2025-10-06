// apps/api/src/modules/users/users.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { usersService } from './users.service';
import { UpdateUserDto } from '@cargoexpress/shared';
import { logger } from '../../core/logger';

class UsersController {
  async getUsers(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const users = await usersService.getUsers(request.query);
      reply.send({
        success: true,
        ...users
      });
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }
  
  async getUserById(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const user = await usersService.getUserById(parseInt(request.params.id));

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'USER_NOT_FOUND'
        });
      }

      reply.send({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  async getUserByTelegramId(request: FastifyRequest<{
    Params: { telegramId: string }
  }>, reply: FastifyReply) {
    try {
      const user = await usersService.getUserByTelegramId(BigInt(request.params.telegramId));

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'USER_NOT_FOUND'
        });
      }

      reply.send({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get user by telegram ID error:', error);
      throw error;
    }
  }

  async getUserProfile(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);

      // Allow bot or check ownership or admin
      const isBot = request.user.role === 'bot';
      if (!isBot && request.user.id !== userId && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }

      const profile = await usersService.getUserProfile(userId);

      if (!profile) {
        return reply.code(404).send({
          success: false,
          error: 'USER_NOT_FOUND'
        });
      }

      reply.send({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw error;
    }
  }

  async updateUser(request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateUserDto
  }>, reply: FastifyReply) {
    try {
      // Check if updating self or is admin
      const userId = parseInt(request.params.id);
      const requestUserId = request.user.id;
      const isAdmin = request.user.role;
      
      if (userId !== requestUserId && !isAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const user = await usersService.updateUser(userId, request.body);
      
      reply.send({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }
  
  async getUserAddresses(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      const addresses = await usersService.getUserAddresses(userId);
      
      reply.send({
        success: true,
        data: addresses
      });
    } catch (error) {
      logger.error('Get addresses error:', error);
      throw error;
    }
  }
  
  async createAddress(request: FastifyRequest<{
    Params: { id: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      
      // Check ownership
      if (userId !== request.user.id && !request.user.role) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const address = await usersService.createAddress(userId, request.body);
      
      reply.code(201).send({
        success: true,
        data: address
      });
    } catch (error) {
      logger.error('Create address error:', error);
      throw error;
    }
  }
  
  async updateAddress(request: FastifyRequest<{
    Params: { id: string; addressId: string };
    Body: any
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      const addressId = parseInt(request.params.addressId);
      
      // Check ownership
      if (userId !== request.user.id && !request.user.role) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const address = await usersService.updateAddress(
        addressId,
        userId,
        request.body
      );
      
      reply.send({
        success: true,
        data: address
      });
    } catch (error) {
      logger.error('Update address error:', error);
      throw error;
    }
  }
  
  async deleteAddress(request: FastifyRequest<{
    Params: { id: string; addressId: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      const addressId = parseInt(request.params.addressId);
      
      // Check ownership
      if (userId !== request.user.id && !request.user.role) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      await usersService.deleteAddress(addressId, userId);
      
      reply.send({
        success: true,
        message: 'Address deleted'
      });
    } catch (error) {
      logger.error('Delete address error:', error);
      throw error;
    }
  }
  
  async getUserOrders(request: FastifyRequest<{
    Params: { id: string };
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      
      // Check ownership
      if (userId !== request.user.id && !request.user.role) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const orders = await usersService.getUserOrders(userId, request.query);
      
      reply.send({
        success: true,
        ...orders
      });
    } catch (error) {
      logger.error('Get user orders error:', error);
      throw error;
    }
  }
  
  async getUserTransactions(request: FastifyRequest<{
    Params: { id: string };
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      
      // Check ownership
      if (userId !== request.user.id && !request.user.role) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const transactions = await usersService.getUserTransactions(
        userId,
        request.query
      );
      
      reply.send({
        success: true,
        ...transactions
      });
    } catch (error) {
      logger.error('Get user transactions error:', error);
      throw error;
    }
  }
  
  async banUser(request: FastifyRequest<{
    Params: { id: string };
    Body: { reason: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      const adminId = request.user.adminId;
      
      await usersService.banUser(
        userId,
        request.body.reason,
        adminId
      );
      
      reply.send({
        success: true,
        message: 'User banned'
      });
    } catch (error) {
      logger.error('Ban user error:', error);
      throw error;
    }
  }
  
  async unbanUser(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);
      const adminId = request.user.adminId;

      await usersService.unbanUser(userId, adminId);

      reply.send({
        success: true,
        message: 'User unbanned'
      });
    } catch (error) {
      logger.error('Unban user error:', error);
      throw error;
    }
  }

  async getUserBalance(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);

      // Allow bot or check ownership or admin
      const isBot = request.user.role === 'bot';
      if (!isBot && userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }

      const balance = await usersService.getUserBalance(userId);

      reply.send({
        success: true,
        data: balance
      });
    } catch (error) {
      logger.error('Get user balance error:', error);
      throw error;
    }
  }

  async depositBalance(request: FastifyRequest<{
    Params: { id: string };
    Body: { amount: number; method: string }
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.id);

      // Check ownership or admin
      if (userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }

      const transaction = await usersService.depositBalance(
        userId,
        request.body.amount,
        request.body.method
      );

      reply.send({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Deposit balance error:', error);
      throw error;
    }
  }
}

export const usersController = new UsersController();