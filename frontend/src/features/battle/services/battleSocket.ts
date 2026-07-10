import { ENV } from '../../../shared/config/env';
import { getToken } from '../../../shared/lib/api';

export const BATTLE_EVENTS = {
  ROOM_SNAPSHOT: 'room_snapshot',
  CONNECT_STATUS: 'connect_status',
  PLAYER_JOINED: 'player_joined',
  BATTLE_STARTED: 'battle_started',
  STATE_UPDATE: 'state_update',
  WIN_EVENT: 'win_event',
  BATTLE_FINISHED: 'battle_finished',
  BATTLE_ABORTED: 'battle_aborted',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
} as const;

export type BattleEventType = typeof BATTLE_EVENTS[keyof typeof BATTLE_EVENTS];

export class BattleSocketService {
  private socket: WebSocket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pingIntervalId: any = null;
  private roomId: string;
  private playerIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onMessageCallback: (event: any) => void;
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private isClosedIntentional = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(
    roomId: string,
    playerIndex: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage: (event: any) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ) {
    this.roomId = roomId;
    this.playerIndex = playerIndex;
    this.onMessageCallback = onMessage;
    this.onConnectCallback = onConnect;
    this.onDisconnectCallback = onDisconnect;

    // Auto-reconnect when browser comes back online
    window.addEventListener('online', this.handleOnline);
  }

  private handleOnline = () => {
     
    this.reconnectAttempts = 0;
    if (!this.isClosedIntentional && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
      this.connect();
    }
  };

  private closeSocket() {
    this.stopPingPong();
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        this.socket.close();
      } catch {
        // Ignore errors while closing an already-closed socket.
      }
    }
  }

  public connect() {
    this.isClosedIntentional = false;
    this.closeSocket();

    const apiURL = ENV.API_URL;
    const host = apiURL.replace(/^https?:\/\//, '').split('/')[0];
    const wsProtocol = apiURL.startsWith('https') ? 'wss' : 'ws';
    const token = getToken() || '';
    
     const wsUrl = `${wsProtocol}://${host}/api/v1/battle/ws/${this.roomId}?player_index=${this.playerIndex}&token=${encodeURIComponent(token)}`;

     
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.setupSocketHandlers();
    } catch (err) {
      console.error('[BattleSocket] Failed to create WebSocket connection:', err);
      this.handleReconnect();
    }
  }

  private setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onConnectCallback?.();
      this.startPingPong();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === BATTLE_EVENTS.PONG) {
           return;
        }
        this.onMessageCallback(message);
      } catch (err) {
        console.error('[BattleSocket] Error parsing WS message:', err);
      }
    };

    this.socket.onerror = (err) => {
      console.error('[BattleSocket] Connection error:', err);
    };

    this.socket.onclose = () => {
      this.stopPingPong();
      this.onDisconnectCallback?.();

      if (!this.isClosedIntentional) {
        this.handleReconnect();
      }
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BattleSocket] Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (!this.isClosedIntentional) {
        this.connect();
      }
    }, delay);
  }

  private startPingPong() {
    this.stopPingPong();
    this.pingIntervalId = setInterval(() => {
      this.send({ type: BATTLE_EVENTS.PING });
    }, 15000);  
  }

  private stopPingPong() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('[BattleSocket] Failed to send WS message:', err);
      }
    } else {
      console.warn('[BattleSocket] WS not open. Message queued or dropped:', message);
    }
  }

  public close() {
    this.isClosedIntentional = true;
    this.closeSocket();
    window.removeEventListener('online', this.handleOnline);
  }
}
