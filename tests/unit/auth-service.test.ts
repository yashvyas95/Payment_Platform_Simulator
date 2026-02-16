import { AuthService } from '../../src/services/auth/auth.service';
import { getPrisma } from '../../src/config/database';
import bcrypt from 'bcryptjs';

jest.mock('../../src/config/database');
jest.mock('bcryptjs');

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedHash = bcrypt.hash as unknown as jest.Mock;
const mockedCompare = bcrypt.compare as unknown as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    mockedHash.mockResolvedValue('hashed-password');
    mockedCompare.mockResolvedValue(true);

    service = new AuthService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('registerUser should create a new user when email is not taken', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'CUSTOMER',
    });

    const result = await service.registerUser({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(mockedHash).toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'user_1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'CUSTOMER',
    });
  });

  it('login should authenticate active user and create refresh token', async () => {
    const user = {
      id: 'user_1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
      role: 'CUSTOMER',
      permissions: ['READ_PAYMENT'],
    };

    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt_1' });

    const result = await service.login('test@example.com', 'password123', 'agent', '127.0.0.1');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(mockedCompare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('refreshAccessToken should rotate refresh token and create a new one', async () => {
    const existingToken = {
      id: 'rt_1',
      token: 'old_token',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
      userAgent: 'agent',
      ipAddress: '127.0.0.1',
      user: {
        id: 'user_1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        permissions: ['READ_PAYMENT'],
        isActive: true,
      },
    };

    prismaMock.refreshToken.findUnique.mockResolvedValue(existingToken);
    prismaMock.refreshToken.update.mockResolvedValue({});
    prismaMock.refreshToken.create.mockResolvedValue({ token: 'new_token' });

    const result = await service.refreshAccessToken('old_token');

    expect(prismaMock.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'old_token' },
      include: { user: true },
    });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});
