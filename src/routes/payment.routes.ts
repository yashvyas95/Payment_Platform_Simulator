import { FastifyInstance } from 'fastify';
import { PaymentService } from '../services/payment/payment.service';
import { authenticateRequest } from '../middleware/auth.middleware';

export default async function paymentRoutes(server: FastifyInstance) {
  const paymentService = new PaymentService();
  // Create payment
  server.post(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Create a new payment',
        tags: ['Payments'],
        body: {
          type: 'object',
          required: ['amount', 'currency', 'payment_method'],
          properties: {
            amount: { type: 'number', minimum: 1 },
            currency: { type: 'string', default: 'USD' },
            payment_method: { type: 'object' },
            customer: { type: 'string' },
            description: { type: 'string' },
            capture: { type: 'boolean', default: true },
            metadata: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const payment = await paymentService.createPayment(merchantId, request.body as any);

      if ((payment as any).status === 'failed') {
        return reply.status(402).send({
          success: false,
          error: (payment as any).error?.code || 'PAYMENT_FAILED',
          error_description: (payment as any).error?.message || 'Payment was declined',
          data: payment,
        });
      }

      return reply.status(201).send({ success: true, data: payment });
    }
  );

  // Get payment by ID
  server.get(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Retrieve a payment by ID',
        tags: ['Payments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      const payment = await paymentService.getPayment(id, merchantId);

      if (!payment) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found',
          },
        });
      }

      return reply.send({ success: true, data: payment });
    }
  );

  // Capture payment
  server.post(
    '/:id/capture',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Capture an authorized payment',
        tags: ['Payments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      const { amount } = request.body as any;

      const payment = await paymentService.capturePayment(id, merchantId, amount);
      return reply.send({ success: true, data: payment });
    }
  );

  // Refund payment
  server.post(
    '/:id/refund',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Refund a payment',
        tags: ['Payments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      const { amount, reason } = request.body as any;

      const refund = await paymentService.refundPayment(id, merchantId, amount, reason);
      return reply.send({ success: true, data: refund });
    }
  );

  // Void payment
  server.post(
    '/:id/void',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Void an authorized payment',
        tags: ['Payments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;

      const payment = await paymentService.voidPayment(id, merchantId);
      return reply.send({ success: true, data: payment });
    }
  );
}
