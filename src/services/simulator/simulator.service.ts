import { getPrisma } from '../../config/database';

export class SimulatorService {
  private prisma = getPrisma();

  async getConfig(merchantId?: string) {
    let config = await this.prisma.simulatorConfig.findFirst({
      where: merchantId ? { merchantId } : { merchantId: null },
    });

    if (!config) {
      // Return default config
      config = await this.prisma.simulatorConfig.create({
        data: {
          merchantId,
          defaultDelayMs: 1000,
          minDelayMs: 500,
          maxDelayMs: 2000,
          successRate: 0.85,
          failureDistribution: {
            card_declined: 0.05,
            insufficient_funds: 0.03,
            processing_error: 0.02,
            fraudulent: 0.03,
            other: 0.02,
          },
          networkSimulation: true,
          fraudDetectionEnabled: true,
        },
      });
    }

    return config;
  }

  async updateConfig(merchantId: string, data: any) {
    const existing = await this.prisma.simulatorConfig.findFirst({
      where: { merchantId },
    });

    if (existing) {
      return await this.prisma.simulatorConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return await this.prisma.simulatorConfig.create({
        data: {
          merchantId,
          ...data,
        },
      });
    }
  }

  getTestScenarios() {
    return {
      success_cards: [
        { number: '4242424242424242', brand: 'Visa', result: 'Success' },
        { number: '5555555555554444', brand: 'Mastercard', result: 'Success' },
        { number: '378282246310005', brand: 'American Express', result: 'Success' },
      ],
      failure_cards: [
        { number: '4000000000000002', brand: 'Visa', result: 'Card Declined' },
        { number: '4000000000009995', brand: 'Visa', result: 'Insufficient Funds' },
        { number: '4000000000000069', brand: 'Visa', result: 'Expired Card' },
        { number: '4000000000000127', brand: 'Visa', result: 'Incorrect CVC' },
        { number: '4000000000006975', brand: 'Visa', result: 'Processing Error' },
        { number: '4100000000000019', brand: 'Visa', result: 'Fraudulent' },
      ],
      amount_triggers: [
        { amount: 0, result: 'Invalid Amount' },
        { amount_range: '< 100', result: 'Below Minimum' },
        { amount_range: '> 999999', result: 'Above Maximum' },
      ],
    };
  }
}
