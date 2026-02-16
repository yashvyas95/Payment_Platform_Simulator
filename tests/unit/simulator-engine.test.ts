import { SimulatorEngine } from '../../src/services/simulator/simulator.engine';

describe('SimulatorEngine', () => {
  let engine: SimulatorEngine;

  beforeEach(() => {
    engine = new SimulatorEngine();
  });

  it('returns success for known success test card', async () => {
    jest.spyOn<any, any>(engine as any, 'sleep').mockResolvedValue(undefined);

    const result = await engine.processPayment({
      cardNumber: '4242424242424242',
      amount: 100,
      currency: 'USD',
    });

    expect(result.success).toBe(true);
    expect(result.authorizationCode).toBeDefined();
    expect(result.metadata?.processor_response).toBe('approved');
  });

  it('returns failure for known failure test card', async () => {
    jest.spyOn<any, any>(engine as any, 'sleep').mockResolvedValue(undefined);

    const result = await engine.processPayment({
      cardNumber: '4000000000000002',
      amount: 100,
      currency: 'USD',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('card_declined');
    expect(result.metadata?.decline_code).toBe('card_declined');
  });

  it('uses probabilistic path for non-test cards', async () => {
    jest.spyOn<any, any>(engine as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const result = await engine.processPayment({
      cardNumber: '1234567890123456',
      amount: 50,
      currency: 'USD',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBeDefined();
  });

  it('returns list of test cards with scenarios', () => {
    const cards = engine.getTestCards();
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]).toHaveProperty('number');
    expect(cards[0]).toHaveProperty('scenario');
  });
});
