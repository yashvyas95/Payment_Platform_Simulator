import { getPrisma } from '../../config/database';

export class CustomerService {
  private prisma = getPrisma();

  async createCustomer(merchantId: string, data: any) {
    const { email, name, phone, metadata } = data;

    // Check if customer with email already exists for this merchant
    if (email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          merchantId,
          email,
        },
      });

      if (existing) {
        throw new Error('Customer with this email already exists');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        merchantId,
        email,
        name,
        phone,
        metadata,
      },
    });

    return this.formatCustomer(customer);
  }

  async getCustomer(id: string, merchantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId },
      include: {
        paymentMethods: true,
      },
    });

    return customer ? this.formatCustomer(customer) : null;
  }

  async updateCustomer(id: string, _merchantId: string, data: any) {
    const customer = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return this.formatCustomer(customer);
  }

  async deleteCustomer(id: string, _merchantId: string) {
    await this.prisma.customer.delete({
      where: { id },
    });
  }

  async listCustomers(merchantId: string, query: any = {}) {
    const { page = 1, limit = 20, email } = query;
    const skip = (page - 1) * limit;

    const where: any = { merchantId };
    if (email) {
      where.email = { contains: email };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c: any) => this.formatCustomer(c)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private formatCustomer(customer: any) {
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: customer.metadata,
      created: Math.floor(new Date(customer.createdAt).getTime() / 1000),
      updated: Math.floor(new Date(customer.updatedAt).getTime() / 1000),
    };
  }
}
