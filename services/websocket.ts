import { Log } from './api';

const WS_URL = 'ws://10.92.63.171:2621'; // Adjust for your network setup

type MessageHandler = (log: Log) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    console.log('[WebSocket] Connecting...');
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
    };

    this.ws.onmessage = (event) => {
      console.log('[WebSocket] Message received:', event.data);
      try {
        const logData: Log = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(logData));
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  subscribe(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }
}

export const wsService = new WebSocketService();
