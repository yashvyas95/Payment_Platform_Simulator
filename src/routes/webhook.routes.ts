import { FastifyInstance } from 'fastify';
import { WebhookService } from '../services/webhook/webhook.service';
import { authenticateRequest } from '../middleware/auth.middleware';

export default async function webhookRoutes(server: FastifyInstance) {
  const webhookService = new WebhookService();
  // Create webhook
  server.post(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Create a webhook endpoint',
        tags: ['Webhooks'],
        body: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const webhook = await webhookService.createWebhook(merchantId, request.body);
      return reply.status(201).send({ success: true, data: webhook });
    }
  );

  // List webhooks
  server.get(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'List all webhooks',
        tags: ['Webhooks'],
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const webhooks = await webhookService.listWebhooks(merchantId);
      return reply.send({ success: true, data: webhooks });
    }
  );

  // Delete webhook
  server.delete(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Delete a webhook',
        tags: ['Webhooks'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      await webhookService.deleteWebhook(id, merchantId);
      return reply.send({ success: true, message: 'Webhook deleted' });
    }
  );
}
