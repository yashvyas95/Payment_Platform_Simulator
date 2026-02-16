import { PayPalGatewayAdapter } from '../../src/services/gateway/paypal.adapter';

describe('PayPalGatewayAdapter', () => {
  let adapter: PayPalGatewayAdapter;

  beforeEach(() => {
    adapter = new PayPalGatewayAdapter('client_id_test', 'client_secret_test');
  });

  it('should process successful payment', async () => {
    const result = await adapter.processPayment({
      amount: 2000,
      currency: 'USD',
      cardNumber: '4242424242424242',
      cvv: '123',
      expMonth: 12,
      expYear: 2030,
      cardholderName: 'Test User',
      merchantId: 'merchant_1',
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toContain('PAYPAL-');
    expect(result.authorizationCode).toBeDefined();
    expect(result.status).toBe('COMPLETED');
    expect(result.metadata?.gateway).toBe('paypal');
  });

  it('should decline payment when card ends with 0002', async () => {
    const result = await adapter.processPayment({
      amount: 1000,
      currency: 'USD',
      cardNumber: '4000000000000002',
      cvv: '123',
      expMonth: 12,
      expYear: 2030,
      cardholderName: 'Test User',
      merchantId: 'merchant_1',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INSTRUMENT_DECLINED');
    expect(result.status).toBe('DECLINED');
  });

  it('should refund payment', async () => {
    const result = await adapter.refundPayment('PAYPAL-123', 500);

    expect(result.success).toBe(true);
    expect(result.refundId).toContain('PAYPAL-REFUND-');
    expect(result.amount).toBe(500);
    expect(result.status).toBe('COMPLETED');
  });

  it('should capture payment', async () => {
    const result = await adapter.capturePayment('PAYPAL-123', 1000);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('PAYPAL-123');
    expect(result.capturedAmount).toBe(1000);
  });

  it('should get payment status', async () => {
    const result = await adapter.getPaymentStatus('PAYPAL-123');

    expect(result.transactionId).toBe('PAYPAL-123');
    expect(result.status).toBe('COMPLETED');
    expect(result.amount).toBe(1000);
  });

  it('should handle 3D Secure as not applicable', async () => {
    const result = await adapter.verify3DSecure({
      transactionId: 'txn_123',
      paRes: 'data',
    });

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.status).toBe('not_applicable');
  });
});
