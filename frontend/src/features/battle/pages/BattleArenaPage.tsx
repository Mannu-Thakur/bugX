import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useBattleTimer } from '../hooks/useBattleTimer';
import { useAuth } from '../../auth/useAuth';
import { userStorage } from '../../../shared/lib/userState';
import { BattleHeader } from '../components/BattleHeader';
import { BattleProblemPanel } from '../components/BattleProblemPanel';
import { BattleSplitView } from '../components/BattleSplitView';
import { BattleResultModal } from '../components/BattleResultModal';
import { MOCK_PROBLEM_DETAILS } from '../../../shared/lib/mockData';
import { api } from '../../../shared/lib/api';
import type { BattleProblem, BattlePlayerState, BattleStatus } from '../types/battle.types';

export const BattleArenaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null);
  const [problem, setProblem] = useState<BattleProblem | null>(null);
  const [players, setPlayers] = useState<BattlePlayerState[]>([]);
  const [status, setStatus] = useState<BattleStatus>('active');
  const [loading, setLoading] = useState(true);

  const [showProblem, setShowProblem] = useState(true);
  const [problemWidth, setProblemWidth] = useState(380);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);

  // Load notes from userState when problem changes or user changes
  useEffect(() => {
    if (problem && user) {
      const savedNotes = userStorage.getNote(user.id, problem.slug);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes(savedNotes || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.slug, user?.id]);

  // Timer loop
  const onTimerExpire = () => {
    setStatus('finished');
  };
  const { timeLeft, isTimeLow, syncTime, formatTime } = useBattleTimer(onTimerExpire);

  // Load configuration from sessionStorage
  useEffect(() => {
    const rawConfig = sessionStorage.getItem('battleConfig');
    if (!rawConfig) {
      navigate('/battle');
      return;
    }

    try {
      const parsed = JSON.parse(rawConfig);
      if (parsed.mode !== 'local') {
        navigate(`/battle/${parsed.battleId}`);
        return;
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(parsed);
      syncTime(parsed.timeLimit * 60);
      setStartTime(new Date().toISOString());

      // Initialize players
      const playerNames = parsed.playerNames || ['Player 1', 'Player 2'];
      const initialPlayers: BattlePlayerState[] = playerNames.map((name: string, idx: number) => ({
        player_index: idx,
        username: name,
        is_active: true,
        score: 0,
        solved: false,
        solved_at: null,
        attempts: 0,
        code: '',
        lang: 'javascript',
        terminal: { status: 'idle', logs: ['Connected.'] },
        testResults: [],
      }));
      setPlayers(initialPlayers);
    } catch (err) {
      console.error('Failed to parse local battle config:', err);
      navigate('/battle');
    }
  }, [navigate, syncTime]);

  // Load problem details
  useEffect(() => {
    if (!config) return;

    const loadProblemData = async () => {
      try {
        if (config.problemSource === 'custom' && config.customProblem) {
          const custom = config.customProblem;
          setProblem({
            id: 'custom',
            slug: 'custom-problem',
            title: custom.title,
            description: custom.description,
            difficulty: 'Medium',
            time_limit_ms: 2000,
            memory_limit_kb: 262144,
            score_base: 300,
            templates: [
              { language: 'javascript', template_code: custom.jsTemplate },
              { language: 'python', template_code: custom.pythonTemplate },
              { language: 'cpp', template_code: custom.cppTemplate },
              { language: 'java', template_code: custom.javaTemplate },
            ],
            sample_test_cases: custom.testCases.map((tc: { input: string; expectedOutput: string }, index: number) => ({
              id: String(index),
              input: tc.input,
              expected_output: tc.expectedOutput,
              is_sample: true,
            })),
            tags: [{ id: '1', name: 'Custom' }],
          });
        } else if (config.selectedSlug) {
          try {
            const p = await api.problems.get(config.selectedSlug);
            setProblem({
              id: p.id,
              slug: p.slug,
              title: p.title,
              description: p.description || 'No description.',
              difficulty: p.difficulty || 'Easy',
              time_limit_ms: p.time_limit_ms || 2000,
              memory_limit_kb: p.memory_limit_kb || 262144,
              score_base: p.score_base || 100,
              templates: p.templates.map((t: { language: string; template_code?: string; source_code?: string; function_name?: string }) => ({
                language: t.language === 'js' ? 'javascript' : t.language,
                template_code: t.template_code || t.source_code || '',
                function_name: t.function_name,
              })),
              sample_test_cases: (p.sample_test_cases || []).map((tc: any, index: number) => ({
                id: tc.id || String(index),
                input: tc.input || '',
                expected_output: tc.expected_output || '',
                is_sample: true,
              })),
              tags: p.tags || [],
            });
          } catch {
            const mock = MOCK_PROBLEM_DETAILS[config.selectedSlug] || Object.values(MOCK_PROBLEM_DETAILS)[0];
            setProblem({
              id: mock.id || 'mock',
              slug: mock.slug,
              title: mock.title,
              description: mock.description || 'Mock description.',
              difficulty: mock.difficulty || 'Easy',
              time_limit_ms: mock.time_limit_ms || 2000,
              memory_limit_kb: mock.memory_limit_kb || 262144,
              score_base: mock.score_base || 100,
              templates: mock.templates.map((t: { language: string; template_code?: string; source_code?: string; function_name?: string }) => ({
                language: t.language === 'js' ? 'javascript' : t.language,
                template_code: t.template_code || t.source_code || '',
                function_name: t.function_name,
              })),
              sample_test_cases: (mock.sample_test_cases || []).map((tc: any, index: number) => ({
                id: tc.id || String(index),
                input: tc.input || '',
                expected_output: tc.expected_output || '',
                is_sample: true,
              })),
              tags: mock.tags || [],
            });
          }
        }
      } catch (err) {
        console.error('Failed to load problem:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProblemData();
  }, [config]);

  // Set default templates for players once problem is loaded
  useEffect(() => {
    if (!problem || !players.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayers(prev => prev.map(p => {
      if (!p.code) {
        const jsTpl = problem.templates.find(t => t.language === 'javascript');
        return {
          ...p,
          code: jsTpl?.template_code || '',
          lang: 'javascript',
        };
      }
      return p;
    }));
  }, [problem, players.length]);

  // Check end game condition (both players solved)
  useEffect(() => {
    if (players.length > 0 && players.every(p => p.solved) && status !== 'finished') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('finished');
    }
  }, [players, status]);

  const handleCodeChange = (idx: number, code: string) => {
    setPlayers(prev => prev.map(p => 
      p.player_index === idx ? { ...p, code } : p
    ));
  };

  const handleLanguageChange = (idx: number, lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    if (!problem) return;
    const starter = problem.templates.find(t => t.language === lang);
    setPlayers(prev => prev.map(p => 
      p.player_index === idx ? { ...p, lang, code: starter?.template_code || '' } : p
    ));
  };

  const handleSolve = (idx: number, score: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.player_index === idx) {
        return {
          ...p,
          solved: true,
          score,
          solved_at: new Date().toISOString(),
        };
      }
      return p;
    }));
  };

  const handleConcede = () => {
    if (window.confirm('Both players want to end the match early?')) {
      setStatus('finished');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#4F7DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-[#07090e] text-gray-250 flex flex-col font-sans overflow-hidden relative">
      {/* Result Modal Overlay when complete */}
      {status === 'finished' && problem && (
        <div className="fixed inset-0 z-40 bg-[#07090e]/90 flex items-center justify-center p-4">
          <BattleResultModal
            players={players}
            problemTitle={problem.title}
            onReturn={() => navigate('/battle')}
            startTime={startTime}
            timeLimit={config?.timeLimit}
          />
        </div>
      )}

      {/* Header bar */}
      <BattleHeader
        mode="local"
        timeLeft={timeLeft}
        isTimeLow={isTimeLow}
        formatTime={formatTime}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        onConcede={handleConcede}
        showProblem={showProblem}
        onToggleProblem={() => setShowProblem(prev => !prev)}
        showScoreboard={false}
        onToggleScoreboard={() => {}}
        isFinished={status === 'finished'}
      />

      {/* Workspace columns */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Collapsed description indicator */}
        {!showProblem && problem && (
          <div className="w-8 border-r border-dark-border bg-dark-panel flex flex-col items-center py-4 select-none shrink-0 h-full animate-fade-in">
            <button
              onClick={() => setShowProblem(true)}
              className="p-1 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-250 transition-colors"
            >
              <span className="text-[10px] font-bold">›</span>
            </button>
            <div className="mt-8 text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] [writing-mode:vertical-lr] flex items-center gap-1.5">
              Problem Description
            </div>
          </div>
        )}

        {/* Column 1: Problem Panel */}
        {showProblem && problem && (
          <BattleProblemPanel
            problem={problem}
            width={problemWidth}
            onResize={setProblemWidth}
            onClose={() => setShowProblem(false)}
            user={user}
            activeLanguage={players[0]?.lang}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}

        {/* Columns 2 & 3: Side-by-side Dual Editors */}
        {problem && players.length >= 2 && (
          <BattleSplitView
            problem={problem}
            players={players}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onSolve={handleSolve}
            soundEnabled={soundEnabled}
            isFinished={status === 'finished'}
          />
        )}
      </main>
    </div>
  );
};
