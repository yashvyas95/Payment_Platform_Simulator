import { RazorpayGatewayAdapter } from '../../src/services/gateway/razorpay.adapter';

describe('RazorpayGatewayAdapter', () => {
  let adapter: RazorpayGatewayAdapter;

  beforeEach(() => {
    adapter = new RazorpayGatewayAdapter('rzp_test_key', 'rzp_test_secret');
  });

  it('should process successful payment', async () => {
    const result = await adapter.processPayment({
      amount: 5000,
      currency: 'INR',
      cardNumber: '4242424242424242',
      cvv: '123',
      expMonth: 12,
      expYear: 2030,
      cardholderName: 'Test User',
      merchantId: 'merchant_1',
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^pay_/);
    expect(result.authorizationCode).toMatch(/^auth_/);
    expect(result.status).toBe('captured');
    expect(result.metadata?.gateway).toBe('razorpay');
    expect(result.metadata?.network).toBe('Visa');
  });

  it('should decline payment when card ends with 0002', async () => {
    const result = await adapter.processPayment({
      amount: 1000,
      currency: 'INR',
      cardNumber: '4000000000000002',
      cvv: '123',
      expMonth: 12,
      expYear: 2030,
      cardholderName: 'Test User',
      merchantId: 'merchant_1',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('BAD_REQUEST_ERROR');
    expect(result.status).toBe('failed');
  });

  it('should detect Mastercard network', async () => {
    const result = await adapter.processPayment({
      amount: 2000,
      currency: 'INR',
      cardNumber: '5200000000000007',
      cvv: '456',
      expMonth: 6,
      expYear: 2028,
      cardholderName: 'MC User',
      merchantId: 'merchant_2',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.network).toBe('Mastercard');
  });

  it('should refund payment', async () => {
    const result = await adapter.refundPayment('pay_abc', 2000);

    expect(result.success).toBe(true);
    expect(result.refundId).toMatch(/^rfnd_/);
    expect(result.amount).toBe(2000);
    expect(result.status).toBe('processed');
  });

  it('should capture payment', async () => {
    const result = await adapter.capturePayment('pay_abc', 5000);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('pay_abc');
    expect(result.capturedAmount).toBe(5000);
    expect(result.status).toBe('captured');
  });

  it('should get payment status', async () => {
    const result = await adapter.getPaymentStatus('pay_abc');

    expect(result.transactionId).toBe('pay_abc');
    expect(result.status).toBe('captured');
    expect(result.currency).toBe('INR');
  });

  it('should verify 3D Secure', async () => {
    const result = await adapter.verify3DSecure({
      transactionId: 'pay_abc',
      paRes: 'data',
    });

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.eci).toBe('05');
    expect(result.status).toBe('Y');
  });
});
