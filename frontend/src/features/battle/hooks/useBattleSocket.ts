import { useEffect, useRef, useState, useCallback } from 'react';
import { BattleSocketService } from '../services/battleSocket';

export const useBattleSocket = (
  roomId: string | undefined,
  playerIndex: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (message: any) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketServiceRef = useRef<BattleSocketService | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const send = useCallback((message: any) => {
    if (socketServiceRef.current) {
      socketServiceRef.current.send(message);
    }
  }, []);

  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!roomId || playerIndex === null) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const socketService = new BattleSocketService(
      roomId,
      playerIndex,
      (msg) => onMessageRef.current(msg),
      onConnect,
      onDisconnect
    );

    socketServiceRef.current = socketService;
    socketService.connect();

    return () => {
      socketService.close();
      socketServiceRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, playerIndex]);

  return {
    isConnected,
    send,
  };
};
