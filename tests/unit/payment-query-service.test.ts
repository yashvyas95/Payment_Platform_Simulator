import { PaymentQueryService } from '../../src/services/cqrs/payment-query.service';
import { prisma } from '../../src/config/database';
import { getCache, setCache } from '../../src/config/redis';

jest.mock('../../src/config/database', () => ({
  prisma: {
    transaction: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

const mockedPrisma = prisma as any;
const mockedGetCache = getCache as jest.Mock;
const mockedSetCache = setCache as jest.Mock;

describe('PaymentQueryService', () => {
  let service: PaymentQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentQueryService();
  });

  describe('getPaymentAnalytics', () => {
    it('returns analytics and caches result when not cached', async () => {
      const merchantId = 'm_1';
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-01-31T23:59:59.000Z');

      mockedGetCache.mockResolvedValue(null);

      (mockedPrisma.transaction.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalTransactions
        .mockResolvedValueOnce(7) // successfulPayments
        .mockResolvedValueOnce(3); // failedPayments

      (mockedPrisma.transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 1500 } }) // totalVolume
        .mockResolvedValueOnce({ _avg: { amount: 150 } }); // avgTransactionValue

      const result: any = await service.getPaymentAnalytics(merchantId, startDate, endDate);

      expect(mockedPrisma.transaction.count).toHaveBeenCalledTimes(3);
      expect(mockedPrisma.transaction.aggregate).toHaveBeenCalledTimes(2);
      expect(result.totalTransactions).toBe(10);
      expect(result.successfulPayments).toBe(7);
      expect(result.failedPayments).toBe(3);
      expect(result.totalVolume).toBe(1500);
      expect(result.avgTransactionValue).toBe(150);
      expect(result.successRate).toBe(70);
      expect(mockedSetCache).toHaveBeenCalledWith(expect.any(String), result, 300);
    });

    it('returns cached analytics when present', async () => {
      const cached = { totalTransactions: 1 } as any;
      mockedGetCache.mockResolvedValue(cached);

      const result: any = await service.getPaymentAnalytics('m_1', new Date(), new Date());

      expect(result).toBe(cached);
      expect(mockedPrisma.transaction.count).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatusDistribution', () => {
    it('computes distribution and caches it', async () => {
      mockedGetCache.mockResolvedValue(null);

      (mockedPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([
        { status: 'CAPTURED', _count: { id: 5 } },
        { status: 'FAILED', _count: { id: 2 } },
      ]);

      const result: any = await service.getPaymentStatusDistribution('m_1', 7);

      expect(mockedPrisma.transaction.groupBy).toHaveBeenCalled();
      expect(result).toEqual({ CAPTURED: 5, FAILED: 2 });
      expect(mockedSetCache).toHaveBeenCalledWith(expect.any(String), result, 300);
    });
  });

  describe('getTopCustomers', () => {
    it('returns top customers with aggregated stats and caches result', async () => {
      mockedGetCache.mockResolvedValue(null);

      (mockedPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([
        { customerId: 'c1', _sum: { amount: 1000 }, _count: { id: 3 } },
        { customerId: 'c2', _sum: { amount: 500 }, _count: { id: 2 } },
      ]);

      (mockedPrisma.customer.findMany as jest.Mock).mockResolvedValue([
        { id: 'c1', email: 'c1@example.com' },
        { id: 'c2', email: 'c2@example.com' },
      ]);

      const result: any = await service.getTopCustomers('m_1', 2);

      expect(mockedPrisma.transaction.groupBy).toHaveBeenCalled();
      expect(mockedPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1', 'c2'] } },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        customer: { id: 'c1', email: 'c1@example.com' },
        totalSpent: 1000,
        transactionCount: 3,
      });
      expect(mockedSetCache).toHaveBeenCalledWith(expect.any(String), result, 600);
    });
  });

  describe('getPaymentTrends', () => {
    it('groups captured payments by date and caches result', async () => {
      mockedGetCache.mockResolvedValue(null);

      (mockedPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2025-01-01T10:00:00Z'), amount: 100 },
        { createdAt: new Date('2025-01-01T12:00:00Z'), amount: 50 },
        { createdAt: new Date('2025-01-02T09:00:00Z'), amount: 20 },
      ]);

      const result: any = await service.getPaymentTrends('m_1', 7);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalled();
      expect(result).toEqual([
        { date: '2025-01-01', count: 2, volume: 150 },
        { date: '2025-01-02', count: 1, volume: 20 },
      ]);
      expect(mockedSetCache).toHaveBeenCalledWith(expect.any(String), result, 600);
    });
  });

  describe('getGatewayPerformance', () => {
    it('aggregates stats per gateway and caches result', async () => {
      mockedGetCache.mockResolvedValue(null);

      (mockedPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { status: 'CAPTURED', metadata: { gateway: 'stripe' } },
        { status: 'AUTHORIZED', metadata: { gateway: 'stripe' } },
        { status: 'FAILED', metadata: { gateway: 'stripe' } },
        { status: 'CAPTURED', metadata: { gateway: 'adyen' } },
        { status: 'FAILED', metadata: {} },
      ]);

      const result: any = await service.getGatewayPerformance('m_1');

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalled();
      const stripe = result.find((g: any) => g.gateway === 'stripe');
      const adyen = result.find((g: any) => g.gateway === 'adyen');
      const unknown = result.find((g: any) => g.gateway === 'unknown');

      expect(stripe).toMatchObject({ total: 3, successCount: 2, failedCount: 1 });
      expect(adyen).toMatchObject({ total: 1, successCount: 1, failedCount: 0 });
      expect(unknown).toMatchObject({ total: 1, successCount: 0, failedCount: 1 });
      expect(mockedSetCache).toHaveBeenCalledWith(expect.any(String), result, 300);
    });
  });

  describe('searchTransactions', () => {
    it('builds where clause from filters and returns paginated result', async () => {
      (mockedPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { id: 't1' },
        { id: 't2' },
      ]);
      (mockedPrisma.transaction.count as jest.Mock).mockResolvedValue(2);

      const filters = {
        merchantId: 'm_1',
        status: 'CAPTURED',
        customerId: 'c1',
        minAmount: 100,
        maxAmount: 200,
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-31T23:59:59Z'),
        limit: 2,
        offset: 0,
      };

      const result: any = await service.searchTransactions(filters);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          merchantId: 'm_1',
          status: 'CAPTURED',
          customerId: 'c1',
        }),
        orderBy: { createdAt: 'desc' },
        take: 2,
        skip: 0,
        include: { customer: true },
      });
      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });
  });
});
