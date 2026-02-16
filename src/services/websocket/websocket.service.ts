import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { logger } from '../../utils/logger';

export interface WebSocketMessage {
  type: 'payment_update' | 'transaction_update' | 'notification' | 'error';
  data: any;
  timestamp: string;
}

export interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  merchantId?: string;
  subscriptions: Set<string>;
}

export class WebSocketService {
  private clients: Map<string, WebSocketClient> = new Map();
  private static instance: WebSocketService;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!this.instance) {
      this.instance = new WebSocketService();
    }
    return this.instance;
  }

  /**
   * Initialize WebSocket server on Fastify instance
   */
  async initialize(fastify: FastifyInstance): Promise<void> {
    try {
      await fastify.register(require('@fastify/websocket'));

      fastify.get('/ws', { websocket: true } as any, (connection: any) => {
        this.handleConnection(connection.socket);
      });

      logger.info('WebSocket server initialized on /ws');
    } catch (error: any) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      ws,
      subscriptions: new Set(),
    };

    this.clients.set(clientId, client);
    logger.info(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'notification',
      data: { message: 'Connected to Payment Platform', clientId },
      timestamp: new Date().toISOString(),
    });

    // Handle incoming messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(clientId, data);
      } catch (error: any) {
        logger.error(`Invalid WebSocket message from ${clientId}:`, error);
        this.sendError(clientId, 'Invalid message format');
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.clients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        const topics = Array.isArray(message.topics) ? message.topics : [message.topics];
        topics.forEach((topic: string) => client.subscriptions.add(topic));
        logger.info(`Client ${clientId} subscribed to: ${topics.join(', ')}`);
        this.sendToClient(clientId, {
          type: 'notification',
          data: { message: 'Subscribed successfully', topics },
          timestamp: new Date().toISOString(),
        });
        break;

      case 'unsubscribe':
        const unsubTopics = Array.isArray(message.topics) ? message.topics : [message.topics];
        unsubTopics.forEach((topic: string) => client.subscriptions.delete(topic));
        logger.info(`Client ${clientId} unsubscribed from: ${unsubTopics.join(', ')}`);
        break;

      case 'authenticate':
        client.userId = message.userId;
        client.merchantId = message.merchantId;
        logger.info(`Client ${clientId} authenticated as user ${message.userId}`);
        break;

      default:
        logger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
    }
  }

  /**
   * Broadcast payment update to subscribed clients
   */
  broadcastPaymentUpdate(paymentId: string, merchantId: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'payment_update',
      data: {
        paymentId,
        merchantId,
        ...data,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(`payment:${paymentId}`, message);
    this.broadcast(`merchant:${merchantId}`, message);
  }

  /**
   * Broadcast transaction update
   */
  broadcastTransactionUpdate(transactionId: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'transaction_update',
      data: {
        transactionId,
        ...data,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(`transaction:${transactionId}`, message);
  }

  /**
   * Send notification to specific merchant
   */
  notifyMerchant(merchantId: string, notification: any): void {
    const message: WebSocketMessage = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
    };

    this.broadcast(`merchant:${merchantId}`, message);
  }

  /**
   * Broadcast message to all clients subscribed to a topic
   */
  private broadcast(topic: string, message: WebSocketMessage): void {
    let count = 0;
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(topic)) {
        this.sendToClient(clientId, message);
        count++;
      }
    });
    logger.debug(`Broadcasted ${message.type} to ${count} clients on topic: ${topic}`);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error: any) {
        logger.error(`Failed to send message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Send error to client
   */
  private sendError(clientId: string, errorMessage: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      data: { message: errorMessage },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        authenticated: !!client.userId,
        subscriptions: Array.from(client.subscriptions),
      })),
    };
  }
}
