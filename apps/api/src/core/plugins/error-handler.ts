import { FastifyInstance } from 'fastify';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    console.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error'
    });
  });
}
