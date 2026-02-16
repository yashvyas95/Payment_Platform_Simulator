import { getPrisma } from '../../config/database';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class MerchantService {
  private prisma = getPrisma();

  async registerMerchant(data: any) {
    const { name, email, webhookUrl, metadata } = data;

    // Check if email already exists
    const existing = await this.prisma.merchant.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error('Merchant with this email already exists');
    }

    // Generate API key and secret
    const apiKey = this.generateApiKey('test');
    const apiSecret = await bcrypt.hash(uuidv4(), 10);

    const merchant = await this.prisma.merchant.create({
      data: {
        name,
        email,
        apiKey,
        apiSecret,
        status: 'ACTIVE',
        webhookUrl,
        metadata,
      },
    });

    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey,
      status: merchant.status,
      createdAt: merchant.createdAt,
    };
  }

  async getMerchant(id: string) {
    return await this.prisma.merchant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        apiKey: true,
        status: true,
        feeRate: true,
        feeFixed: true,
        currency: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMerchant(id: string, data: any) {
    return await this.prisma.merchant.update({
      where: { id },
      data,
    });
  }

  private generateApiKey(env: 'test' | 'live'): string {
    const prefix = env === 'test' ? 'sk_test' : 'sk_live';
    const random = uuidv4().replace(/-/g, '');
    return `${prefix}_${random}`;
  }
}
