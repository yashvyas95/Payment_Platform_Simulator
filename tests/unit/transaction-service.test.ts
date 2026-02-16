import { TransactionService } from '../../src/services/transaction/transaction.service';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/config/database');

const mockedGetPrisma = getPrisma as jest.Mock;

describe('TransactionService', () => {
  let service: TransactionService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      transaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    service = new TransactionService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('listTransactions should return formatted data with pagination', async () => {
    const now = new Date();
    prismaMock.transaction.findMany.mockResolvedValue([
      {
        id: 'txn_1',
        merchantId: 'm_1',
        amount: 100,
        currency: 'USD',
        status: 'CAPTURED',
        type: 'PAYMENT',
        description: 'Test',
        authorizationCode: 'AUTH_1',
        capturedAmount: 100,
        refundedAmount: 0,
        customer: { id: 'c_1', email: 'c@example.com', name: 'Customer' },
        events: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prismaMock.transaction.count.mockResolvedValue(1);

    const result: any = await service.listTransactions('m_1', {
      page: 1,
      limit: 10,
      status: 'captured',
      type: 'payment',
    });

    expect(prismaMock.transaction.findMany).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('captured');
    expect(result.pagination.total).toBe(1);
  });

  it('getTransaction should return formatted transaction when found', async () => {
    const now = new Date();
    prismaMock.transaction.findFirst.mockResolvedValue({
      id: 'txn_1',
      merchantId: 'm_1',
      amount: 50,
      currency: 'USD',
      status: 'AUTHORIZED',
      type: 'PAYMENT',
      description: 'Auth only',
      authorizationCode: 'AUTH_2',
      capturedAmount: null,
      refundedAmount: 0,
      customer: null,
      events: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    const result: any = await service.getTransaction('txn_1', 'm_1');

    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 'txn_1', merchantId: 'm_1' },
      include: {
        customer: true,
        events: { orderBy: { createdAt: 'asc' } },
        refunds: true,
      },
    });
    expect(result).not.toBeNull();
    expect(result.status).toBe('authorized');
  });

  it('getTransaction should return null when not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    const result = await service.getTransaction('missing', 'm_1');

    expect(result).toBeNull();
  });

  it('getTransactionStats should compute stats correctly', async () => {
    const now = new Date();
    prismaMock.transaction.findMany.mockResolvedValue([
      { id: 't1', status: 'CAPTURED', amount: 100, createdAt: now },
      { id: 't2', status: 'AUTHORIZED', amount: 50, createdAt: now },
      { id: 't3', status: 'FAILED', amount: 70, createdAt: now },
      { id: 't4', status: 'REFUNDED', amount: 30, createdAt: now },
      { id: 't5', status: 'PARTIALLY_REFUNDED', amount: 20, createdAt: now },
    ]);

    const stats = await service.getTransactionStats('m_1', 'day');

    expect(prismaMock.transaction.findMany).toHaveBeenCalled();
    expect(stats.total).toBe(5);
    expect(stats.successful).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.refunded).toBe(2);
    expect(stats.totalAmount).toBe(100);
    expect(stats.averageAmount).toBeGreaterThan(0);
    expect(stats.successRate).toBeGreaterThan(0);
  });
});
