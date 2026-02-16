import { FastifyInstance } from 'fastify';
import { getPrisma } from '../config/database';
import { getRedis } from '../config/redis';

export default async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (_request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    return reply.send(health);
  });

  server.get('/detailed', async (_request, reply) => {
    const prisma = getPrisma();
    const redis = getRedis();

    const checks = {
      database: 'unknown',
      redis: 'unknown',
      memory: process.memoryUsage(),
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
    }

    // Check redis
    try {
      await redis.ping();
      checks.redis = 'connected';
    } catch (error) {
      checks.redis = 'disconnected';
    }

    const health = {
      status: checks.database === 'connected' && checks.redis === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };

    return reply.send(health);
  });
}
