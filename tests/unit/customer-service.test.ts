import { CustomerService } from '../../src/services/customer/customer.service';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/config/database');

const mockedGetPrisma = getPrisma as jest.Mock;

describe('CustomerService', () => {
  let service: CustomerService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    service = new CustomerService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('createCustomer should create when email not taken', async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);
    const now = new Date();
    prismaMock.customer.create.mockResolvedValue({
      id: 'c_1',
      merchantId: 'm_1',
      email: 'c@example.com',
      name: 'Customer',
      phone: '123',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createCustomer('m_1', {
      email: 'c@example.com',
      name: 'Customer',
      phone: '123',
    });

    expect(prismaMock.customer.findFirst).toHaveBeenCalled();
    expect(prismaMock.customer.create).toHaveBeenCalled();
    expect(result.id).toBe('c_1');
  });

  it('createCustomer should throw when email already exists', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createCustomer('m_1', {
        email: 'c@example.com',
        name: 'Customer',
      })
    ).rejects.toThrow('Customer with this email already exists');
  });

  it('getCustomer should return formatted customer when found', async () => {
    const now = new Date();
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'c_1',
      merchantId: 'm_1',
      email: 'c@example.com',
      name: 'Customer',
      phone: '123',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      paymentMethods: [],
    });

    const result = await service.getCustomer('c_1', 'm_1');

    expect(prismaMock.customer.findFirst).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.id).toBe('c_1');
  });

  it('listCustomers should return paginated data', async () => {
    const now = new Date();
    prismaMock.customer.findMany.mockResolvedValue([
      {
        id: 'c_1',
        merchantId: 'm_1',
        email: 'c@example.com',
        name: 'Customer',
        phone: '123',
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prismaMock.customer.count.mockResolvedValue(1);

    const result: any = await service.listCustomers('m_1', { page: 1, limit: 10 });

    expect(prismaMock.customer.findMany).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
