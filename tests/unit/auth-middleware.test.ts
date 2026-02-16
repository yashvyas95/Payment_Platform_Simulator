import { authenticateRequest } from '../../src/middleware/auth.middleware';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/config/database');

const mockedGetPrisma = getPrisma as jest.Mock;

describe('authenticateRequest', () => {
  let mockRequest: any;
  let mockReply: any;
  let prismaMock: any;

  beforeEach(() => {
    mockRequest = { headers: {} };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    prismaMock = {
      merchant: {
        findUnique: jest.fn(),
      },
    };
    mockedGetPrisma.mockReturnValue(prismaMock);
  });

  afterEach(() => jest.resetAllMocks());

  it('returns 401 when authorization header is missing', async () => {
    await authenticateRequest(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
  });

  it('returns 401 when authorization header is empty Bearer', async () => {
    mockRequest.headers.authorization = 'Bearer ';

    await authenticateRequest(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
  });

  it('returns 401 when merchant is not found', async () => {
    mockRequest.headers.authorization = 'Bearer sk_test_invalid';
    prismaMock.merchant.findUnique.mockResolvedValue(null);

    await authenticateRequest(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_API_KEY' }),
      })
    );
  });

  it('returns 403 when merchant is suspended', async () => {
    mockRequest.headers.authorization = 'Bearer sk_test_suspended';
    prismaMock.merchant.findUnique.mockResolvedValue({
      id: 'm_1',
      status: 'SUSPENDED',
    });

    await authenticateRequest(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(403);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MERCHANT_SUSPENDED' }),
      })
    );
  });

  it('attaches merchant info to request on success', async () => {
    mockRequest.headers.authorization = 'Bearer sk_test_valid';
    prismaMock.merchant.findUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ACTIVE',
    });

    await authenticateRequest(mockRequest, mockReply);

    expect(mockRequest.user).toEqual({
      merchantId: 'm_1',
      apiKey: 'sk_test_valid',
    });
    expect(mockReply.status).not.toHaveBeenCalled();
  });

  it('returns 500 when database throws', async () => {
    mockRequest.headers.authorization = 'Bearer sk_test_valid';
    prismaMock.merchant.findUnique.mockRejectedValue(new Error('DB error'));

    await authenticateRequest(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'AUTHENTICATION_ERROR' }),
      })
    );
  });
});
