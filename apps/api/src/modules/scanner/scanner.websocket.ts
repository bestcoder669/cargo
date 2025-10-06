// apps/api/src/modules/scanner/scanner.websocket.ts
import { FastifyRequest } from 'fastify';
import { Socket } from 'socket.io';
import { scannerService } from './scanner.service';
import { logger } from '../../core/logger';

export async function scannerWebsocket(
  connection: any, // WebSocket connection
  request: FastifyRequest
) {
  logger.info('Scanner WebSocket connected');
  
  // Verify admin auth
  if (!request.user?.adminId) {
    connection.socket.close();
    return;
  }
  
  const adminId = request.user.adminId;
  
  connection.socket.on('message', async (message: any) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'START_SESSION':
          const session = await scannerService.startSession({
            adminId,
            targetStatus: data.targetStatus,
            confirmationMode: data.confirmationMode,
            soundEnabled: data.soundEnabled
          });
          
          connection.socket.send(JSON.stringify({
            type: 'SESSION_STARTED',
            sessionId: session.id,
            config: session.config
          }));
          break;
          
        case 'SCAN':
          const result = await scannerService.processScan({
            sessionId: data.sessionId,
            trackNumber: data.trackNumber,
            timestamp: new Date()
          });
          
          connection.socket.send(JSON.stringify({
            type: 'SCAN_RESULT',
            ...result
          }));
          break;
          
        case 'CONFIRM_SCAN':
          const confirmed = await scannerService.confirmScan({
            sessionId: data.sessionId,
            trackNumber: data.trackNumber,
            confirmed: data.confirmed
          });
          
          connection.socket.send(JSON.stringify({
            type: 'SCAN_CONFIRMED',
            ...confirmed
          }));
          break;
          
        case 'END_SESSION':
          const ended = await scannerService.endSession(data.sessionId);
          
          connection.socket.send(JSON.stringify({
            type: 'SESSION_ENDED',
            session: ended
          }));
          break;
          
        case 'PING':
          connection.socket.send(JSON.stringify({ type: 'PONG' }));
          break;
      }
    } catch (error) {
      logger.error('Scanner WebSocket error:', error);
      
      connection.socket.send(JSON.stringify({
        type: 'ERROR',
        message: error.message
      }));
    }
  });
  
  connection.socket.on('close', () => {
    logger.info('Scanner WebSocket disconnected');
  });
}