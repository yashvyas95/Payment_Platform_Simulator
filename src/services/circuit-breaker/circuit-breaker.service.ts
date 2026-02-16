import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Successes needed in half-open to close
  timeout: number; // Time in ms before attempting half-open
  monitoringPeriod: number; // Time window for failure counting
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  nextAttemptAt?: Date;
}

export class CircuitBreaker {
  private serviceName: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureAt?: Date;
  private nextAttemptAt?: Date;

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      successThreshold: config?.successThreshold || 2,
      timeout: config?.timeout || 60000, // 1 minute default
      monitoringPeriod: config?.monitoringPeriod || 120000, // 2 minutes
    };

    this.loadState();
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        logger.info(`Circuit breaker ${this.serviceName}: Attempting half-open state`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        const error = new Error('Circuit breaker is OPEN');
        logger.warn(`Circuit breaker ${this.serviceName}: Rejecting call - circuit is OPEN`);
        throw error;
      }
    }

    try {
      const result = await operation();
      await this.onSuccess();
      return result;
    } catch (error: any) {
      await this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private async onSuccess(): Promise<void> {
    this.failureCount = 0;
    this.lastFailureAt = undefined;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      logger.info(
        `Circuit breaker ${this.serviceName}: Success in half-open (${this.successCount}/${this.config.successThreshold})`
      );

      if (this.successCount >= this.config.successThreshold) {
        logger.info(`Circuit breaker ${this.serviceName}: Closing circuit`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.nextAttemptAt = undefined;
        await this.persistState();
      }
    }
  }

  /**
   * Handle failed operation
   */
  private async onFailure(error: Error): Promise<void> {
    this.failureCount++;
    this.lastFailureAt = new Date();

    logger.warn(
      `Circuit breaker ${this.serviceName}: Failure recorded (${this.failureCount}/${this.config.failureThreshold})`,
      { error: error.message }
    );

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`Circuit breaker ${this.serviceName}: Failure in half-open, reopening circuit`);
      this.state = CircuitState.OPEN;
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptAt = new Date(Date.now() + this.config.timeout);
      await this.persistState();
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      logger.error(`Circuit breaker ${this.serviceName}: Opening circuit due to failures`);
      this.state = CircuitState.OPEN;
      this.nextAttemptAt = new Date(Date.now() + this.config.timeout);
      await this.persistState();
    }
  }

  /**
   * Check if should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptAt) return true;
    return Date.now() >= this.nextAttemptAt.getTime();
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      nextAttemptAt: this.nextAttemptAt,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  async reset(): Promise<void> {
    logger.info(`Circuit breaker ${this.serviceName}: Manual reset`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureAt = undefined;
    this.nextAttemptAt = undefined;
    await this.persistState();
  }

  /**
   * Persist circuit breaker state to database
   */
  private async persistState(): Promise<void> {
    try {
      await prisma.circuitBreakerState.upsert({
        where: { serviceName: this.serviceName },
        update: {
          state: this.state,
          failureCount: this.failureCount,
          lastFailureAt: this.lastFailureAt,
          nextAttemptAt: this.nextAttemptAt,
          updatedAt: new Date(),
        },
        create: {
          serviceName: this.serviceName,
          state: this.state,
          failureCount: this.failureCount,
          lastFailureAt: this.lastFailureAt,
          nextAttemptAt: this.nextAttemptAt,
        },
      });
    } catch (error: any) {
      logger.error(`Failed to persist circuit breaker state: ${error.message}`);
    }
  }

  /**
   * Load circuit breaker state from database
   */
  private async loadState(): Promise<void> {
    try {
      const saved = await prisma.circuitBreakerState.findUnique({
        where: { serviceName: this.serviceName },
      });

      if (saved) {
        this.state = saved.state as CircuitState;
        this.failureCount = saved.failureCount;
        this.lastFailureAt = saved.lastFailureAt || undefined;
        this.nextAttemptAt = saved.nextAttemptAt || undefined;
        logger.info(`Circuit breaker ${this.serviceName}: State loaded - ${this.state}`);
      }
    } catch (error: any) {
      logger.error(`Failed to load circuit breaker state: ${error.message}`);
    }
  }
}

/**
 * Circuit breaker registry for managing multiple service breakers
 */
export class CircuitBreakerRegistry {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  static getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }

  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }
}
