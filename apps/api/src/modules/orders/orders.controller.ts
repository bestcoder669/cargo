// apps/api/src/modules/orders/orders.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ordersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { io } from '../../core/websocket/server';
import { SocketEvents } from '@cargoexpress/shared';

class OrdersController {
  async createOrder(request: FastifyRequest<{
    Body: CreateOrderDto & { userId?: number }
  }>, reply: FastifyReply) {
    try {
      // If request is from bot, use userId from body; otherwise use authenticated user
      const userId = request.user.role === 'bot'
        ? request.body.userId!
        : request.user.id;

      const order = await ordersService.createOrder({
        ...request.body,
        userId
      });

      // Notify via WebSocket
      io.emit(SocketEvents.ORDER_CREATED, order);

      reply.code(201).send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Create order error:', error);
      throw error;
    }
  }
  
  async getOrders(request: FastifyRequest<{
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const filters = { ...request.query };

      // If not admin, filter by user
      if (!request.user.adminId) {
        filters.userId = request.user.id;
      }

      const orders = await ordersService.getOrders(filters);

      reply.send({
        success: true,
        ...orders
      });
    } catch (error) {
      logger.error('Get orders error:', error);
      throw error;
    }
  }

  async getUserOrders(request: FastifyRequest<{
    Params: { userId: string };
    Querystring: any
  }>, reply: FastifyReply) {
    try {
      const userId = parseInt(request.params.userId);

      // Allow bot or check ownership or admin
      const isBot = request.user.role === 'bot';
      if (!isBot && request.user.id !== userId && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }

      const filters = { ...request.query, userId };
      const orders = await ordersService.getOrders(filters);

      reply.send({
        success: true,
        ...orders
      });
    } catch (error) {
      logger.error('Get user orders error:', error);
      throw error;
    }
  }
  
  async getOrder(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const order = await ordersService.getOrder(parseInt(request.params.id));
      
      if (!order) {
        return reply.code(404).send({
          success: false,
          error: 'ORDER_NOT_FOUND'
        });
      }
      
      // Check ownership (allow bot to access all orders)
      const isBot = request.user.role === 'bot';
      if (!isBot && order.userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      reply.send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Get order error:', error);
      throw error;
    }
  }
  
  async updateOrder(request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateOrderDto
  }>, reply: FastifyReply) {
    try {
      // Only admins can update orders
      if (!request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const order = await ordersService.updateOrder(
        parseInt(request.params.id),
        request.body,
        request.user.adminId
      );
      
      // Notify via WebSocket
      io.emit(SocketEvents.ORDER_UPDATED, order);
      
      if (request.body.status) {
        io.emit(SocketEvents.ORDER_STATUS_CHANGED, {
          orderId: order.id,
          newStatus: request.body.status,
          userId: order.userId
        });
      }
      
      reply.send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Update order error:', error);
      throw error;
    }
  }
  
  async cancelOrder(request: FastifyRequest<{
    Params: { id: string };
    Body: { reason?: string }
  }>, reply: FastifyReply) {
    try {
      const orderId = parseInt(request.params.id);
      const order = await ordersService.getOrder(orderId);
      
      if (!order) {
        return reply.code(404).send({
          success: false,
          error: 'ORDER_NOT_FOUND'
        });
      }
      
      // Check ownership or admin
      if (order.userId !== request.user.id && !request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      await ordersService.cancelOrder(
        orderId,
        request.body.reason,
        request.user.id
      );
      
      // Notify
      io.emit(SocketEvents.ORDER_CANCELLED, {
        orderId,
        userId: order.userId
      });
      
      reply.send({
        success: true,
        message: 'Order cancelled'
      });
    } catch (error) {
      logger.error('Cancel order error:', error);
      throw error;
    }
  }
  
  async getOrderByTrackNumber(request: FastifyRequest<{
    Params: { trackNumber: string }
  }>, reply: FastifyReply) {
    try {
      const order = await ordersService.getOrderByTrackNumber(
        request.params.trackNumber
      );
      
      if (!order) {
        return reply.code(404).send({
          success: false,
          error: 'ORDER_NOT_FOUND'
        });
      }
      
      // Public tracking - limited info
      if (!request.user) {
        reply.send({
          success: true,
          data: {
            trackNumber: order.trackNumber,
            status: order.status,
            type: order.type,
            createdAt: order.createdAt,
            warehouse: order.warehouse,
            statusHistory: order.statusHistory.map(h => ({
              status: h.toStatus,
              createdAt: h.createdAt
            }))
          }
        });
      } else {
        // Full info for owner/admin
        if (order.userId === request.user.id || request.user.adminId) {
          reply.send({
            success: true,
            data: order
          });
        } else {
          reply.code(403).send({
            success: false,
            error: 'FORBIDDEN'
          });
        }
      }
    } catch (error) {
      logger.error('Track order error:', error);
      throw error;
    }
  }
  
  async searchOrders(request: FastifyRequest<{
    Querystring: { q: string }
  }>, reply: FastifyReply) {
    try {
      const orders = await ordersService.searchOrders(
        request.query.q,
        request.user.adminId ? undefined : request.user.id
      );
      
      reply.send({
        success: true,
        data: orders
      });
    } catch (error) {
      logger.error('Search orders error:', error);
      throw error;
    }
  }
  
  async bulkUpdateStatus(request: FastifyRequest<{
    Body: {
      orderIds: number[];
      status: string;
      comment?: string;
    }
  }>, reply: FastifyReply) {
    try {
      // Admin only
      if (!request.user.adminId) {
        return reply.code(403).send({
          success: false,
          error: 'FORBIDDEN'
        });
      }
      
      const results = await ordersService.bulkUpdateStatus({
        ...request.body,
        adminId: request.user.adminId
      });
      
      // Notify each update
      results.forEach(result => {
        if (result.success) {
          io.emit(SocketEvents.ORDER_STATUS_CHANGED, {
            orderId: result.orderId,
            newStatus: request.body.status
          });
        }
      });
      
      reply.send({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Bulk update error:', error);
      throw error;
    }
  }
  
  async uploadPhoto(request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      const orderId = parseInt(request.params.id);
      const photo = await ordersService.uploadOrderPhoto(
        orderId,
        data,
        request.user.adminId || request.user.id
      );
      
      reply.send({
        success: true,
        data: photo
      });
    } catch (error) {
      logger.error('Upload photo error:', error);
      throw error;
    }
  }
  
  async getStatistics(request: FastifyRequest<{
    Querystring: {
      dateFrom?: string;
      dateTo?: string;
      warehouseId?: string;
    }
  }>, reply: FastifyReply) {
    try {
      const stats = await ordersService.getOrderStatistics(request.query);
      
      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get statistics error:', error);
      throw error;
    }
  }
}

export const ordersController = new OrdersController();