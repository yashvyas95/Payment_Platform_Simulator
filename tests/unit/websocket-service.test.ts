import { WebSocketService } from '../../src/services/websocket/websocket.service';

describe('WebSocketService', () => {
  it('broadcasts payment and transaction updates to subscribed clients', () => {
    const service = WebSocketService.getInstance() as any;

    const ws: any = { readyState: 1, send: jest.fn() };
    service.clients = new Map([
      [
        'client_1',
        {
          ws,
          subscriptions: new Set(['payment:pay_1', 'transaction:txn_1', 'merchant:m_1']),
        },
      ],
    ]);

    service.broadcastPaymentUpdate('pay_1', 'm_1', { status: 'captured' });
    service.broadcastTransactionUpdate('txn_1', { status: 'updated' });
    service.notifyMerchant('m_1', { message: 'hello' });

    expect(ws.send).toHaveBeenCalled();
    const payloads = (ws.send as jest.Mock).mock.calls.map((c) => JSON.parse(c[0]));
    expect(payloads.some((p: any) => p.type === 'payment_update')).toBe(true);
    expect(payloads.some((p: any) => p.type === 'transaction_update')).toBe(true);
    expect(payloads.some((p: any) => p.type === 'notification')).toBe(true);
  });

  it('getStats returns connection statistics', () => {
    const service = WebSocketService.getInstance() as any;
    service.clients = new Map([
      [
        'client_1',
        { ws: { readyState: 1 }, userId: 'u1', subscriptions: new Set(['payment:pay_1']) },
      ],
    ]);

    const stats = service.getStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.clients[0].authenticated).toBe(true);
    expect(stats.clients[0].subscriptions).toContain('payment:pay_1');
  });
});
