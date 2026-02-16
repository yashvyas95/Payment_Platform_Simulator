import { FastifyInstance } from 'fastify';
import { SimulatorService } from '../services/simulator/simulator.service';
import { authenticateRequest } from '../middleware/auth.middleware';

export default async function simulatorRoutes(server: FastifyInstance) {
  const simulatorService = new SimulatorService();
  // Get simulator config
  server.get(
    '/config',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Get simulator configuration',
        tags: ['Simulator'],
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const config = await simulatorService.getConfig(merchantId);
      return reply.send({ success: true, data: config });
    }
  );

  // Update simulator config
  server.put(
    '/config',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Update simulator configuration',
        tags: ['Simulator'],
        body: {
          type: 'object',
          properties: {
            defaultDelayMs: { type: 'integer' },
            minDelayMs: { type: 'integer' },
            maxDelayMs: { type: 'integer' },
            successRate: { type: 'number' },
            failureDistribution: { type: 'object' },
            networkSimulation: { type: 'boolean' },
            fraudDetectionEnabled: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const config = await simulatorService.updateConfig(merchantId, request.body);
      return reply.send({ success: true, data: config });
    }
  );

  // Test scenarios
  server.get(
    '/scenarios',
    {
      schema: {
        description: 'Get available test scenarios',
        tags: ['Simulator'],
      },
    },
    async (_request, reply) => {
      const scenarios = simulatorService.getTestScenarios();
      return reply.send({ success: true, data: scenarios });
    }
  );
}
