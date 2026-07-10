import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { battleApi } from '../services/battleApi';
import { useBattleSocket } from './useBattleSocket';
import { useBattleTimer } from './useBattleTimer';
import { BATTLE_EVENTS } from '../services/battleSocket';
import type { BattleRoom, BattlePlayerState } from '../types/battle.types';
import { useQueryClient } from '@tanstack/react-query';

export const useBattleRoom = (roomId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
  const [activeProblemIndex, setActiveProblemIndex] = useState<number>(0);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countdownIntervalRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendRef = useRef<((msg: any) => void) | null>(null);
  const startCountdownRef = useRef<(secs: number) => void>(() => {});

  const onTimerExpire = useCallback(() => {
    setRoom(prev => prev ? { ...prev, status: 'finished' } : null);
    sendRef.current?.({ type: 'timer_expired' });
  }, []);

  const { timeLeft, isTimeLow, syncTime, formatTime } = useBattleTimer(onTimerExpire);

  // Parse server player representation to frontend format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsePlayers = useCallback((playersList: any[]): BattlePlayerState[] => {
    return playersList.map(p => ({
      player_index: p.player_index,
      username: p.username,
      is_active: p.is_active ?? false,
      score: p.score ?? 0,
      solved: p.solved ?? false,
      solved_at: p.solved_at ?? null,
      attempts: p.attempts ?? 0,
      code: p.code ?? '',
      lang: p.lang ?? 'javascript',
      progress: p.progress ?? {},
      active_problem_index: p.active_problem_index ?? 0,
      terminal: { status: 'idle', logs: ['Connected.'] },
      testResults: [],
    }));
  }, []);

  // Fetch Room state via REST API
  const fetchRoomState = useCallback(async () => {
    if (!roomId) return;
    try {
      const serverRoom = await battleApi.get(roomId);
      setError(null);

      // Resolve my player index if I'm already in this room
      // Resolve my player index if I'm already in this room
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me = serverRoom.players.find((p: any) => p.username === user?.username);
      if (me) {
        setMyPlayerIndex(me.player_index);
        setIsJoined(true);
      }

      setRoom({
        id: serverRoom.id,
        host_username: serverRoom.host_username,
        max_players: serverRoom.max_players,
        status: serverRoom.status,
        time_limit: serverRoom.time_limit,
        time_left: serverRoom.time_left,
        problem_source: serverRoom.problem_source,
        selected_slug: serverRoom.selected_slug,
        custom_problem: serverRoom.custom_problem,
        problem_id: serverRoom.problem_id,
        selected_slugs: serverRoom.selected_slugs,
        custom_problems: serverRoom.custom_problems,
        problem_ids: serverRoom.problem_ids,
        start_time: serverRoom.start_time,
        created_at: serverRoom.created_at,
        players: parsePlayers(serverRoom.players),
        problem: serverRoom.problem ?? null, // Fully serialized problem object
        problems: serverRoom.problems ?? (serverRoom.problem ? [serverRoom.problem] : []),
      });

      if (serverRoom.status === 'active' && serverRoom.time_left !== null) {
        syncTime(serverRoom.time_left);
      } else if (serverRoom.status === 'countdown' && serverRoom.time_left !== null && serverRoom.time_left > 0) {
        startCountdownRef.current(serverRoom.time_left);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[useBattleRoom] Error fetching room:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.username, parsePlayers, syncTime]);

  // Start countdown sequence
  const startCountdown = useCallback((initialSeconds: number) => {
    setCountdown(initialSeconds);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    let count = initialSeconds;
    countdownIntervalRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        setRoom(prev => prev ? { ...prev, status: 'active' } : null);
        // Re-fetch or sync timer when countdown completes
        fetchRoomState();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [fetchRoomState]);

  useEffect(() => {
    startCountdownRef.current = startCountdown;
  }, [startCountdown]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoomState();
  }, [fetchRoomState]);

  // Poll room state in lobby to handle socket disconnects/lag
  useEffect(() => {
    if (!roomId || !room || (room.status !== 'pending' && room.status !== 'countdown')) return;

    const interval = setInterval(() => {
      fetchRoomState();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, room?.status, fetchRoomState]);

  // WebSocket Message Dispatcher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSocketMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case BATTLE_EVENTS.ROOM_SNAPSHOT: {
        const snap = msg.room;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const me = snap.players.find((p: any) => p.username === user?.username);
        if (me) {
          setMyPlayerIndex(me.player_index);
          setIsJoined(true);
        }
        setRoom({
          id: snap.id,
          host_username: snap.host_username,
          max_players: snap.max_players,
          status: snap.status,
          time_limit: snap.time_limit,
          time_left: snap.time_left,
          problem_source: snap.problem_source,
          selected_slug: snap.selected_slug,
          custom_problem: snap.custom_problem,
          problem_id: snap.problem_id,
          selected_slugs: snap.selected_slugs,
          custom_problems: snap.custom_problems,
          problem_ids: snap.problem_ids,
          start_time: snap.start_time,
          created_at: snap.created_at,
          players: parsePlayers(snap.players),
          problem: snap.problem ?? null,
          problems: snap.problems ?? (snap.problem ? [snap.problem] : []),
        });
        if (snap.status === 'active' && snap.time_left !== null) {
          syncTime(snap.time_left);
        } else if (snap.status === 'countdown' && snap.time_left !== null && snap.time_left > 0) {
          startCountdownRef.current(snap.time_left);
        }
        break;
      }
      
      case BATTLE_EVENTS.CONNECT_STATUS: {
        setRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            players: prev.players.map(p => 
              p.player_index === msg.player_index ? { ...p, is_active: msg.active } : p
            ),
          };
        });
        break;
      }

      case BATTLE_EVENTS.PLAYER_JOINED: {
        setRoom(prev => {
          if (!prev) return null;
          if (prev.players.some(p => p.player_index === msg.player_index)) return prev;
          const newPlayer: BattlePlayerState = {
            player_index: msg.player_index,
            username: msg.username,
            is_active: true,
            score: 0,
            solved: false,
            solved_at: null,
            attempts: 0,
            code: '',
            lang: 'javascript',
            terminal: { status: 'idle', logs: ['Connected.'] },
            testResults: [],
          };
          return {
            ...prev,
            players: [...prev.players, newPlayer],
          };
        });
        break;
      }

      case BATTLE_EVENTS.BATTLE_STARTED: {
        startCountdown(5);
        break;
      }

      case BATTLE_EVENTS.STATE_UPDATE: {
        setRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            players: prev.players.map(p => {
              if (p.player_index === msg.player_index) {
                // If this is my own update, do not overwrite code/lang to prevent jumping cursor
                const updatedCode = msg.player_index === myPlayerIndex ? p.code : (msg.code !== undefined ? msg.code : p.code);
                const updatedLang = msg.player_index === myPlayerIndex ? p.lang : (msg.lang || p.lang);
                return {
                  ...p,
                  score: msg.score !== undefined ? msg.score : p.score,
                  solved: msg.solved !== undefined ? msg.solved : p.solved,
                  attempts: msg.attempts !== undefined ? msg.attempts : p.attempts,
                  code: updatedCode,
                  lang: updatedLang,
                  progress: msg.progress !== undefined ? msg.progress : p.progress,
                  active_problem_index: msg.active_problem_index !== undefined ? msg.active_problem_index : p.active_problem_index,
                };
              }
              return p;
            }),
          };
        });
        break;
      }

      case BATTLE_EVENTS.WIN_EVENT: {
        setRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            players: prev.players.map(p => 
              p.player_index === msg.winner_index ? { ...p, solved: true, score: msg.score } : p
            ),
          };
        });
        break;
      }

      case BATTLE_EVENTS.BATTLE_FINISHED: {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        setRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'finished',
            players: prev.players.map(p => {
              const matched = msg.players?.find((x: { player_index: number; score: number; solved: boolean; attempts: number; solved_at: string | null }) => x.player_index === p.player_index);
              if (matched) {
                return {
                  ...p,
                  score: matched.score,
                  solved: matched.solved,
                  attempts: matched.attempts,
                  solved_at: matched.solved_at,
                };
              }
              return p;
            }),
          };
        });
        break;
      }

      case BATTLE_EVENTS.BATTLE_ABORTED: {
        setRoom(prev => prev ? { ...prev, status: 'aborted' } : null);
        alert('The battle room has been closed or aborted.');
        break;
      }
    }
  }, [user?.username, myPlayerIndex, parsePlayers, syncTime, startCountdown, queryClient]);

  const { isConnected, send } = useBattleSocket(roomId, myPlayerIndex, handleSocketMessage);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  // Host starts battle
  const startRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      await battleApi.start(roomId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(errorMsg);
    }
  }, [roomId]);

  // Guest joins room (accepts optional overrideUsername for unauthenticated guests)
  const joinRoom = useCallback(async (overrideUsername?: string) => {
    if (!roomId) return;
    const username = overrideUsername || user?.username;
    if (!username) throw new Error('No username available. Please log in or enter a display name.');
    const res = await battleApi.join(roomId, username);
    setMyPlayerIndex(res.player_index);
    setIsJoined(true);
    fetchRoomState();
  }, [roomId, user, fetchRoomState]);

  // Update local typing code and sync to socket
  const updateCode = useCallback((newCode: string) => {
    if (myPlayerIndex === null) return;
    
    // Update local state immediately
    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.player_index === myPlayerIndex) {
            const prog = p.progress ? { ...p.progress } : {};
            prog[activeProblemIndex] = {
              ...(prog[activeProblemIndex] || { solved: false, attempts: 0, lang: p.lang || 'javascript', score: 0, solved_at: null }),
              code: newCode
            };
            return { ...p, code: newCode, progress: prog };
          }
          return p;
        }),
      };
    });

    // Send code update through socket
    send({
      type: 'update',
      player_index: myPlayerIndex,
      code: newCode,
      problem_index: activeProblemIndex,
      active_problem_index: activeProblemIndex,
    });
  }, [myPlayerIndex, send, activeProblemIndex]);

  // Update language and template
  const updateLanguage = useCallback((lang: 'python' | 'javascript' | 'cpp' | 'java', starterCode: string) => {
    if (myPlayerIndex === null) return;

    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.player_index === myPlayerIndex) {
            const prog = p.progress ? { ...p.progress } : {};
            prog[activeProblemIndex] = {
              ...(prog[activeProblemIndex] || { solved: false, attempts: 0, lang, score: 0, solved_at: null }),
              lang,
              code: starterCode
            };
            return { ...p, lang, code: starterCode, progress: prog };
          }
          return p;
        }),
      };
    });

    send({
      type: 'update',
      player_index: myPlayerIndex,
      lang,
      code: starterCode,
      problem_index: activeProblemIndex,
      active_problem_index: activeProblemIndex,
    });
  }, [myPlayerIndex, send, activeProblemIndex]);

  // Change active problem tab index
  const changeActiveProblemIndex = useCallback((idx: number) => {
    setActiveProblemIndex(idx);
    if (myPlayerIndex === null) return;
    send({
      type: 'update',
      player_index: myPlayerIndex,
      active_problem_index: idx,
    });
  }, [myPlayerIndex, send]);

  // Concede problem
  const concedeProblem = useCallback(() => {
    if (myPlayerIndex === null) return;

    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.player_index === myPlayerIndex) {
            const prog = p.progress ? { ...p.progress } : {};
            prog[activeProblemIndex] = {
              ...(prog[activeProblemIndex] || { code: p.code, lang: p.lang, attempts: p.attempts, solved_at: null }),
              solved: true,
              score: 0
            };
            return {
              ...p,
              progress: prog,
              score: Object.values(prog).reduce((acc, curr) => acc + (curr.score || 0), 0)
            };
          }
          return p;
        }),
      };
    });

    send({
      type: 'update',
      player_index: myPlayerIndex,
      solved: true,
      score: 0,
      problem_index: activeProblemIndex,
      active_problem_index: activeProblemIndex,
    });
  }, [myPlayerIndex, send, activeProblemIndex]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return {
    room,
    myPlayerIndex,
    activeProblemIndex,
    isJoined,
    loading,
    error,
    countdown,
    timeLeft,
    isTimeLow,
    formatTime,
    isConnected,
    joinRoom,
    startRoom,
    updateCode,
    updateLanguage,
    changeActiveProblemIndex,
    concedeProblem,
    setRoom,
  };
};
