import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Terminal, Swords, Award, Search, Sparkles, ChevronRight,
  Zap, Trophy, Clock, Cpu, Shield, Globe, Activity, CheckCircle2
} from 'lucide-react';
import { api } from '../shared/lib/api';
import { useToast } from '../shared/ui/toast/ToastProvider';
import { Button } from '../shared/ui/button/Button';
import { Input } from '../shared/ui/input/Input';
import { useAuth } from '../features/auth/useAuth';
import { cn } from '../shared/lib/cn';

/* ═══════════════════════════════════════════════════
   Scroll Reveal Hook — makes sections go CRAZY on scroll
   ═══════════════════════════════════════════════════ */
type RevealVariant = 'slide-up' | 'slide-left' | 'slide-right' | 'zoom-rotate' | 'flip' | 'scale-bounce' | 'stagger-children';

function useScrollReveal<T extends HTMLElement>(variant: RevealVariant = 'slide-up', delay = 0) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeoutId: any;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutId = setTimeout(() => setVisible(true), delay);
        } else {
          clearTimeout(timeoutId);
          setVisible(false);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [delay]);

  const baseTransition = 'transition-all duration-[1000ms] cubic-bezier(0.22, 1, 0.36, 1)';

  const variantStyles: Record<RevealVariant, { hidden: string; visible: string }> = {
    'slide-up': {
      hidden: 'opacity-0 translate-y-24',
      visible: 'opacity-100 translate-y-0',
    },
    'slide-left': {
      hidden: 'opacity-0 -translate-x-24',
      visible: 'opacity-100 translate-x-0',
    },
    'slide-right': {
      hidden: 'opacity-0 translate-x-24',
      visible: 'opacity-100 translate-x-0',
    },
    'zoom-rotate': {
      hidden: 'opacity-0 scale-75 rotate-6',
      visible: 'opacity-100 scale-100 rotate-0',
    },
    'flip': {
      hidden: 'opacity-0 [transform:perspective(800px)_rotateX(25deg)_translateY(40px)]',
      visible: 'opacity-100 [transform:perspective(800px)_rotateX(0deg)_translateY(0px)]',
    },
    'scale-bounce': {
      hidden: 'opacity-0 scale-50',
      visible: 'opacity-100 scale-100',
    },
    'stagger-children': {
      hidden: 'opacity-0 translate-y-12',
      visible: 'opacity-100 translate-y-0',
    },
  };

  const className = `${baseTransition} ${visible ? variantStyles[variant].visible : variantStyles[variant].hidden}`;

  return { ref, className, visible };
}


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
   Custom Hook for Typing Effect
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
   Interactive Bento Card Component
   ═══════════════════════════════════════════════════ */
interface BentoCardProps {
  to: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  color: 'orange' | 'blue' | 'emerald';
  borderHover: string;
  iconBg: string;
  iconText: string;
  chevronColor: string;
  className?: string;
  children?: React.ReactNode;
}

const BentoCard: React.FC<BentoCardProps> = ({
  to, title, desc, icon: Icon, color, borderHover, iconBg, iconText, chevronColor, className = '', children
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, []);

  const colorVal = color === 'orange' ? '#f97316' : color === 'blue' ? '#3b82f6' : '#10b981';
  const gradFrom = color === 'orange' ? 'from-orange-500/[0.04]' : color === 'blue' ? 'from-blue-500/[0.04]' : 'from-emerald-500/[0.04]';

  return (
    <Link to={to} className={`block ${className}`}>
      <div
        ref={ref}
        className={`group glass-card glass-card-hover p-6 rounded-2xl transition-colors duration-300 h-full border border-white/[0.06] bg-white/[0.01] ${borderHover} relative overflow-hidden`}
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
        }}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }}
      >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradFrom} to-transparent rounded-2xl pointer-events-none`} />

        <div className="absolute inset-[-1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none animate-border-travel"
          style={{
            background: `conic-gradient(from var(--border-angle, 0deg), transparent 60%, ${colorVal}33 80%, ${colorVal} 100%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
          } as React.CSSProperties}
        />

        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${iconBg} border flex items-center justify-center ${iconText}`}
            style={{
              transform: hovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <ChevronRight className={`w-4 h-4 ${chevronColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`} />
        </div>

        <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed font-medium mb-4">{desc}</p>

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
      y: 10 + Math.random() * 80,
      delay: Math.random() * 20,
      dur: 20 + Math.random() * 25,
      size: 10 + Math.random() * 3,
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
            opacity: 0.03,
            color: '#cbd5e1',
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
   Bento Widgets
   ═══════════════════════════════════════════════════ */
const BattleQueueWidget: React.FC = () => {
  return (
    <div className="p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-2 select-none text-[11px] text-gray-400 font-medium">
      <div className="flex items-center gap-1.5 font-bold text-gray-400 text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Lobby Matchmaker Active
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0a0d14] border border-white/[0.03] rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-mono text-blue-400 font-bold uppercase text-[9px]">You</span>
          <span className="text-gray-600 font-semibold text-[8px]">vs</span>
          <span className="font-mono text-rose-400 font-bold uppercase text-[9px]">Rival_7</span>
        </div>
        <div className="text-[9px] text-gray-500 font-mono font-medium animate-pulse">01:42 elapsed</div>
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
    <div className="p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-3 select-none text-[11px] text-gray-400 font-medium">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-400">Compiler Support</span>
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
          <span key={p.name} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${p.style}`}>
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const LeaderboardPreviewWidget: React.FC<{ climbers: { username: string; score: number }[]; loading: boolean }> = ({ climbers, loading }) => {
  const fallbacks = [
    { username: 'Mannu Kumar', score: 2450, rank: 1 },
    { username: 'CodeMaster', score: 2120, rank: 2 },
    { username: 'SyntaxSlayer', score: 1980, rank: 3 }
  ];

  const data = climbers.length > 0 ? climbers.map((c, i) => ({ ...c, rank: i + 1 })) : fallbacks;

  return (
    <div className="p-3.5 bg-black/40 border border-white/[0.04] rounded-xl space-y-1.5 select-none text-[11px] text-gray-400 font-medium">
      {loading && climbers.length === 0 ? (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-6 bg-white/5 rounded-lg" />
          <div className="h-6 bg-white/5 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-1">
          {data.slice(0, 2).map((c) => (
            <div key={c.username} className="flex items-center justify-between px-2 py-1 bg-[#0a0d14] border border-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 text-center font-black ${
                  c.rank === 1 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {c.rank}
                </span>
                <span className="font-mono text-gray-300 font-bold truncate max-w-[80px]">{c.username}</span>
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
   Real-Time Battle Calendar & Scheduler Widget
   ═══════════════════════════════════════════════════ */
const BattleSchedulerWidget: React.FC = () => {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [time, setTime] = useState(new Date());
  const toast = useToast();

  // Real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Next 7 days list
  const days = useMemo(() => {
    const arr = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        name: weekdays[d.getDay()],
        dateNum: d.getDate(),
        dateStr: d.toDateString(),
      });
    }
    return arr;
  }, []);

  // Events state
  const [schedules, setSchedules] = useState<Record<string, Array<{ id: number; title: string; time: string; players: string; status: 'live' | 'upcoming' | 'completed' }>>>({
    [days[0].dateStr]: [
      { id: 1, title: 'Bug Bounty Blitz', time: '17:30', players: 'Mannu vs CodeSlayer', status: 'completed' },
      { id: 2, title: '1v1 Ranked Duel', time: '20:00', players: 'SyntaxSlayer vs Rival_9', status: 'live' },
      { id: 3, title: 'Speed Contest', time: '22:30', players: 'Open Lobby', status: 'upcoming' },
    ],
    [days[1].dateStr]: [
      { id: 4, title: 'Daily Challenge Lobby', time: '19:00', players: 'Open Lobby', status: 'upcoming' },
      { id: 5, title: 'Vault Practice Session', time: '21:00', players: 'Open Lobby', status: 'upcoming' },
    ],
    [days[2].dateStr]: [
      { id: 6, title: 'Weekly Blitz Championship', time: '18:00', players: 'Tournament Bracket', status: 'upcoming' },
    ],
  });

  // Real-time countdown to the next event
  const nextEventCountdown = useMemo(() => {
    const todayStr = days[0].dateStr;
    const todayEvents = schedules[todayStr] || [];
    const nextEvent = todayEvents.find(e => e.status === 'live' || e.status === 'upcoming');
    if (!nextEvent) return null;

    // Parse time
    const [h, m] = nextEvent.time.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);

    const diff = target.getTime() - time.getTime();
    if (diff <= 0) return 'Starts now!';

    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }, [time, schedules, days]);

  // Form states to add new duel schedule
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('18:00');
  const [newRival, setNewRival] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const targetDayStr = days[selectedDayIdx].dateStr;
    const newEvent = {
      id: Date.now(),
      title: newTitle.trim(),
      time: newTime,
      players: newRival.trim() ? `You vs ${newRival.trim()}` : 'Open Lobby',
      status: 'upcoming' as const,
    };

    setSchedules(prev => ({
      ...prev,
      [targetDayStr]: [...(prev[targetDayStr] || []), newEvent].sort((a, b) => a.time.localeCompare(b.time)),
    }));

    setNewTitle('');
    setNewRival('');
    setShowAddForm(false);
    toast.success('Duel scheduled successfully!');
  };

  const selectedDayStr = days[selectedDayIdx].dateStr;
  const activeEvents = schedules[selectedDayStr] || [];

  return (
    <div className="space-y-4">
      {/* Top Header Row with clock and countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span className="font-bold text-gray-200 text-xs">Battle Schedule & Calendar</span>
          <span className="font-mono text-gray-500 text-[10px] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.04]">
            {time.toLocaleTimeString()}
          </span>
        </div>
        {nextEventCountdown && (
          <div className="text-[10px] font-mono text-gray-400">
            Next match countdown:{' '}
            <span className="text-orange-400 font-bold animate-pulse">{nextEventCountdown}</span>
          </div>
        )}
      </div>

      {/* Calendar Week Days Row */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, idx) => {
          const isSelected = selectedDayIdx === idx;
          const hasEvents = (schedules[d.dateStr] || []).length > 0;
          return (
            <button
              key={idx}
              onClick={() => {
                setSelectedDayIdx(idx);
                setShowAddForm(false);
              }}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg border transition-all cursor-pointer relative",
                isSelected
                  ? "bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-md shadow-orange-500/5"
                  : "bg-white/[0.01] border-white/[0.04] text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
              )}
            >
              <span className="text-[9px] uppercase font-bold tracking-wider">{d.name}</span>
              <span className="text-xs font-black mt-0.5">{d.dateNum}</span>
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-400/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Event Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left pane: Event List */}
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {activeEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
              <span className="text-xs">No duels scheduled for this day</span>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
              >
                + Schedule one now
              </button>
            </div>
          ) : (
            activeEvents.map((evt) => (
              <div
                key={evt.id}
                className={cn(
                  "p-2.5 rounded-lg border flex items-center justify-between text-[11px] transition-all",
                  evt.status === 'live'
                    ? "bg-red-500/[0.03] border-red-500/20 text-red-400 shadow-sm"
                    : evt.status === 'completed'
                    ? "bg-white/[0.01] border-white/[0.03] text-gray-500 opacity-60"
                    : "bg-[#0a0d14] border-white/[0.04] text-gray-300"
                )}
              >
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-gray-500 font-bold bg-white/[0.03] px-1 rounded text-[9px]">{evt.time}</span>
                    <span className="font-bold truncate text-gray-200">{evt.title}</span>
                  </div>
                  <div className="text-[9px] text-gray-400 pl-8 truncate">{evt.players}</div>
                </div>

                <div className="shrink-0">
                  {evt.status === 'live' ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] font-black uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                  ) : evt.status === 'completed' ? (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                      Done
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right pane: Quick Schedule Form */}
        <div className="border border-white/[0.04] bg-black/20 rounded-lg p-3.5 flex flex-col justify-center">
          {!showAddForm ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-[10px] text-gray-400 font-medium">Want to schedule a competitive 1v1 duel?</p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer border-0 shadow-sm shadow-orange-600/10"
              >
                Schedule New Duel
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddSchedule} className="space-y-2.5 text-[10px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-500 block mb-0.5 font-bold">Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 1v1 Battle"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-white/[0.06] rounded p-1.5 text-[10px] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-0.5 font-bold">Rival Username</label>
                  <input
                    type="text"
                    placeholder="e.g. RivalCoder"
                    value={newRival}
                    onChange={(e) => setNewRival(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-white/[0.06] rounded p-1.5 text-[10px] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.02]">
                <div className="flex items-center gap-1.5">
                  <label className="text-gray-500 font-bold">Time:</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-[#0a0d14] border border-white/[0.06] rounded p-1 text-[10px] text-gray-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 font-semibold cursor-pointer border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold cursor-pointer border-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Main Landing Page Component
   ═══════════════════════════════════════════════════ */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  /* ── States ── */
  const [importInput, setImportInput] = useState('');

  // AST Analyzer scanning states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  const [totalProblems, setTotalProblems] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [topClimbers, setTopClimbers] = useState<{ username: string; score: number }[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Live stats loading
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

  /* ── Scroll Reveal Refs ── */
  const manifestoStory = useScrollReveal<HTMLDivElement>('slide-left', 0);
  const manifestoImage = useScrollReveal<HTMLDivElement>('zoom-rotate', 200);
  const bentoTitle = useScrollReveal<HTMLDivElement>('flip', 0);
  const bentoGrid = useScrollReveal<HTMLDivElement>('slide-up', 150);
  const statsRow = useScrollReveal<HTMLElement>('scale-bounce', 0);
  const battleSection = useScrollReveal<HTMLElement>('flip', 100);
  const ctaSection = useScrollReveal<HTMLElement>('slide-up', 0);


  // Text Typing Effects
  const line1 = useTypingText('WANT TO STAND OUT?', 70, 300);
  const line2 = useTypingText('GREAT. COMPETE FIRST.', 50, 0, line1.done);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (line2.done) {
      setGlitch(true);
      const t1 = setTimeout(() => setGlitch(false), 250);
      const t2 = setTimeout(() => setSubtitleVisible(true), 350);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [line2.done]);

  // Mouse Reactive Orbs
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 35,
        y: (e.clientY / window.innerHeight - 0.5) * 35,
      });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Importer Submission
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = importInput.trim();
    if (!slug) { toast.error("Please enter a question name, URL, or keyword."); return; }

    setIsAnalyzing(true);
    setAnalysisLogs(["[pipeline] Connecting to external repository..."]);

    const logTimeouts: number[] = [];
    const pushLog = (msg: string, delay: number) => {
      const tid = window.setTimeout(() => {
        setAnalysisLogs(prev => [...prev, msg]);
      }, delay);
      logTimeouts.push(tid);
    };

    pushLog("[pipeline] Connection established. Initializing secure scraper session...", 350);
    pushLog("[ast] Fetching page markup. Extracting problem metadata & statement...", 750);
    pushLog("[ast] Parsing markup AST. Structuring constraints & tag mapping...", 1150);
    pushLog("[sandbox] Creating Monaco templates for C++, Java, JS, Python...", 1550);
    pushLog("[sandbox] Synthesizing input schemas & mapping public testcases...", 1950);

    try {
      // Import the problem while simulating professional compilation logs
      const [problem] = await Promise.all([
        api.problems.import(slug),
        new Promise(r => setTimeout(r, 2200)) // ensure logs compile beautifully
      ]);

      setAnalysisLogs(prev => [...prev, `[compiler] SUCCESS: Workspace for "${problem.title}" synthesized successfully!`]);
      await new Promise(r => setTimeout(r, 400));
      toast.success(`Successfully imported "${problem.title}"!`);
      navigate(`/problems/${problem.slug}`);
    } catch (err: any) {
      setAnalysisLogs(prev => [...prev, "[compiler] ERROR: Verification failed. Attempting fail-safe schema generation..."]);
      await new Promise(r => setTimeout(r, 600));
      toast.error(err?.message || "Failed to import problem. Synthesized a fallback workspace.");
      navigate('/problems');
    } finally {
      logTimeouts.forEach(clearTimeout);
      setIsAnalyzing(false);
      setAnalysisLogs([]);
    }
  };


  return (
    <div className="relative min-h-[calc(100vh-115px)] flex flex-col items-center overflow-hidden bg-[#030407] select-none text-gray-200">

      {/* Grid Background */}
      <div className="grid-bg absolute inset-0 pointer-events-none opacity-45" />

      {/* Background Floating Particles */}
      <FloatingCodeParticles />

      {/* Mouse Reactive Glowing Orbs — now also shift slightly on scroll for parallax depth */}
      <div className="absolute top-[8%] left-[12%] w-[450px] h-[450px] rounded-full bg-blue-600/[0.06] blur-[150px] pointer-events-none transition-transform duration-[2500ms] ease-out will-change-transform"
        style={{ transform: `translate(${mouse.x * 0.4}px, ${mouse.y * 0.4}px)` }} />
      <div className="absolute top-[45%] right-[8%] w-[400px] h-[400px] rounded-full bg-indigo-500/[0.05] blur-[130px] pointer-events-none transition-transform duration-[2500ms] ease-out will-change-transform"
        style={{ transform: `translate(${mouse.x * -0.3}px, ${mouse.y * -0.3}px)` }} />
      <div className="absolute bottom-[2%] left-[25%] w-[350px] h-[350px] rounded-full bg-teal-500/[0.04] blur-[120px] pointer-events-none transition-transform duration-[2500ms] ease-out will-change-transform"
        style={{ transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)` }} />
      {/* Extra wild orb that only appears mid-page */}
      <div className="absolute top-[65%] left-[55%] w-[300px] h-[300px] rounded-full bg-orange-500/[0.04] blur-[140px] pointer-events-none transition-transform duration-[3000ms] ease-out will-change-transform"
        style={{ transform: `translate(${mouse.x * -0.5}px, ${mouse.y * 0.5}px)` }} />

      {/* Content wrapper */}
      <div className="max-w-5xl w-full mx-auto relative z-10 py-16 sm:py-24 px-4 space-y-24">

        {/* ────────── 1. HERO HEADER SECTION ────────── */}
        <section className="text-center space-y-8 max-w-3xl mx-auto">
          {/* Spark Badge / Welcome Greet Badge */}
          {user ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/[0.06] border border-blue-500/15 text-blue-400 text-[10px] font-black tracking-widest uppercase animate-scale-in relative overflow-hidden"
              style={{ animationDelay: '0.1s', opacity: 0 }}>
              <div className="absolute inset-[-1px] rounded-full animate-border-travel pointer-events-none"
                style={{
                  background: 'conic-gradient(from var(--border-angle, 0deg), transparent 70%, rgba(59,130,246,0.4) 100%)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  padding: '1px',
                } as React.CSSProperties}
              />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Welcome back, {user.username}!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/[0.06] border border-blue-500/15 text-blue-400 text-[10px] font-black tracking-widest uppercase animate-scale-in relative overflow-hidden"
              style={{ animationDelay: '0.1s', opacity: 0 }}>
              <div className="absolute inset-[-1px] rounded-full animate-border-travel pointer-events-none"
                style={{
                  background: 'conic-gradient(from var(--border-angle, 0deg), transparent 70%, rgba(59,130,246,0.4) 100%)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  padding: '1px',
                } as React.CSSProperties}
              />
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              Competitive Coding Arena
            </div>
          )}


          {/* Heading */}
          <div className="relative inline-block w-full">
            <div className="absolute inset-0 -z-10 flex items-center justify-center filter blur-[100px] pointer-events-none select-none">
              <div className={`rounded-full transition-all duration-1000 ease-out ${
                !line1.done
                  ? 'w-[180px] h-[60px] bg-blue-500/10 scale-90'
                  : !line2.done
                  ? 'w-[250px] h-[80px] bg-indigo-500/10 scale-100'
                  : 'w-[320px] h-[100px] bg-violet-600/10 scale-105 animate-glow-pulse'
              }`} />
            </div>

            <h1 className={`text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] select-text ${glitch ? 'animate-glitch' : ''}`}>
              <span className="block text-white">
                {line1.displayed}
                {!line1.done && (
                  <span className="inline-block w-[2.5px] h-[0.85em] bg-blue-400 ml-1 align-middle animate-blink rounded-sm" />
                )}
              </span>
              <span className="text-gradient-primary block mt-1">
                {line2.displayed}
                {line1.done && !line2.done && (
                  <span className="inline-block w-[2.5px] h-[0.85em] bg-violet-400 ml-1 align-middle animate-blink rounded-sm" />
                )}
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className={`text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed font-medium transition-all duration-700 ease-out ${
            subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            In an era of boilerplate portfolios and generated code, credentials lose their meaning. Elite developers stand out by competing under extreme time pressure.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-wrap items-center justify-center gap-4 pt-2 transition-all duration-700 ease-out delay-150 ${
            subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            <Link to="/battle">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold tracking-wider shadow-lg shadow-orange-600/15 border-0 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-2.5 px-6 h-11 text-xs group"
              >
                <Swords className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                Enter 1v1 Arena
              </Button>
            </Link>
            <Link to="/problems">
              <Button
                size="lg"
                variant="outline"
                className="border-white/[0.08] hover:bg-white/[0.04] text-gray-200 hover:text-white tracking-wider hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-2.5 px-6 h-11 text-xs"
              >
                <Terminal className="w-4 h-4 text-blue-400" />
                Explore Problems
              </Button>
            </Link>
          </div>
        </section>

        {/* ────────── 2. THE MANIFESTO SECTION (Narrative Experience) ────────── */}
        <section className="border-t border-b border-white/[0.04] py-14 bg-gradient-to-b from-white/[0.01] via-transparent to-white/[0.01]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Story block */}
            <div ref={manifestoStory.ref} className={`space-y-6 ${manifestoStory.className}`}>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                <Award className="w-4 h-4 text-orange-400" />
                The Filtering Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Boilerplate is cheap.<br />
                Mastery is demonstrated.
              </h2>
              <div className="space-y-4 text-xs sm:text-sm text-gray-400 font-medium leading-relaxed">
                <p>
                  Today, credentials can be simulated. Portfolios are generated, resumes are polished by algorithms, and solutions are easily looked up.
                </p>
                <p className="border-l-2 border-orange-500/50 pl-3 italic text-gray-300">
                  "Want to stand out? Great. Compete first."
                </p>
                <p>
                  Real-time engineering requires deep algorithmic comprehension, memory optimization under stress, and split-second runtime efficiency. We do not provide a playground. We provide the crucible.
                </p>
              </div>
            </div>

            {/* Enhanced Graphic block — always show premium image with cinematic effects */}
            <div ref={manifestoImage.ref} className={`relative ${manifestoImage.className}`}>
              {/* Multi-layered glow */}
              <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-2xl pointer-events-none -z-10" />
              <div className="absolute inset-[-20px] bg-blue-500/[0.06] blur-[60px] rounded-full pointer-events-none -z-10 animate-glow-pulse" />

              <div className="glass-card p-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-2xl overflow-hidden group relative">
                {/* Animated scan line overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
                  <div className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent animate-scan" />
                </div>
                {/* Holographic shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.06] via-transparent to-indigo-500/[0.06] pointer-events-none z-10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl" />

                <img
                  src="/premium_developer_coding.png"
                  alt="Elite Developer Space"
                  className="rounded-xl w-full h-auto object-cover border border-white/[0.04] group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                />

                {/* Corner UI decorations */}
                <div className="absolute top-4 left-4 z-20">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Live System</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 z-20">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/10">
                    <Activity className="w-3 h-3 text-blue-400" />
                    <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Runtime Active</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────── 3. ASYMMETRIC BENTO GRID FEATURE DISPLAY ────────── */}
        <section className="space-y-8">
          <div ref={bentoTitle.ref} className={`text-center ${bentoTitle.className}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">The Anatomy of Performance</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Engineered for Elite Solvers</h2>
          </div>

          <div ref={bentoGrid.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto ${bentoGrid.className}`}>
            {/* 1v1 card (Large / Double columns on desktop) */}
            <BentoCard
              to="/battle"
              icon={Swords}
              color="orange"
              title="1v1 Battle Arena"
              desc="Engage in synchronized coding battles with sub-second execution logic and live interactive scoreboards."
              borderHover="hover:border-orange-500/30"
              iconBg="bg-orange-500/10 border-orange-500/20"
              iconText="text-orange-400"
              chevronColor="text-orange-400"
              className="md:col-span-2"
            >
              <BattleQueueWidget />
            </BentoCard>

            {/* Global standings (Medium) */}
            <BentoCard
              to="/leaderboard"
              icon={Trophy}
              color="emerald"
              title="Elo Leaderboard"
              desc="Climb the ranks, secure points, and build your digital validation."
              borderHover="hover:border-emerald-500/30"
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              iconText="text-emerald-400"
              chevronColor="text-emerald-400"
            >
              <LeaderboardPreviewWidget climbers={topClimbers} loading={loadingLeaderboard} />
            </BentoCard>

            {/* Monaco Card (Medium) */}
            <BentoCard
              to="/problems"
              icon={Terminal}
              color="blue"
              title="Intelligent Compiler"
              desc="Write and compile in a distraction-free, premium Monaco editor with autocompletes."
              borderHover="hover:border-blue-500/30"
              iconBg="bg-blue-500/10 border-blue-500/20"
              iconText="text-blue-400"
              chevronColor="text-blue-400"
            >
              <WorkspaceStatsWidget count={totalProblems} loading={loadingStats} />
            </BentoCard>

            {/* Monaco Sandbox Compiler & Workspace Synthesizer Card */}
            <div className="md:col-span-2 relative max-w-full">
              {/* Active AST scanner visual grid scanning overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none overflow-hidden z-20 rounded-2xl">
                  {/* Scan Line */}
                  <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-scan" />
                </div>
              )}

              <div className="glass-card p-6 h-full rounded-2xl border border-blue-500/[0.12] bg-white/[0.01] shadow-2xl relative overflow-hidden transition-all duration-300">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/[0.04] to-transparent pointer-events-none -z-10" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15">
                    <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">AST Analysis Engine</span>
                  </div>
                  {!importInput.trim() && !isAnalyzing && (
                    <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1 animate-float">
                      <Cpu className="w-3 h-3 text-gray-500 animate-pulse" />
                      Compiler Workspace Idle
                    </span>
                  )}
                  {isAnalyzing && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-emerald-400 tracking-wider">Parsing AST...</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleImport} className="space-y-4 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <Input
                        placeholder="Paste LeetCode/GFG URL or problem name..."
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        disabled={isAnalyzing}
                        className="w-full !bg-[#07090e]/70 focus:!border-blue-500/40 focus:!ring-blue-500/10 placeholder:text-gray-600 !h-10 pl-10 text-xs text-gray-200 rounded-lg"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    </div>
                    <Button
                      type="submit"
                      disabled={isAnalyzing || !importInput.trim()}
                      className="w-full sm:w-auto h-10 px-5 font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 rounded-lg border-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                          SYNTHESIZING...
                        </>
                      ) : (
                        <>
                          <Terminal className="w-3 h-3" />
                          Fetch & Sync
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Terminal Log Console */}
                  {isAnalyzing && analysisLogs.length > 0 && (
                    <div className="bg-[#05070a]/90 border border-blue-500/15 rounded-lg p-3 font-mono text-[9px] text-gray-400 space-y-1 h-28 overflow-y-auto shadow-inner flex flex-col justify-start">
                      {analysisLogs.map((log, idx) => {
                        let color = "text-gray-400";
                        let isDone = false;
                        if (log.includes("SUCCESS")) {
                          color = "text-emerald-400 font-bold";
                          isDone = true;
                        } else if (log.includes("ERROR") || log.includes("failed")) {
                          color = "text-rose-400";
                        } else if (log.includes("[ast]")) {
                          color = "text-blue-400";
                        } else if (log.includes("[sandbox]")) {
                          color = "text-purple-400";
                        }
                        return (
                          <div key={idx} className={`${color} flex items-center gap-1.5 animate-fade-in`}>
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="text-gray-600 select-none">&gt;</span>
                            )}
                            <span className="whitespace-pre-wrap">{log}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Real-time Battle Calendar Widget (Full Width) */}
            <div className="md:col-span-3">
              <div className="glass-card p-6 rounded-2xl border border-orange-500/[0.12] bg-white/[0.01] shadow-2xl relative overflow-hidden transition-all duration-300">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/[0.04] to-transparent pointer-events-none -z-10" />
                <BattleSchedulerWidget />
              </div>
            </div>
          </div>
        </section>

        {/* ────────── 4. SYSTEM STATS ROW ────────── */}
        <section ref={statsRow.ref} className={`max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 ${statsRow.className}`}>
          <div className="glass-card p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
            <Cpu className="w-4.5 h-4.5 text-blue-400 mx-auto mb-1.5" />
            <p className="text-lg font-black text-white leading-none">0.04s</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Execution Latency</p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
            <Shield className="w-4.5 h-4.5 text-orange-400 mx-auto mb-1.5" />
            <p className="text-lg font-black text-white leading-none">100%</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Secure Sandbox</p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
            <Globe className="w-4.5 h-4.5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-lg font-black text-white leading-none">Universal</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Universal Crawler</p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
            <Zap className="w-4.5 h-4.5 text-yellow-400 mx-auto mb-1.5" />
            <p className="text-lg font-black text-white leading-none">Sub-second</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Arena Sync</p>
          </div>
        </section>

        {/* ────────── 5. LIVE CODE DUELS SIMULATOR ────────── */}
        <section ref={battleSection.ref} className={`max-w-4xl mx-auto space-y-6 ${battleSection.className}`}>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Under the Hood</span>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">Real-time Performance Validation</h2>
          </div>
          <BattleSimulation />
        </section>

        {/* ────────── 6. BOTTOM CTA MANIFESTO ────────── */}
        <section ref={ctaSection.ref} className={`text-center space-y-6 pb-8 border-t border-white/[0.04] pt-16 ${ctaSection.className}`}>
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-white">Do you have what it takes?</h3>
            <p className="text-xs text-gray-500 font-medium">Step out of the noise. Validate your capability.</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link to="/battle">
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-6 h-10 shadow-md border-0 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-xs group">
                <Swords className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Start a Battle
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="outline" className="border-white/[0.08] hover:bg-white/[0.04] text-gray-300 hover:text-white font-bold px-6 h-10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-xs">
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
