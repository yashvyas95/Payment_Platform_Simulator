import { requireAuth, requirePermission, requireRole } from '../../src/middleware/rbac.middleware';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/config/database');

const mockedGetPrisma = getPrisma as jest.Mock;

function buildReply() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

describe('requireAuth', () => {
  let prismaMock: any;
  const middleware = requireAuth();

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn() },
    };
    mockedGetPrisma.mockReturnValue(prismaMock);
  });
  afterEach(() => jest.resetAllMocks());

  it('returns 401 when no authorization header', async () => {
    const req: any = { headers: {} };
    const reply = buildReply();
    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) })
    );
  });

  it('returns 401 when token is invalid base64', async () => {
    const req: any = { headers: { authorization: 'Bearer not-base64-json' } };
    const reply = buildReply();
    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is expired', async () => {
    const token = Buffer.from(JSON.stringify({ userId: 'u1', exp: Date.now() - 10000 })).toString(
      'base64'
    );
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = buildReply();
    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }) })
    );
  });

  it('returns 401 when user not found', async () => {
    const token = Buffer.from(JSON.stringify({ userId: 'u1' })).toString('base64');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = buildReply();
    prismaMock.user.findUnique.mockResolvedValue(null);

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when user is inactive', async () => {
    const token = Buffer.from(JSON.stringify({ userId: 'u1' })).toString('base64');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = buildReply();
    prismaMock.user.findUnique.mockResolvedValue({ isActive: false, merchantId: null });

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('attaches user to request on success', async () => {
    const payload = {
      userId: 'u1',
      email: 'a@b.com',
      role: 'MERCHANT_OWNER',
      permissions: ['READ_PAYMENT'],
    };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = buildReply();
    prismaMock.user.findUnique.mockResolvedValue({ isActive: true, merchantId: 'm1' });

    await middleware(req, reply as any);

    expect(req.user).toEqual(
      expect.objectContaining({
        userId: 'u1',
        email: 'a@b.com',
        role: 'MERCHANT_OWNER',
        merchantId: 'm1',
      })
    );
    expect(reply.status).not.toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  it('returns 401 when user is not set', async () => {
    const middleware = requirePermission('READ_PAYMENT');
    const req: any = {};
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('allows ADMIN regardless of permissions', async () => {
    const middleware = requirePermission('READ_PAYMENT');
    const req: any = { user: { role: 'ADMIN', permissions: [] } };
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks permission', async () => {
    const middleware = requirePermission('MANAGE_USERS');
    const req: any = { user: { role: 'MERCHANT_OWNER', permissions: ['READ_PAYMENT'] } };
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('allows user with matching permission', async () => {
    const middleware = requirePermission('READ_PAYMENT', 'MANAGE_USERS');
    const req: any = { user: { role: 'MERCHANT_OWNER', permissions: ['READ_PAYMENT'] } };
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('returns 401 when user is not set', async () => {
    const middleware = requireRole('ADMIN');
    const req: any = {};
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user role does not match', async () => {
    const middleware = requireRole('ADMIN');
    const req: any = { user: { role: 'CUSTOMER' } };
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('allows user with matching role', async () => {
    const middleware = requireRole('ADMIN', 'MERCHANT_OWNER');
    const req: any = { user: { role: 'ADMIN' } };
    const reply = buildReply();

    await middleware(req, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });
});
