import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  EventStoreService,
  PaymentEvents,
} from '../../src/services/event-store/event-store.service';

// Mock prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    eventStore: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn((operations: any) => Promise.all(operations)),
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

describe('EventStoreService', () => {
  let eventStore: EventStoreService;

  beforeEach(() => {
    eventStore = new EventStoreService();
  });

  it('should append a new event', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.eventStore.create.mockResolvedValue({
      id: 'event-123',
      aggregateId: 'payment-123',
      aggregateType: 'Payment',
      eventType: PaymentEvents.PAYMENT_INITIATED,
      eventData: { amount: 1000 },
      version: 1,
    });

    const eventId = await eventStore.appendEvent({
      aggregateId: 'payment-123',
      aggregateType: 'Payment',
      eventType: PaymentEvents.PAYMENT_INITIATED,
      eventData: { amount: 1000 },
      version: 1,
    });

    expect(eventId).toBe('event-123');
    expect(prisma.eventStore.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_INITIATED,
        version: 1,
      }),
    });
  });

  it('should append multiple events atomically', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.$transaction.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);

    const events = [
      {
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_INITIATED,
        eventData: { amount: 1000 },
        version: 1,
      },
      {
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_CAPTURED,
        eventData: { amount: 1000 },
        version: 2,
      },
    ];

    const eventIds = await eventStore.appendEvents(events);

    expect(eventIds).toHaveLength(2);
    expect(eventIds).toEqual(['event-1', 'event-2']);
  });

  it('should retrieve events for an aggregate', async () => {
    const { prisma } = require('../../src/config/database');
    const mockEvents = [
      {
        id: 'event-1',
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_INITIATED,
        eventData: { amount: 1000 },
        version: 1,
        userId: null,
        metadata: {},
      },
      {
        id: 'event-2',
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_CAPTURED,
        eventData: { amount: 1000 },
        version: 2,
        userId: null,
        metadata: {},
      },
    ];

    prisma.eventStore.findMany.mockResolvedValue(mockEvents);

    const events = await eventStore.getEvents({ aggregateId: 'payment-123' });

    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe(PaymentEvents.PAYMENT_INITIATED);
    expect(events[1].eventType).toBe(PaymentEvents.PAYMENT_CAPTURED);
  });

  it('should get latest version for an aggregate', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.eventStore.findFirst.mockResolvedValue({
      version: 5,
    });

    const version = await eventStore.getLatestVersion('payment-123', 'Payment');

    expect(version).toBe(5);
  });

  it('should return 0 if no events exist for aggregate', async () => {
    const { prisma } = require('../../src/config/database');
    prisma.eventStore.findFirst.mockResolvedValue(null);

    const version = await eventStore.getLatestVersion('payment-999', 'Payment');

    expect(version).toBe(0);
  });

  it('should replay events for an aggregate', async () => {
    const { prisma } = require('../../src/config/database');
    const mockEvents = [
      {
        aggregateId: 'payment-123',
        aggregateType: 'Payment',
        eventType: PaymentEvents.PAYMENT_INITIATED,
        eventData: { amount: 1000 },
        version: 1,
        userId: null,
        metadata: {},
      },
    ];

    prisma.eventStore.findMany.mockResolvedValue(mockEvents);

    const events = await eventStore.replayEvents('payment-123', 'Payment');

    expect(events).toHaveLength(1);
    expect(prisma.eventStore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aggregateId: 'payment-123',
          aggregateType: 'Payment',
        }),
        orderBy: { version: 'asc' },
      })
    );
  });
});
