import { FastifyInstance, FastifyError } from 'fastify';
import { logger } from '../logger';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    logger.error('Request error:', error);
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal Server Error',
      code: error.code
    });
  });
}
