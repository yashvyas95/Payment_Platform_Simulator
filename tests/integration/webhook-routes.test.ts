import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateRequest: async (request: any, _reply: any) => {
    (request as any).user = { merchantId: 'm_1' };
  },
}));

const createWebhookMock = jest.fn();
const listWebhooksMock = jest.fn();
const deleteWebhookMock = jest.fn();

jest.mock('../../src/services/webhook/webhook.service', () => ({
  WebhookService: jest.fn().mockImplementation(() => ({
    createWebhook: createWebhookMock,
    listWebhooks: listWebhooksMock,
    deleteWebhook: deleteWebhookMock,
  })),
}));

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(() => ({ merchant: {}, webhook: {}, webhookDelivery: {} })),
  prisma: {},
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('Webhook Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    createWebhookMock.mockResolvedValue({ id: 'wh_1', url: 'https://example.com' });
    listWebhooksMock.mockResolvedValue([{ id: 'wh_1', url: 'https://example.com' }]);
    deleteWebhookMock.mockResolvedValue(undefined);

    mockedGetPrisma.mockClear();
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  it('POST /v1/webhooks creates a webhook', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/webhooks',
      payload: { url: 'https://example.com', events: ['PAYMENT_CAPTURED'] },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(createWebhookMock).toHaveBeenCalledWith('m_1', expect.any(Object));
  });

  it('GET /v1/webhooks lists webhooks', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/webhooks',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(listWebhooksMock).toHaveBeenCalledWith('m_1');
  });

  it('DELETE /v1/webhooks/:id deletes webhook', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/webhooks/wh_1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(deleteWebhookMock).toHaveBeenCalledWith('wh_1', 'm_1');
  });
});
