// ==================== apps/api/src/modules/scanner/index.ts ====================

import { FastifyPluginAsync } from 'fastify';
import { scannerController } from './scanner.controller';
import { scannerWebsocket } from './scanner.websocket';

export const scannerModule: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);
  
  // Scanner sessions
  fastify.post('/session/start', scannerController.startSession);
  fastify.post('/session/:id/end', scannerController.endSession);
  fastify.get('/session/:id', scannerController.getSession);
  fastify.get('/sessions', scannerController.getSessions);
  
  // Scanning
  fastify.post('/scan', scannerController.scan);
  fastify.post('/scan/confirm', scannerController.confirmScan);
  fastify.post('/bulk-update', scannerController.bulkUpdate);
  
  // Track info
  fastify.get('/track/:trackNumber', scannerController.getTrackInfo);
  
  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, scannerWebsocket);
};

