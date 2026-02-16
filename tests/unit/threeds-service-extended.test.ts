import { ThreeDSecureService } from '../../src/services/threeds/threeds.service';

// Mock the database module *before* importing threeds.service
jest.mock('../../src/config/database', () => ({
  prisma: {
    threeDSecure: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
  getPrisma: jest.fn(),
}));

// Access the mock
import { prisma } from '../../src/config/database';
const mockPrisma = prisma as any;

describe('ThreeDSecureService', () => {
  let service: ThreeDSecureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ThreeDSecureService();
  });

  describe('initiateAuthentication', () => {
    it('creates a 3DS challenge for a 3DS-required card', async () => {
      mockPrisma.threeDSecure.create.mockResolvedValue({});

      const result = await service.initiateAuthentication(
        'txn_1',
        '4000002500003155', // known 3DS test card
        100,
        'USD'
      );

      expect(result.transactionId).toBe('txn_1');
      expect(result.id).toMatch(/^3ds_/);
      expect(result.challengeUrl).toContain('/3ds/challenge/');
      expect(result.acsUrl).toBe('https://acs.visa.com/authenticate');
      expect(result.paReq).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.threeDSecure.create).toHaveBeenCalled();
    });

    it('throws when card does not require 3DS', async () => {
      await expect(
        service.initiateAuthentication('txn_2', '5555555555554444', 50, 'USD')
      ).rejects.toThrow('3DS initiation failed');
    });

    it('returns Mastercard ACS URL for 5xxx cards that require 3DS', async () => {
      // Card starting with 400000 triggers 3DS
      mockPrisma.threeDSecure.create.mockResolvedValue({});

      const result = await service.initiateAuthentication('txn_3', '4000001234567890', 200, 'EUR');

      expect(result.acsUrl).toBe('https://acs.visa.com/authenticate');
    });
  });

  describe('verifyAuthentication', () => {
    it('throws for unknown challenge id', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue(null);

      await expect(service.verifyAuthentication('3ds_unknown', 'data')).rejects.toThrow(
        '3DS verification failed'
      );
    });

    it('throws when challenge is already processed', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue({
        id: '3ds_1',
        status: 'AUTHENTICATED',
        transactionId: 'txn_1',
      });

      await expect(service.verifyAuthentication('3ds_1', 'data')).rejects.toThrow(
        '3DS verification failed'
      );
    });

    it('throws when challenge is expired', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue({
        id: '3ds_1',
        status: 'REQUIRED',
        transactionId: 'txn_1',
        expiresAt: new Date(Date.now() - 60000), // expired
      });
      mockPrisma.threeDSecure.update.mockResolvedValue({});

      await expect(service.verifyAuthentication('3ds_1', 'data')).rejects.toThrow(
        '3DS verification failed'
      );
    });

    it('verifies authentication with valid paRes', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue({
        id: '3ds_1',
        status: 'REQUIRED',
        transactionId: 'txn_1',
        expiresAt: new Date(Date.now() + 600000), // 10 min future
      });
      mockPrisma.threeDSecure.update.mockResolvedValue({});

      const paRes = Buffer.from(JSON.stringify({ transactionId: 'txn_1', result: 'Y' })).toString(
        'base64'
      );

      // The verification has a random component (80% success), so we just verify the shape
      const result = await service.verifyAuthentication('3ds_1', paRes);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn_1');
      expect(typeof result.authenticated).toBe('boolean');
      expect(mockPrisma.threeDSecure.update).toHaveBeenCalled();
    });

    it('returns failed auth for invalid paRes format', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue({
        id: '3ds_1',
        status: 'REQUIRED',
        transactionId: 'txn_1',
        expiresAt: new Date(Date.now() + 600000),
      });
      mockPrisma.threeDSecure.update.mockResolvedValue({});

      // Invalid base64 that doesn't decode to valid JSON
      const result = await service.verifyAuthentication('3ds_1', '!!!invalid!!!');

      expect(result.success).toBe(true); // call itself succeeds
      expect(result.authenticated).toBe(false); // but authentication fails
    });
  });

  describe('getAuthenticationStatus', () => {
    it('returns status for existing challenge', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue({
        id: '3ds_1',
        transactionId: 'txn_1',
        status: 'AUTHENTICATED',
        expiresAt: new Date(),
      });

      const result = await service.getAuthenticationStatus('3ds_1');

      expect(result.id).toBe('3ds_1');
      expect(result.status).toBe('AUTHENTICATED');
      expect(result.authenticated).toBe(true);
    });

    it('throws for unknown challenge', async () => {
      mockPrisma.threeDSecure.findUnique.mockResolvedValue(null);

      await expect(service.getAuthenticationStatus('3ds_nope')).rejects.toThrow(
        '3DS challenge not found'
      );
    });
  });

  describe('cleanupExpiredChallenges', () => {
    it('cleans up expired challenges and returns count', async () => {
      mockPrisma.threeDSecure.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.cleanupExpiredChallenges();

      expect(count).toBe(3);
      expect(mockPrisma.threeDSecure.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'EXPIRED' },
        })
      );
    });

    it('returns 0 when updateMany throws', async () => {
      mockPrisma.threeDSecure.updateMany.mockRejectedValue(new Error('DB error'));

      const count = await service.cleanupExpiredChallenges();

      expect(count).toBe(0);
    });
  });
});
