import { getPrisma } from '../../config/database';
import { WebhookService } from '../webhook/webhook.service';
import { getCache, setCache } from '../../config/redis';
import { PaymentGatewayFactory, GatewayType } from '../gateway/gateway.factory';
import { CircuitBreakerRegistry } from '../circuit-breaker/circuit-breaker.service';
import { EventStoreService, PaymentEvents } from '../event-store/event-store.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ThreeDSecureService } from '../threeds/threeds.service';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface CreatePaymentDTO {
  amount: number;
  currency?: string;
  payment_method: any;
  customer?: string;
  description?: string;
  capture?: boolean;
  metadata?: any;
  gateway?: GatewayType;
}

export class PaymentService {
  private prisma = getPrisma();
  private webhookService = new WebhookService();
  private eventStore = new EventStoreService();
  private wsService = WebSocketService.getInstance();
  private threeDSService = new ThreeDSecureService();

  async createPayment(merchantId: string, data: CreatePaymentDTO) {
    const {
      amount,
      currency = 'USD',
      payment_method,
      customer,
      description,
      capture = true,
      metadata,
      gateway = 'simulator',
    } = data;

    // Check idempotency
    const idempotencyKey = metadata?.idempotency_key;
    if (idempotencyKey) {
      const cached = await getCache(`idempotency:${idempotencyKey}`);
      if (cached) {
        return cached;
      }
    }

    // Validate payment method
    if (!payment_method || !payment_method.card) {
      throw new Error('Invalid payment method');
    }

    const transactionId = uuidv4();
    const cardNumber = payment_method.card.number;

    // Emit PAYMENT_INITIATED event
    await this.eventStore.appendEvent({
      aggregateId: transactionId,
      aggregateType: 'Payment',
      eventType: PaymentEvents.PAYMENT_INITIATED,
      eventData: {
        amount,
        currency,
        cardNumber: `****${cardNumber.slice(-4)}`,
        gateway,
        merchantId,
      },
      version: 1,
    });

    let status: any = 'PENDING';
    let errorCode = null;
    let errorMessage = null;
    let authorizationCode = null;
    let requires3DS = false;
    let threeDSChallenge = null;

    try {
      // Get the payment gateway adapter
      const gatewayAdapter = PaymentGatewayFactory.getGateway(gateway);

      // Get circuit breaker for this gateway
      const circuitBreaker = CircuitBreakerRegistry.getBreaker(`gateway_${gateway}`);

      // Process payment through gateway with circuit breaker protection
      const gatewayResult = await circuitBreaker.execute(async () => {
        return await gatewayAdapter.processPayment({
          transactionId,
          amount,
          currency,
          cardNumber,
          cvv: payment_method.card.cvv,
          expiryMonth: payment_method.card.exp_month,
          expiryYear: payment_method.card.exp_year,
          cardholderName: payment_method.card.name,
          merchantId,
        } as any);
      });

      // Check if 3D Secure is required
      if ((gatewayResult as any).requires3DS) {
        requires3DS = true;
        threeDSChallenge = await this.threeDSService.initiateAuthentication(
          transactionId,
          cardNumber,
          amount,
          currency
        );

        status = 'REQUIRES_ACTION';

        await this.eventStore.appendEvent({
          aggregateId: transactionId,
          aggregateType: 'Payment',
          eventType: PaymentEvents.THREE_DS_REQUIRED,
          eventData: { challengeId: threeDSChallenge.id },
          version: 2,
        });

        logger.info(`Payment requires 3DS authentication: ${transactionId}`);
      } else if (!gatewayResult.success) {
        status = 'FAILED';
        errorCode = gatewayResult.errorCode;
        errorMessage = gatewayResult.errorMessage;

        await this.eventStore.appendEvent({
          aggregateId: transactionId,
          aggregateType: 'Payment',
          eventType: PaymentEvents.PAYMENT_FAILED,
          eventData: { errorCode, errorMessage },
          version: 2,
        });
      } else {
        status = capture ? 'CAPTURED' : 'AUTHORIZED';
        authorizationCode = gatewayResult.authorizationCode;

        await this.eventStore.appendEvent({
          aggregateId: transactionId,
          aggregateType: 'Payment',
          eventType: capture ? PaymentEvents.PAYMENT_CAPTURED : PaymentEvents.PAYMENT_AUTHORIZED,
          eventData: { authorizationCode, gatewayTransactionId: gatewayResult.transactionId },
          version: 2,
        });
      }
    } catch (error: any) {
      status = 'FAILED';
      errorCode = 'GATEWAY_ERROR';
      errorMessage = error.message;

      logger.error('Payment processing failed:', error);

      await this.eventStore.appendEvent({
        aggregateId: transactionId,
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_FAILED,
        eventData: { errorCode, errorMessage, error: error.stack },
        version: 2,
      });
    }

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        id: transactionId,
        merchantId,
        customerId: customer,
        amount,
        currency,
        status,
        type: 'PAYMENT',
        description,
        authorizationCode,
        errorCode,
        errorMessage,
        capturedAmount: capture && status === 'CAPTURED' ? amount : null,
        metadata: {
          ...metadata,
          gateway,
          requires3DS,
          threeDSChallengeId: threeDSChallenge?.id,
        },
        idempotencyKey,
      },
    });

    // Create event
    await this.prisma.transactionEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: (status === 'CAPTURED'
          ? 'PAYMENT_CAPTURED'
          : status === 'AUTHORIZED'
            ? 'PAYMENT_AUTHORIZED'
            : status === 'REQUIRES_ACTION'
              ? 'PAYMENT_REQUIRES_ACTION'
              : 'PAYMENT_FAILED') as any,
        newStatus: status,
        metadata: { gateway },
      },
    });

    // Cache for idempotency
    if (idempotencyKey) {
      await setCache(`idempotency:${idempotencyKey}`, transaction, 86400); // 24 hours
    }

    // Send real-time update via WebSocket
    this.wsService.broadcastPaymentUpdate(transaction.id, merchantId, {
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    // Trigger webhook
    await this.webhookService.triggerWebhook(merchantId, {
      type:
        status === 'CAPTURED'
          ? 'PAYMENT_CAPTURED'
          : status === 'AUTHORIZED'
            ? 'PAYMENT_AUTHORIZED'
            : status === 'REQUIRES_ACTION'
              ? 'PAYMENT_REQUIRES_ACTION'
              : 'PAYMENT_FAILED',
      data: transaction,
    });

    const formattedTransaction = this.formatTransaction(transaction);

    // Include 3DS challenge data if required
    if (requires3DS && threeDSChallenge) {
      return {
        ...formattedTransaction,
        next_action: {
          type: '3ds_authentication',
          challenge_url: threeDSChallenge.challengeUrl,
          challenge_id: threeDSChallenge.id,
        },
      };
    }

    return formattedTransaction;
  }

  async getPayment(id: string, merchantId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, merchantId },
      include: {
        customer: true,
        events: true,
      },
    });

    return transaction ? this.formatTransaction(transaction) : null;
  }

  async complete3DSAuthentication(
    paymentId: string,
    merchantId: string,
    challengeId: string,
    paRes: string
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: paymentId, merchantId },
    });

    if (!transaction) {
      throw new Error('Payment not found');
    }

    if ((transaction.status as string) !== 'REQUIRES_ACTION') {
      throw new Error('Payment does not require 3DS authentication');
    }

    try {
      // Verify 3DS authentication
      const verification = await this.threeDSService.verifyAuthentication(challengeId, paRes);

      if (!verification.authenticated) {
        // Authentication failed
        await this.prisma.transaction.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            errorCode: '3DS_AUTHENTICATION_FAILED',
            errorMessage: '3D Secure authentication failed',
          },
        });

        await this.eventStore.appendEvent({
          aggregateId: paymentId,
          aggregateType: 'Payment',
          eventType: PaymentEvents.THREE_DS_FAILED,
          eventData: { challengeId },
          version: 3,
        });

        this.wsService.broadcastPaymentUpdate(paymentId, merchantId, {
          status: 'FAILED',
          error: '3D Secure authentication failed',
        });

        throw new Error('3D Secure authentication failed');
      }

      // Authentication successful - process the payment
      const gateway = (transaction.metadata as any)?.gateway || 'simulator';
      const gatewayAdapter = PaymentGatewayFactory.getGateway(gateway);

      // Complete the payment (we only care if it throws or not)
      await gatewayAdapter.capturePayment(paymentId, Number(transaction.amount));

      const updated = await this.prisma.transaction.update({
        where: { id: paymentId },
        data: {
          status: 'CAPTURED',
          capturedAmount: transaction.amount,
          authorizationCode: verification.xid,
          metadata: {
            ...(transaction.metadata as any),
            threeDSAuthenticated: true,
            eci: verification.eci,
            cavv: verification.cavv,
          },
        },
      });

      await this.eventStore.appendEvent({
        aggregateId: paymentId,
        aggregateType: 'Payment',
        eventType: PaymentEvents.THREE_DS_AUTHENTICATED,
        eventData: { challengeId, eci: verification.eci },
        version: 3,
      });

      await this.eventStore.appendEvent({
        aggregateId: paymentId,
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_CAPTURED,
        eventData: { eci: verification.eci, cavv: verification.cavv },
        version: 4,
      });

      this.wsService.broadcastPaymentUpdate(paymentId, merchantId, {
        status: 'CAPTURED',
        amount: updated.amount,
      });

      await this.webhookService.triggerWebhook(merchantId, {
        type: 'PAYMENT_CAPTURED',
        data: updated,
      });

      return this.formatTransaction(updated);
    } catch (error: any) {
      logger.error('Failed to complete 3DS authentication:', error);
      throw error;
    }
  }

  async capturePayment(id: string, merchantId: string, amount?: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, merchantId },
    });

    if (!transaction) {
      throw new Error('Payment not found');
    }

    if (transaction.status !== 'AUTHORIZED') {
      throw new Error('Payment cannot be captured');
    }

    const captureAmount = amount || Number(transaction.amount);

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: 'CAPTURED',
        capturedAmount: captureAmount,
        updatedAt: new Date(),
      },
    });

    await this.prisma.transactionEvent.create({
      data: {
        transactionId: id,
        eventType: 'PAYMENT_CAPTURED',
        previousStatus: 'AUTHORIZED',
        newStatus: 'CAPTURED',
      },
    });

    await this.webhookService.triggerWebhook(merchantId, {
      type: 'PAYMENT_CAPTURED',
      data: updated,
    });

    return this.formatTransaction(updated);
  }

  async refundPayment(id: string, merchantId: string, amount?: number, reason?: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, merchantId },
    });

    if (!transaction) {
      throw new Error('Payment not found');
    }

    if (transaction.status !== 'CAPTURED') {
      throw new Error('Only captured payments can be refunded');
    }

    const refundAmount = amount || Number(transaction.amount);
    const currentRefunded = Number(transaction.refundedAmount || 0);

    if (currentRefunded + refundAmount > Number(transaction.amount)) {
      throw new Error('Refund amount exceeds payment amount');
    }

    // Create refund transaction
    const refund = await this.prisma.transaction.create({
      data: {
        merchantId,
        customerId: transaction.customerId,
        amount: refundAmount,
        currency: transaction.currency,
        status: 'CAPTURED',
        type: 'REFUND',
        description: reason || 'Refund',
        parentId: id,
      },
    });

    // Update original transaction
    const newRefundedAmount = currentRefunded + refundAmount;
    const newStatus =
      newRefundedAmount >= Number(transaction.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.transaction.update({
      where: { id },
      data: {
        refundedAmount: newRefundedAmount,
        status: newStatus,
      },
    });

    await this.webhookService.triggerWebhook(merchantId, {
      type: 'PAYMENT_REFUNDED',
      data: refund,
    });

    return this.formatTransaction(refund);
  }

  async voidPayment(id: string, merchantId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, merchantId },
    });

    if (!transaction) {
      throw new Error('Payment not found');
    }

    if (transaction.status !== 'AUTHORIZED') {
      throw new Error('Only authorized payments can be voided');
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: 'VOIDED',
        updatedAt: new Date(),
      },
    });

    await this.prisma.transactionEvent.create({
      data: {
        transactionId: id,
        eventType: 'PAYMENT_VOIDED',
        previousStatus: 'AUTHORIZED',
        newStatus: 'VOIDED',
      },
    });

    await this.webhookService.triggerWebhook(merchantId, {
      type: 'PAYMENT_VOIDED',
      data: updated,
    });

    return this.formatTransaction(updated);
  }

  private formatTransaction(transaction: any) {
    return {
      id: transaction.id,
      object: 'payment',
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status.toLowerCase(),
      type: transaction.type.toLowerCase(),
      description: transaction.description,
      authorization_code: transaction.authorizationCode,
      captured_amount: transaction.capturedAmount ? Number(transaction.capturedAmount) : null,
      refunded_amount: transaction.refundedAmount ? Number(transaction.refundedAmount) : null,
      error: transaction.errorCode
        ? {
            code: transaction.errorCode,
            message: transaction.errorMessage,
          }
        : null,
      metadata: transaction.metadata,
      created: Math.floor(new Date(transaction.createdAt).getTime() / 1000),
      updated: Math.floor(new Date(transaction.updatedAt).getTime() / 1000),
    };
  }
}
