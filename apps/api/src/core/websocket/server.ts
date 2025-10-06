// ==================== apps/api/src/core/websocket/server.ts ====================

import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { config } from '../config';
import { logger } from '../logger';
import { redis } from '../redis';
import { authService } from '../../modules/auth/auth.service';
import { SocketEvents } from '@cargoexpress/shared';

let io: SocketServer;

export async function initializeWebSocket(server: Server): Promise<SocketServer> {
  io = new SocketServer(server, {
    cors: {
      origin: config.CORS_ORIGINS,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const type = socket.handshake.auth.type || 'user';
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      if (type === 'bot') {
        // Bot authentication
        if (token !== config.BOT_TOKEN) {
          return next(new Error('Invalid bot token'));
        }
        socket.data.type = 'bot';
        socket.data.authenticated = true;
      } else if (type === 'admin') {
        // Admin authentication
        const admin = await authService.verifyAdminToken(token);
        socket.data.type = 'admin';
        socket.data.admin = admin;
        socket.data.authenticated = true;
      } else {
        // User authentication
        const user = await authService.verifyUserToken(token);
        socket.data.type = 'user';
        socket.data.user = user;
        socket.data.authenticated = true;
      }
      
      next();
    } catch (error) {
      logger.error('WebSocket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket connected: ${socket.id} (${socket.data.type})`);
    
    // Join rooms based on type
    if (socket.data.type === 'admin') {
      socket.join('admins');
      socket.join(`admin:${socket.data.admin.id}`);
      
      // Notify other admins
      socket.broadcast.to('admins').emit(SocketEvents.ADMIN_CONNECTED, {
        adminId: socket.data.admin.id,
        name: socket.data.admin.firstName
      });
    } else if (socket.data.type === 'user') {
      socket.join(`user:${socket.data.user.id}`);
    } else if (socket.data.type === 'bot') {
      socket.join('bot');
    }
    
    // Handle scanner events
    socket.on(SocketEvents.SCANNER_SESSION_START, async (data) => {
      if (socket.data.type !== 'admin') {
        return socket.emit('error', 'Unauthorized');
      }
      
      socket.join(`scanner:${data.sessionId}`);
      socket.broadcast.to('admins').emit(SocketEvents.SCANNER_SESSION_START, data);
    });
    
    socket.on(SocketEvents.SCANNER_SESSION_END, async (data) => {
      socket.leave(`scanner:${data.sessionId}`);
      socket.broadcast.to('admins').emit(SocketEvents.SCANNER_SESSION_END, data);
    });
    
    socket.on(SocketEvents.SCANNER_SCAN, async (data) => {
      io.to(`scanner:${data.sessionId}`).emit(SocketEvents.SCANNER_SCAN, data);
    });
    
    // Handle support events
    socket.on(SocketEvents.SUPPORT_NEW_MESSAGE, async (data) => {
      // Store message
      await redis.lpush(
        `support:chat:${data.chatId}`,
        JSON.stringify(data)
      );
      
      // Notify operators
      io.to('support-operators').emit(SocketEvents.SUPPORT_NEW_MESSAGE, data);
      
      // Notify specific user
      if (data.userId) {
        io.to(`user:${data.userId}`).emit(SocketEvents.SUPPORT_NEW_MESSAGE, data);
      }
    });
    
    socket.on(SocketEvents.SUPPORT_TYPING, async (data) => {
      socket.broadcast.to(`support:chat:${data.chatId}`).emit(
        SocketEvents.SUPPORT_TYPING,
        data
      );
    });
    
    // Handle order events
    socket.on(SocketEvents.ORDER_STATUS_CHANGED, async (data) => {
      // Notify user
      io.to(`user:${data.userId}`).emit(SocketEvents.ORDER_STATUS_CHANGED, data);
      
      // Notify admins
      io.to('admins').emit(SocketEvents.ORDER_STATUS_CHANGED, data);
      
      // Notify bot
      io.to('bot').emit(SocketEvents.ORDER_STATUS_CHANGED, data);
    });
    
    // Handle broadcast events
    socket.on(SocketEvents.BROADCAST_MESSAGE, async (data) => {
      if (socket.data.type !== 'admin') {
        return socket.emit('error', 'Unauthorized');
      }
      
      // Broadcast to all users
      io.emit(SocketEvents.BROADCAST_MESSAGE, data);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
      
      if (socket.data.type === 'admin') {
        socket.broadcast.to('admins').emit('admin:disconnected', {
          adminId: socket.data.admin.id
        });
      }
    });
    
    // Error handling
    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.id}:`, error);
    });
  });
  
  // Periodic ping to keep connections alive
  setInterval(() => {
    io.emit('ping');
  }, 30000);
  
  logger.info(`WebSocket server initialized on port ${config.WS_PORT}`);
  
  return io;
}

export { io };

