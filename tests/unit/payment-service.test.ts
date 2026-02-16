import { PaymentService } from '../../src/services/payment/payment.service';
import { getPrisma } from '../../src/config/database';
import { setCache, getCache } from '../../src/config/redis';
import { PaymentGatewayFactory } from '../../src/services/gateway/gateway.factory';
import { ThreeDSecureService } from '../../src/services/threeds/threeds.service';
import { EventStoreService } from '../../src/services/event-store/event-store.service';
import { WebhookService } from '../../src/services/webhook/webhook.service';

jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/gateway/gateway.factory');
jest.mock('../../src/services/threeds/threeds.service');
jest.mock('../../src/services/event-store/event-store.service');
jest.mock('../../src/services/webhook/webhook.service');

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedSetCache = setCache as jest.Mock;
const mockedGetCache = getCache as jest.Mock;

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      transaction: {
        create: jest.fn().mockResolvedValue({
          id: 'txn_1',
          merchantId: 'm_1',
          amount: 100,
          currency: 'USD',
          status: 'CAPTURED',
          type: 'PAYMENT',
          description: 'Test payment',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      transactionEvent: {
        create: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    mockedSetCache.mockResolvedValue(undefined);
    mockedGetCache.mockResolvedValue(null);

    (PaymentGatewayFactory.getGateway as jest.Mock).mockReturnValue({
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        authorizationCode: 'auth_123',
        transactionId: 'gw_txn_1',
      }),
      capturePayment: jest.fn().mockResolvedValue({ success: true }),
    });

    (ThreeDSecureService as unknown as jest.Mock).mockImplementation(() => ({
      initiateAuthentication: jest.fn(),
      verifyAuthentication: jest.fn(),
    }));

    (EventStoreService as unknown as jest.Mock).mockImplementation(() => ({
      appendEvent: jest.fn().mockResolvedValue(undefined),
    }));

    (WebhookService as unknown as jest.Mock).mockImplementation(() => ({
      triggerWebhook: jest.fn().mockResolvedValue(undefined),
    }));

    paymentService = new PaymentService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a captured payment successfully', async () => {
    const result: any = await paymentService.createPayment('m_1', {
      amount: 100,
      currency: 'USD',
      payment_method: {
        card: {
          number: '4242424242424242',
          cvv: '123',
          exp_month: 12,
          exp_year: 2030,
          name: 'Test User',
        },
      },
      description: 'Test payment',
      capture: true,
      metadata: {},
      gateway: 'simulator',
    } as any);

    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(result.status).toBe('captured');
  });

  it('should return cached transaction when idempotency key is reused', async () => {
    const cached = { id: 'txn_cached', status: 'CAPTURED' };
    mockedGetCache.mockResolvedValueOnce(cached);

    const result: any = await paymentService.createPayment('m_1', {
      amount: 100,
      currency: 'USD',
      payment_method: {
        card: {
          number: '4242424242424242',
          cvv: '123',
          exp_month: 12,
          exp_year: 2030,
          name: 'Test User',
        },
      },
      description: 'Test payment',
      capture: true,
      metadata: { idempotency_key: 'key_1' },
      gateway: 'simulator',
    } as any);

    expect(result).toBe(cached as any);
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });
});
