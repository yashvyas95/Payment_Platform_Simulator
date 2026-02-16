import { getPrisma } from '../../config/database';

export class TransactionService {
  private prisma = getPrisma();

  async listTransactions(merchantId: string, query: any = {}) {
    const { page = 1, limit = 20, status, type, customerId, startDate, endDate } = query;

    const skip = (page - 1) * limit;

    const where: any = { merchantId };
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t: any) => this.formatTransaction(t)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTransaction(id: string, merchantId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, merchantId },
      include: {
        customer: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
        refunds: true,
      },
    });

    return transaction ? this.formatTransaction(transaction) : null;
  }

  async getTransactionStats(merchantId: string, period: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const stats = {
      total: transactions.length,
      successful: transactions.filter((t: any) => ['CAPTURED', 'AUTHORIZED'].includes(t.status))
        .length,
      failed: transactions.filter((t: any) => t.status === 'FAILED').length,
      refunded: transactions.filter((t: any) =>
        ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(t.status)
      ).length,
      totalAmount: transactions
        .filter((t: any) => t.status === 'CAPTURED')
        .reduce((sum: any, t: any) => sum + Number(t.amount), 0),
      averageAmount: 0,
      successRate: 0,
    };

    stats.averageAmount = stats.successful > 0 ? stats.totalAmount / stats.successful : 0;
    stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

    return stats;
  }

  private formatTransaction(transaction: any) {
    return {
      id: transaction.id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status.toLowerCase(),
      type: transaction.type.toLowerCase(),
      description: transaction.description,
      authorization_code: transaction.authorizationCode,
      captured_amount: transaction.capturedAmount ? Number(transaction.capturedAmount) : null,
      refunded_amount: transaction.refundedAmount ? Number(transaction.refundedAmount) : null,
      customer: transaction.customer,
      events: transaction.events,
      metadata: transaction.metadata,
      created: Math.floor(new Date(transaction.createdAt).getTime() / 1000),
      updated: Math.floor(new Date(transaction.updatedAt).getTime() / 1000),
    };
  }
}
