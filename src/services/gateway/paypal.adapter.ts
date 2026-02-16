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

export class PayPalGatewayAdapter implements PaymentGatewayInterface {
  private _clientId: string;
  private _clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this._clientId = clientId;
    this._clientSecret = clientSecret;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment through PayPal', {
        clientIdPrefix: this._clientId.substring(0, 8),
        hasClientSecret: !!this._clientSecret,
      });
      await this.simulateNetworkDelay();

      // PayPal-specific test card logic
      const declinedCards: Record<string, { code: string; message: string }> = {
        '4000000000000002': { code: 'INSTRUMENT_DECLINED', message: 'Your card was declined' },
        '4000000000009995': { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' },
        '4000000000000069': { code: 'EXPIRED_CARD', message: 'Your card has expired' },
        '4000000000000127': {
          code: 'INCORRECT_CVC',
          message: "Your card's security code is incorrect",
        },
        '4000000000006975': {
          code: 'PROCESSING_ERROR',
          message: 'An error occurred while processing your card',
        },
        '4100000000000019': {
          code: 'FRAUD_DETECTED',
          message: 'Your card was declined (suspected fraud)',
        },
        '4000000000000119': { code: 'INSTRUMENT_DECLINED', message: 'Your card was declined' },
      };

      const declineInfo = declinedCards[request.cardNumber];
      if (declineInfo) {
        return {
          success: false,
          transactionId: `paypal_${Date.now()}`,
          status: 'DECLINED',
          errorCode: declineInfo.code,
          errorMessage: declineInfo.message,
        };
      }

      return {
        success: true,
        transactionId: `PAYPAL-${Date.now()}-${this.generateOrderId()}`,
        authorizationCode: `${this.generateRandomCode()}`,
        status: 'COMPLETED',
        metadata: {
          gateway: 'paypal',
          payer_id: `PAYER${this.generateRandomCode()}`,
          last4: request.cardNumber.slice(-4),
        },
      };
    } catch (error: any) {
      logger.error('PayPal payment failed:', error);
      throw new Error(`PayPal payment failed: ${error.message}`);
    }
  }

  async refundPayment(transactionId: string, amount: number): Promise<RefundResponse> {
    logger.info(`Refunding PayPal payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      refundId: `PAYPAL-REFUND-${Date.now()}`,
      amount,
      status: 'COMPLETED',
    };
  }

  async capturePayment(transactionId: string, amount: number): Promise<CaptureResponse> {
    logger.info(`Capturing PayPal payment: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      success: true,
      transactionId,
      capturedAmount: amount,
      status: 'COMPLETED',
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    logger.info(`Getting PayPal payment status: ${transactionId}`);
    await this.simulateNetworkDelay();

    return {
      transactionId,
      status: 'COMPLETED',
      amount: 1000,
      currency: 'USD',
    };
  }

  async verify3DSecure(data: ThreeDSecureData): Promise<ThreeDSecureResponse> {
    logger.info(`PayPal doesn't use traditional 3DS: ${data.transactionId}`);

    return {
      success: true,
      authenticated: true,
      status: 'not_applicable',
    };
  }

  private async simulateNetworkDelay(): Promise<void> {
    const delay = 400 + Math.random() * 800; // 400-1200ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateOrderId(): string {
    return Math.random().toString(36).substring(2, 17).toUpperCase();
  }

  private generateRandomCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
