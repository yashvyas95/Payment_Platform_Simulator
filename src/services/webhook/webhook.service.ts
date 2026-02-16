import { getPrisma } from '../../config/database';
import { publishToQueue, QUEUES } from '../../config/rabbitmq';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export class WebhookService {
  private prisma = getPrisma();

  async createWebhook(merchantId: string, data: any) {
    const { url, events } = data;

    // Generate webhook secret for signature verification
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        merchantId,
        url,
        events,
        secret,
        isActive: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  async listWebhooks(merchantId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w: any) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  async deleteWebhook(id: string, _merchantId: string) {
    await this.prisma.webhook.delete({
      where: { id },
    });
  }

  async triggerWebhook(merchantId: string, event: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        merchantId,
        isActive: true,
        events: {
          has: event.type,
        },
      },
    });

    for (const webhook of webhooks) {
      const payload = {
        id: uuidv4(),
        type: event.type,
        created: Math.floor(Date.now() / 1000),
        data: event.data,
      };

      // Create webhook delivery record
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType: event.type,
          payload: payload as any,
          status: 'PENDING',
        },
      });

      // Queue for delivery
      await publishToQueue(QUEUES.WEBHOOK_DELIVERY, {
        deliveryId: delivery.id,
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        payload,
      });
    }
  }

  generateSignature(payload: any, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  verifySignature(payload: any, signature: string, secret: string): boolean {
    const parts = signature.split(',');
    const timestamp = parts[0].split('=')[1];
    const receivedSignature = parts[1].split('=')[1];

    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return receivedSignature === expectedSignature;
  }
}
