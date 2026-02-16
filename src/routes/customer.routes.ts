import { FastifyInstance } from 'fastify';
import { CustomerService } from '../services/customer/customer.service';
import { authenticateRequest } from '../middleware/auth.middleware';

export default async function customerRoutes(server: FastifyInstance) {
  const customerService = new CustomerService();
  // Create customer
  server.post(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Create a new customer',
        tags: ['Customers'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const customer = await customerService.createCustomer(merchantId, request.body);
      return reply.status(201).send({ success: true, data: customer });
    }
  );

  // Get customer
  server.get(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Retrieve a customer by ID',
        tags: ['Customers'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      const customer = await customerService.getCustomer(id, merchantId);

      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' },
        });
      }

      return reply.send({ success: true, data: customer });
    }
  );
}
