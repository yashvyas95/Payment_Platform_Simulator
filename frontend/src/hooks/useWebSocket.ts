import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { updateTransactionStatus, addTransaction } from '../store/slices/transactionSlice';
import { updatePaymentStatus } from '../store/slices/paymentSlice';

const WEBSOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface WebSocketMessage {
  type: 'payment_update' | 'transaction_update' | 'notification' | 'error';
  data: any;
  timestamp: string;
}

export const useWebSocket = (merchantId?: string) => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = io(WEBSOCKET_URL, {
      path: '/ws',
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Authenticate with merchantId if provided
      if (merchantId) {
        socket.emit('message', {
          type: 'authenticate',
          merchantId,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('message', (message: WebSocketMessage) => {
      console.log('WebSocket message received:', message);
      setLastMessage(message);

      // Handle different message types
      switch (message.type) {
        case 'payment_update':
          if (message.data.paymentId && message.data.status) {
            dispatch(
              updatePaymentStatus({
                id: message.data.paymentId,
                status: message.data.status,
              })
            );
          }
          break;

        case 'transaction_update':
          if (message.data.transactionId && message.data.status) {
            dispatch(
              updateTransactionStatus({
                id: message.data.transactionId,
                status: message.data.status,
              })
            );
          }
          if (message.data.transaction) {
            dispatch(addTransaction(message.data.transaction));
          }
          break;

        case 'notification':
          console.log('Notification:', message.data.message);
          break;

        case 'error':
          console.error('WebSocket error:', message.data.message);
          break;
      }
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [merchantId, dispatch]);

  const subscribe = useCallback(
    (topics: string | string[]) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('message', {
          type: 'subscribe',
          topics: Array.isArray(topics) ? topics : [topics],
        });
      }
    },
    [isConnected]
  );

  const unsubscribe = useCallback(
    (topics: string | string[]) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('message', {
          type: 'unsubscribe',
          topics: Array.isArray(topics) ? topics : [topics],
        });
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
  };
};
