import { PaymentService } from '../../src/services/payment/payment.service';
import { getPrisma } from '../../src/config/database';
import { setCache, getCache } from '../../src/config/redis';
import { PaymentGatewayFactory } from '../../src/services/gateway/gateway.factory';
import { ThreeDSecureService } from '../../src/services/threeds/threeds.service';
import { EventStoreService } from '../../src/services/event-store/event-store.service';
import { WebhookService } from '../../src/services/webhook/webhook.service';

jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/gateway/gateway.factory');
jest.mock('../../src/services/threeds/threeds.service');
jest.mock('../../src/services/event-store/event-store.service');
jest.mock('../../src/services/webhook/webhook.service');

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedSetCache = setCache as jest.Mock;
const mockedGetCache = getCache as jest.Mock;

describe('PaymentService – extended', () => {
  let service: PaymentService;
  let prismaMock: any;
  let gatewayMock: any;

  const baseTxn = {
    id: 'txn_1',
    merchantId: 'm_1',
    amount: 100,
    currency: 'USD',
    status: 'CAPTURED',
    type: 'PAYMENT',
    description: 'Test',
    capturedAmount: 100,
    refundedAmount: 0,
    authorizationCode: 'auth_1',
    errorCode: null,
    errorMessage: null,
    customerId: 'c_1',
    metadata: { gateway: 'simulator' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      transaction: {
        create: jest.fn().mockResolvedValue({ ...baseTxn }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      transactionEvent: {
        create: jest.fn(),
      },
    };
    mockedGetPrisma.mockReturnValue(prismaMock);
    mockedSetCache.mockResolvedValue(undefined);
    mockedGetCache.mockResolvedValue(null);

    gatewayMock = {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        authorizationCode: 'auth_123',
        transactionId: 'gw_txn_1',
      }),
      capturePayment: jest.fn().mockResolvedValue({ success: true }),
    };
    (PaymentGatewayFactory.getGateway as jest.Mock).mockReturnValue(gatewayMock);

    (ThreeDSecureService as unknown as jest.Mock).mockImplementation(() => ({
      initiateAuthentication: jest.fn().mockResolvedValue({
        id: '3ds_1',
        challengeUrl: '/3ds/challenge/3ds_1',
      }),
      verifyAuthentication: jest.fn().mockResolvedValue({
        authenticated: true,
        eci: '05',
        cavv: 'xxxcavvxxx',
        xid: 'xxxxidxxx',
      }),
    }));
    (EventStoreService as unknown as jest.Mock).mockImplementation(() => ({
      appendEvent: jest.fn().mockResolvedValue(undefined),
    }));
    (WebhookService as unknown as jest.Mock).mockImplementation(() => ({
      triggerWebhook: jest.fn().mockResolvedValue(undefined),
    }));

    service = new PaymentService();
  });

  const validPaymentData = {
    amount: 100,
    currency: 'USD',
    payment_method: {
      card: { number: '4242424242424242', cvv: '123', exp_month: 12, exp_year: 2030, name: 'Test' },
    },
    capture: true,
    metadata: {},
    gateway: 'simulator' as any,
  };

  // ---- createPayment additional scenarios ----

  it('throws when payment_method is missing', async () => {
    await expect(
      service.createPayment('m_1', { amount: 100, payment_method: null } as any)
    ).rejects.toThrow('Invalid payment method');
  });

  it('handles failed gateway response', async () => {
    gatewayMock.processPayment.mockResolvedValueOnce({
      success: false,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });
    prismaMock.transaction.create.mockResolvedValueOnce({
      ...baseTxn,
      status: 'FAILED',
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });

    const result: any = await service.createPayment('m_1', validPaymentData);

    expect(result.status).toBe('failed');
    expect(result.error).toBeTruthy();
  });

  it('handles gateway exception (circuit breaker error)', async () => {
    gatewayMock.processPayment.mockRejectedValueOnce(new Error('Circuit open'));
    prismaMock.transaction.create.mockResolvedValueOnce({
      ...baseTxn,
      status: 'FAILED',
      errorCode: 'GATEWAY_ERROR',
      errorMessage: 'Circuit open',
    });

    const result: any = await service.createPayment('m_1', validPaymentData);

    expect(result.status).toBe('failed');
  });

  it('handles 3DS-required gateway response', async () => {
    gatewayMock.processPayment.mockResolvedValueOnce({
      success: true,
      requires3DS: true,
      transactionId: 'gw_txn_1',
    });
    prismaMock.transaction.create.mockResolvedValueOnce({
      ...baseTxn,
      status: 'REQUIRES_ACTION',
      metadata: { gateway: 'simulator', requires3DS: true, threeDSChallengeId: '3ds_1' },
    });

    const result: any = await service.createPayment('m_1', validPaymentData);

    expect(result.status).toBe('requires_action');
    expect(result.next_action).toBeDefined();
    expect(result.next_action.type).toBe('3ds_authentication');
  });

  it('creates authorized (not captured) payment when capture=false', async () => {
    prismaMock.transaction.create.mockResolvedValueOnce({
      ...baseTxn,
      status: 'AUTHORIZED',
      capturedAmount: null,
    });

    const result: any = await service.createPayment('m_1', { ...validPaymentData, capture: false });

    expect(result.status).toBe('authorized');
  });

  // ---- getPayment ----

  it('getPayment returns formatted transaction', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      customer: { id: 'c_1', email: 'a@b.com' },
      events: [],
    });

    const result: any = await service.getPayment('txn_1', 'm_1');

    expect(result.id).toBe('txn_1');
    expect(result.object).toBe('payment');
    expect(typeof result.amount).toBe('number');
  });

  it('getPayment returns null when not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    const result = await service.getPayment('missing', 'm_1');
    expect(result).toBeNull();
  });

  // ---- capturePayment ----

  it('capturePayment captures authorized transaction', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'AUTHORIZED' });
    prismaMock.transaction.update.mockResolvedValue({
      ...baseTxn,
      status: 'CAPTURED',
      capturedAmount: 100,
    });

    const result: any = await service.capturePayment('txn_1', 'm_1');

    expect(result.status).toBe('captured');
    expect(prismaMock.transactionEvent.create).toHaveBeenCalled();
  });

  it('capturePayment throws when transaction not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);
    await expect(service.capturePayment('missing', 'm_1')).rejects.toThrow('Payment not found');
  });

  it('capturePayment throws when status is not AUTHORIZED', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'CAPTURED' });
    await expect(service.capturePayment('txn_1', 'm_1')).rejects.toThrow(
      'Payment cannot be captured'
    );
  });

  // ---- refundPayment ----

  it('refundPayment creates full refund', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      status: 'CAPTURED',
      refundedAmount: 0,
    });
    prismaMock.transaction.create.mockResolvedValue({
      ...baseTxn,
      id: 'ref_1',
      type: 'REFUND',
      amount: 100,
      status: 'CAPTURED',
      description: 'Refund',
    });
    prismaMock.transaction.update.mockResolvedValue({});

    const result: any = await service.refundPayment('txn_1', 'm_1');

    expect(result.type).toBe('refund');
    expect(prismaMock.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REFUNDED' }),
      })
    );
  });

  it('refundPayment creates partial refund', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      status: 'CAPTURED',
      refundedAmount: 0,
    });
    prismaMock.transaction.create.mockResolvedValue({
      ...baseTxn,
      id: 'ref_2',
      type: 'REFUND',
      amount: 30,
      status: 'CAPTURED',
      description: 'Partial refund',
    });
    prismaMock.transaction.update.mockResolvedValue({});

    const result: any = await service.refundPayment('txn_1', 'm_1', 30, 'Partial refund');

    expect(result.amount).toBe(30);
    expect(prismaMock.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PARTIALLY_REFUNDED' }),
      })
    );
  });

  it('refundPayment throws when refund exceeds amount', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      status: 'CAPTURED',
      amount: 100,
      refundedAmount: 80,
    });

    await expect(service.refundPayment('txn_1', 'm_1', 50)).rejects.toThrow(
      'Refund amount exceeds payment amount'
    );
  });

  it('refundPayment throws when transaction not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);
    await expect(service.refundPayment('missing', 'm_1')).rejects.toThrow('Payment not found');
  });

  it('refundPayment throws when status is not CAPTURED', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'AUTHORIZED' });
    await expect(service.refundPayment('txn_1', 'm_1')).rejects.toThrow(
      'Only captured payments can be refunded'
    );
  });

  // ---- voidPayment ----

  it('voidPayment voids authorized transaction', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'AUTHORIZED' });
    prismaMock.transaction.update.mockResolvedValue({ ...baseTxn, status: 'VOIDED' });

    const result: any = await service.voidPayment('txn_1', 'm_1');

    expect(result.status).toBe('voided');
    expect(prismaMock.transactionEvent.create).toHaveBeenCalled();
  });

  it('voidPayment throws when not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);
    await expect(service.voidPayment('missing', 'm_1')).rejects.toThrow('Payment not found');
  });

  it('voidPayment throws when status is not AUTHORIZED', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'CAPTURED' });
    await expect(service.voidPayment('txn_1', 'm_1')).rejects.toThrow(
      'Only authorized payments can be voided'
    );
  });

  // ---- complete3DSAuthentication ----

  it('complete3DS throws when payment not found', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);
    await expect(
      service.complete3DSAuthentication('pay_1', 'm_1', '3ds_1', 'paRes')
    ).rejects.toThrow('Payment not found');
  });

  it('complete3DS throws when payment is not REQUIRES_ACTION', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({ ...baseTxn, status: 'CAPTURED' });
    await expect(
      service.complete3DSAuthentication('pay_1', 'm_1', '3ds_1', 'paRes')
    ).rejects.toThrow('Payment does not require 3DS authentication');
  });

  it('complete3DS captures payment on successful authentication', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      status: 'REQUIRES_ACTION',
      metadata: { gateway: 'simulator' },
    });
    prismaMock.transaction.update.mockResolvedValue({
      ...baseTxn,
      status: 'CAPTURED',
      capturedAmount: 100,
      authorizationCode: 'xxxxidxxx',
    });

    const result: any = await service.complete3DSAuthentication('txn_1', 'm_1', '3ds_1', 'paRes');

    expect(result.status).toBe('captured');
    expect(prismaMock.transaction.update).toHaveBeenCalled();
  });

  it('complete3DS fails when 3DS verification fails', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      ...baseTxn,
      status: 'REQUIRES_ACTION',
      metadata: { gateway: 'simulator' },
    });
    // Override the ThreeDSecureService mock for this test
    const svc = new PaymentService();
    (svc as any).threeDSService = {
      verifyAuthentication: jest.fn().mockResolvedValue({ authenticated: false }),
    };
    prismaMock.transaction.update.mockResolvedValue({ ...baseTxn, status: 'FAILED' });

    await expect(svc.complete3DSAuthentication('txn_1', 'm_1', '3ds_1', 'paRes')).rejects.toThrow(
      '3D Secure authentication failed'
    );
  });
});
