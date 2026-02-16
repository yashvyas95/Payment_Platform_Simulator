import { MerchantService } from '../../src/services/merchant/merchant.service';
import { getPrisma } from '../../src/config/database';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../src/config/database');
jest.mock('bcrypt');
jest.mock('uuid');

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedBcryptHash = bcrypt.hash as jest.Mock;
const mockedUuid = uuidv4 as jest.Mock;

describe('MerchantService', () => {
  let service: MerchantService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      merchant: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    mockedBcryptHash.mockResolvedValue('hashed-secret');
    mockedUuid.mockReturnValue('uuid-1234');

    service = new MerchantService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('registerMerchant creates a new merchant when email not taken', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(null);
    const now = new Date();
    prismaMock.merchant.create.mockResolvedValue({
      id: 'm_1',
      name: 'Test Merchant',
      email: 'test@example.com',
      apiKey: 'sk_test_abc',
      apiSecret: 'hashed-secret',
      status: 'ACTIVE',
      webhookUrl: 'https://example.com',
      metadata: {},
      createdAt: now,
    });

    const result = await service.registerMerchant({
      name: 'Test Merchant',
      email: 'test@example.com',
      webhookUrl: 'https://example.com',
      metadata: {},
    });

    expect(prismaMock.merchant.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(prismaMock.merchant.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'm_1',
      name: 'Test Merchant',
      email: 'test@example.com',
      status: 'ACTIVE',
    });
  });

  it('registerMerchant throws when email already exists', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.registerMerchant({
        name: 'Test Merchant',
        email: 'test@example.com',
      })
    ).rejects.toThrow('Merchant with this email already exists');
  });

  it('getMerchant returns selected merchant fields', async () => {
    const merchant = { id: 'm_1', name: 'Test', email: 'test@example.com' };
    prismaMock.merchant.findUnique.mockResolvedValue(merchant);

    const result = await service.getMerchant('m_1');

    expect(prismaMock.merchant.findUnique).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      select: expect.any(Object),
    });
    expect(result).toBe(merchant);
  });

  it('updateMerchant updates merchant data', async () => {
    prismaMock.merchant.update.mockResolvedValue({ id: 'm_1', name: 'Updated' });

    const result = await service.updateMerchant('m_1', { name: 'Updated' });

    expect(prismaMock.merchant.update).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { name: 'Updated' },
    });
    expect(result.name).toBe('Updated');
  });
});
