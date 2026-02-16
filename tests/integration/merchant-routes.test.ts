jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn().mockReturnValue({
    merchant: {
      create: jest.fn().mockResolvedValue({
        id: 'm_new',
        name: 'Test Merchant',
        email: 'test@example.com',
        apiKey: 'sk_test_123',
        apiSecret: 'ss_test_456',
        status: 'PENDING',
        feeRate: 0.029,
        feeFixed: 0.3,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: jest.fn(),
    },
  }),
}));

import { buildServer } from '../../src/server';

describe('Merchant Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('POST /v1/merchants/register creates a merchant', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/v1/merchants/register',
      payload: { name: 'Test Merchant', email: 'test@example.com' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.apiKey).toBeDefined();
  });

  it('GET /v1/merchants/me returns merchant details', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/v1/merchants/me',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });
});
