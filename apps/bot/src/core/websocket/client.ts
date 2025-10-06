// ==================== apps/bot/src/core/websocket/client.ts ====================

import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { logger } from '../logger';
import { SocketEvents } from '@cargoexpress/shared';
import EventEmitter from 'events';

class WebSocketClient extends EventEmitter {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(config.WS_URL, {
        auth: {
          token: config.BOT_TOKEN,
          type: 'bot'
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval
      });
      
      this.socket.on('connect', () => {
        logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        this.subscribeToEvents();
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        logger.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to WebSocket server'));
        }
      });
      
      this.socket.on('disconnect', (reason) => {
        logger.warn('WebSocket disconnected:', reason);
      });
      
      this.socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }
  
  private subscribeToEvents(): void {
    if (!this.socket) return;
    
    // Order events
    this.socket.on(SocketEvents.ORDER_STATUS_CHANGED, (data) => {
      this.emit('order:status_changed', data);
    });
    
    this.socket.on(SocketEvents.ORDER_PAID, (data) => {
      this.emit('order:paid', data);
    });
    
    // Support events
    this.socket.on(SocketEvents.SUPPORT_NEW_MESSAGE, (data) => {
      this.emit('support:new_message', data);
    });
    
    this.socket.on(SocketEvents.SUPPORT_CHAT_ASSIGNED, (data) => {
      this.emit('support:chat_assigned', data);
    });
    
    // Admin events
    this.socket.on(SocketEvents.ADMIN_ACTION, (data) => {
      this.emit('admin:action', data);
    });
    
    // Broadcast events
    this.socket.on(SocketEvents.BROADCAST_MESSAGE, (data) => {
      this.emit('broadcast:message', data);
    });
    
    this.socket.on(SocketEvents.BROADCAST_NOTIFICATION, (data) => {
      this.emit('broadcast:notification', data);
    });
    
    // Data updates
    this.socket.on(SocketEvents.DATA_UPDATE, (data) => {
      this.emit('data:update', data);
    });
  }
  
  emitEvent(event: string, data?: any): boolean {
    if (!this.socket) {
      logger.warn(`Cannot emit event ${event}: WebSocket not connected`);
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsClient = new WebSocketClient();