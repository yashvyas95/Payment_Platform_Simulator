import {
  PaymentGatewayInterface,
  PaymentRequest,
  PaymentResponse,
  RefundResponse,
  CaptureResponse,
  PaymentStatusResponse,
  ThreeDSecureData,
  ThreeDSecureResponse,
} from './gateway.interface';
import { logger } from '../../utils/logger';

export class StripeGatewayAdapter implements PaymentGatewayInterface {
  private _apiKey: string;
  private _apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this._apiKey = apiKey;
    this._apiSecret = apiSecret;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment through Stripe', {
        apiKeyPrefix: this._apiKey.substring(0, 8),
        hasApiSecret: !!this._apiSecret,
      });

      // Simulate Stripe API call (in production, use Stripe SDK)
      await this.simulateNetworkDelay();

      // Stripe-specific test card logic
      const testCards: Record<
        string,
        { success: boolean; code: string; message?: string; requires3DS?: boolean }
      > = {
        '4242424242424242': { success: true, code: 'success' },
        '5555555555554444': { success: true, code: 'success' },
        '378282246310005': { success: true, code: 'success' },
        '4000000000000002': {
          success: false,
          code: 'card_declined',
          message: 'Your card was declined',
        },
        '4000000000009995': {
          success: false,
          code: 'insufficient_funds',
          message: 'Insufficient funds',
        },
        '4000000000000069': {
          success: false,
          code: 'expired_card',
          message: 'Your card has expired',
        },
        '4000000000000127': {
          success: false,
          code: 'incorrect_cvc',
          message: "Your card's security code is incorrect",
        },
        '4000000000006975': {
          success: false,
          code: 'processing_error',
          message: 'An error occurred while processing your card',
        },
        '4100000000000019': {
          success: false,
          code: 'fraudulent',
          message: 'Your card was declined (suspected fraud)',
        },
        '4000000000000119': {
          success: false,
          code: 'generic_decline',
          message: 'Your card was declined',
        },
        '4000002500003155': { success: true, code: 'requires_3ds', requires3DS: true },
      };

      const cardBehavior = testCards[request.cardNumber as keyof typeof testCards];

      if (
        cardBehavior &&
        'requires3DS' in cardBehavior &&
        cardBehavior.requires3DS &&
        request.require3DSecure
      ) {
        return {
          success: false,
          transactionId: `stripe_auth_${Date.now()}`,
          status: 'requires_action',
          threeDSecureRequired: true,
          threeDSecureUrl: `https://stripe-3ds-simulator.com/authenticate?id=${Date.now()}`,
        };
      }

      if (cardBehavior && !cardBehavior.success) {
        return {
          success: false,
          transactionId: `stripe_${Date.now()}`,
          status: 'failed',
          errorCode: cardBehavior.code,
          errorMessage: cardBehavior.message || 'Payment declined by Stripe',
        };
      }

      // Success response
      return {
        success: true,
        transactionId: `stripe_${Date.now()}`,
        authorizationCode: `AUTH_${this.generateRandomCode()}`,
        status: 'succeeded',
        metadata: {
          gateway: 'stripe',
          network: this.getCardNetwork(request.cardNumber),
          last4: request.cardNumber.slice(-4),
        },
      };
    } catch (error: any) {
      logger.error('Stripe payment failed:', error);
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  async refundPayment(transactionId: string, amount: number): Promise<RefundResponse> {
    logger.info(`Refunding Stripe payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      refundId: `stripe_refund_${Date.now()}`,
      amount,
      status: 'succeeded',
    };
  }

  async capturePayment(transactionId: string, amount: number): Promise<CaptureResponse> {
    logger.info(`Capturing Stripe payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      transactionId,
      capturedAmount: amount,
      status: 'succeeded',
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    logger.info(`Getting Stripe payment status: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      transactionId,
      status: 'succeeded',
      amount: 1000, // Mock amount
      currency: 'USD',
    };
  }

  async verify3DSecure(data: ThreeDSecureData): Promise<ThreeDSecureResponse> {
    logger.info(`Verifying 3D Secure for Stripe: ${data.transactionId}`);
    await this.simulateNetworkDelay();

    // Simulate successful 3DS authentication
    return {
      success: true,
      authenticated: true,
      eci: '05',
      cavv: this.generateRandomCode(),
      xid: this.generateRandomCode(),
      status: 'authenticated',
    };
  }

  private async simulateNetworkDelay(): Promise<void> {
    const delay = 300 + Math.random() * 700; // 300-1000ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateRandomCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  private getCardNetwork(cardNumber: string): string {
    if (cardNumber.startsWith('4')) return 'Visa';
    if (cardNumber.startsWith('5')) return 'Mastercard';
    if (cardNumber.startsWith('3')) return 'Amex';
    return 'Unknown';
  }
}
