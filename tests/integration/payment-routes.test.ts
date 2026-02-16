import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';

// Mock auth middleware to inject merchantId
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateRequest: async (request: any, _reply: any) => {
    (request as any).user = { merchantId: 'm_1' };
  },
}));

// Mock PaymentService used by routes
const createPaymentMock = jest.fn();
const getPaymentMock = jest.fn();
const capturePaymentMock = jest.fn();
const refundPaymentMock = jest.fn();
const voidPaymentMock = jest.fn();

jest.mock('../../src/services/payment/payment.service', () => ({
  PaymentService: jest.fn().mockImplementation(() => ({
    createPayment: createPaymentMock,
    getPayment: getPaymentMock,
    capturePayment: capturePaymentMock,
    refundPayment: refundPaymentMock,
    voidPayment: voidPaymentMock,
  })),
}));

// Mock database for other services
jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(() => ({
    merchant: {},
    transaction: {},
    customer: {},
  })),
  prisma: {},
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('Payment Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    createPaymentMock.mockResolvedValue({ id: 'pay_1', amount: 100 });
    getPaymentMock.mockResolvedValue({ id: 'pay_1', amount: 100 });
    capturePaymentMock.mockResolvedValue({ id: 'pay_1', status: 'captured' });
    refundPaymentMock.mockResolvedValue({ id: 'refund_1', amount: 50 });
    voidPaymentMock.mockResolvedValue({ id: 'pay_1', status: 'voided' });

    mockedGetPrisma.mockClear();
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  it('POST /v1/payments creates a payment', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments',
      payload: { amount: 100, currency: 'USD', payment_method: {} },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(createPaymentMock).toHaveBeenCalledWith('m_1', expect.any(Object));
  });

  it('GET /v1/payments/:id returns payment when found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/payments/pay_1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(getPaymentMock).toHaveBeenCalledWith('pay_1', 'm_1');
  });

  it('POST /v1/payments/:id/capture captures payment', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments/pay_1/capture',
      payload: { amount: 100 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(capturePaymentMock).toHaveBeenCalledWith('pay_1', 'm_1', 100);
  });

  it('POST /v1/payments/:id/refund refunds payment', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments/pay_1/refund',
      payload: { amount: 50, reason: 'test' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(refundPaymentMock).toHaveBeenCalledWith('pay_1', 'm_1', 50, 'test');
  });

  it('POST /v1/payments/:id/void voids payment', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments/pay_1/void',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(voidPaymentMock).toHaveBeenCalledWith('pay_1', 'm_1');
  });
});
