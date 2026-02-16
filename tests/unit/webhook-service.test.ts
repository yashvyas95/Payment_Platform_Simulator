import { WebhookService } from '../../src/services/webhook/webhook.service';
import { getPrisma } from '../../src/config/database';
import { publishToQueue, QUEUES } from '../../src/config/rabbitmq';

jest.mock('../../src/config/database');
jest.mock('../../src/config/rabbitmq', () => ({
  publishToQueue: jest.fn(),
  QUEUES: { WEBHOOK_DELIVERY: 'WEBHOOK_DELIVERY' },
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedPublishToQueue = publishToQueue as jest.Mock;

describe('WebhookService', () => {
  let service: WebhookService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      webhook: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      webhookDelivery: {
        create: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    (mockedPublishToQueue as jest.Mock).mockResolvedValue(undefined);

    service = new WebhookService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('createWebhook should persist and return basic fields', async () => {
    const now = new Date();
    prismaMock.webhook.create.mockResolvedValue({
      id: 'wh_1',
      merchantId: 'm_1',
      url: 'https://example.com',
      events: ['PAYMENT_CAPTURED'],
      secret: 'secret',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createWebhook('m_1', {
      url: 'https://example.com',
      events: ['PAYMENT_CAPTURED'],
    });

    expect(prismaMock.webhook.create).toHaveBeenCalled();
    expect(result.id).toBe('wh_1');
    expect(result.url).toBe('https://example.com');
  });

  it('listWebhooks should map database records', async () => {
    const now = new Date();
    prismaMock.webhook.findMany.mockResolvedValue([
      {
        id: 'wh_1',
        merchantId: 'm_1',
        url: 'https://example.com',
        events: ['PAYMENT_CAPTURED'],
        secret: 'secret',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await service.listWebhooks('m_1');

    expect(prismaMock.webhook.findMany).toHaveBeenCalledWith({
      where: { merchantId: 'm_1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wh_1');
  });

  it('triggerWebhook should create deliveries and publish to queue', async () => {
    const now = new Date();
    prismaMock.webhook.findMany.mockResolvedValue([
      {
        id: 'wh_1',
        merchantId: 'm_1',
        url: 'https://example.com',
        events: ['PAYMENT_CAPTURED'],
        secret: 'secret',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh_2',
        merchantId: 'm_1',
        url: 'https://other.example.com',
        events: ['PAYMENT_CAPTURED'],
        secret: 'secret2',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    prismaMock.webhookDelivery.create.mockImplementation(async ({ data }: any) => ({
      id: `deliv_${data.webhookId}`,
      ...data,
    }));

    await service.triggerWebhook('m_1', {
      type: 'PAYMENT_CAPTURED',
      data: { id: 'txn_1' },
    });

    expect(prismaMock.webhook.findMany).toHaveBeenCalled();
    expect(prismaMock.webhookDelivery.create).toHaveBeenCalledTimes(2);
    expect(mockedPublishToQueue).toHaveBeenCalledTimes(2);
    expect(mockedPublishToQueue).toHaveBeenCalledWith(QUEUES.WEBHOOK_DELIVERY, expect.any(Object));
  });

  it('generateSignature and verifySignature should be consistent', () => {
    const payload = { id: 'evt_1', data: { foo: 'bar' } };
    const secret = 'test_secret';

    const signature = service.generateSignature(payload, secret);
    const valid = service.verifySignature(payload, signature, secret);

    expect(valid).toBe(true);
  });
});
