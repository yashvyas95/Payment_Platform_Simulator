import { FastifyInstance } from 'fastify';
import { TransactionService } from '../services/transaction/transaction.service';
import { authenticateRequest } from '../middleware/auth.middleware';

export default async function transactionRoutes(server: FastifyInstance) {
  const transactionService = new TransactionService();
  // List transactions
  server.get(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'List all transactions',
        tags: ['Transactions'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
            status: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const merchantId = (request.user as any).merchantId;
      const query = request.query as any;
      const transactions = await transactionService.listTransactions(merchantId, query);
      return reply.send({ success: true, data: transactions });
    }
  );

  // Get transaction
  server.get(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: {
        description: 'Retrieve a transaction by ID',
        tags: ['Transactions'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const merchantId = (request.user as any).merchantId;
      const transaction = await transactionService.getTransaction(id, merchantId);

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' },
        });
      }

      return reply.send({ success: true, data: transaction });
    }
  );
}
