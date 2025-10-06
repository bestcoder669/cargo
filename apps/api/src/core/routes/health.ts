import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@cargoexpress/prisma';
import { redis } from '../redis';

export async function healthCheckRoute(_request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'healthy';

    // Check Redis
    await redis.ping();
    const redisStatus = 'healthy';

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    reply.code(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus
      },
      memory: memoryUsageMB,
      environment: process.env.NODE_ENV
    });

  } catch (error) {
    const err = error as Error;
    reply.code(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
}