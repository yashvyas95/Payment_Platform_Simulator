import { describe, it, expect } from '@jest/globals';
import { StripeGatewayAdapter } from '../../src/services/gateway/stripe.adapter';

describe('StripeGatewayAdapter', () => {
  let adapter: StripeGatewayAdapter;

  beforeEach(() => {
    adapter = new StripeGatewayAdapter('sk_test_123', 'sk_secret_123');
  });

  it('should process successful payment', async () => {
    const result = await adapter.processPayment({
      amount: 1000,
      currency: 'USD',
      cardNumber: '4242424242424242', // Stripe test card
      cvv: '123',
      expMonth: 12,
      expYear: 2025,
      cardholderName: 'Test User',
      merchantId: 'merchant_123',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(result.transactionId).toBeDefined();
    expect(result.authorizationCode).toBeDefined();
  });

  it('should decline payment with test decline card', async () => {
    const result = await adapter.processPayment({
      amount: 1000,
      currency: 'USD',
      cardNumber: '4000000000000002', // Stripe decline test card
      cvv: '123',
      expMonth: 12,
      expYear: 2025,
      cardholderName: 'Test User',
      merchantId: 'merchant_123',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('card_declined');
  });

  it('should require 3DS for specific test card', async () => {
    const result = await adapter.processPayment({
      amount: 1000,
      currency: 'USD',
      cardNumber: '4000002500003155', // 3DS test card
      cvv: '123',
      expMonth: 12,
      expYear: 2025,
      cardholderName: 'Test User',
      merchantId: 'merchant_123',
      require3DSecure: true,
    });

    expect(result.threeDSecureRequired).toBe(true);
  });

  it('should refund payment successfully', async () => {
    const result = await adapter.refundPayment('txn_123', 500);

    expect(result.success).toBe(true);
    expect(result.refundId).toBeDefined();
    expect(result.amount).toBe(500);
  });

  it('should capture authorized payment', async () => {
    const result = await adapter.capturePayment('txn_123', 1000);

    expect(result.success).toBe(true);
    expect(result.capturedAmount).toBe(1000);
  });

  it('should get payment status', async () => {
    const result = await adapter.getPaymentStatus('txn_123');

    expect(result.transactionId).toBe('txn_123');
    expect(result.status).toBeDefined();
  });
});
