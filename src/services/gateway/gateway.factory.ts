import { PaymentGatewayInterface } from './gateway.interface';
import { StripeGatewayAdapter } from './stripe.adapter';
import { PayPalGatewayAdapter } from './paypal.adapter';
import { RazorpayGatewayAdapter } from './razorpay.adapter';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export type GatewayType = 'stripe' | 'paypal' | 'razorpay' | 'simulator';

export interface GatewayConfig {
  gateway: GatewayType;
  apiKey: string;
  apiSecret?: string;
  enabled: boolean;
}

export class PaymentGatewayFactory {
  private static gateways: Map<GatewayType, PaymentGatewayInterface> = new Map();

  /**
   * Initialize gateway adapters from database configuration
   */
  static async initialize(): Promise<void> {
    try {
      const configs = await prisma.gatewayConfig.findMany({
        where: { isActive: true },
      });

      for (const config of configs) {
        const gatewayType = config.gateway.toLowerCase() as GatewayType;
        const gateway = this.createGateway(
          gatewayType,
          config.apiKey,
          config.apiSecret || undefined
        );
        if (gateway) {
          this.gateways.set(gatewayType, gateway);
          logger.info(`Payment gateway initialized: ${gatewayType}`);
        }
      }

      // Always ensure simulator gateway exists for testing
      if (!this.gateways.has('simulator')) {
        this.gateways.set('simulator', this.createSimulatorGateway());
        logger.info('Simulator gateway initialized');
      }

      logger.info(`Payment Gateway Factory initialized with ${this.gateways.size} gateways`);
    } catch (error: any) {
      logger.error('Failed to initialize payment gateways:', error);
      throw new Error(`Gateway initialization failed: ${error.message}`);
    }
  }

  /**
   * Get a specific payment gateway
   */
  static getGateway(type: GatewayType): PaymentGatewayInterface {
    const gateway = this.gateways.get(type);

    if (!gateway) {
      logger.warn(`Gateway ${type} not found, falling back to simulator`);
      return this.gateways.get('simulator')!;
    }

    return gateway;
  }

  /**
   * Register a gateway manually
   */
  static registerGateway(type: GatewayType, apiKey: string, apiSecret?: string): void {
    const gateway = this.createGateway(type, apiKey, apiSecret);
    if (gateway) {
      this.gateways.set(type, gateway);
      logger.info(`Gateway ${type} registered successfully`);
    }
  }

  /**
   * Get all available gateway types
   */
  static getAvailableGateways(): GatewayType[] {
    return Array.from(this.gateways.keys());
  }

  /**
   * Create gateway instance based on type
   */
  private static createGateway(
    type: GatewayType,
    apiKey: string,
    apiSecret?: string
  ): PaymentGatewayInterface | null {
    switch (type) {
      case 'stripe':
        return new StripeGatewayAdapter(apiKey, apiSecret || '');

      case 'paypal':
        return new PayPalGatewayAdapter(apiKey, apiSecret || '');

      case 'razorpay':
        return new RazorpayGatewayAdapter(apiKey, apiSecret || '');

      case 'simulator':
        return this.createSimulatorGateway();

      default:
        logger.warn(`Unknown gateway type: ${type}`);
        return null;
    }
  }

  /**
   * Create simulator gateway (original behavior)
   */
  private static createSimulatorGateway(): PaymentGatewayInterface {
    // This maintains backward compatibility with the existing simulator
    return new StripeGatewayAdapter('simulator_key', 'simulator_secret');
  }

  /**
   * Check gateway health
   */
  static async checkGatewayHealth(type: GatewayType): Promise<boolean> {
    try {
      const gateway = this.getGateway(type);
      // Attempt a status check with a dummy transaction
      await gateway.getPaymentStatus('health_check');
      return true;
    } catch {
      return false;
    }
  }
}
