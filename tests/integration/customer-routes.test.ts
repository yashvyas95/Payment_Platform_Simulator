import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateRequest: async (request: any, _reply: any) => {
    (request as any).user = { merchantId: 'm_1' };
  },
}));

const createCustomerMock = jest.fn();
const getCustomerMock = jest.fn();

jest.mock('../../src/services/customer/customer.service', () => ({
  CustomerService: jest.fn().mockImplementation(() => ({
    createCustomer: createCustomerMock,
    getCustomer: getCustomerMock,
  })),
}));

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(() => ({ merchant: {}, customer: {} })),
  prisma: {},
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('Customer Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    createCustomerMock.mockResolvedValue({ id: 'c_1', email: 'c@example.com' });
    getCustomerMock.mockResolvedValue({ id: 'c_1', email: 'c@example.com' });

    mockedGetPrisma.mockClear();
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  it('POST /v1/customers creates a customer', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/customers',
      payload: { email: 'c@example.com', name: 'Customer' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(createCustomerMock).toHaveBeenCalledWith('m_1', expect.any(Object));
  });

  it('GET /v1/customers/:id returns customer when found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/customers/c_1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(getCustomerMock).toHaveBeenCalledWith('c_1', 'm_1');
  });

  it('GET /v1/customers/:id returns 404 when not found', async () => {
    getCustomerMock.mockResolvedValueOnce(null);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/customers/missing',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });
});
