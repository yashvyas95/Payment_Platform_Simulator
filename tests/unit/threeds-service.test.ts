import { ThreeDSecureService } from '../../src/services/threeds/threeds.service';
import { prisma } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  prisma: {
    threeDSecure: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const prismaMock = prisma as any;

describe('ThreeDSecureService', () => {
  let service: ThreeDSecureService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ThreeDSecureService();
  });

  it('should initiate authentication and create a 3DS record', async () => {
    // force requires3DSecure to return true (reach happy-path branch)
    jest.spyOn(service as any, 'requires3DSecure').mockResolvedValue(true);

    const result = await service.initiateAuthentication('txn_1', '4000002500003155', 100, 'USD');

    expect(result.id).toBeDefined();
    expect(result.transactionId).toBe('txn_1');
    expect(prismaMock.threeDSecure.create).toHaveBeenCalled();
  });

  it('should throw if transaction does not require 3DS', async () => {
    jest.spyOn(service as any, 'requires3DSecure').mockResolvedValue(false);

    await expect(
      service.initiateAuthentication('txn_1', '4111111111111111', 100, 'USD')
    ).rejects.toThrow('Transaction does not require 3D Secure authentication');
  });
});
