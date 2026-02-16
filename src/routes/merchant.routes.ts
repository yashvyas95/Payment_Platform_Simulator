import { FastifyInstance } from 'fastify';
import { MerchantService } from '../services/merchant/merchant.service';

export default async function merchantRoutes(server: FastifyInstance) {
  const merchantService = new MerchantService();
  // Register new merchant
  server.post(
    '/register',
    {
      schema: {
        description: 'Register a new merchant',
        tags: ['Merchants'],
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            webhookUrl: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const merchant = await merchantService.registerMerchant(request.body);
      return reply.status(201).send({ success: true, data: merchant });
    }
  );

  // Get merchant details
  server.get(
    '/me',
    {
      schema: {
        description: 'Get current merchant details',
        tags: ['Merchants'],
        security: [{ Bearer: [] }],
      },
    },
    async (_request, reply) => {
      // This would use authentication middleware
      return reply.send({ success: true, data: { message: 'Merchant details' } });
    }
  );
}
