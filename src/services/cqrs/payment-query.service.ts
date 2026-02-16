import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { getCache, setCache } from '../../config/redis';

/**
 * CQRS Read Model Service
 * Optimized for query operations, separate from command (write) operations
 */
export class PaymentQueryService {
  /**
   * Get payment analytics for a merchant
   */
  async getPaymentAnalytics(merchantId: string, startDate: Date, endDate: Date) {
    const cacheKey = `analytics:${merchantId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [
        totalTransactions,
        successfulPayments,
        failedPayments,
        totalVolume,
        avgTransactionValue,
      ] = await Promise.all([
        // Total transactions count
        prisma.transaction.count({
          where: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate },
            type: 'PAYMENT',
          },
        }),

        // Successful payments count
        prisma.transaction.count({
          where: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate },
            type: 'PAYMENT',
            status: { in: ['CAPTURED', 'AUTHORIZED'] },
          },
        }),

        // Failed payments count
        prisma.transaction.count({
          where: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate },
            type: 'PAYMENT',
            status: 'FAILED',
          },
        }),

        // Total volume
        prisma.transaction.aggregate({
          where: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate },
            type: 'PAYMENT',
            status: 'CAPTURED',
          },
          _sum: { amount: true },
        }),

        // Average transaction value
        prisma.transaction.aggregate({
          where: {
            merchantId,
            createdAt: { gte: startDate, lte: endDate },
            type: 'PAYMENT',
            status: 'CAPTURED',
          },
          _avg: { amount: true },
        }),
      ]);

      const successRate =
        totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0;

      const analytics = {
        totalTransactions,
        successfulPayments,
        failedPayments,
        successRate: Number(successRate.toFixed(2)),
        totalVolume: Number(totalVolume._sum.amount || 0),
        avgTransactionValue: Number(avgTransactionValue._avg.amount || 0),
        period: {
          start: startDate,
          end: endDate,
        },
      };

      // Cache for 5 minutes
      await setCache(cacheKey, analytics, 300);

      return analytics;
    } catch (error: any) {
      logger.error('Failed to fetch payment analytics:', error);
      throw new Error(`Analytics query failed: ${error.message}`);
    }
  }

  /**
   * Get payment status distribution
   */
  async getPaymentStatusDistribution(merchantId: string, days: number = 30) {
    const cacheKey = `status-distribution:${merchantId}:${days}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const statusDistribution = await prisma.transaction.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: startDate },
          type: 'PAYMENT',
        },
        _count: {
          id: true,
        },
      });

      const distribution = statusDistribution.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {});

      await setCache(cacheKey, distribution, 300);

      return distribution;
    } catch (error: any) {
      logger.error('Failed to fetch status distribution:', error);
      throw error;
    }
  }

  /**
   * Get top customers by volume
   */
  async getTopCustomers(merchantId: string, limit: number = 10) {
    const cacheKey = `top-customers:${merchantId}:${limit}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const topCustomers = await prisma.transaction.groupBy({
        by: ['customerId'],
        where: {
          merchantId,
          type: 'PAYMENT',
          status: 'CAPTURED',
          customerId: { not: null },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: limit,
      });

      // Fetch customer details
      const customerIds = topCustomers.map((c: any) => c.customerId).filter(Boolean);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds as string[] } },
      });

      const customerMap = new Map(customers.map((c: any) => [c.id, c]));

      const result = topCustomers.map((item: any) => ({
        customer: customerMap.get(item.customerId!),
        totalSpent: Number(item._sum.amount || 0),
        transactionCount: item._count.id,
      }));

      await setCache(cacheKey, result, 600);

      return result;
    } catch (error: any) {
      logger.error('Failed to fetch top customers:', error);
      throw error;
    }
  }

  /**
   * Get payment trends over time
   */
  async getPaymentTrends(merchantId: string, days: number = 30) {
    const cacheKey = `payment-trends:${merchantId}:${days}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await prisma.transaction.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate },
          type: 'PAYMENT',
          status: 'CAPTURED',
        },
        select: {
          createdAt: true,
          amount: true,
        },
      });

      // Group by date
      const trendMap = new Map<string, { count: number; volume: number }>();

      transactions.forEach((txn: any) => {
        const date = txn.createdAt.toISOString().split('T')[0];
        const existing = trendMap.get(date) || { count: 0, volume: 0 };
        trendMap.set(date, {
          count: existing.count + 1,
          volume: existing.volume + Number(txn.amount),
        });
      });

      const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        volume: data.volume,
      }));

      trends.sort((a, b) => a.date.localeCompare(b.date));

      await setCache(cacheKey, trends, 600);

      return trends;
    } catch (error: any) {
      logger.error('Failed to fetch payment trends:', error);
      throw error;
    }
  }

  /**
   * Get gateway performance metrics
   */
  async getGatewayPerformance(merchantId: string) {
    const cacheKey = `gateway-performance:${merchantId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          merchantId,
          type: 'PAYMENT',
        },
        select: {
          status: true,
          metadata: true,
        },
      });

      const gatewayStats = new Map<string, { total: number; success: number; failed: number }>();

      transactions.forEach((txn: any) => {
        const gateway = (txn.metadata as any)?.gateway || 'unknown';
        const stats = gatewayStats.get(gateway) || { total: 0, success: 0, failed: 0 };

        stats.total++;
        if (txn.status === 'CAPTURED' || txn.status === 'AUTHORIZED') {
          stats.success++;
        } else if (txn.status === 'FAILED') {
          stats.failed++;
        }

        gatewayStats.set(gateway, stats);
      });

      const performance = Array.from(gatewayStats.entries()).map(([gateway, stats]) => ({
        gateway,
        total: stats.total,
        successCount: stats.success,
        failedCount: stats.failed,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      }));

      await setCache(cacheKey, performance, 300);

      return performance;
    } catch (error: any) {
      logger.error('Failed to fetch gateway performance:', error);
      throw error;
    }
  }

  /**
   * Search transactions with filters
   */
  async searchTransactions(filters: {
    merchantId: string;
    status?: string;
    customerId?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {
        merchantId: filters.merchantId,
        type: 'PAYMENT',
      };

      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.customerId) {
        where.customerId = filters.customerId;
      }
      if (filters.minAmount !== undefined) {
        where.amount = { gte: filters.minAmount };
      }
      if (filters.maxAmount !== undefined) {
        where.amount = { ...where.amount, lte: filters.maxAmount };
      }
      if (filters.startDate) {
        where.createdAt = { gte: filters.startDate };
      }
      if (filters.endDate) {
        where.createdAt = { ...where.createdAt, lte: filters.endDate };
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
          include: {
            customer: true,
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };
    } catch (error: any) {
      logger.error('Failed to search transactions:', error);
      throw error;
    }
  }
}
