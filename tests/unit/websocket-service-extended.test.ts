import { WebSocketService } from '../../src/services/websocket/websocket.service';
import { WebSocket } from 'ws';

describe('WebSocketService – extended', () => {
  let service: WebSocketService;

  beforeEach(() => {
    // Reset singleton
    (WebSocketService as any).instance = null;
    service = WebSocketService.getInstance();
  });

  afterEach(() => {
    (WebSocketService as any).instance = null;
  });

  it('returns the same singleton instance', () => {
    const a = WebSocketService.getInstance();
    const b = WebSocketService.getInstance();
    expect(a).toBe(b);
  });

  it('broadcastPaymentUpdate sends to subscribed clients', () => {
    const sentMessages: string[] = [];
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn((msg: string) => sentMessages.push(msg)),
      on: jest.fn(),
    };

    // Manually register a client
    const clientId = 'test_client_1';
    const client = {
      ws: mockWs,
      subscriptions: new Set<string>(['merchant:m_1']),
    };
    (service as any).clients.set(clientId, client);

    service.broadcastPaymentUpdate('pay_1', 'm_1', { status: 'CAPTURED', amount: 100 });

    expect(mockWs.send).toHaveBeenCalled();
    const parsed = JSON.parse(sentMessages[0]);
    expect(parsed.type).toBe('payment_update');
    expect(parsed.data.paymentId).toBe('pay_1');
    expect(parsed.data.status).toBe('CAPTURED');
  });

  it('broadcastTransactionUpdate sends to subscribed clients', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      subscriptions: new Set(['transaction:txn_1']),
    });

    service.broadcastTransactionUpdate('txn_1', { status: 'REFUNDED' });

    expect(mockWs.send).toHaveBeenCalled();
    const msg = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(msg.type).toBe('transaction_update');
    expect(msg.data.transactionId).toBe('txn_1');
  });

  it('notifyMerchant sends notification to merchant subscribers', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      subscriptions: new Set(['merchant:m_2']),
    });

    service.notifyMerchant('m_2', { message: 'New sale' });

    expect(mockWs.send).toHaveBeenCalled();
    const msg = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(msg.type).toBe('notification');
    expect(msg.data.message).toBe('New sale');
  });

  it('does not send to clients not subscribed to topic', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      subscriptions: new Set(['merchant:OTHER']),
    });

    service.broadcastPaymentUpdate('pay_1', 'm_1', { status: 'CAPTURED' });

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('does not send to clients with closed connection', () => {
    const mockWs = {
      readyState: WebSocket.CLOSED,
      send: jest.fn(),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      subscriptions: new Set(['merchant:m_1']),
    });

    service.broadcastPaymentUpdate('pay_1', 'm_1', { status: 'CAPTURED' });

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('handleConnection registers client and sets up event handlers', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);

    // Client should be registered
    expect((service as any).clients.size).toBe(1);
    // Welcome message sent
    expect(mockWs.send).toHaveBeenCalled();
    // Event handlers registered
    expect(onHandlers['message']).toBeDefined();
    expect(onHandlers['close']).toBeDefined();
    expect(onHandlers['error']).toBeDefined();
  });

  it('handleMessage processes subscribe messages', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);
    const clientId = Array.from((service as any).clients.keys())[0] as string;

    // Simulate subscribe message
    onHandlers['message'](JSON.stringify({ type: 'subscribe', topics: ['merchant:m_1'] }));

    const client = (service as any).clients.get(clientId);
    expect(client.subscriptions.has('merchant:m_1')).toBe(true);
  });

  it('handleMessage processes unsubscribe messages', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);
    const clientId = Array.from((service as any).clients.keys())[0] as string;

    // Subscribe then unsubscribe
    onHandlers['message'](JSON.stringify({ type: 'subscribe', topics: ['merchant:m_1'] }));
    onHandlers['message'](JSON.stringify({ type: 'unsubscribe', topics: ['merchant:m_1'] }));

    const client = (service as any).clients.get(clientId);
    expect(client.subscriptions.has('merchant:m_1')).toBe(false);
  });

  it('handleMessage processes authenticate messages', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);
    const clientId = Array.from((service as any).clients.keys())[0] as string;

    onHandlers['message'](JSON.stringify({ type: 'authenticate', userId: 'u1', merchantId: 'm1' }));

    const client = (service as any).clients.get(clientId);
    expect(client.userId).toBe('u1');
    expect(client.merchantId).toBe('m1');
  });

  it('close event removes client', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);
    expect((service as any).clients.size).toBe(1);

    onHandlers['close']();
    expect((service as any).clients.size).toBe(0);
  });

  it('error event removes client', () => {
    const onHandlers: Record<string, Function> = {};
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        onHandlers[event] = handler;
      }),
    };

    (service as any).handleConnection(mockWs);
    expect((service as any).clients.size).toBe(1);

    onHandlers['error'](new Error('connection lost'));
    expect((service as any).clients.size).toBe(0);
  });

  it('getStats returns accurate connection info', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      userId: 'u1',
      subscriptions: new Set(['merchant:m_1']),
    });
    (service as any).clients.set('c2', {
      ws: mockWs,
      subscriptions: new Set([]),
    });

    const stats = service.getStats();

    expect(stats.totalConnections).toBe(2);
    expect(stats.clients).toHaveLength(2);
    expect(stats.clients[0].authenticated).toBe(true);
    expect(stats.clients[1].authenticated).toBe(false);
  });

  it('handles send failure gracefully', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(() => {
        throw new Error('network error');
      }),
      on: jest.fn(),
    };

    (service as any).clients.set('c1', {
      ws: mockWs,
      subscriptions: new Set(['merchant:m_1']),
    });

    // Should not throw
    expect(() => {
      service.broadcastPaymentUpdate('pay_1', 'm_1', { status: 'CAPTURED' });
    }).not.toThrow();
  });
});
