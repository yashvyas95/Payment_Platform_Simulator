import amqp, { Channel, Connection } from 'amqplib';
import { config } from './index';
import { logger } from '../utils/logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const QUEUES = {
  WEBHOOK_DELIVERY: 'webhook_delivery',
  NOTIFICATION: 'notification',
  SETTLEMENT: 'settlement',
};

export async function connectRabbitMQ() {
  try {
    connection = (await amqp.connect(config.rabbitmq.url)) as any;
    channel = await (connection as any).createChannel();

    // Assert queues
    for (const queue of Object.values(QUEUES)) {
      await (channel as any).assertQueue(queue, { durable: true });
    }

    (connection as any).on('error', (error: Error) => {
      logger.error('RabbitMQ connection error:', error);
    });

    (connection as any).on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    logger.info('RabbitMQ connected successfully');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function disconnectRabbitMQ() {
  if (channel) {
    await (channel as any).close();
  }
  if (connection) {
    await (connection as any).close();
  }
  logger.info('RabbitMQ disconnected');
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
}

export async function publishToQueue(queue: string, data: any) {
  const ch = getChannel();
  const message = JSON.stringify(data);
  (ch as any).sendToQueue(queue, Buffer.from(message), { persistent: true });
}

export async function consumeQueue(queue: string, callback: (data: any) => Promise<void>) {
  const ch = getChannel();
  await (ch as any).consume(queue, async (msg: any) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        await callback(data);
        (ch as any).ack(msg);
      } catch (error) {
        logger.error(`Error processing message from ${queue}:`, error);
        (ch as any).nack(msg, false, false);
      }
    }
  });
}

export { channel, connection };
