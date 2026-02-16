import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';

// Mock auth middleware to inject a merchantId without real auth
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateRequest: async (request: any, _reply: any) => {
    (request as any).user = { merchantId: 'm_1' };
  },
}));

// Mock TransactionService used by the routes
const listTransactionsMock = jest.fn();
const getTransactionMock = jest.fn();

jest.mock('../../src/services/transaction/transaction.service', () => ({
  TransactionService: jest.fn().mockImplementation(() => ({
    listTransactions: listTransactionsMock,
    getTransaction: getTransactionMock,
  })),
}));

// Mock database so that PaymentService (used in payment routes) does not throw
jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(() => ({
    transaction: {},
    customer: {},
    paymentMethod: {},
    webhook: {},
    webhookDelivery: {},
    eventStore: {},
  })),
  prisma: {},
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('Transaction Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    listTransactionsMock.mockResolvedValue({
      data: [{ id: 'txn_1', amount: 100 }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    getTransactionMock.mockResolvedValue({ id: 'txn_1', amount: 100 });

    // Ensure mocked database is used when building the server
    mockedGetPrisma.mockClear();
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('GET /v1/transactions should return list of transactions', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/transactions?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(1);
    expect(body.data.pagination.total).toBe(1);
    expect(listTransactionsMock).toHaveBeenCalledWith(
      'm_1',
      expect.objectContaining({
        page: 1,
        limit: 10,
      })
    );
  });

  it('GET /v1/transactions/:id should return transaction when found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/transactions/txn_1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 'txn_1', amount: 100 });
    expect(getTransactionMock).toHaveBeenCalledWith('txn_1', 'm_1');
  });

  it('GET /v1/transactions/:id should return 404 when not found', async () => {
    getTransactionMock.mockResolvedValueOnce(null);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/transactions/missing',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TRANSACTION_NOT_FOUND');
  });
});
