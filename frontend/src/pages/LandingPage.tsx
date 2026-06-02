import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Terminal, Swords, Award, Search, Sparkles, ChevronRight,
  Play, Zap, Trophy, Clock
} from 'lucide-react';
import { api } from '../shared/lib/api';
import { useToast } from '../shared/ui/toast/ToastProvider';
import { Button } from '../shared/ui/button/Button';
import { Input } from '../shared/ui/input/Input';

/* ═══════════════════════════════════════════════════
   Battle Simulation Data
   ═══════════════════════════════════════════════════ */
const P1_CODE = `#include <vector>
#include <unordered_map>

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int comp = target - nums[i];
            if (seen.count(comp))
                return {seen[comp], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`;

const P2_CODE = `#include <vector>

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); i++) {
            for (int j = i+1; j < nums.size(); j++) {
                if (nums[i] + nums[j] == target)
                    return {i, j};
            }
        }
        return {};
    }
};`;

const CODE_FRAGMENTS = ['{}', '()', '=>', '//', '#include', 'const', 'return', '&&', '||', 'for', 'if', '==', '[]', '++;', 'void', '<<'];

/* ═══════════════════════════════════════════════════
   Custom Hooks
   ═══════════════════════════════════════════════════ */
function useTypingText(text: string, speed = 65, delay = 0, enabled = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        i++;
        if (i > text.length) {
          clearInterval(intervalId);
          setDone(true);
        } else {
          setDisplayed(text.slice(0, i));
        }
      }, speed);
    }, delay);
    return () => { clearTimeout(timeoutId); clearInterval(intervalId!); };
  }, [text, speed, delay, enabled]);

  return { displayed, done };
}


/* ═══════════════════════════════════════════════════
   Battle Simulation Component
   ═══════════════════════════════════════════════════ */
const BattleSimulation: React.FC = () => {
  const [p1Idx, setP1Idx] = useState(0);
  const [p2Idx, setP2Idx] = useState(0);
  const [timer, setTimer] = useState(300);
  const [p1Done, setP1Done] = useState(false);
  const [p2Done, setP2Done] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [phase, setPhase] = useState<'wait' | 'battle' | 'result'>('wait');
  const [cycle, setCycle] = useState(0);

  // Start battle after 1s
  useEffect(() => {
    const t = setTimeout(() => { setPhase('battle'); }, 1000);
    return () => clearTimeout(t);
  }, [cycle]);

  // P1 typing at 35ms/char (faster = wins)
  useEffect(() => {
    if (phase !== 'battle' || p1Done) return;
    const iv = setInterval(() => {
      setP1Idx(prev => {
        if (prev >= P1_CODE.length) { setP1Done(true); clearInterval(iv); return prev; }
        return prev + 1;
      });
    }, 35);
    return () => clearInterval(iv);
  }, [phase, p1Done, cycle]);

  // P2 typing at 50ms/char (slower = loses)
  useEffect(() => {
    if (phase !== 'battle' || p2Done) return;
    const iv = setInterval(() => {
      setP2Idx(prev => {
        if (prev >= P2_CODE.length) { setP2Done(true); clearInterval(iv); return prev; }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(iv);
  }, [phase, p2Done, cycle]);

  // Timer
  useEffect(() => {
    if (phase !== 'battle') return;
    const iv = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [phase, cycle]);

  // Winner detection
  useEffect(() => {
    if (p1Done && p2Done && !showWinner) {
      const t = setTimeout(() => { setShowWinner(true); setPhase('result'); }, 600);
      return () => clearTimeout(t);
    }
  }, [p1Done, p2Done, showWinner]);

  // Cycle reset
  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(() => {
      setP1Idx(0); setP2Idx(0); setTimer(300);
      setP1Done(false); setP2Done(false);
      setShowWinner(false); setPhase('wait');
      setCycle(c => c + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [phase]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const MiniEditor = ({ code, idx, name, done: isDone, color }: {
    code: string; idx: number; name: string; done: boolean; color: string;
  }) => {
    const visible = code.slice(0, idx);
    const lines = visible.split('\n');
    return (
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500/60" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
          </div>
          <span className={`text-[10px] font-black ${color} uppercase tracking-wider`}>{name}</span>
          <div className={`ml-auto flex items-center gap-1 text-[9px] font-semibold ${isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isDone && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
            {isDone ? 'Done' : 'Coding...'}
          </div>
        </div>
        <div className="flex-1 p-3 overflow-hidden bg-[#0a0d14] relative" style={{ minHeight: 210 }}>
          <pre className="text-[10px] sm:text-[11px] leading-[1.65] font-mono text-gray-300/80 whitespace-pre">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="inline-block w-5 text-right mr-3 text-gray-600/40 select-none text-[9px]">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
            {!isDone && phase === 'battle' && (
              <span className="inline-block w-[2px] h-3 bg-blue-400 ml-0.5 animate-blink" />
            )}
          </pre>
          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/[0.06] backdrop-blur-[1px] animate-fade-in">
              <div className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-[11px] font-black tracking-wider animate-scale-in shadow-lg shadow-emerald-500/10">
                ✓ ACCEPTED
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const confettiColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899'];

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.06] relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Swords className="w-3 h-3 text-orange-400" />
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Battle Preview</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
          phase === 'battle' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.04] border border-white/[0.04]'
        }`}>
          <Clock className="w-3 h-3 text-red-400" />
          <span className={`text-[11px] font-mono font-bold ${phase === 'battle' ? 'text-red-400' : 'text-gray-500'}`}>
            {fmtTime(timer)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black">
          <span className="text-blue-400">P1: {p1Done ? '300' : '0'}</span>
          <span className="text-gray-600">vs</span>
          <span className="text-rose-400">P2: {p2Done ? '250' : '0'}</span>
        </div>
      </div>

      {/* Split editors */}
      <div className="flex relative">
        <MiniEditor code={P1_CODE} idx={p1Idx} name="Player 1" done={p1Done} color="text-blue-400" />
        {/* VS divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-orange-500/30 to-transparent relative flex-shrink-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0f1119] border border-orange-500/30 flex items-center justify-center z-10 shadow-lg shadow-orange-500/10">
            <span className="text-[8px] font-black text-orange-400">VS</span>
          </div>
        </div>
        <MiniEditor code={P2_CODE} idx={p2Idx} name="Player 2" done={p2Done} color="text-rose-400" />
      </div>

      {/* Winner overlay */}
      {showWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in z-20">
          <div className="text-center space-y-2 animate-scale-in">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" style={{ animation: 'float 1.5s ease-in-out infinite' }} />
            <div className="px-8 py-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 rounded-xl backdrop-blur-md">
              <p className="text-amber-400 text-xl font-black tracking-wide">🏆 PLAYER 1 WINS!</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">300 vs 250 pts · Optimal O(n) solution</p>
            </div>
          </div>
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                width: 4 + Math.random() * 5,
                height: 4 + Math.random() * 5,
                backgroundColor: confettiColors[i % confettiColors.length],
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Exhaust Particles for Rocket
   ═══════════════════════════════════════════════════ */
const ExhaustParticles: React.FC<{ boosted: boolean }> = ({ boosted }) => {
  const particles = useMemo(() =>
    Array.from({ length: boosted ? 24 : 10 }).map((_, i) => ({
      id: i,
      x: 25 + Math.random() * 50,
      delay: Math.random() * 2,
      dur: 1.2 + Math.random() * 1.8,
      size: boosted ? 2 + Math.random() * 4 : 1.5 + Math.random() * 2,
      op: boosted ? 0.5 + Math.random() * 0.4 : 0.12 + Math.random() * 0.18,
    }))
  , [boosted]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-exhaust"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            background: boosted
              ? `radial-gradient(circle, rgba(99,102,241,${p.op}), rgba(59,130,246,${p.op * 0.6}))`
              : `rgba(59,130,246,${p.op})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Interactive Feature Card
   ═══════════════════════════════════════════════════ */
const FeatureCard: React.FC<{
  to: string; icon: React.ElementType; title: string; desc: string;
  color: string; borderHover: string; iconBg: string; iconText: string;
  chevronColor: string; delay: number;
  children?: React.ReactNode;
}> = ({ to, icon: Icon, title, desc, color, borderHover, iconBg, iconText, chevronColor, delay, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: y * -10, y: x * 10 });
  }, []);

  const colorVal = color === 'orange' ? '#f97316' : color === 'blue' ? '#3b82f6' : '#10b981';
  const gradFrom = color === 'orange' ? 'from-orange-500/[0.06]' : color === 'blue' ? 'from-blue-500/[0.06]' : 'from-emerald-500/[0.06]';

  return (
    <Link to={to} className="block">
      <div
        ref={ref}
        className={`group glass-card glass-card-hover p-6 rounded-2xl transition-colors duration-300 ${borderHover} relative overflow-hidden animate-spring-in`}
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
          animationDelay: `${delay}ms`,
        }}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }}
      >
        {/* Hover gradient overlay */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradFrom} to-transparent rounded-2xl pointer-events-none`} />

        {/* Animated border glow on hover */}
        <div className="absolute inset-[-1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none animate-border-travel"
          style={{
            background: `conic-gradient(from var(--border-angle, 0deg), transparent 60%, ${colorVal}44 80%, ${colorVal} 100%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
          } as React.CSSProperties}
        />

        <div
          className={`w-11 h-11 rounded-xl ${iconBg} border flex items-center justify-center mb-5 ${iconText}`}
          style={{
            transform: hovered ? 'scale(1.15) rotate(360deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2 flex items-center">
          {title}
          <ChevronRight className={`w-4 h-4 ${chevronColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 ml-auto`} />
        </h3>

        <p className="text-sm text-gray-400 leading-relaxed font-medium mb-3.5">{desc}</p>

        {children}
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════
   Floating Code Particles (Background)
   ═══════════════════════════════════════════════════ */
const FloatingCodeParticles: React.FC = React.memo(() => {
  const particles = useMemo(() =>
    CODE_FRAGMENTS.map((text) => ({
      text,
      x: Math.random() * 100,
      y: 20 + Math.random() * 70,
      delay: Math.random() * 25,
      dur: 18 + Math.random() * 22,
      size: 10 + Math.random() * 4,
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute font-mono animate-drift select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            opacity: 0.035,
            color: '#94a3b8',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
});

/* ═══════════════════════════════════════════════════
   Authentic Micro-UI Widgets for Cards
   ═══════════════════════════════════════════════════ */
const BattleQueueWidget: React.FC = () => {
  return (
    <div className="mt-5 p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-2 select-none text-[11px] text-gray-400 font-medium">
      <div className="flex items-center gap-1.5 font-bold text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Lobby Matchmaker Active
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0f111a] border border-white/[0.03] rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-mono text-blue-400 font-bold uppercase">You</span>
          <span className="text-gray-600 font-semibold">vs</span>
          <span className="font-mono text-rose-400 font-bold uppercase">Rival_7</span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono font-medium animate-pulse">01:42 elapsed</div>
      </div>
      <div className="h-1 bg-[#161a24] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '45%' }} />
      </div>
    </div>
  );
};

const WorkspaceStatsWidget: React.FC<{ count: number | null; loading: boolean }> = ({ count, loading }) => {
  const pills = [
    { name: 'C++', style: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { name: 'Python', style: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
    { name: 'JavaScript', style: 'bg-amber-500/10 text-amber-300 border border-amber-500/20' },
    { name: 'Java', style: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' }
  ];

  return (
    <div className="mt-5 p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-3 select-none text-[11px] text-gray-400 font-medium">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-400">Available Problems</span>
        {loading ? (
          <div className="w-8 h-3.5 bg-white/5 rounded animate-pulse" />
        ) : (
          <span className="font-mono text-gray-200 font-extrabold text-xs">
            {count !== null ? count : '50+'} active
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {pills.map(p => (
          <span key={p.name} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${p.style}`}>
            {p.name}
          </span>
        ))}
      </div>
      
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400/90 pt-0.5 border-t border-white/[0.03]">
        <div className="w-1 h-1 rounded-full bg-emerald-400" />
        Compiler sandbox ready to compile & run
      </div>
    </div>
  );
};

const LeaderboardPreviewWidget: React.FC<{
  climbers: { username: string; score: number }[];
  loading: boolean;
}> = ({ climbers, loading }) => {
  const fallbacks = [
    { username: 'Mannu Kumar', score: 2450, rank: 1 },
    { username: 'CodeMaster', score: 2120, rank: 2 },
    { username: 'SyntaxSlayer', score: 1980, rank: 3 }
  ];

  const data = climbers.length > 0 ? climbers.map((c, i) => ({ ...c, rank: i + 1 })) : fallbacks;

  return (
    <div className="mt-5 p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-2 select-none text-[11px] text-gray-400 font-medium">
      <span className="font-bold text-gray-400 block mb-1">Top Coder Standings</span>
      
      {loading && climbers.length === 0 ? (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-6 bg-white/5 rounded-lg" />
          <div className="h-6 bg-white/5 rounded-lg" />
          <div className="h-6 bg-white/5 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.map((c) => (
            <div key={c.username} className="flex items-center justify-between px-2 py-1 bg-[#0f111a] border border-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-4 text-center font-black ${
                  c.rank === 1 ? 'text-amber-400' : c.rank === 2 ? 'text-slate-400' : 'text-orange-400'
                }`}>
                  {c.rank}
                </span>
                <span className="font-mono text-gray-300 font-bold truncate max-w-[100px]">{c.username}</span>
              </div>
              <span className="font-mono text-gray-500 font-black">{c.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════════════ */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  /* ── State ── */
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState('');
  const [rocketLaunched, setRocketLaunched] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [sonicBoom, setSonicBoom] = useState(false);

  /* ── Live backend stats data fetching ── */
  const [totalProblems, setTotalProblems] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [topClimbers, setTopClimbers] = useState<{ username: string; score: number }[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLiveStats = async () => {
      try {
        const probs = await api.problems.list({ page: 1, limit: 1 });
        if (active) setTotalProblems(probs.total);
      } catch (err) {
        console.error("Failed to load live problem stats:", err);
      } finally {
        if (active) setLoadingStats(false);
      }
    };
    const fetchLiveLeaderboard = async () => {
      try {
        const board = await api.leaderboard.get('all', 3);
        if (active) {
          setTopClimbers(board.map(entry => ({
            username: entry.username,
            score: entry.score
          })));
        }
      } catch (err) {
        console.error("Failed to load live leaderboard:", err);
      } finally {
        if (active) setLoadingLeaderboard(false);
      }
    };
    fetchLiveStats();
    fetchLiveLeaderboard();
    return () => { active = false; };
  }, []);

  /* ── Hero typing ── */
  const line1 = useTypingText('Code Faster.', 75, 400);
  const line2 = useTypingText('Compete Smarter.', 55, 0, line1.done);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (line2.done) {
      setGlitch(true);
      const t1 = setTimeout(() => setGlitch(false), 300);
      const t2 = setTimeout(() => setSubtitleVisible(true), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [line2.done]);

  /* ── Mouse parallax for orbs ── */
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  /* ── Fetch & Solve with Rocket Launch ── */
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = importInput.trim();
    if (!slug) { toast.error("Please enter a question name, URL, or keyword."); return; }

    // 1) Shake
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      // 2) Launch
      setRocketLaunched(true);
      setSonicBoom(true);
      setTimeout(() => setSonicBoom(false), 1000);
    }, 150);

    // 3) After rocket animation, run fetch
    setTimeout(async () => {
      setImporting(true);
      setImportStep("Connecting to repository...");
      try {
        await new Promise(r => setTimeout(r, 500));
        setImportStep("Extracting statements & syntax templates...");
        await new Promise(r => setTimeout(r, 500));
        const problem = await api.problems.import(slug);
        setImportStep("Configuring Monaco Workspace...");
        await new Promise(r => setTimeout(r, 400));
        toast.success(`Successfully imported "${problem.title}"! Opening editor...`);
        navigate(`/problems/${problem.slug}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to import problem. Our backup engine synthesized a fallback workspace.");
        navigate('/problems');
      } finally {
        setImporting(false);
        setImportStep('');
        setRocketLaunched(false);
      }
    }, 750);
  };


  return (
    <div className="relative min-h-[calc(100vh-115px)] flex flex-col items-center overflow-hidden bg-[#07090e] select-none text-gray-200">

      {/* Grid bg */}
      <div className="grid-bg absolute inset-0 pointer-events-none" />

      {/* Floating code particles */}
      <FloatingCodeParticles />

      {/* Mouse-reactive orbs */}
      <div className="absolute top-[10%] left-[15%] w-[420px] h-[420px] rounded-full bg-blue-600/[0.07] blur-[140px] pointer-events-none transition-transform duration-[2500ms] ease-out"
        style={{ transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)` }} />
      <div className="absolute top-[55%] right-[10%] w-[360px] h-[360px] rounded-full bg-indigo-500/[0.06] blur-[130px] pointer-events-none transition-transform duration-[2500ms] ease-out"
        style={{ transform: `translate(${mouse.x * -0.3}px, ${mouse.y * -0.3}px)` }} />
      <div className="absolute bottom-[5%] left-[30%] w-[300px] h-[300px] rounded-full bg-teal-500/[0.05] blur-[120px] pointer-events-none transition-transform duration-[2500ms] ease-out"
        style={{ transform: `translate(${mouse.x * 0.4}px, ${mouse.y * 0.4}px)` }} />
      <div className="absolute top-[30%] right-[35%] w-[200px] h-[200px] rounded-full bg-violet-500/[0.04] blur-[100px] pointer-events-none transition-transform duration-[2500ms] ease-out"
        style={{ transform: `translate(${mouse.x * -0.6}px, ${mouse.y * -0.6}px)` }} />

      {/* Main content */}
      <div className="max-w-6xl w-full mx-auto relative z-10 py-16 sm:py-24 px-4 space-y-20">

        {/* ────────── HERO SECTION ────────── */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Badge with rotating border */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 text-[11px] font-bold tracking-widest uppercase animate-scale-in relative overflow-hidden"
            style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="absolute inset-[-1px] rounded-full animate-border-travel pointer-events-none"
              style={{
                background: 'conic-gradient(from var(--border-angle, 0deg), transparent 70%, rgba(59,130,246,0.5) 100%)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                padding: '1px',
              } as React.CSSProperties}
            />
            <Sparkles className="w-3.5 h-3.5" style={{ animation: 'spin 3s linear infinite' }} />
            Competitive Coding Arena
          </div>

          {/* Typing heading with dynamic light spotlight */}
          <div className="relative inline-block w-full">
            {/* Spotlight Ambient Glow */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center filter blur-[100px] pointer-events-none transition-all duration-1000 ease-out select-none">
              <div className={`rounded-full transition-all duration-1000 ease-out ${
                !line1.done
                  ? 'w-[200px] h-[70px] bg-blue-500/10 scale-90'
                  : !line2.done
                  ? 'w-[270px] h-[90px] bg-indigo-500/12 scale-100'
                  : 'w-[350px] h-[110px] bg-violet-600/10 scale-105 animate-glow-pulse'
              }`} />
            </div>

            <h1 className={`text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.08] select-text ${glitch ? 'animate-glitch' : ''}`}>
              <span className="block text-white">
                {line1.displayed}
                {!line1.done && (
                  <span className="inline-block w-[3px] h-[0.85em] bg-blue-400 ml-1 align-middle animate-blink rounded-sm" />
                )}
              </span>
              <span className="text-gradient-primary block mt-1">
                {line2.displayed}
                {line1.done && !line2.done && (
                  <span className="inline-block w-[3px] h-[0.85em] bg-violet-400 ml-1 align-middle animate-blink rounded-sm" />
                )}
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className={`text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium transition-all duration-700 ease-out ${
            subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            Fetch problems from LeetCode & GeeksforGeeks, solve them in a premium
            Monaco editor, and battle rivals in real-time 1v1 arenas.
          </p>

          {/* CTA buttons */}
          <div className={`flex flex-wrap items-center justify-center gap-4 pt-2 transition-all duration-700 ease-out delay-150 ${
            subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            <Link to="/battle">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold tracking-wide shadow-lg shadow-orange-600/20 border-0 hover:scale-[1.04] active:scale-[0.97] transition-all flex items-center gap-2.5 px-7 h-12 text-sm group"
              >
                <Swords className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                Enter 1v1 Arena
              </Button>
            </Link>
            <Link to="/problems">
              <Button
                size="lg"
                variant="outline"
                className="border-white/[0.08] hover:bg-white/[0.04] text-gray-200 hover:text-white tracking-wide hover:scale-[1.04] active:scale-[0.97] transition-all flex items-center gap-2.5 px-7 h-12 text-sm"
              >
                <Terminal className="w-5 h-5 text-blue-400" />
                Explore Problems
              </Button>
            </Link>
          </div>
        </section>

        {/* ────────── FETCH & SOLVE ROCKET BAR ────────── */}
        <section className="max-w-2xl w-full mx-auto relative">
          {/* Sonic boom ring */}
          {sonicBoom && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
              <div className="w-2 h-2 rounded-full border-2 border-blue-400/60 animate-sonic-boom" />
            </div>
          )}

          <div className={`glass-card relative p-6 sm:p-8 rounded-2xl border border-blue-500/[0.12] shadow-2xl shadow-blue-900/10 transition-transform ${
            shaking ? 'animate-shake' : ''
          } ${rocketLaunched ? 'animate-rocket-launch' : ''}`}>
            {/* Exhaust particles */}
            <ExhaustParticles boosted={rocketLaunched} />

            {/* Glow accent */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/[0.08] to-transparent pointer-events-none -z-10" />

            {/* Label */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Zap className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Instant Fetch Engine</span>
              </div>
              {!importInput.trim() && !importing && !rocketLaunched && (
                <span className="ml-auto text-[10px] text-gray-500 font-medium animate-float" style={{ animationDuration: '3s' }}>
                  Ready for liftoff 🚀
                </span>
              )}
            </div>

            <form onSubmit={handleImport} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Input
                    placeholder="Paste LeetCode/GFG URL or search keyword..."
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    disabled={importing || rocketLaunched}
                    className="w-full !bg-[#07090e]/80 focus:!border-blue-500/60 focus:!ring-blue-500/15 placeholder:text-gray-500 !h-12 pl-11 text-sm text-gray-100 rounded-xl"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                </div>
                <Button
                  type="submit"
                  disabled={importing || !importInput.trim() || rocketLaunched}
                  className="w-full sm:w-auto h-12 px-6 font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 rounded-xl border-0 group"
                >
                  {rocketLaunched ? (
                    <span className="animate-pulse font-black tracking-wide">🚀 LAUNCHING...</span>
                  ) : importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Fetch & Solve
                    </>
                  )}
                </Button>
              </div>

              {importing && (
                <div className="flex items-center justify-between text-xs text-blue-400 font-semibold px-1 pt-1.5 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin border-blue-400" />
                    {importStep}
                  </div>
                  <span className="text-gray-500">Creating Sandbox...</span>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* ────────── FEATURE CARDS ────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            to="/battle"
            icon={Swords}
            color="orange"
            title="1v1 Battle Arena"
            desc="Challenge rivals in real-time coding duels with synchronized editors, instant judging, and live scoreboards."
            borderHover="hover:border-orange-500/30"
            iconBg="bg-orange-500/10 border-orange-500/20"
            iconText="text-orange-400"
            chevronColor="text-orange-400"
            delay={0}
          >
            <BattleQueueWidget />
          </FeatureCard>

          <FeatureCard
            to="/problems"
            icon={Terminal}
            color="blue"
            title="Monaco Workspace"
            desc="Write, compile, and execute code in a premium distraction-free editor with intelligent autocomplete."
            borderHover="hover:border-blue-500/30"
            iconBg="bg-blue-500/10 border-blue-500/20"
            iconText="text-blue-400"
            chevronColor="text-blue-400"
            delay={200}
          >
            <WorkspaceStatsWidget count={totalProblems} loading={loadingStats} />
          </FeatureCard>

          <FeatureCard
            to="/leaderboard"
            icon={Trophy}
            color="emerald"
            title="Global Leaderboard"
            desc="Climb the competitive ladder, earn badges, and claim your rank among the world's best problem solvers."
            borderHover="hover:border-emerald-500/30"
            iconBg="bg-emerald-500/10 border-emerald-500/20"
            iconText="text-emerald-400"
            chevronColor="text-emerald-400"
            delay={400}
          >
            <LeaderboardPreviewWidget climbers={topClimbers} loading={loadingLeaderboard} />
          </FeatureCard>
        </section>

        {/* ────────── BATTLE SIMULATION PREVIEW ────────── */}
        <section className="max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <div className="text-center mb-6">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">See how battles work</span>
          </div>
          <BattleSimulation />
        </section>

        {/* ────────── BOTTOM CTA ────────── */}
        <section className="text-center space-y-5 pb-8 animate-slide-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
          <p className="text-gray-500 text-sm font-medium">Ready to level up your competitive coding?</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/battle">
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-6 h-11 shadow-lg shadow-orange-600/15 border-0 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 text-sm group">
                <Swords className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Start a Battle
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="outline" className="border-white/[0.08] hover:bg-white/[0.04] text-gray-300 hover:text-white font-bold px-6 h-11 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-emerald-400" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};
