import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import { logger } from './utils/logger';
import { config } from './config';

// Import routes
import healthRoutes from './routes/health.routes';
import paymentRoutes from './routes/payment.routes';
import merchantRoutes from './routes/merchant.routes';
import customerRoutes from './routes/customer.routes';
import transactionRoutes from './routes/transaction.routes';
import webhookRoutes from './routes/webhook.routes';
import simulatorRoutes from './routes/simulator.routes';

export async function buildServer(): Promise<FastifyInstance<any>> {
  const server = Fastify({
    logger: logger as any,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
  });

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  await server.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    }),
  });

  await server.register(jwt, {
    secret: config.jwt.secret,
  });

  // Swagger documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Payment Platform Simulator API',
        description: 'API documentation for Payment Platform Simulator',
        version: '1.0.0',
      },
      host: `localhost:${config.server.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Enter your API key with Bearer prefix',
        },
      },
    },
  });

  await server.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(paymentRoutes, { prefix: '/v1/payments' });
  await server.register(merchantRoutes, { prefix: '/v1/merchants' });
  await server.register(customerRoutes, { prefix: '/v1/customers' });
  await server.register(transactionRoutes, { prefix: '/v1/transactions' });
  await server.register(webhookRoutes, { prefix: '/v1/webhooks' });
  await server.register(simulatorRoutes, { prefix: '/v1/simulator' });

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      requestId: request.id,
      url: request.url,
    });

    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  });

  return server as unknown as FastifyInstance<any>;
}
