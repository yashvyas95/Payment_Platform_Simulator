import { logger } from '../../utils/logger';

interface PaymentRequest {
  cardNumber: string;
  amount: number;
  currency: string;
}

interface SimulationResult {
  success: boolean;
  authorizationCode?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: any;
}

// Test card numbers and their responses
const TEST_CARDS = {
  '4242424242424242': { success: true, description: 'Success' },
  '4000000000000002': { success: false, code: 'card_declined', message: 'Your card was declined' },
  '4000000000009995': { success: false, code: 'insufficient_funds', message: 'Insufficient funds' },
  '4000000000000069': { success: false, code: 'expired_card', message: 'Your card has expired' },
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
  '5555555555554444': { success: true, description: 'Mastercard Success' },
  '378282246310005': { success: true, description: 'Amex Success' },
};

export class SimulatorEngine {
  async processPayment(request: PaymentRequest): Promise<SimulationResult> {
    // Simulate network delay
    const delay = this.getRandomDelay();
    await this.sleep(delay);

    logger.info(
      `Processing payment for ${request.cardNumber.slice(-4)}, amount: ${request.amount}`
    );

    // Check test card scenarios
    const testScenario = TEST_CARDS[request.cardNumber as keyof typeof TEST_CARDS];

    if (testScenario) {
      if (testScenario.success) {
        return {
          success: true,
          authorizationCode: this.generateAuthCode(),
          metadata: {
            processor_response: 'approved',
            network: this.getCardNetwork(request.cardNumber),
          },
        };
      } else {
        // Type guard: testScenario is failure type
        const failureScenario = testScenario as { success: false; code: string; message: string };
        return {
          success: false,
          errorCode: failureScenario.code,
          errorMessage: failureScenario.message,
          metadata: {
            processor_response: 'declined',
            decline_code: failureScenario.code,
          },
        };
      }
    }

    // For other cards, use probabilistic success
    const successRate = parseFloat(process.env.SIMULATOR_SUCCESS_RATE || '0.85');
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      return {
        success: true,
        authorizationCode: this.generateAuthCode(),
        metadata: {
          processor_response: 'approved',
          network: this.getCardNetwork(request.cardNumber),
        },
      };
    } else {
      // Random failure scenario
      const failures = [
        { code: 'card_declined', message: 'Your card was declined' },
        { code: 'insufficient_funds', message: 'Insufficient funds' },
        { code: 'processing_error', message: 'An error occurred while processing' },
      ];
      const failure = failures[Math.floor(Math.random() * failures.length)];

      return {
        success: false,
        errorCode: failure.code,
        errorMessage: failure.message,
        metadata: {
          processor_response: 'declined',
          decline_code: failure.code,
        },
      };
    }
  }

  private getRandomDelay(): number {
    const min = 500;
    const max = 2000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateAuthCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private getCardNetwork(cardNumber: string): string {
    const firstDigit = cardNumber.charAt(0);
    const firstTwo = cardNumber.substring(0, 2);

    if (firstDigit === '4') return 'visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'mastercard';
    if (['34', '37'].includes(firstTwo)) return 'amex';
    if (firstTwo === '60') return 'discover';

    return 'unknown';
  }

  getTestCards() {
    return Object.entries(TEST_CARDS).map(([number, scenario]) => ({
      number,
      last4: number.slice(-4),
      scenario: scenario.success ? 'success' : (scenario as any).code,
      description: scenario.success ? (scenario as any).description : (scenario as any).message,
    }));
  }
}
