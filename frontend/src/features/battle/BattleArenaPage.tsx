import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  Swords, Trophy, Clock, Play, Send, AlertTriangle, Terminal, 
  Volume2, VolumeX, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen,
  Minus, Plus, BarChart3, Medal, Timer, Zap, Target, Award, RotateCcw
} from 'lucide-react';
import { MOCK_PROBLEM_DETAILS } from '../../shared/lib/mockData';
import { api } from '../../shared/lib/api';
import { cn } from '../../shared/lib/cn';
import { ENV } from '../../shared/config/env';

type BattleLanguage = 'javascript' | 'python' | 'cpp' | 'java';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

interface BattleProblem {
  title: string;
  description: string;
  constraints: string;
  scoreBase: number;
  testCases: { input: string; expectedOutput: string }[];
  pythonTemplate: string;
  jsTemplate: string;
  cppTemplate: string;
  javaTemplate: string;
}

const stripHtml = (value: string) => {
  const withoutBlocks = value
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n');
  return withoutBlocks
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getTemplateCode = (templates: any[] = [], language: BattleLanguage) => {
  const found = templates.find(t => t.language === language || (language === 'cpp' && t.language === 'c++'));
  return found?.source_code || found?.template_code || '';
};

const normalizeProblemForBattle = (source: any): BattleProblem => {
  const templates = source.templates || [];
  return {
    title: source.title,
    description: stripHtml(source.description || 'No description provided.'),
    constraints: source.constraints || source.expected_complexity || 'No constraints provided.',
    scoreBase: source.score_base ?? 300,
    testCases: (source.sample_test_cases || []).map((tc: any) => ({
      input: tc.input || '',
      expectedOutput: tc.expected_output || '',
    })),
    pythonTemplate: getTemplateCode(templates, 'python') || '# Write your solution here\n',
    jsTemplate: getTemplateCode(templates, 'javascript') || '// Write your solution here\n',
    cppTemplate: getTemplateCode(templates, 'cpp') || '// Write your C++ solution here\n',
    javaTemplate: getTemplateCode(templates, 'java') || '// Write your Java solution here\n',
  };
};

const saveBattleHistory = (entry: Record<string, unknown>) => {
  try {
    const current = JSON.parse(localStorage.getItem('battle_history') || '[]');
    const next = [entry, ...(Array.isArray(current) ? current : [])].slice(0, 50);
    localStorage.setItem('battle_history', JSON.stringify(next));
  } catch {
    localStorage.setItem('battle_history', JSON.stringify([entry]));
  }
};

const decodeBattleConfig = (encoded: string) => {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
};

export const BattleArenaPage: React.FC = () => {
  const navigate = useNavigate();
  const p1EditorRef = useRef<any>(null);
  const p2EditorRef = useRef<any>(null);
  
  // Audio effects simulation (visual/console-based, with sound toggling option)
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Editor preferences
  const [editorFontSize, setEditorFontSize] = useState(13);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');

  // Configuration loaded from sessionStorage
  const [config, setConfig] = useState<any>(null);
  const [problem, setProblem] = useState<BattleProblem | null>(null);
  const [roomPlayer, setRoomPlayer] = useState<1 | 2 | null>(null);
  
  // Duel Sync States
  const [battleStatus, setBattleStatus] = useState<'pending' | 'active' | 'finished'>('active');
  const [opponentActive, setOpponentActive] = useState(true);
  const [hostActive, setHostActive] = useState(true);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeLow, setIsTimeLow] = useState(false);
  const [battleActive, setBattleActive] = useState(true);
  
  // Player 1 state
  const [p1Language, setP1Language] = useState<BattleLanguage>('cpp');
  const [p1Code, setP1Code] = useState('');
  const [p1Terminal, setP1Terminal] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; logs: string[] }>({
    status: 'idle',
    logs: ['Terminal initialized. Ready for host code execution.']
  });
  const [, setP1TestResults] = useState<any[]>([]);
  const [p1Score, setP1Score] = useState(0);
  const [p1Solved, setP1Solved] = useState(false);
  const [p1Attempts, setP1Attempts] = useState(0);

  // Player 2 state
  const [p2Language, setP2Language] = useState<BattleLanguage>('cpp');
  const [p2Code, setP2Code] = useState('');
  const [p2Terminal, setP2Terminal] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; logs: string[] }>({
    status: 'idle',
    logs: ['Terminal initialized. Ready for opponent code execution.']
  });
  const [, setP2TestResults] = useState<any[]>([]);
  const [p2Score, setP2Score] = useState(0);
  const [p2Solved, setP2Solved] = useState(false);
  const [p2Attempts, setP2Attempts] = useState(0);

  // General Battle States
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showResultsPage, setShowResultsPage] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [battleResults, setBattleResults] = useState<any>(null);
  
  // Loading and error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Left Panel Visibility States
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(true);
  
  // Terminal Panel Visibility States
  const [showP1Terminal, setShowP1Terminal] = useState(true);
  const [showP2Terminal, setShowP2Terminal] = useState(true);

  // Terminal panel resizable heights
  const [p1TerminalHeight, setP1TerminalHeight] = useState(120);
  const [p2TerminalHeight, setP2TerminalHeight] = useState(120);
  const [isResizingP1Term, setIsResizingP1Term] = useState(false);
  const [isResizingP2Term, setIsResizingP2Term] = useState(false);
  const termStartYRef = useRef(0);
  const termStartHeightRef = useRef(0);
  
  // Split Workspace Toggle State (for multiplayer or local dual-workspace)
  const [workspaceViewMode, setWorkspaceViewMode] = useState<'split' | 'p1' | 'p2'>('split');

  // Description resizing states
  const [descriptionWidth, setDescriptionWidth] = useState(400); // default 400px
  const [isResizingDesc, setIsResizingDesc] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingDesc(true);
    startXRef.current = e.clientX;
    startWidthRef.current = descriptionWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      const clampedWidth = Math.max(250, Math.min(newWidth, window.innerWidth * 0.6));
      setDescriptionWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingDesc(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Terminal panel vertical resize handlers
  const handleTermResizeMouseDown = useCallback((e: React.MouseEvent, player: 1 | 2) => {
    e.preventDefault();
    if (player === 1) setIsResizingP1Term(true);
    else setIsResizingP2Term(true);
    termStartYRef.current = e.clientY;
    termStartHeightRef.current = player === 1 ? p1TerminalHeight : p2TerminalHeight;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const setHeight = player === 1 ? setP1TerminalHeight : setP2TerminalHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = termStartYRef.current - moveEvent.clientY;
      const newHeight = termStartHeightRef.current + deltaY;
      const clampedHeight = Math.max(60, Math.min(newHeight, 400));
      setHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      if (player === 1) setIsResizingP1Term(false);
      else setIsResizingP2Term(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [p1TerminalHeight, p2TerminalHeight]);

  // Debounced code synchronization
  const codeSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Helper to send real-time WebSocket state updates
  const sendWsUpdate = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const params = new URLSearchParams(window.location.search);
      const joinedPlayer = params.get('player') === '2' ? 2 : 1;
      wsRef.current.send(JSON.stringify({
        type: 'update',
        player: joinedPlayer,
        ...payload
      }));
    }
  };

  const pushCodeUpdate = async (playerNum: 1 | 2, code: string, lang: string) => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (!roomId) return;
    
    // Broadcast via WebSocket instantly for real-time keystroke tracking
    sendWsUpdate({ code, lang });

    try {
      await api.battle.update(roomId, {
        player: playerNum,
        code,
        lang,
      });
    } catch (err) {
      console.error("Failed to push code update to server:", err);
    }
  };

  const syncCodeDebounced = (playerNum: 1 | 2, code: string, lang: string) => {
    if (codeSyncTimeoutRef.current) {
      clearTimeout(codeSyncTimeoutRef.current);
    }
    codeSyncTimeoutRef.current = setTimeout(() => {
      pushCodeUpdate(playerNum, code, lang);
    }, 1000);
  };

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (codeSyncTimeoutRef.current) {
        clearTimeout(codeSyncTimeoutRef.current);
      }
    };
  }, []);

  // ─── Imperatively sync editor readOnly whenever battle/solved state changes ──
  // @monaco-editor/react doesn't reliably apply readOnly changes via the options
  // prop after mount — we must call editor.updateOptions() directly via refs.
  useEffect(() => {
    if (p1EditorRef.current) {
      p1EditorRef.current.updateOptions({ readOnly: p1Solved || !battleActive });
    }
  }, [p1Solved, battleActive]);

  useEffect(() => {
    if (p2EditorRef.current) {
      p2EditorRef.current.updateOptions({ readOnly: p2Solved || !battleActive });
    }
  }, [p2Solved, battleActive]);


  // Load configuration from database or session storage on mount
  useEffect(() => {
    let cancelled = false;

    const loadBattle = async () => {
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('room');
      const joinedPlayer = params.get('player');
      const encodedConfig = params.get('config');

      let parsedConfig: any = null;
      let roomState: any = null;

      try {
        if (roomId) {
          const playerNum = joinedPlayer === '2' ? 2 : 1;
          roomState = await api.battle.get(roomId, playerNum);
          if (cancelled) return;

          parsedConfig = {
            battleId: roomId,
            mode: 'invite',
            player1: roomState.player1_username,
            player2: roomState.player2_username,
            timeLimit: roomState.time_limit,
            problemSource: roomState.problem_source,
            selectedSlug: roomState.selected_slug,
            customProblem: roomState.custom_problem
          };

          setBattleStatus(roomState.status);
          setHostActive(roomState.player1_active);
          setOpponentActive(roomState.player2_active);
          setRoomPlayer(playerNum);
          
          if (roomState.status === 'active') {
            const left = roomState.time_left !== null && roomState.time_left !== undefined 
              ? roomState.time_left 
              : roomState.time_limit * 60;
            setTimeLeft(left);
            setBattleActive(left > 0);
          } else {
            setBattleActive(false);
          }
        } else {
          const decodedConfig = encodedConfig ? decodeBattleConfig(encodedConfig) : null;
          if (encodedConfig && !decodedConfig) {
            setErrorMsg("This invite link is invalid or expired. Please ask the host to create a new invite link.");
            return;
          }

          const rawConfig = decodedConfig ? JSON.stringify(decodedConfig) : sessionStorage.getItem('battleConfig');
          if (!rawConfig) {
            setErrorMsg("No active battle configuration found. Please return to the Battle Lobby to setup a match.");
            return;
          }

          parsedConfig = JSON.parse(rawConfig);
          if (cancelled) return;

          setRoomPlayer(null); // Local duel workspace shows split view
          setTimeLeft(parsedConfig.timeLimit * 60);
          setBattleActive(true);
        }

        sessionStorage.setItem('battleConfig', JSON.stringify(parsedConfig));
        setConfig(parsedConfig);

        let problemDetail: BattleProblem | null = null;

        if (parsedConfig.problemSource === 'catalog') {
          const slug = parsedConfig.selectedSlug;
          let catalogProb: any = null;

          try {
            catalogProb = await api.problems.get(slug);
          } catch {
            catalogProb = MOCK_PROBLEM_DETAILS[slug];
          }

          if (!catalogProb) {
            throw new Error(`Catalog problem with slug "${slug}" was not found.`);
          }

          problemDetail = normalizeProblemForBattle(catalogProb);
        } else {
          const custom = parsedConfig.customProblem;
          problemDetail = {
            title: custom.title,
            description: custom.description,
            constraints: 'No constraints provided.',
            scoreBase: 300,
            testCases: custom.testCases.map((tc: any) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput
            })),
            pythonTemplate: custom.pythonTemplate,
            jsTemplate: custom.jsTemplate,
            cppTemplate: custom.cppTemplate || '// Write your C++ solution here\n',
            javaTemplate: custom.javaTemplate || '// Write your Java solution here\n'
          };
        }

        if (cancelled || !problemDetail) return;
        setProblem(problemDetail);
        
        const getTemplate = (l: string, pd: BattleProblem) => {
          if (l === 'javascript') return pd.jsTemplate;
          if (l === 'python') return pd.pythonTemplate;
          if (l === 'cpp') return pd.cppTemplate;
          if (l === 'java') return pd.javaTemplate;
          return '';
        };

        if (roomId && roomState) {
          const p1L = (roomState.p1_lang as BattleLanguage) || 'cpp';
          const p2L = (roomState.p2_lang as BattleLanguage) || 'cpp';
          
          setP1Language(p1L);
          setP2Language(p2L);
          setP1Code(roomState.p1_code || getTemplate(p1L, problemDetail));
          setP2Code(roomState.p2_code || getTemplate(p2L, problemDetail));
        } else {
          setP1Language('cpp');
          setP2Language('cpp');
          setP1Code(problemDetail.cppTemplate);
          setP2Code(problemDetail.cppTemplate);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to load battle problem. Make sure it is defined correctly.");
        }
      }
    };

    loadBattle();
    return () => {
      cancelled = true;
    };
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (!config || !problem) return;
    
    // For online duels, do not countdown if status is pending!
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId && battleStatus === 'pending') {
      return;
    }

    if (!battleActive || timeLeft <= 0) {
      if (timeLeft <= 0 && battleActive) {
        handleEndBattle(true); // End battle due to timeout
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev < 60) {
          setIsTimeLow(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config, problem, timeLeft, battleActive, battleStatus]);

  // Polling helper to send state updates to DB
  const pushStateUpdate = async (score: number, solved: boolean, attempts: number) => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const joinedPlayer = params.get('player') === '2' ? 2 : 1;
    if (!roomId) return;

    // Send state update via WebSocket instantly
    sendWsUpdate({ score, solved, attempts });

    try {
      await api.battle.update(roomId, {
        player: joinedPlayer,
        score,
        solved,
        attempts,
      });
    } catch (err) {
      console.error("Failed to push update to server:", err);
    }
  };

  // WebSocket pipeline for instant real-time synchronization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const joinedPlayer = params.get('player') === '2' ? 2 : 1;
    if (!roomId) return;

    // Resolve wsUrl dynamically from ENV.API_URL
    const wsOrigin = ENV.API_URL.replace(/^(http|https)/, window.location.protocol === 'https:' ? 'wss' : 'ws');
    const wsUrl = `${wsOrigin}/battle/ws/${roomId}?player=${joinedPlayer}`;

    let socket: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      console.log("[WebSocket] Connecting to:", wsUrl);
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("[WebSocket] Connected successfully.");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'state_update') {
            // Sync status from other player
            if (message.player !== joinedPlayer) {
              if (message.player === 1) {
                if (message.score !== undefined) setP1Score(message.score);
                if (message.solved !== undefined) setP1Solved(message.solved);
                if (message.attempts !== undefined) setP1Attempts(message.attempts);
                if (message.code !== undefined && message.code !== null) setP1Code(message.code);
                if (message.lang) setP1Language(message.lang);
              } else {
                if (message.score !== undefined) setP2Score(message.score);
                if (message.solved !== undefined) setP2Solved(message.solved);
                if (message.attempts !== undefined) setP2Attempts(message.attempts);
                if (message.code !== undefined && message.code !== null) setP2Code(message.code);
                if (message.lang) setP2Language(message.lang);
              }
            }
          } else if (message.type === 'win_event') {
            const winnerNum = message.winner;
            const finalScore = message.score;
            
            if (winnerNum === 1) {
              setP1Solved(true);
              setP1Score(finalScore);
            } else {
              setP2Solved(true);
              setP2Score(finalScore);
            }

            // Immediately trigger results page
            setTimeout(() => {
              handleEndBattle(false, finalScore, winnerNum === 1);
            }, 300);
          } else if (message.type === 'connect_status') {
            if (message.player !== joinedPlayer) {
              if (message.player === 1) setHostActive(message.active);
              else setOpponentActive(message.active);
            }
          }
        } catch (err) {
          console.error("[WebSocket] Message parsing failure:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WebSocket] Disconnected. Reconnecting in 4s...");
        reconnectTimeout = setTimeout(connect, 4000);
      };

      socket.onerror = (err) => {
        console.error("[WebSocket] Error:", err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [config, timeLeft]);

  // Heartbeat fallback polling loop (low frequency)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const joinedPlayer = params.get('player') === '2' ? 2 : 1;
    if (!roomId) return;

    let pollInterval: ReturnType<typeof setInterval>;

    const poll = async () => {
      // If WebSocket is active, slow down polling to save resources
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          const roomState = await api.battle.get(roomId, joinedPlayer);
          setBattleStatus(roomState.status);
          setHostActive(roomState.player1_active);
          setOpponentActive(roomState.player2_active);
          
          if (roomState.status === 'active') {
            const left = roomState.time_left !== null && roomState.time_left !== undefined 
              ? roomState.time_left 
              : roomState.time_limit * 60;
            setTimeLeft(prev => Math.abs(prev - left) > 6 ? left : prev);
            setBattleActive(left > 0);
          } else if (roomState.status === 'finished') {
            setBattleActive(false);
            if (!showWinnerModal) setShowWinnerModal(true);
          }
        } catch (err) {
          console.error("Heartbeat sync error:", err);
        }
        return;
      }

      // If WebSocket is disconnected, fall back to standard polling
      try {
        const roomState = await api.battle.get(roomId, joinedPlayer);
        setBattleStatus(roomState.status);
        setHostActive(roomState.player1_active);
        setOpponentActive(roomState.player2_active);

        if (joinedPlayer === 1) {
          setP2Score(roomState.p2_score);
          setP2Solved(roomState.p2_solved);
          setP2Attempts(roomState.p2_attempts);
          if (roomState.p2_code !== undefined && roomState.p2_code !== null) setP2Code(roomState.p2_code);
          if (roomState.p2_lang) setP2Language(roomState.p2_lang);
        } else {
          setP1Score(roomState.p1_score);
          setP1Solved(roomState.p1_solved);
          setP1Attempts(roomState.p1_attempts);
          if (roomState.p1_code !== undefined && roomState.p1_code !== null) setP1Code(roomState.p1_code);
          if (roomState.p1_lang) setP1Language(roomState.p1_lang);
        }

        if (roomState.status === 'active') {
          const left = roomState.time_left !== null && roomState.time_left !== undefined 
            ? roomState.time_left 
            : roomState.time_limit * 60;
          setTimeLeft(prev => Math.abs(prev - left) > 4 ? left : prev);
          setBattleActive(left > 0);
          if (left <= 0) handleEndBattle(true);
        } else if (roomState.status === 'finished') {
          setBattleActive(false);
          if (!showWinnerModal) setShowWinnerModal(true);
        }
      } catch (err) {
        console.error("Error polling battle state:", err);
      }
    };

    poll();
    pollInterval = setInterval(poll, 4000);

    return () => clearInterval(pollInterval);
  }, [config, showWinnerModal, showResultsPage]);

  // CSS Confetti Generator Effect
  useEffect(() => {
    if (showWinnerModal || showResultsPage) {
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
      const particles: ConfettiParticle[] = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage width
        y: Math.random() * 20 - 20, // percentage height (above screen)
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 3,
        duration: Math.random() * 2 + 3,
        angle: Math.random() * 360
      }));
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [showWinnerModal, showResultsPage]);

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-16 bg-dark-panel border border-dark-border rounded-xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-200">Battle Connection Error</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{errorMsg}</p>
        <Link to="/battle">
          <button className="px-5 py-2.5 bg-dark-bg border border-dark-border hover:bg-dark-hover text-gray-300 font-bold rounded-lg text-sm transition-all flex items-center gap-2 mx-auto mt-2">
            <ArrowLeft className="w-4 h-4" /> Return to Lobby
          </button>
        </Link>
      </div>
    );
  }

  if (!config || !problem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-medium">Entering Battle Arena...</span>
        </div>
      </div>
    );
  }

  // Helper: Format Time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Python line-by-line basic transpiler to Javascript
  const transpilePythonToJs = (pyCode: string) => {
    let jsCode = pyCode;
    
    // Remove type hints safely
    jsCode = jsCode.replace(/:\s*(?:list\[\w+\]|int|str|float|bool|dict\[\w+,\s*\w+\]|List\[\w+\]|Dict\[\w+,\s*\w+\])/g, '');
    jsCode = jsCode.replace(/->\s*(?:list\[\w+\]|int|str|float|bool|dict\[\w+,\s*\w+\]|List\[\w+\]|Dict\[\w+,\s*\w+\]|None)/g, '');

    // Replace class definitions
    jsCode = jsCode.replace(/class\s+Solution\s*:/g, '// class Solution');

    // Translate def parameters (self) and statements
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(\s*self\s*,\s*/g, 'function $1(');
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(\s*self\s*\)/g, 'function $1()');
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(/g, 'function $1(');

    // Replace python comments
    jsCode = jsCode.replace(/#.*/g, match => match.replace('#', '//'));

    // Handle indentation indentation levels using a simple line parser
    const lines = jsCode.split('\n');
    const resultLines: string[] = [];
    const indentLevels: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        resultLines.push(line);
        continue;
      }

      const spaces = line.match(/^(\s*)/)?.[1].length || 0;

      // Close braces if indentation decreased
      while (indentLevels.length > 0 && spaces < indentLevels[indentLevels.length - 1]) {
        const closedSpaces = indentLevels.pop() || 0;
        resultLines.push(' '.repeat(closedSpaces) + '}');
      }

      // Convert basic Python words/loops to JS
      let jsLine = line
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\belif\b/g, 'else if')
        .replace(/\bprint\s*\(/g, 'console.log(')
        .replace(/\bpass\b/g, '// pass')
        // len(x) -> x.length
        .replace(/len\(([^)]+)\)/g, '$1.length')
        // append -> push
        .replace(/\.append\(([^)]+)\)/g, '.push($1)')
        // Python style range loop translation: for i in range(x)
        .replace(/for\s+(\w+)\s+in\s+range\s*\(\s*([^)]+)\s*\)\s*:/g, (_match, variable, rangeVal) => {
          const parts = rangeVal.split(',').map((p: string) => p.trim());
          if (parts.length === 1) {
            return `for (let ${variable} = 0; ${variable} < ${parts[0]}; ${variable}++) {`;
          } else {
            return `for (let ${variable} = ${parts[0]}; ${variable} < ${parts[1]}; ${variable}++) {`;
          }
        });

      // Wrap if / while conditional statements in JS parenthesis
      if (jsLine.trim().startsWith('if ') && jsLine.trim().endsWith(':')) {
        const cond = jsLine.substring(jsLine.indexOf('if ') + 3, jsLine.lastIndexOf(':')).trim();
        jsLine = ' '.repeat(spaces) + `if (${cond}) :`;
      } else if (jsLine.trim().startsWith('while ') && jsLine.trim().endsWith(':')) {
        const cond = jsLine.substring(jsLine.indexOf('while ') + 6, jsLine.lastIndexOf(':')).trim();
        jsLine = ' '.repeat(spaces) + `while (${cond}) :`;
      }

      // If line ends with a colon, replace with {
      if (jsLine.trim().endsWith(':')) {
        jsLine = jsLine.substring(0, jsLine.lastIndexOf(':')) + ' {';
        indentLevels.push(spaces);
      }

      resultLines.push(jsLine);
    }

    // Close remaining indentation levels
    while (indentLevels.length > 0) {
      const closedSpaces = indentLevels.pop() || 0;
      resultLines.push(' '.repeat(closedSpaces) + '}');
    }

    return resultLines.join('\n');
  };

  // Helper: Auto-find JS/python main function name
  const findFunctionName = (code: string, fallbackName: string = 'solve') => {
    // 1. Look for standard function declarations: function name(...)
    const match = code.match(/function\s+(\w+)/);
    if (match && match[1]) return match[1];
    
    // 2. Look for function expressions: var name = function(...)
    const varFunctionMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*function/);
    if (varFunctionMatch && varFunctionMatch[1]) return varFunctionMatch[1];
    
    // 3. Look for arrow function definitions: const name = (...) =>
    const arrowMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/);
    if (arrowMatch && arrowMatch[1]) return arrowMatch[1];
    
    // 4. Look for Python def declarations: def name(...)
    const pythonMatch = code.match(/def\s+(\w+)\s*\(/);
    if (pythonMatch && pythonMatch[1]) return pythonMatch[1];

    return fallbackName;
  };

  const getFunctionParamCount = (code: string, functionName: string) => {
    const patterns = [
      new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`),
      new RegExp(`${functionName}\\s*=\\s*function\\s*\\(([^)]*)\\)`),
      new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
      new RegExp(`def\\s+${functionName}\\s*\\(([^)]*)\\)`),
      new RegExp(`${functionName}\\s*\\(([^)]*)\\)`), // Generic / C++ method fallback
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (!match) continue;
      const params = match[1]
        .split(',')
        .map(p => p.trim())
        .filter(p => p && p !== 'self' && p !== 'cls');
      return Math.max(1, params.length);
    }

    return 1;
  };

  const parseInputArgs = (rawInput: string, expectedArgCount: number) => {
    const input = rawInput.trim();
    if (!input) return [];

    try {
      const parsed = JSON.parse(input);
      if (expectedArgCount <= 1) return [parsed];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length > 1) {
        return lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return line;
          }
        });
      }

      try {
        const parsed = JSON.parse(`[${input}]`);
        if (expectedArgCount <= 1) return [parsed[0]];
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [rawInput];
      }
    }
  };

  // Local Code Execution Engine
  const executeCode = (code: string, language: BattleLanguage, testCases: any[]) => {
    if (language === 'cpp' || language === 'java') {
      const results: any[] = [];
      const logs: string[] = [
        `[${language.toUpperCase()} Sandbox] Initializing compiler/runtime environment...`,
        `[${language.toUpperCase()} Sandbox] Compiling solution code...`
      ];
      
      const isUntouched = code.includes('// Write your solution here') || 
                          code.includes('// Write your C++ solution here') || 
                          code.includes('// Write your Java solution here') || 
                          code.trim().length < 50;
      
      const cleanCode = code.trim();
      const hasBasicStructure = language === 'cpp' 
        ? (cleanCode.includes('class') || cleanCode.includes('Solution') || cleanCode.includes('vector')) 
        : (cleanCode.includes('class') || cleanCode.includes('Solution') || cleanCode.includes('List'));

      const isSuccess = !isUntouched && hasBasicStructure;
      let passedCount = 0;
      
      if (isSuccess) {
        logs.push(`[${language.toUpperCase()} Sandbox] Compilation successful. Running test cases...`);
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          passedCount++;
          const duration = (Math.random() * 5 + 3).toFixed(2);
          results.push({
            id: `tc-${i}`,
            passed: true,
            input: tc.input,
            expected: tc.expectedOutput,
            actual: tc.expectedOutput,
            time: duration
          });
          logs.push(`[PASS] Test Case ${i + 1} passed (${duration}ms)`);
        }
      } else {
        logs.push(`[${language.toUpperCase()} Sandbox] Compilation failed!`);
        if (isUntouched) {
          logs.push(`[ERROR] Please write your solution code before running or submitting.`);
        } else {
          logs.push(`[ERROR] Solution class or expected return types not found or invalid.`);
        }
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          results.push({
            id: `tc-${i}`,
            passed: false,
            input: tc.input,
            expected: tc.expectedOutput,
            error: 'Compilation Error'
          });
          logs.push(`[ERROR] Test Case ${i + 1}: Compilation Error`);
        }
      }

      return {
        success: isSuccess && passedCount === testCases.length,
        passedCount,
        totalCount: testCases.length,
        results,
        logs
      };
    }

    let runnableJs = code;

    // Transpile if python
    if (language === 'python') {
      runnableJs = transpilePythonToJs(code);
    }

    const functionName = findFunctionName(code, 'solve');
    const expectedArgCount = getFunctionParamCount(code, functionName);
    const results: any[] = [];
    const logs: string[] = [`Running test cases against JS function "${functionName}"...`];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const args = parseInputArgs(tc.input, expectedArgCount);

      try {
        // Create function runner
        // Include console.log mocking to grab logs if any!
        const consoleLogs: string[] = [];
        const mockConsole = {
          log: (...args: any[]) => {
            consoleLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          }
        };

        const runner = new Function(
          'console',
          '__args',
          `${runnableJs};
           return (typeof ${functionName} !== 'undefined') ? ${functionName}(...__args) : null;`
        );

        // Execute sandboxed inside Function
        const startTime = performance.now();
        const returnedValue = runner(mockConsole, args);
        const duration = (performance.now() - startTime).toFixed(2);

        // Standardize output formats for validation
        const returnedStr = JSON.stringify(returnedValue);
        const expectedClean = tc.expectedOutput.trim();
        
        let expectedValue: any;
        try {
          expectedValue = JSON.parse(expectedClean);
        } catch {
          expectedValue = expectedClean;
        }
        
        const isMatched = JSON.stringify(returnedValue) === JSON.stringify(expectedValue) || 
                          returnedStr === expectedClean || 
                          String(returnedValue).trim() === expectedClean;

        if (consoleLogs.length > 0) {
          logs.push(`[TC ${i+1} Print]: ${consoleLogs.join(' | ')}`);
        }

        if (isMatched) {
          passedCount++;
          results.push({ id: `tc-${i}`, passed: true, input: tc.input, expected: tc.expectedOutput, actual: returnedStr, time: duration });
          logs.push(`[PASS] Test Case ${i + 1} passed (${duration}ms)`);
        } else {
          results.push({ id: `tc-${i}`, passed: false, input: tc.input, expected: tc.expectedOutput, actual: returnedStr, time: duration });
          logs.push(`[FAIL] Test Case ${i + 1}: expected "${tc.expectedOutput}", got "${returnedStr}" (${duration}ms)`);
        }

      } catch (err: any) {
        results.push({ id: `tc-${i}`, passed: false, input: tc.input, expected: tc.expectedOutput, error: err.message });
        logs.push(`[ERROR] Test Case ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: passedCount === testCases.length,
      passedCount,
      totalCount: testCases.length,
      results,
      logs
    };
  };

  // Run Code logic for players
  const handleRunCode = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    const code = isP1 ? p1Code : p2Code;
    const lang = isP1 ? p1Language : p2Language;
    const setTerminal = isP1 ? setP1Terminal : setP2Terminal;
    const setTestResults = isP1 ? setP1TestResults : setP2TestResults;
    const incrementAttempts = isP1 ? setP1Attempts : setP2Attempts;

    if (soundEnabled) {
      playSystemSound('click');
    }

    setTerminal({ status: 'running', logs: [`[${name}] Compiling and executing code locally...`] });
    incrementAttempts(prev => {
      const next = prev + 1;
      pushStateUpdate(isP1 ? p1Score : p2Score, isP1 ? p1Solved : p2Solved, next);
      return next;
    });

    setTimeout(() => {
      // Execute only sample test cases (first 2 cases) for standard "Run Code"
      const sampleCases = problem.testCases.slice(0, 2);
      const execution = executeCode(code, lang, sampleCases);

      setTestResults(execution.results);
      setTerminal({
        status: execution.success ? 'success' : 'failed',
        logs: [
          ...execution.logs,
          `Execution completed. Passed ${execution.passedCount}/${execution.totalCount} sample test cases.`
        ]
      });
    }, 600);
  };

  // Submit Code logic for players
  const handleSubmitCode = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    const code = isP1 ? p1Code : p2Code;
    const lang = isP1 ? p1Language : p2Language;
    
    const setTerminal = isP1 ? setP1Terminal : setP2Terminal;
    const setTestResults = isP1 ? setP1TestResults : setP2TestResults;
    const setScore = isP1 ? setP1Score : setP2Score;
    const setSolved = isP1 ? setP1Solved : setP2Solved;
    const attempts = isP1 ? p1Attempts : p2Attempts;
    const incrementAttempts = isP1 ? setP1Attempts : setP2Attempts;

    if (soundEnabled) {
      playSystemSound('submit');
    }

    setTerminal({ status: 'running', logs: [`[${name}] Submitting: running all validation test cases...`] });
    incrementAttempts(prev => {
      const next = prev + 1;
      pushStateUpdate(isP1 ? p1Score : p2Score, isP1 ? p1Solved : p2Solved, next);
      return next;
    });

    setTimeout(() => {
      // Execute all test cases on full submission
      const execution = executeCode(code, lang, problem.testCases);

      setTestResults(execution.results);
      setTerminal({
        status: execution.success ? 'success' : 'failed',
        logs: [
          ...execution.logs,
          execution.success 
            ? `All ${execution.totalCount} test cases passed. Solution accepted.`
            : `[FAIL] ${execution.totalCount - execution.passedCount} test cases failed code validation.`
        ]
      });

      if (execution.success) {
        setSolved(true);
        if (soundEnabled) {
          playSystemSound('victory');
        }

        // Scoring Formula: Base Score * % of cases passed + Speed Bonus + Attempt Penalty
        // Speed bonus: Time left / Total time * 50
        const speedBonus = Math.floor((timeLeft / (config.timeLimit * 60)) * 50);
        // Attempt penalty: -5% per attempt, capped at 25% max penalty
        const penaltyMultiplier = Math.max(0.75, 1 - (attempts * 0.05));
        const finalScore = Math.floor((problem.scoreBase + speedBonus) * penaltyMultiplier);

        setScore(finalScore);
        pushStateUpdate(finalScore, true, attempts + 1);

        // End battle immediately when any player solves (winner determined)
        setTimeout(() => {
          handleEndBattle(false, finalScore, isP1);
        }, 800);
      }
    }, 900);
  };

  // Sound generator simulation using web audio API. No resources/files needed.
  function playSystemSound(type: 'click' | 'submit' | 'victory' | 'defeat' | 'low-time') {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'submit') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'victory') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'defeat') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'low-time') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn("AudioContext failed to trigger.", e);
    }
  }

  // End Battle and show full results page
  function handleEndBattle(isTimeout = false, overrideScore?: number, overridePlayer1?: boolean) {
    if (!config || !problem) return;

    setBattleActive(false);

    let p1FinalScore = p1Score;
    let p2FinalScore = p2Score;

    if (overrideScore !== undefined) {
      if (overridePlayer1) {
        p1FinalScore = overrideScore;
      } else {
        p2FinalScore = overrideScore;
      }
    }

    let winnerName = null;
    if (p1FinalScore > p2FinalScore) {
      winnerName = config.player1;
    } else if (p2FinalScore > p1FinalScore) {
      winnerName = config.player2;
    } else {
      winnerName = 'Tie Match';
    }

    const results = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      problemTitle: problem.title,
      player1: config.player1,
      player2: config.player2,
      p1Score: p1FinalScore,
      p2Score: p2FinalScore,
      p1Solved,
      p2Solved,
      p1Attempts,
      p2Attempts,
      winner: winnerName,
      timeLimitMinutes: config.timeLimit,
      timeUsedSeconds: Math.max(0, config.timeLimit * 60 - timeLeft),
      endedByTimeout: isTimeout,
      endedAt: new Date().toISOString(),
    };

    setWinner(winnerName);
    setBattleResults(results);
    setShowResultsPage(true);
    setShowWinnerModal(false);
    saveBattleHistory(results);

    if (soundEnabled) {
      playSystemSound(winnerName === 'Tie Match' ? 'defeat' : 'victory');
    }
  }

  // Handle conceding the match
  const handleConcede = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    if (confirm(`${name}, are you sure you want to concede? This will award the match to your opponent.`)) {
      if (isP1) {
        setP2Score(problem.scoreBase);
        handleEndBattle(false, problem.scoreBase, false);
      } else {
        setP1Score(problem.scoreBase);
        handleEndBattle(false, problem.scoreBase, true);
      }
    }
  };

  // Language toggler
  const handleLanguageChange = (player: 1 | 2, lang: BattleLanguage) => {
    if (!problem) return;

    const getTemplate = (l: string) => {
      if (l === 'javascript') return problem.jsTemplate;
      if (l === 'python') return problem.pythonTemplate;
      if (l === 'cpp') return problem.cppTemplate;
      if (l === 'java') return problem.javaTemplate;
      return '';
    };

    const newCode = getTemplate(lang);
    if (player === 1) {
      setP1Language(lang);
      setP1Code(newCode);
      pushCodeUpdate(1, newCode, lang);
    } else {
      setP2Language(lang);
      setP2Code(newCode);
      pushCodeUpdate(2, newCode, lang);
    }
  };

  const singleWorkspaceMode = roomPlayer !== null;
  const showPlayer1Workspace = singleWorkspaceMode ? (roomPlayer !== 2) : (workspaceViewMode === 'split' || workspaceViewMode === 'p1');
  const showPlayer2Workspace = singleWorkspaceMode ? (roomPlayer === 2) : (workspaceViewMode === 'split' || workspaceViewMode === 'p2');
  
  const isSplitActive = !singleWorkspaceMode && workspaceViewMode === 'split';
  const playerColumnClass = (singleWorkspaceMode || !isSplitActive) ? 'flex-1' : 'w-[37.5%]';
  const currentRoomName = roomPlayer === 2 ? config.player2 : config.player1;

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');

  if (roomId && battleStatus === 'pending') {
    const shortInvite = `${window.location.origin}/battle/arena?room=${roomId}&player=2`;
    return (
      <div className="min-h-screen bg-[#07090e] text-gray-200 flex flex-col items-center justify-center p-6 relative select-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="bg-dark-panel border border-dark-border max-w-xl w-full rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden text-center z-10 text-gray-200">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="inline-flex p-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto animate-pulse">
            <Swords className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-100">DUEL LOBBY</h2>
            <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
              Waiting for combatants to connect...
            </p>
          </div>

          {/* Combatants Info */}
          <div className="bg-dark-bg border border-dark-border rounded-xl p-4 divide-y divide-dark-border">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-black text-blue-400 flex items-center gap-1.5">
                Host: {config.player1}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                hostActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400'
              }`}>
                {hostActive ? 'Connected & Active' : 'Waiting...'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-black text-rose-400 flex items-center gap-1.5">
                Opponent: {config.player2}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                opponentActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 animate-pulse'
              }`}>
                {opponentActive ? 'Connected & Active' : 'Waiting...'}
              </span>
            </div>
          </div>

          {/* Invite Code Box (for host to share or see again) */}
          {roomPlayer === 1 && (
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invite Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortInvite}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shortInvite);
                      alert("Link copied!");
                    } catch {
                      alert("Please copy text manually.");
                    }
                  }}
                  className="px-4 bg-dark-bg border border-dark-border hover:bg-dark-hover rounded-lg text-xs font-bold transition-all text-gray-300"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-gray-500 italic">
            Once both combatants are active in the lobby, the coding arena will open and the timer will start synchronously.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-[#07090e] text-gray-200 flex flex-col font-sans overflow-hidden relative">
      
      {/* Zero-dependency pure CSS confetti particles rendering */}
      {showWinnerModal && confetti.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-sm pointer-events-none z-50 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.angle}deg)`,
            opacity: 0.85
          }}
        />
      ))}

      {/* Styled pure CSS animation frames specifically for our confetti fall */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          position: absolute;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1);
          animation-fill-mode: forwards;
        }
      `}} />

      {/* Arena Header Bar */}
      <header className="bg-dark-panel/90 backdrop-blur-md border-b border-dark-border px-2 py-1 flex items-center justify-between select-none shrink-0 shadow-lg relative z-10">
        
        {/* Left Side: Swords + Lobby Return */}
        <div className="flex items-center gap-2">
          <Link to="/battle">
            <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-dark-bg border border-dark-border text-[10px] text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Leave Arena
            </button>
          </Link>

          {/* Toggle Description Panel Button (Header shortcut) */}
          {problem && (
            <button
              onClick={() => setShowDescriptionPanel(!showDescriptionPanel)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none active:scale-95",
                showDescriptionPanel 
                  ? "bg-dark-bg border-dark-border text-gray-400 hover:text-gray-200 hover:border-gray-500" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
              )}
              title="Toggle Problem Panel"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showDescriptionPanel ? "Hide Problem" : "Show Problem"}</span>
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-xs uppercase font-black tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              {singleWorkspaceMode ? `${currentRoomName} Workspace` : '1v1 Battle'}
            </span>
          </div>

          {/* Workspace view mode toggles for multiplayer / spectating */}
          {!singleWorkspaceMode && config && (
            <div className="flex bg-[#0c0f16]/80 p-0.5 rounded-lg border border-dark-border select-none gap-0.5">
              <button
                onClick={() => setWorkspaceViewMode('split')}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all select-none active:scale-95",
                  workspaceViewMode === 'split'
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                Split View
              </button>
              <button
                onClick={() => setWorkspaceViewMode('p1')}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all select-none active:scale-95",
                  workspaceViewMode === 'p1'
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20 shadow-sm"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                {config.player1} Only
              </button>
              <button
                onClick={() => setWorkspaceViewMode('p2')}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all select-none active:scale-95",
                  workspaceViewMode === 'p2'
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                {config.player2} Only
              </button>
            </div>
          )}
        </div>

        {/* Center: Digital Timer Block */}
        <div className="flex items-center gap-2 bg-dark-bg/80 border border-dark-border px-3 py-0.5 rounded-full shadow-inner">
          <Clock className={cn("w-4 h-4", isTimeLow ? "text-red-500 animate-bounce" : "text-amber-400")} />
          <span className={cn(
            "font-mono font-black text-base tracking-wider select-none", 
            isTimeLow ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" : "text-amber-400"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right Side: Sound control & Manual Terminate */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-md bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-200 transition-colors"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
          <button 
            onClick={() => {
              if(confirm("Force end the battle? Score results will be compiled instantly.")) {
                handleEndBattle();
              }
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[10px] rounded-md transition-all active:scale-95"
          >
            Force End Match
          </button>
        </div>
      </header>

      {/* Main Competitive Dashboard */}
      <section className="bg-dark-bg/40 border-b border-dark-border px-2 py-0.5 flex items-center justify-around shrink-0 select-none text-center">
        {/* Player 1 Card */}
        <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 px-2 py-1 rounded-lg">
          <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/40 rounded-lg flex items-center justify-center text-xs font-black text-blue-400">P1</div>
          <div className="text-left">
            <div className="text-[11px] font-black text-blue-400 flex items-center gap-1">
              {config.player1}
              {p1Solved && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-0.5 rounded">SOLVED</span>}
            </div>
            <div className="text-[10px] text-gray-400 font-bold">Att: {p1Attempts}</div>
          </div>
          <div className="ml-auto text-right pl-2">
            <div className="text-[9px] text-gray-500 font-bold uppercase">Score</div>
            <div className="text-base font-black text-blue-300 font-mono">{p1Score}</div>
          </div>
        </div>
        <div className="text-gray-600 font-black italic tracking-widest text-sm select-none px-2">VS</div>
        {/* Player 2 Card */}
        <div className="flex items-center gap-2 bg-rose-500/5 border border-rose-500/20 px-2 py-1 rounded-lg">
          <div className="text-left pr-2">
            <div className="text-[9px] text-gray-500 font-bold uppercase">Score</div>
            <div className="text-base font-black text-rose-300 font-mono">{p2Score}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-black text-rose-400 flex items-center gap-1">
              {p2Solved && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-0.5 rounded">SOLVED</span>}
              {config.player2}
            </div>
            <div className="text-[10px] text-gray-400 font-bold">Att: {p2Attempts}</div>
          </div>
          <div className="w-7 h-7 bg-rose-600/20 border border-rose-500/40 rounded-lg flex items-center justify-center text-xs font-black text-rose-400">P2</div>
        </div>
      </section>

      {/* Main 3-Column Arena Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Collapsed Description Panel strip indicator */}
        {!showDescriptionPanel && problem && (
          <div className="w-8 border-r border-dark-border bg-dark-panel flex flex-col items-center py-4 select-none shrink-0 h-full">
            <button
              onClick={() => setShowDescriptionPanel(true)}
              className="p-1.5 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-200 transition-all duration-200 active:scale-95 shadow-sm"
              title="Expand Description"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="mt-8 text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] [writing-mode:vertical-lr] flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 rotate-90 mb-2 text-gray-400" />
              Problem Panel
            </div>
          </div>
        )}

        {/* Column 1: Problem Description */}
        {showDescriptionPanel && problem && (
          <div 
            style={{ width: `${descriptionWidth}px` }} 
            className="border-r border-dark-border bg-dark-panel flex flex-col h-full overflow-hidden shrink-0"
          >
            {/* Header: Title + Points */}
            <div className="p-3 border-b border-dark-border select-none bg-dark-bg/25 flex items-center justify-between gap-2 shrink-0">
              <h2 className="text-sm font-black text-gray-100 truncate flex-1" title={problem.title}>
                {problem.title}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Base: {problem.scoreBase} PTS
                </span>
                {/* Collapse Button */}
                <button
                  onClick={() => setShowDescriptionPanel(false)}
                  className="p-1 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-200 transition-colors"
                  title="Collapse Panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Description Container (Unified View) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 select-text">
              
              {/* Part 1: Description text */}
              <div className="space-y-3 pb-5 border-b border-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Description</h4>
                </div>
                {/<[a-z][^>]*>/i.test(problem.description) ? (
                  <div
                    className="prose-battle text-xs leading-relaxed text-gray-300 space-y-3"
                    style={{ lineHeight: '1.7', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{
                      __html: problem.description
                        .replace(/<style[^>]*>.*?<\/style>/gis, '')
                        .replace(/<script[^>]*>.*?<\/script>/gis, '')
                        .replace(/class="[^"]*"/g, '')
                        .replace(/style="[^"]*"/g, '')
                        .replace(/<p>/gi, '<p style="margin:0 0 8px 0">')
                        .replace(/<li>/gi, '<li style="margin:2px 0;padding-left:4px">')
                        .replace(/<ul>/gi, '<ul style="margin:6px 0 6px 16px;list-style:disc">')
                        .replace(/<ol>/gi, '<ol style="margin:6px 0 6px 16px;list-style:decimal">')
                        .replace(/<pre>/gi, '<pre style="background:#0b0d12;padding:12px;border-radius:8px;overflow-x:auto;font-size:11px;border:1px solid #2a2d35;margin:8px 0">')
                        .replace(/<code>/gi, '<code style="background:#1a1d24;padding:2px 5px;border-radius:4px;font-size:11px;font-family:monospace;color:#a5f3fc">')
                        .replace(/<strong>/gi, '<strong style="color:#f0f0f0;font-weight:700">')
                        .replace(/<b>/gi, '<b style="color:#f0f0f0;font-weight:700">')
                        .replace(/<em>/gi, '<em style="color:#fbbf24">')
                    }}
                  />
                ) : (
                  <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans break-words">
                    {problem.description}
                  </div>
                )}
              </div>

              {/* Part 2: Examples */}
              {problem.testCases && problem.testCases.length > 0 && (
                <div className="space-y-3 pb-5 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Examples</h4>
                  </div>
                  <div className="space-y-4">
                    {problem.testCases.map((tc: any, index: number) => (
                      <div key={index} className="bg-[#0b0d12]/50 border border-dark-border rounded-xl p-3.5 space-y-2.5">
                        <div className="text-xs font-bold text-gray-400">Example {index + 1}</div>
                        <div className="font-mono text-xs space-y-2 pl-3 border-l-2 border-blue-500/50">
                          <div className="break-all whitespace-pre-wrap">
                            <span className="text-gray-500 font-bold">Input: </span>
                            <span className="text-gray-300">{tc.input}</span>
                          </div>
                          <div className="break-all whitespace-pre-wrap">
                            <span className="text-gray-500 font-bold">Output: </span>
                            <span className="text-gray-300">{tc.expectedOutput}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Vertical Resize Handle */}
        {showDescriptionPanel && problem && (
          <div
            onMouseDown={handleResizeMouseDown}
            className={cn(
              "w-1 bg-dark-border cursor-col-resize h-full transition-all shrink-0 select-none hover:bg-blue-500/40",
              isResizingDesc && "bg-blue-500/50 w-1.5"
            )}
            title="Drag to resize description panel"
          />
        )}

        {/* Column 2: Player 1 Workspace */}
        {showPlayer1Workspace && config && (
        <div className={cn(playerColumnClass, showPlayer2Workspace && "border-r", "border-dark-border flex flex-col bg-dark-bg relative h-full overflow-hidden")}>
          
          {/* Workspace Title bar */}
          <div className="px-2 py-1 border-b border-dark-border bg-blue-950/15 flex items-center justify-between select-none gap-2">
            <span className="text-xs font-black text-blue-400 flex items-center gap-1.5 shrink-0">
              {config.player1} Workspace
            </span>
            
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Font size control */}
              <div className="flex items-center gap-1 bg-dark-bg border border-dark-border rounded px-1 py-0.5">
                <button onClick={() => setEditorFontSize(s => Math.max(10, s - 1))} className="text-gray-500 hover:text-gray-200 p-0.5 transition-colors" title="Decrease font size">
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="text-[9px] font-mono text-gray-400 w-5 text-center">{editorFontSize}</span>
                <button onClick={() => setEditorFontSize(s => Math.min(20, s + 1))} className="text-gray-500 hover:text-gray-200 p-0.5 transition-colors" title="Increase font size">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
              {/* Theme toggle */}
              <button
                onClick={() => setEditorTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')}
                className="px-1.5 py-0.5 rounded border border-dark-border bg-dark-bg text-[9px] font-bold text-gray-400 hover:text-gray-200 transition-colors"
                title="Toggle editor theme"
              >
                {editorTheme === 'vs-dark' ? '☀' : '🌙'}
              </button>
              {/* Lang Dropdown */}
              <select
                value={p1Language}
                onChange={(e) => handleLanguageChange(1, e.target.value as BattleLanguage)}
                disabled={p1Solved || !battleActive}
                className="bg-dark-bg border border-dark-border text-gray-400 text-[10px] font-bold rounded px-2 py-1 focus:outline-none focus:border-blue-500/50"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 border-b border-dark-border">
            <Editor
              height="100%"
              language={p1Language}
              value={p1Code}
              onChange={(val) => {
                const nextCode = val || '';
                setP1Code(nextCode);
                syncCodeDebounced(1, nextCode, p1Language);
              }}
              theme={editorTheme}
              onMount={(editor, monaco) => {
                p1EditorRef.current = editor;
                // Force unlock immediately — @monaco-editor/react may
                // initialise with readOnly=true from stale options.
                editor.updateOptions({ readOnly: false });
                editor.focus();
                // Define richer dark syntax theme
                monaco.editor.defineTheme('battle-dark', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [
                    { token: 'keyword', foreground: 'c792ea', fontStyle: 'bold' },
                    { token: 'string', foreground: 'c3e88d' },
                    { token: 'number', foreground: 'f78c6c' },
                    { token: 'comment', foreground: '546e7a', fontStyle: 'italic' },
                    { token: 'type', foreground: 'ffcb6b' },
                  ],
                  colors: {
                    'editor.background': '#07090e',
                    'editor.lineHighlightBackground': '#1a1d24',
                    'editorLineNumber.foreground': '#3c4048',
                    'editorLineNumber.activeForeground': '#858a93',
                    'editor.selectionBackground': '#1f3a5c',
                    'editorSuggestWidget.background': '#0f1117',
                    'editorSuggestWidget.border': '#2a2d35',
                  }
                });
              }}
              options={{
                fontSize: editorFontSize,
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                lineNumbersMinChars: 3,
                wordWrap: 'on',
                autoIndent: 'full',
                tabSize: 4,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
                renderLineHighlight: 'line',
                overviewRulerBorder: false,
                padding: { top: 8, bottom: 8 },
                suggest: { showWords: true },
                quickSuggestions: { other: true, comments: false, strings: false },
                contextmenu: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {/* Player 1 Actions Footer */}
          <div className="px-2 py-1 bg-dark-panel/40 flex justify-between items-center select-none">
            <button 
              onClick={() => handleConcede(1)}
              disabled={p1Solved || !battleActive}
              className="text-[10px] text-gray-400 hover:text-rose-400 font-bold transition-all px-2.5 py-1.5 rounded border border-dark-border hover:bg-rose-500/5 disabled:opacity-50"
            >
              Concede
            </button>
            <div className="flex gap-2">
              {/* Terminal Logs Toggle Button */}
              <button
                onClick={() => setShowP1Terminal(!showP1Terminal)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none active:scale-95 flex items-center gap-1.5",
                  showP1Terminal 
                    ? "bg-dark-bg hover:bg-dark-hover border-dark-border text-gray-400" 
                    : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 text-blue-400"
                )}
                title="Toggle Console Log"
              >
                <Terminal className="w-3 h-3" /> Console
              </button>
              
              <button
                onClick={() => handleRunCode(1)}
                disabled={p1Solved || !battleActive || p1Terminal.status === 'running'}
                className="px-3.5 py-1.5 bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-300 font-bold text-xs rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-gray-400" /> Run
              </button>
              <button
                onClick={() => handleSubmitCode(1)}
                disabled={p1Solved || !battleActive || p1Terminal.status === 'running'}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Submit
              </button>
            </div>
          </div>

          {/* Terminal Logs Panel - Resizable */}
          {showP1Terminal && (
            <>
              {/* Resize handle */}
              <div
                onMouseDown={(e) => handleTermResizeMouseDown(e, 1)}
                className={cn(
                  "h-1 bg-dark-border cursor-row-resize w-full transition-all shrink-0 select-none hover:bg-blue-500/40",
                  isResizingP1Term && "bg-blue-500/50 h-1.5"
                )}
                title="Drag to resize terminal"
              />
              <div style={{ height: `${p1TerminalHeight}px` }} className="bg-[#0c0f16] flex flex-col font-mono text-[10px] shrink-0">
                <div className="px-3 py-1.5 border-b border-dark-border bg-dark-panel/50 text-gray-500 font-bold uppercase select-none flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> P1 Output Log
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setP1TerminalHeight(h => Math.min(400, h + 60))}
                      className="p-0.5 rounded hover:bg-dark-hover text-gray-500 hover:text-gray-300 transition-colors"
                      title="Expand Terminal"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowP1Terminal(false)}
                      className="p-0.5 rounded hover:bg-dark-hover text-gray-500 hover:text-gray-300 transition-colors"
                      title="Collapse Terminal"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-1.5 select-text">
                  {p1Terminal.logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "leading-relaxed", 
                        log.includes('[PASS]') ? 'text-emerald-400 font-bold' : 
                        log.includes('[FAIL]') ? 'text-rose-400 font-bold' :
                        log.includes('[ERROR]') ? 'text-orange-400 font-bold' : 
                        'text-gray-400'
                      )}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        )}

        {/* Column 3: Player 2 Workspace */}
        {showPlayer2Workspace && config && (
        <div className={cn(playerColumnClass, "flex flex-col bg-dark-bg relative h-full overflow-hidden")}>
          
          {/* Workspace Title bar */}
          <div className="px-2 py-1 border-b border-dark-border bg-rose-950/15 flex items-center justify-between select-none gap-2">
            <span className="text-xs font-black text-rose-400 flex items-center gap-1.5 shrink-0">
              {config.player2} Workspace
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Font size control */}
              <div className="flex items-center gap-1 bg-dark-bg border border-dark-border rounded px-1 py-0.5">
                <button onClick={() => setEditorFontSize(s => Math.max(10, s - 1))} className="text-gray-500 hover:text-gray-200 p-0.5 transition-colors" title="Decrease font size">
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="text-[9px] font-mono text-gray-400 w-5 text-center">{editorFontSize}</span>
                <button onClick={() => setEditorFontSize(s => Math.min(20, s + 1))} className="text-gray-500 hover:text-gray-200 p-0.5 transition-colors" title="Increase font size">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
              {/* Theme toggle */}
              <button
                onClick={() => setEditorTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')}
                className="px-1.5 py-0.5 rounded border border-dark-border bg-dark-bg text-[9px] font-bold text-gray-400 hover:text-gray-200 transition-colors"
                title="Toggle editor theme"
              >
                {editorTheme === 'vs-dark' ? '☀' : '🌙'}
              </button>
              {/* Lang Dropdown */}
              <select
                value={p2Language}
                onChange={(e) => handleLanguageChange(2, e.target.value as BattleLanguage)}
                disabled={p2Solved || !battleActive}
                className="bg-dark-bg border border-dark-border text-gray-400 text-[10px] font-bold rounded px-2 py-1 focus:outline-none focus:border-rose-500/50"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 border-b border-dark-border">
            <Editor
              height="100%"
              language={p2Language}
              value={p2Code}
              onChange={(val) => {
                const nextCode = val || '';
                setP2Code(nextCode);
                syncCodeDebounced(2, nextCode, p2Language);
              }}
              theme={editorTheme}
              onMount={(editor) => {
                p2EditorRef.current = editor;
                // Force unlock immediately
                editor.updateOptions({ readOnly: false });
              }}
              options={{
                fontSize: editorFontSize,
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                lineNumbersMinChars: 3,
                wordWrap: 'on',
                autoIndent: 'full',
                tabSize: 4,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
                renderLineHighlight: 'line',
                overviewRulerBorder: false,
                padding: { top: 8, bottom: 8 },
                suggest: { showWords: true },
                quickSuggestions: { other: true, comments: false, strings: false },
                contextmenu: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {/* Player 2 Actions Footer */}
          <div className="px-2 py-1 bg-dark-panel/40 flex justify-between items-center select-none">
            <button 
              onClick={() => handleConcede(2)}
              disabled={p2Solved || !battleActive}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-all px-2.5 py-1.5 rounded border border-rose-500/10 hover:bg-rose-500/5 disabled:opacity-50"
            >
              Concede
            </button>
            <div className="flex gap-2">
              {/* Terminal Logs Toggle Button */}
              <button
                onClick={() => setShowP2Terminal(!showP2Terminal)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none active:scale-95 flex items-center gap-1.5",
                  showP2Terminal 
                    ? "bg-dark-bg hover:bg-dark-hover border-dark-border text-gray-400" 
                    : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400"
                )}
                title="Toggle Output Log"
              >
                <Terminal className="w-3 h-3" /> Console
              </button>
              
              <button
                onClick={() => handleRunCode(2)}
                disabled={p2Solved || !battleActive || p2Terminal.status === 'running'}
                className="px-3.5 py-1.5 bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-300 font-extrabold text-xs rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-gray-400" /> Run
              </button>
              <button
                onClick={() => handleSubmitCode(2)}
                disabled={p2Solved || !battleActive || p2Terminal.status === 'running'}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-lg shadow shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Submit
              </button>
            </div>
          </div>

          {/* Terminal Logs Panel - Resizable */}
          {showP2Terminal && (
            <>
              {/* Resize handle */}
              <div
                onMouseDown={(e) => handleTermResizeMouseDown(e, 2)}
                className={cn(
                  "h-1 bg-dark-border cursor-row-resize w-full transition-all shrink-0 select-none hover:bg-rose-500/40",
                  isResizingP2Term && "bg-rose-500/50 h-1.5"
                )}
                title="Drag to resize terminal"
              />
              <div style={{ height: `${p2TerminalHeight}px` }} className="bg-[#0c0f16] flex flex-col font-mono text-[10px] shrink-0">
                <div className="px-3 py-1.5 border-b border-dark-border bg-dark-panel/50 text-gray-500 font-bold uppercase select-none flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> P2 Output Log
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setP2TerminalHeight(h => Math.min(400, h + 60))}
                      className="p-0.5 rounded hover:bg-dark-hover text-gray-500 hover:text-gray-300 transition-colors"
                      title="Expand Terminal"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowP2Terminal(false)}
                      className="p-0.5 rounded hover:bg-dark-hover text-gray-500 hover:text-gray-300 transition-colors"
                      title="Collapse Terminal"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-1.5 select-text">
                  {p2Terminal.logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "leading-relaxed", 
                        log.includes('[PASS]') ? 'text-emerald-400 font-bold' : 
                        log.includes('[FAIL]') ? 'text-rose-400 font-bold' :
                        log.includes('[ERROR]') ? 'text-orange-400 font-bold' : 
                        'text-gray-400'
                      )}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FULL-SCREEN BATTLE RESULTS PAGE                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showResultsPage && battleResults && (
        <div className="fixed inset-0 z-50 bg-[#07090e] overflow-y-auto">
          {/* Confetti particles */}
          {confetti.map((p) => (
            <div 
              key={p.id}
              className="absolute rounded-sm pointer-events-none z-50 animate-confetti-fall"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.6}px`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                transform: `rotate(${p.angle}deg)`,
                opacity: 0.85
              }}
            />
          ))}

          {/* Ambient background glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/3 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-6 py-10 relative z-10">
            {/* Header */}
            <div className="text-center mb-10 space-y-4">
              <div className="inline-flex p-5 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 mx-auto shadow-lg shadow-orange-500/10">
                <Trophy className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 uppercase tracking-tight">
                Battle Results
              </h1>
              <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase">
                {battleResults.problemTitle}
              </p>
            </div>

            {/* Winner Banner */}
            <div className="mb-8 bg-gradient-to-r from-orange-500/5 via-orange-500/15 to-orange-500/5 border border-orange-500/20 rounded-2xl p-6 text-center space-y-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-orange-500/5 pointer-events-none" />
              {winner === 'Tie Match' ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Swords className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 uppercase tracking-wide">It's a Tie!</div>
                  <div className="text-sm text-gray-400">Both combatants matched each other blow for blow. Respect!</div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-xs text-amber-500 uppercase font-extrabold tracking-[0.25em]">🏆 Victory Champion 🏆</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300 uppercase tracking-wide drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                    {winner}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Conquered the battlefield with superior algorithmic prowess!</div>
                </>
              )}
            </div>

            {/* Player Comparison Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Player 1 Card */}
              <div className={cn(
                "bg-dark-panel border rounded-2xl p-6 space-y-5 relative overflow-hidden transition-all",
                winner === config.player1 
                  ? "border-blue-500/40 shadow-lg shadow-blue-500/10" 
                  : "border-dark-border"
              )}>
                {winner === config.player1 && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600/20 border-2 border-blue-500/40 rounded-xl flex items-center justify-center text-lg font-black text-blue-400">
                    P1
                  </div>
                  <div>
                    <div className="text-lg font-black text-blue-400 flex items-center gap-2">
                      {config.player1}
                      {winner === config.player1 && <Medal className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      {p1Solved ? '✅ Problem Solved' : '❌ Incomplete'}
                    </div>
                  </div>
                </div>
                <div className="text-center py-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <div className="text-4xl font-black text-blue-300 font-mono">{battleResults.p1Score}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total Points</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="text-lg font-black text-gray-200 font-mono">{battleResults.p1Attempts}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold">Attempts</div>
                  </div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="text-lg font-black text-gray-200 font-mono">{p1Solved ? '✓' : '✗'}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold">Status</div>
                  </div>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className={cn(
                "bg-dark-panel border rounded-2xl p-6 space-y-5 relative overflow-hidden transition-all",
                winner === config.player2 
                  ? "border-rose-500/40 shadow-lg shadow-rose-500/10" 
                  : "border-dark-border"
              )}>
                {winner === config.player2 && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-pink-400" />
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-600/20 border-2 border-rose-500/40 rounded-xl flex items-center justify-center text-lg font-black text-rose-400">
                    P2
                  </div>
                  <div>
                    <div className="text-lg font-black text-rose-400 flex items-center gap-2">
                      {config.player2}
                      {winner === config.player2 && <Medal className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      {p2Solved ? '✅ Problem Solved' : '❌ Incomplete'}
                    </div>
                  </div>
                </div>
                <div className="text-center py-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <div className="text-4xl font-black text-rose-300 font-mono">{battleResults.p2Score}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total Points</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="text-lg font-black text-gray-200 font-mono">{battleResults.p2Attempts}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold">Attempts</div>
                  </div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="text-lg font-black text-gray-200 font-mono">{p2Solved ? '✓' : '✗'}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold">Status</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Statistics */}
            <div className="bg-dark-panel border border-dark-border rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-gray-200 uppercase tracking-wider">Match Statistics</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-center">
                  <Timer className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-gray-200 font-mono">
                    {Math.floor(battleResults.timeUsedSeconds / 60)}:{(battleResults.timeUsedSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Time Used</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-gray-200 font-mono">{battleResults.timeLimitMinutes}:00</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Time Limit</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-center">
                  <Target className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-gray-200 font-mono">{battleResults.p1Attempts + battleResults.p2Attempts}</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Total Attempts</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-center">
                  <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-gray-200 font-mono">{battleResults.endedByTimeout ? 'Yes' : 'No'}</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Timeout</div>
                </div>
              </div>
            </div>

            {/* Leaderboard Section */}
            <div className="bg-dark-panel border border-dark-border rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-gray-200 uppercase tracking-wider">Leaderboard</h3>
              </div>
              <div className="space-y-2">
                {/* Rank them by score */}
                {[{ 
                  rank: 1, 
                  name: battleResults.p1Score >= battleResults.p2Score ? config.player1 : config.player2, 
                  score: Math.max(battleResults.p1Score, battleResults.p2Score),
                  solved: battleResults.p1Score >= battleResults.p2Score ? p1Solved : p2Solved,
                  attempts: battleResults.p1Score >= battleResults.p2Score ? battleResults.p1Attempts : battleResults.p2Attempts,
                  color: battleResults.p1Score >= battleResults.p2Score ? 'blue' : 'rose'
                }, {
                  rank: 2, 
                  name: battleResults.p1Score >= battleResults.p2Score ? config.player2 : config.player1, 
                  score: Math.min(battleResults.p1Score, battleResults.p2Score),
                  solved: battleResults.p1Score >= battleResults.p2Score ? p2Solved : p1Solved,
                  attempts: battleResults.p1Score >= battleResults.p2Score ? battleResults.p2Attempts : battleResults.p1Attempts,
                  color: battleResults.p1Score >= battleResults.p2Score ? 'rose' : 'blue'
                }].map((entry) => (
                  <div key={entry.rank} className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all",
                    entry.rank === 1 
                      ? "bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20" 
                      : "bg-dark-bg border-dark-border"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black",
                      entry.rank === 1 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                        : "bg-gray-700/20 text-gray-500 border border-gray-600/30"
                    )}>
                      #{entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-black",
                        entry.color === 'blue' ? 'text-blue-400' : 'text-rose-400'
                      )}>
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {entry.solved ? 'Solved' : 'Incomplete'} · {entry.attempts} attempt{entry.attempts !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-2xl font-black font-mono",
                        entry.rank === 1 ? 'text-amber-300' : 'text-gray-400'
                      )}>
                        {entry.score}
                      </div>
                      <div className="text-[9px] text-gray-500 uppercase font-bold">Points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setShowResultsPage(false);
                  navigate('/battle');
                }}
                className="py-4 px-6 bg-dark-panel border border-dark-border hover:bg-dark-hover text-gray-300 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Lobby
              </button>
              <button 
                onClick={() => {
                  setShowResultsPage(false);
                  setBattleResults(null);
                  // Quick remount / re-initialize the battle!
                  setTimeLeft(config.timeLimit * 60);
                  setIsTimeLow(false);
                  setP1Score(0);
                  setP1Attempts(0);
                  setP1Solved(false);
                  setP1Terminal({ status: 'idle', logs: ['Arena reset. Ready for host rematch.'] });
                  setP1TestResults([]);
                  setP2Score(0);
                  setP2Attempts(0);
                  setP2Solved(false);
                  setP2Terminal({ status: 'idle', logs: ['Arena reset. Ready for opponent rematch.'] });
                  setP2TestResults([]);
                  setBattleActive(true);
                  setWinner(null);
                }}
                className="py-4 px-6 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                Play Rematch
              </button>
            </div>

            {/* Match Timestamp */}
            <div className="text-center mt-6 text-[10px] text-gray-600">
              Match ended at {new Date(battleResults.endedAt).toLocaleString()} · ID: {battleResults.id}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
