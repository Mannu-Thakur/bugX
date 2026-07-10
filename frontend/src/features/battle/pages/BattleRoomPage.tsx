import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { userStorage } from '../../../shared/lib/userState';
import { useBattleRoom } from '../hooks/useBattleRoom';
import { BattleHeader } from '../components/BattleHeader';
import { BattleProblemPanel } from '../components/BattleProblemPanel';
import { BattleSidebar } from '../components/BattleSidebar';
import { BattleEditor } from '../components/BattleEditor';
import { BattleWaitingScreen } from '../components/BattleWaitingScreen';
import { BattleResultModal } from '../components/BattleResultModal';

export const BattleRoomPage: React.FC = () => {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
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
    joinRoom,
    startRoom,
    updateCode,
    updateLanguage,
    changeActiveProblemIndex,
    concedeProblem,
    setRoom,
  } = useBattleRoom(battleId);

  // UI Panels state
  const [showProblem, setShowProblem] = useState(true);
  const [showScoreboard, setShowScoreboard] = useState(true);
  const [problemWidth, setProblemWidth] = useState(420);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notes, setNotes] = useState('');

  // Guest join state (for non-authenticated users)
  const [guestUsername, setGuestUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const activeProblem = room?.problems && room.problems.length > activeProblemIndex
    ? room.problems[activeProblemIndex]
    : room?.problem;

  const myPlayer = room?.players.find(p => p.player_index === myPlayerIndex);

  const activeProblemProgress = myPlayer?.progress?.[activeProblemIndex] || {
    code: (() => {
      const currentLang = myPlayer?.lang || 'javascript';
      const starter = activeProblem?.templates?.find(t => t.language === currentLang);
      return starter?.template_code || starter?.source_code || '';
    })(),
    lang: myPlayer?.lang || 'javascript',
    solved: false,
    attempts: 0,
    score: 0,
    solved_at: null
  };

  // Load notes from userState when problem changes or user changes
  useEffect(() => {
    if (activeProblem && user) {
      const savedNotes = userStorage.getNote(user.id, activeProblem.slug);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes(savedNotes || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProblem?.slug, user?.id]);

  // Auto-initialize template code on changing active problem if not already initialized
  useEffect(() => {
    if (!activeProblem || !myPlayer || myPlayerIndex === null) return;
    const progress = myPlayer.progress?.[activeProblemIndex];
    if (!progress || !progress.code) {
      const currentLang = progress?.lang || myPlayer.lang || 'javascript';
      const starter = activeProblem.templates?.find(t => t.language === currentLang);
      const starterCode = starter?.template_code || starter?.source_code || '';
      updateLanguage(currentLang, starterCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProblemIndex, activeProblem?.id, myPlayerIndex, myPlayer?.username, updateLanguage]);

  // Auto-join if guest and battle is pending
  useEffect(() => {
    if (room && room.status === 'pending' && !isJoined && user) {
      joinRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, isJoined, user, joinRoom]);

  // Auto-collapse side panels on small screens
  useEffect(() => {
    if (window.innerWidth < 1024) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowProblem(false);
      setShowScoreboard(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw className="w-8 h-8 text-[#4F7DFF] animate-spin" />
          <span className="text-xs font-semibold select-none">Entering Arena...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-sm w-full space-y-6 bg-[#0b0e14]/40 border border-white/5 p-6 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <Swords className="w-5 h-5 text-rose-450" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-gray-150">Lobby Error</h2>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
          <button
            onClick={() => navigate('/battle')}
            className="battle-btn-secondary w-full py-2.5"
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Guest join overlay
  if (!isJoined) {
    const effectiveUsername = user?.username || guestUsername.trim();
    const handleJoin = async () => {
      if (!effectiveUsername) {
        setJoinError('Please enter a display name to join.');
        return;
      }
      setJoinError('');
      setIsJoining(true);
      try {
        await joinRoom(effectiveUsername);
      } catch (err: unknown) {
        setJoinError(err instanceof Error ? err.message : 'Failed to join. Please try again.');
      } finally {
        setIsJoining(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6 select-none relative">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#4F7DFF]/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7A5FFF]/2 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-sm w-full space-y-6 bg-[#0b0e14]/50 border border-white/[0.06] p-8 rounded-2xl backdrop-blur-md shadow-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4F7DFF]/10 border border-[#4F7DFF]/25 flex items-center justify-center shadow-[0_0_20px_rgba(79,125,255,0.08)]">
              <Swords className="w-6 h-6 text-[#4F7DFF]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-gray-100">Join Battle Arena</h2>
              <p className="text-xs text-gray-500">
                Match room <span className="font-mono text-[#4F7DFF]/80">{room.id.slice(0, 8)}</span> · {room.players.length}/{room.max_players} joined
              </p>
            </div>
          </div>

          {user ? (
            <div className="bg-[#0c0f16]/80 p-4 rounded-xl border border-white/[0.05] space-y-1">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Joining as</span>
              <span className="text-sm font-black text-gray-200">{user.username}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Display Name
              </label>
              <input
                type="text"
                value={guestUsername}
                onChange={e => { setGuestUsername(e.target.value); setJoinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={20}
                className="battle-input w-full"
                placeholder="Enter your display name..."
                autoFocus
              />
            </div>
          )}

          {joinError && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {joinError}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isJoining || (!user && !guestUsername.trim())}
            className="battle-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Joining...
              </>
            ) : 'Enter Battle Arena'}
          </button>
        </div>
      </div>
    );
  }

  // Pending room lobby state
  if (room.status === 'pending') {
    return (
      <BattleWaitingScreen
        roomId={room.id}
        players={room.players}
        maxPlayers={room.max_players}
        myPlayerIndex={myPlayerIndex}
        onStartRoom={startRoom}
        isHost={room.host_username === user?.username}
      />
    );
  }

  // Con concede match handler
  const handleConcede = () => {
    if (activeProblemProgress.solved) return;
    if (window.confirm('Are you sure you want to concede this match? You will receive 0 points.')) {
      concedeProblem();
    }
  };

  return (
    <div className="h-screen max-h-screen bg-[#07090e] text-gray-250 flex flex-col font-sans overflow-hidden relative">
      
      {/* 5-second countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-[#07090e]/95 z-50 flex flex-col items-center justify-center select-none">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-black uppercase text-[#4F7DFF] tracking-[0.3em] block">
              PREPARE YOUR WORKSPACE
            </span>
            <div className="text-7xl sm:text-8xl font-black text-gray-100 animate-ping">
              {countdown}
            </div>
            <span className="text-[11px] font-bold text-gray-500 tracking-wider block">
              MATCH STARTING IN
            </span>
          </div>
        </div>
      )}

      {/* Main result Modal when completed */}
      {room.status === 'finished' && (
        <div className="fixed inset-0 z-40 bg-[#07090e]/90 flex items-center justify-center p-4">
          <BattleResultModal
            players={room.players}
            problemTitle={room.problem?.title || 'Coding Challenge'}
            onReturn={() => navigate('/battle')}
            startTime={room.start_time}
            timeLimit={room.time_limit}
          />
        </div>
      )}

      {/* Header bar */}
      <BattleHeader
        mode="invite"
        roomId={room.id}
        timeLeft={timeLeft}
        isTimeLow={isTimeLow}
        formatTime={formatTime}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        onConcede={handleConcede}
        showProblem={showProblem}
        onToggleProblem={() => setShowProblem(prev => !prev)}
        showScoreboard={showScoreboard}
        onToggleScoreboard={() => setShowScoreboard(prev => !prev)}
        isFinished={room.status === 'finished'}
      />

      {/* Workspace columns */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left sidebar for multiple problems (Tabs 1, 2, 3) */}
        {room.problems && room.problems.length > 1 && (
          <div className="w-16 bg-[#0b0e14]/60 border-r border-white/5 flex flex-col items-center py-6 gap-4 select-none shrink-0">
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
              Levels
            </span>
            <div className="flex flex-col gap-3 w-full px-2">
              {room.problems.map((prob, idx) => {
                const isSelected = idx === activeProblemIndex;
                const isSolved = myPlayer?.progress?.[idx]?.solved;
                
                return (
                  <button
                    key={prob.id}
                    onClick={() => changeActiveProblemIndex(idx)}
                    className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#4F7DFF]/15 border-[#4F7DFF] text-white shadow-lg'
                        : 'bg-dark-bg/40 border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-black">{idx + 1}</span>
                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 mt-0.5">
                      LVL
                    </span>
                    {isSolved && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-[#07090e]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsed description indicator */}
        {!showProblem && (
          <div className="w-8 border-r border-dark-border bg-dark-panel flex flex-col items-center py-4 select-none shrink-0 h-full">
            <button
              onClick={() => setShowProblem(true)}
              className="p-1 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="text-[10px] font-bold">›</span>
            </button>
            <div className="mt-8 text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] [writing-mode:vertical-lr] flex items-center gap-1.5">
              Problem Description
            </div>
          </div>
        )}

        {/* Column 1: Problem Panel */}
        {showProblem && activeProblem && (
          <BattleProblemPanel
            problem={activeProblem}
            width={problemWidth}
            onResize={setProblemWidth}
            onClose={() => setShowProblem(false)}
            user={user}
            activeLanguage={activeProblemProgress.lang}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}

        {/* Column 2: Editor */}
        {myPlayer && activeProblem && (
          <BattleEditor
            key={activeProblem.id}
            slug={activeProblem.slug}
            problemId={activeProblem.id}
            code={activeProblemProgress.code}
            language={activeProblemProgress.lang}
            onChangeCode={updateCode}
            onChangeLanguage={(lang) => {
              const starter = activeProblem?.templates.find(t => t.language === lang);
              updateLanguage(lang, starter?.template_code || starter?.source_code || '');
            }}
            templates={activeProblem.templates}
            testCases={activeProblem.sample_test_cases}
            isSolved={activeProblemProgress.solved}
            attempts={activeProblemProgress.attempts}
            myPlayerIndex={myPlayerIndex || 0}
            battleId={room.id}
            onSolve={(score) => {
              // Submit solution updates score
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
                        score: score
                      };
                      return {
                        ...p,
                        progress: prog,
                        score: Object.values(prog).reduce((acc, curr) => acc + (curr.score || 0), 0)
                      };
                    }
                    return p;
                  })
                };
              });
            }}
            soundEnabled={soundEnabled}
            isFinished={room.status === 'finished'}
          />
        )}

        {/* Column 3: Sidebar Scoreboard */}
        {showScoreboard && (
          <BattleSidebar
            players={room.players}
            myPlayerIndex={myPlayerIndex}
            battleId={room.id}
            onClose={() => setShowScoreboard(false)}
            problemsCount={room.problems?.length || 1}
          />
        )}
      </main>
    </div>
  );
};
