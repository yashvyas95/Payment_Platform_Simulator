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

export class RazorpayGatewayAdapter implements PaymentGatewayInterface {
  private _keyId: string;
  private _keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this._keyId = keyId;
    this._keySecret = keySecret;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment through Razorpay', {
        keyIdPrefix: this._keyId.substring(0, 8),
        hasKeySecret: !!this._keySecret,
      });
      await this.simulateNetworkDelay();

      // Razorpay-specific test card logic
      const declinedCards: Record<string, { code: string; message: string }> = {
        '4000000000000002': { code: 'BAD_REQUEST_ERROR', message: 'Your card was declined' },
        '4000000000009995': { code: 'BAD_REQUEST_ERROR', message: 'Insufficient funds' },
        '4000000000000069': { code: 'BAD_REQUEST_ERROR', message: 'Your card has expired' },
        '4000000000000127': {
          code: 'BAD_REQUEST_ERROR',
          message: "Your card's security code is incorrect",
        },
        '4000000000006975': {
          code: 'GATEWAY_ERROR',
          message: 'An error occurred while processing your card',
        },
        '4100000000000019': {
          code: 'BAD_REQUEST_ERROR',
          message: 'Your card was declined (suspected fraud)',
        },
        '4000000000000119': { code: 'BAD_REQUEST_ERROR', message: 'Your card was declined' },
      };

      const declineInfo = declinedCards[request.cardNumber];
      if (declineInfo) {
        return {
          success: false,
          transactionId: `razorpay_${Date.now()}`,
          status: 'failed',
          errorCode: declineInfo.code,
          errorMessage: declineInfo.message,
        };
      }

      return {
        success: true,
        transactionId: `pay_${this.generateRazorpayId()}`,
        authorizationCode: `auth_${this.generateRazorpayId()}`,
        status: 'captured',
        metadata: {
          gateway: 'razorpay',
          order_id: `order_${this.generateRazorpayId()}`,
          method: 'card',
          last4: request.cardNumber.slice(-4),
          network: this.getCardNetwork(request.cardNumber),
        },
      };
    } catch (error: any) {
      logger.error('Razorpay payment failed:', error);
      throw new Error(`Razorpay payment failed: ${error.message}`);
    }
  }

  async refundPayment(transactionId: string, amount: number): Promise<RefundResponse> {
    logger.info(`Refunding Razorpay payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      refundId: `rfnd_${this.generateRazorpayId()}`,
      amount,
      status: 'processed',
    };
  }

  async capturePayment(transactionId: string, amount: number): Promise<CaptureResponse> {
    logger.info(`Capturing Razorpay payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      transactionId,
      capturedAmount: amount,
      status: 'captured',
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    logger.info(`Getting Razorpay payment status: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      transactionId,
      status: 'captured',
      amount: 1000,
      currency: 'INR',
    };
  }

  async verify3DSecure(data: ThreeDSecureData): Promise<ThreeDSecureResponse> {
    logger.info(`Verifying 3D Secure for Razorpay: ${data.transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      authenticated: true,
      eci: '05',
      status: 'Y', // Y = Authentication successful
    };
  }

  private async simulateNetworkDelay(): Promise<void> {
    const delay = 350 + Math.random() * 650; // 350-1000ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateRazorpayId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getCardNetwork(cardNumber: string): string {
    if (cardNumber.startsWith('4')) return 'Visa';
    if (cardNumber.startsWith('5')) return 'Mastercard';
    if (cardNumber.startsWith('6')) return 'RuPay';
    return 'Unknown';
  }
}
