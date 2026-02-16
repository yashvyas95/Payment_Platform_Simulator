import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitState,
} from '../../src/services/circuit-breaker/circuit-breaker.service';

// Mock prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    circuitBreakerState: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
    });
  });

  it('should start in CLOSED state', () => {
    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(0);
    expect(stats.successCount).toBe(0);
  });

  it('should execute operation successfully in CLOSED state', async () => {
    const operation = jest.fn<() => Promise<string>>().mockResolvedValue('success');
    const result = await circuitBreaker.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should open circuit after exceeding failure threshold', async () => {
    const operation = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(new Error('Service unavailable'));

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected to fail
      }
    }

    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.OPEN);
  });

  it('should reject calls when circuit is OPEN', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('Service unavailable'));

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected to fail
      }
    }

    // Try to execute when circuit is open
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should reset failure count on successful operation', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');

    // Two failures
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {}
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {}

    // Success should reset counter
    await circuitBreaker.execute(operation);

    const stats = circuitBreaker.getStats();
    expect(stats.failureCount).toBe(0);
    expect(stats.state).toBe(CircuitState.CLOSED);
  });

  it('should manually reset circuit breaker', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('Service unavailable'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {}
    }

    expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);

    // Manual reset
    await circuitBreaker.reset();

    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(0);
  });
});
