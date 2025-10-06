// apps/api/src/types/fastify.d.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (role: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    io: SocketIOServer;
  }
  
  interface FastifyRequest {
    user?: {
      id: number;
      adminId?: number;
      role?: string;
      [key: string]: any;
    };
  }
}