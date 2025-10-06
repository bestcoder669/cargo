// ==================== apps/api/src/modules/scanner/scanner.controller.ts ====================

import { FastifyRequest, FastifyReply } from 'fastify';
import { scannerService } from './scanner.service';
import { StartScannerSessionDto, ScanDto, ConfirmScanDto } from '@cargoexpress/shared';
import { logger } from '../../core/logger';
import { io } from '../../core/websocket/server';
import { SocketEvents } from '@cargoexpress/shared';

class ScannerController {
  async startSession(
    request: FastifyRequest<{ Body: StartScannerSessionDto }>,
    reply: FastifyReply
  ) {
    try {
      const adminId = request.user.id;
      const session = await scannerService.startSession({
        ...request.body,
        adminId
      });
      
      // Notify via WebSocket
      io.emit(SocketEvents.SCANNER_SESSION_START, session);
      
      reply.send({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Start scanner session error:', error);
      throw error;
    }
  }
  
  async endSession(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const session = await scannerService.endSession(request.params.id);
      
      // Notify via WebSocket
      io.emit(SocketEvents.SCANNER_SESSION_END, session);
      
      reply.send({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('End scanner session error:', error);
      throw error;
    }
  }
  
  async scan(
    request: FastifyRequest<{ Body: ScanDto }>,
    reply: FastifyReply
  ) {
    try {
      const result = await scannerService.processScan(request.body);
      
      // Notify via WebSocket
      io.to(`scanner_${request.body.sessionId}`).emit(
        SocketEvents.SCANNER_SCAN_RESULT,
        result
      );
      
      // If status changed, notify order update
      if (result.success && result.order) {
        io.emit(SocketEvents.ORDER_STATUS_CHANGED, {
          orderId: result.order.id,
          oldStatus: result.oldStatus,
          newStatus: result.newStatus
        });
      }
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Scan error:', error);
      
      io.to(`scanner_${request.body.sessionId}`).emit(
        SocketEvents.SCANNER_ERROR,
        { message: error.message }
      );
      
      throw error;
    }
  }
  
  async confirmScan(
    request: FastifyRequest<{ Body: ConfirmScanDto }>,
    reply: FastifyReply
  ) {
    try {
      const result = await scannerService.confirmScan(request.body);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Confirm scan error:', error);
      throw error;
    }
  }
  
  async bulkUpdate(
    request: FastifyRequest<{
      Body: {
        trackNumbers: string[];
        status: string;
        comment?: string;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const adminId = request.user.id;
      const results = await scannerService.bulkUpdateStatus({
        ...request.body,
        adminId
      });
      
      // Notify each order update
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
  
  async getTrackInfo(
    request: FastifyRequest<{ Params: { trackNumber: string } }>,
    reply: FastifyReply
  ) {
    try {
      const order = await scannerService.getOrderByTrackNumber(
        request.params.trackNumber
      );
      
      if (!order) {
        return reply.code(404).send({
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        });
      }
      
      reply.send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Get track info error:', error);
      throw error;
    }
  }
  
  async getSession(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const session = await scannerService.getSession(request.params.id);
      
      if (!session) {
        return reply.code(404).send({
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: 'Scanner session not found'
        });
      }
      
      reply.send({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Get session error:', error);
      throw error;
    }
  }
  
  async getSessions(
    request: FastifyRequest<{
      Querystring: {
        active?: boolean;
        adminId?: number;
        limit?: number;
        offset?: number;
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const sessions = await scannerService.getSessions(request.query);
      
      reply.send({
        success: true,
        data: sessions
      });
    } catch (error) {
      logger.error('Get sessions error:', error);
      throw error;
    }
  }
}

export const scannerController = new ScannerController();