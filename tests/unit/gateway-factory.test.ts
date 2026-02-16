import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PaymentGatewayFactory } from '../../src/services/gateway/gateway.factory';

// Mock all dependencies
jest.mock('../../src/services/gateway/stripe.adapter');
jest.mock('../../src/services/gateway/paypal.adapter');
jest.mock('../../src/services/gateway/razorpay.adapter');
jest.mock('../../src/config/database', () => ({
  prisma: {
    gatewayConfig: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PaymentGatewayFactory', () => {
  beforeEach(async () => {
    // Reset factory state
    jest.clearAllMocks();
  });

  it('should initialize gateways from database config', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.gatewayConfig.findMany.mockResolvedValue([
      {
        gateway: 'stripe',
        apiKey: 'sk_test_123',
        apiSecret: null,
        isActive: true,
      },
    ]);

    await PaymentGatewayFactory.initialize();

    expect(prisma.gatewayConfig.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    });
  });

  it('should get a specific gateway', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.gatewayConfig.findMany.mockResolvedValue([
      {
        gateway: 'stripe',
        apiKey: 'sk_test_123',
        apiSecret: null,
        isActive: true,
      },
    ]);

    await PaymentGatewayFactory.initialize();
    const gateway = PaymentGatewayFactory.getGateway('stripe');

    expect(gateway).toBeDefined();
  });

  it('should fallback to simulator if gateway not found', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.gatewayConfig.findMany.mockResolvedValue([]);

    await PaymentGatewayFactory.initialize();
    const gateway = PaymentGatewayFactory.getGateway('unknown' as any);

    expect(gateway).toBeDefined();
  });

  it('should register a gateway manually', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.gatewayConfig.findMany.mockResolvedValue([]);

    await PaymentGatewayFactory.initialize();
    PaymentGatewayFactory.registerGateway('stripe', 'sk_test_123');

    const availableGateways = PaymentGatewayFactory.getAvailableGateways();
    expect(availableGateways).toContain('stripe');
  });

  it('should return list of available gateways', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.gatewayConfig.findMany.mockResolvedValue([
      {
        gateway: 'stripe',
        apiKey: 'sk_test_123',
        apiSecret: null,
        isActive: true,
      },
      {
        gateway: 'paypal',
        apiKey: 'pp_client_123',
        apiSecret: 'pp_secret_123',
        isActive: true,
      },
    ]);

    await PaymentGatewayFactory.initialize();
    const gateways = PaymentGatewayFactory.getAvailableGateways();

    expect(gateways.length).toBeGreaterThan(0);
    expect(gateways).toContain('stripe');
    expect(gateways).toContain('paypal');
  });
});
