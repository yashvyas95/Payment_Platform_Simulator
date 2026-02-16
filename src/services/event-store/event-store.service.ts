import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export interface DomainEvent {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: any;
  version: number;
  metadata?: Record<string, any>;
  causationId?: string;
  correlationId?: string;
}

export interface EventFilter {
  aggregateId?: string;
  aggregateType?: string;
  eventType?: string;
  fromVersion?: number;
  toVersion?: number;
  limit?: number;
}

export class EventStoreService {
  /**
   * Append a new event to the event store
   */
  async appendEvent(event: DomainEvent): Promise<string> {
    try {
      const storedEvent = await prisma.eventStore.create({
        data: {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          eventData: event.eventData,
          version: event.version,
          eventMetadata: event.metadata || {},
          causationId: event.causationId,
          correlationId: event.correlationId,
        },
      });

      logger.info(
        `Event appended: ${event.eventType} for ${event.aggregateType}:${event.aggregateId} v${event.version}`
      );

      return storedEvent.id;
    } catch (error: any) {
      logger.error('Failed to append event:', error);
      throw new Error(`Event append failed: ${error.message}`);
    }
  }

  /**
   * Append multiple events atomically
   */
  async appendEvents(events: DomainEvent[]): Promise<string[]> {
    try {
      const result = await prisma.$transaction(
        events.map((event) =>
          prisma.eventStore.create({
            data: {
              aggregateId: event.aggregateId,
              aggregateType: event.aggregateType,
              eventType: event.eventType,
              eventData: event.eventData,
              version: event.version,
              eventMetadata: event.metadata || {},
              causationId: event.causationId,
              correlationId: event.correlationId,
            },
          })
        )
      );

      logger.info(`Appended ${events.length} events atomically`);
      return result.map((e: any) => e.id);
    } catch (error: any) {
      logger.error('Failed to append events:', error);
      throw new Error(`Batch event append failed: ${error.message}`);
    }
  }

  /**
   * Get events for a specific aggregate
   */
  async getEvents(filter: EventFilter): Promise<DomainEvent[]> {
    try {
      const where: any = {};

      if (filter.aggregateId) {
        where.aggregateId = filter.aggregateId;
      }
      if (filter.aggregateType) {
        where.aggregateType = filter.aggregateType;
      }
      if (filter.eventType) {
        where.eventType = filter.eventType;
      }
      if (filter.fromVersion !== undefined) {
        where.version = { gte: filter.fromVersion };
      }
      if (filter.toVersion !== undefined) {
        where.version = { ...where.version, lte: filter.toVersion };
      }

      const events = await prisma.eventStore.findMany({
        where,
        orderBy: { version: 'asc' },
        take: filter.limit || 100,
      });

      return events.map((e: any) => ({
        aggregateId: e.aggregateId,
        aggregateType: e.aggregateType,
        eventType: e.eventType,
        eventData: e.eventData as any,
        version: e.version,
        metadata: e.eventMetadata as any,
        causationId: e.causationId || undefined,
        correlationId: e.correlationId || undefined,
      }));
    } catch (error: any) {
      logger.error('Failed to get events:', error);
      throw new Error(`Event retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get all events for rebuilding aggregate state (event replay)
   */
  async replayEvents(aggregateId: string, aggregateType: string): Promise<DomainEvent[]> {
    logger.info(`Replaying events for ${aggregateType}:${aggregateId}`);
    return this.getEvents({ aggregateId, aggregateType });
  }

  /**
   * Get latest version number for an aggregate
   */
  async getLatestVersion(aggregateId: string, aggregateType: string): Promise<number> {
    try {
      const latestEvent = await prisma.eventStore.findFirst({
        where: {
          aggregateId,
          aggregateType,
        },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      return latestEvent?.version || 0;
    } catch (error: any) {
      logger.error('Failed to get latest version:', error);
      return 0;
    }
  }

  /**
   * Get event stream for a specific aggregate type
   */
  async getEventStream(
    aggregateType: string,
    fromTimestamp?: Date
  ): Promise<AsyncIterable<DomainEvent>> {
    async function* eventGenerator() {
      const where: any = { aggregateType };
      if (fromTimestamp) {
        where.timestamp = { gte: fromTimestamp };
      }

      const events = await prisma.eventStore.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      for (const event of events) {
        yield {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          eventData: event.eventData as any,
          version: event.version,
          metadata: event.eventMetadata as any,
          causationId: event.causationId || undefined,
          correlationId: event.correlationId || undefined,
        };
      }
    }

    return eventGenerator();
  }

  /**
   * Create snapshot of aggregate state
   */
  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    state: any,
    version: number
  ): Promise<void> {
    try {
      // Store snapshot as a special event type
      await this.appendEvent({
        aggregateId,
        aggregateType,
        eventType: 'SNAPSHOT',
        eventData: state,
        version,
        metadata: { isSnapshot: true },
      });

      logger.info(`Snapshot created for ${aggregateType}:${aggregateId} at version ${version}`);
    } catch (error: any) {
      logger.error('Failed to create snapshot:', error);
      throw new Error(`Snapshot creation failed: ${error.message}`);
    }
  }

  /**
   * Get count of events by type
   */
  async getEventStatistics(): Promise<Record<string, number>> {
    try {
      const stats = await prisma.eventStore.groupBy({
        by: ['eventType'],
        _count: {
          id: true,
        },
      });

      const result: Record<string, number> = {};
      stats.forEach((stat: any) => {
        result[stat.eventType] = stat._count.id;
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to get event statistics:', error);
      return {};
    }
  }
}

// Event types for Payment domain
export const PaymentEvents = {
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  THREE_DS_REQUIRED: 'THREE_DS_REQUIRED',
  THREE_DS_AUTHENTICATED: 'THREE_DS_AUTHENTICATED',
  THREE_DS_FAILED: 'THREE_DS_FAILED',
} as const;

// Event types for Transaction domain
export const TransactionEvents = {
  TRANSACTION_CREATED: 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
  TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
  TRANSACTION_REFUNDED: 'TRANSACTION_REFUNDED',
} as const;
