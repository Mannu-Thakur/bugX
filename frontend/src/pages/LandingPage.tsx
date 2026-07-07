import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../shared/lib/api';
import type { LeaderboardEntry } from '../shared/lib/api';
import {
  ArrowRight,
  Code2,
  Terminal,
  Swords,
  Trophy,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  Timer,
  CheckCircle2,
  Bookmark,
  Bot,
  Cpu
} from 'lucide-react';
import { Button } from '../shared/ui/button/Button';
import { BugXLogo } from '../shared/ui/logo/BugXLogo';
import { cn } from '../shared/lib/cn';
import { DailyChallengeCard } from '../features/daily/DailyChallengeCard';
import { FEATURES } from '../shared/config/features';
import { useUserStats } from '../features/profile/hooks';

/* ─── Typewriter & Stats Animate Counters ─── */
const useCountUp = (end: number, duration: number = 1000, trigger: boolean = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, trigger]);
  return count;
};

/* ─── Scroll Reveal Wrapper ─── */
const ScrollReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'left' | 'right' | 'up';
}> = ({ children, className, delay = 0, direction = 'up' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getDirectionClass = () => {
    if (revealed) return 'translate-x-0 translate-y-0 opacity-100';
    switch (direction) {
      case 'left': return '-translate-x-12 opacity-0';
      case 'right': return 'translate-x-12 opacity-0';
      case 'up': default: return 'translate-y-12 opacity-0';
    }
  };

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform-opacity',
        getDirectionClass(),
        className
      )}
    >
      {children}
    </div>
  );
};

/* ─── Shimmer / Skeleton Loaders ─── */
const TopicSkeleton = () => (
  <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] animate-pulse flex flex-col justify-between h-40">
    <div>
      <div className="w-8 h-8 rounded bg-white/[0.03] mb-4" />
      <div className="h-4 bg-white/[0.03] rounded w-2/3 mb-2" />
      <div className="h-2.5 bg-white/[0.02] rounded w-1/2" />
    </div>
    <div className="h-3 bg-white/[0.02] rounded w-1/3 mt-4" />
  </div>
);

const CompanySkeleton = () => (
  <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] animate-pulse flex flex-col justify-between h-36">
    <div className="space-y-4">
      <div className="h-4 bg-white/[0.03] rounded w-1/2" />
      <div className="space-y-1.5">
        <div className="h-2 bg-white/[0.02] rounded w-2/3" />
        <div className="h-2 bg-white/[0.02] rounded w-3/4" />
      </div>
    </div>
    <div className="h-3 bg-white/[0.02] rounded w-1/3 mt-4" />
  </div>
);

/* ─── Topic Icon Matcher Helper ─── */
const getTopicIcon = (slug: string) => {
  const s = slug.toLowerCase();
  if (s.includes('array') || s.includes('list')) return <Layers className="w-3.5 h-3.5 text-blue-400" />;
  if (s.includes('graph')) return <GitBranch className="w-3.5 h-3.5 text-purple-400" />;
  if (s.includes('tree')) return <Activity className="w-3.5 h-3.5 text-emerald-400" />;
  if (s.includes('dynamic') || s.includes('dp')) return <Sparkles className="w-3.5 h-3.5 text-rose-400" />;
  if (s.includes('search') || s.includes('find')) return <Terminal className="w-3.5 h-3.5 text-amber-400" />;
  if (s.includes('greedy')) return <Swords className="w-3.5 h-3.5 text-cyan-400" />;
  if (s.includes('stack')) return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
  if (s.includes('queue')) return <Timer className="w-3.5 h-3.5 text-teal-400" />;
  if (s.includes('heap')) return <Trophy className="w-3.5 h-3.5 text-yellow-400" />;
  if (s.includes('trie')) return <Code2 className="w-3.5 h-3.5 text-pink-400" />;
  if (s.includes('window')) return <Activity className="w-3.5 h-3.5 text-orange-400" />;
  if (s.includes('string')) return <Code2 className="w-3.5 h-3.5 text-pink-400" />;
  if (s.includes('math')) return <Activity className="w-3.5 h-3.5 text-teal-400" />;
  return <Code2 className="w-3.5 h-3.5 text-[#4F7DFF]" />;
};

/* ─── Real Leaderboard Loader ─── */
const LeaderboardPreview: React.FC = () => {
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'all'],
    queryFn: async () => {
      try {
        return await api.leaderboard.get('all');
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    retry: 0,
  });

  const topFive = entries.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.04] bg-[#090d14]/40 backdrop-blur-md select-none hover:border-white/[0.08] transition-colors duration-300">
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
          Rankings
        </p>
        <Link to="/leaderboard" className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-white transition-colors duration-150 group">
          View full board
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-150 text-[#4F7DFF]" />
        </Link>
      </div>

      {isLoading ? (
        <div className="divide-y divide-white/[0.03] animate-pulse">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-3.5">
              <div className="h-3 w-4 bg-white/[0.03] rounded" />
              <div className="h-3 w-28 bg-white/[0.03] rounded" />
              <div className="h-3 w-12 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      ) : topFive.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-gray-600 animate-fade-in">
          <Trophy className="h-5 w-5 mb-2 text-gray-700 animate-pulse" />
          <span>No active contenders yet</span>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] animate-fade-in">
          {topFive.map((player) => (
            <div key={player.username} className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-white/[0.015] hover:pl-6 transition-all duration-200 group">
              <span className="font-mono text-xs text-gray-600 group-hover:text-[#4F7DFF] transition-colors">
                #{player.rank}
              </span>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                {player.username}
              </span>
              <span className="font-mono text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                {player.score.toLocaleString()} ELO
              </span>
              <span className="font-mono text-[10px] font-bold text-[#B9C8FF] bg-[#4F7DFF]/10 px-2 py-0.5 rounded-md group-hover:bg-[#4F7DFF]/15 transition-colors">
                {player.solved} solved
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── AI Judge Live Typing Mock Showcase ─── */
const AIMatchReportShowcase: React.FC = () => {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!isTyping) return;

    const lines = [
      "⚡ AI Match Verdict: Analysis complete.",
      "",
      "🏆 WINNER ANALYSIS (priya_jha):",
      "• Code complexity: O(N) time, O(1) space.",
      "• Approach: Optimized dual-pointer in-place.",
      "💡 Tip: Excellent boundary case handling.",
      "",
      "❌ RUNNER UP ANALYSIS (mkt2016):",
      "• Status: Empty submission or compile failure.",
      "💡 Advice: Focus on parsing base inputs first."
    ];

    let currentLine = 0;
    let currentChar = 0;
    let output = '';

    const typingInterval = setInterval(() => {
      if (currentLine < lines.length) {
        const line = lines[currentLine];
        if (currentChar < line.length) {
          output += line[currentChar];
          setText(output + '█');
          currentChar++;
        } else {
          output += '\n';
          currentLine++;
          currentChar = 0;
        }
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        // Wait 5 seconds, then restart typing loop
        setTimeout(() => {
          setText('');
          setIsTyping(true);
        }, 5000);
      }
    }, 20);

    return () => clearInterval(typingInterval);
  }, [isTyping]);

  return (
    <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c0f16]/95 overflow-hidden shadow-2xl transition-all duration-500 hover:border-[#7A5FFF]/40 hover:shadow-[#7A5FFF]/[0.03] flex flex-col sm:flex-row h-[320px]">
      {/* Sidebar: Light-dark */}
      <div className="w-full sm:w-[150px] bg-[#161a26] border-b sm:border-b-0 sm:border-r border-white/[0.05] p-4 flex flex-col justify-between shrink-0 font-sans select-none">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">AI Judge</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="block text-[8px] uppercase text-gray-500 font-bold">STATUS</span>
              <span className="text-[10px] font-black text-emerald-450 font-mono">Realtime</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase text-gray-500 font-bold">MODEL</span>
              <span className="text-[10px] font-black text-gray-300 font-mono">Gemini 2.5</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:block pt-3 border-t border-white/[0.05]">
          <span className="text-[8px] text-gray-500 font-mono leading-tight block">Analyzing code complexity & logic flow</span>
        </div>
      </div>

      {/* Main Terminal panel: Deep dark */}
      <div className="flex-1 p-4 bg-[#07090e] flex flex-col overflow-hidden relative">
        {/* Glow ambient background inside terminal */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,95,255,0.06),transparent_60%)] pointer-events-none" />
        <div className="flex justify-between items-center text-[8px] text-gray-600 font-mono border-b border-white/[0.04] pb-2 mb-3 select-none">
          <span>JUDGMENT_STREAM // ACTIVE</span>
          <span>12.5 KB/S</span>
        </div>
        <pre className="flex-grow font-mono text-[10px] leading-relaxed text-[#a5f3fc] overflow-y-auto whitespace-pre-wrap select-text pr-1 custom-scrollbar min-h-0">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  );
};

/* ─── Main Landing Page Redesign ─── */
export const LandingPage: React.FC = () => {
  // Cursor position trackers for ambient lighting & parallax effects
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringPage, setIsHoveringPage] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'cases'>('editor');

  // React Query Hooks for Dynamic Data
  const { data: companies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: api.companies.list,
    staleTime: 60000,
  });

  const { data: topics = [], isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics', 'list'],
    queryFn: api.topics.list,
    staleTime: 60000,
  });

  const { data: overviewStats, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: api.stats.overview,
    staleTime: 30000,
  });

  const { data: userStats } = useUserStats();

  // Trigger counters when scrolled to progress section
  const [progressInView, setProgressInView] = useState(false);

  const solvedTarget = userStats?.total_solved ?? overviewStats?.solvedCount ?? 0;
  const ratingTarget = userStats?.total_score ?? 0;
  const streakTarget = userStats?.current_streak ?? 0;

  const solvedCount = useCountUp(solvedTarget, 1200, progressInView && !isOverviewLoading);
  const ratingCount = useCountUp(ratingTarget, 1500, progressInView && !isOverviewLoading);
  const streakCount = useCountUp(streakTarget, 1000, progressInView && !isOverviewLoading);

  // Intersection observer for counters
  const statsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setProgressInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync global mouse moves
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setIsHoveringPage(true);
    };
    const handleMouseLeave = () => setIsHoveringPage(false);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);


  // Compute Parallax variables for hero cards (Reacts slightly to cursor movement)
  const parallaxX = isHoveringPage ? (mousePos.x - window.innerWidth / 2) * 0.012 : 0;
  const parallaxY = isHoveringPage ? (mousePos.y - window.innerHeight / 2) * 0.012 : 0;

  // Capabilities sequential fade-in states
  const [trustStep, setTrustStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTrustStep(prev => (prev < 4 ? prev + 1 : 4));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D12] text-gray-200 antialiased selection:bg-[#4F7DFF]/30 selection:text-white overflow-x-hidden relative">
      {/* CSS Animations style tag */}
      <style>{`
        @keyframes subtle-ambient-drift {
          0% { transform: translate3d(-50%, -10px, 0) scale(1); }
          50% { transform: translate3d(-48%, 10px, 0) scale(1.05); }
          100% { transform: translate3d(-50%, -10px, 0) scale(1); }
        }
        .animate-ambient-drift {
          animation: subtle-ambient-drift 24s ease-in-out infinite;
        }
        @keyframes showcase-float-1 {
          0%, 100% { transform: translate3d(0, -6px, 0); }
          50% { transform: translate3d(0, 6px, 0); }
        }
        @keyframes showcase-float-2 {
          0%, 100% { transform: translate3d(0, 5px, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        @keyframes showcase-float-3 {
          0%, 100% { transform: translate3d(0, -4px, 0); }
          50% { transform: translate3d(0, 4px, 0); }
        }
        .animate-showcase-float-1 { animation: showcase-float-1 8s ease-in-out infinite; }
        .animate-showcase-float-2 { animation: showcase-float-2 10s ease-in-out infinite; }
        .animate-showcase-float-3 { animation: showcase-float-3 12s ease-in-out infinite; }
        .will-change-transform-opacity {
          will-change: transform, opacity;
        }
      `}</style>

      {/* Tiny grain noise pattern overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.015] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Ambient background lighting drift */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-[radial-gradient(circle_at_50%_0%,rgba(79,125,255,0.06),transparent_60%)] pointer-events-none animate-ambient-drift" />

      {/* Cursor dynamic glow effect */}
      {isHoveringPage && (
        <div
          className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 select-none"
          style={{
            opacity: 0.06,
            background: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, #4F7DFF, transparent 100%)`
          }}
        />
      )}

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-32 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
            
            {/* Left Side: Copywriting */}
            <div className="space-y-6 animate-slide-up">
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 border border-white/[0.06] bg-white/[0.01] px-3.5 py-1.5 rounded-full text-[10px] font-bold text-gray-400 tracking-wider uppercase select-none hover:border-white/10 transition-colors duration-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4F7DFF] animate-pulse" />
                Practice & Ranked Coding Platform
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
                The arena for serious problem solving.
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl">
                Practice coding, join contests, and track your progress. Build skill through structured problems and real competition on a platform designed for serious builders.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/battle" className="shrink-0">
                  <Button variant="primary" className="h-11 rounded-lg px-6 text-xs font-semibold bg-[#4F7DFF] hover:bg-[#5f8aff] text-white shadow-[0_4px_16px_rgba(79,125,255,0.1)] hover:shadow-[0_4px_24px_rgba(79,125,255,0.2)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer group">
                    <span>Enter Arena</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
                <Link to="/problems" className="shrink-0">
                  <Button variant="outline" className="h-11 rounded-lg px-6 text-xs font-semibold border-white/[0.08] hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] text-gray-300 hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
                    <Terminal className="w-3.5 h-3.5 text-gray-500" />
                    <span>View Problems</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Row */}
              <div className="pt-6 border-t border-white/[0.03] max-w-xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                  {[
                    'Solve coding problems',
                    'Join ranked contests',
                    'Practice by topic',
                    'Company tagged questions',
                    'Track your progress'
                  ].map((cap, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center text-[11px] text-gray-500 font-semibold transition-all duration-500",
                        trustStep >= i ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 mr-2 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Product Showcase (Live Interactive Visualization) */}
            <div
              className="relative w-full h-[400px] lg:h-[480px] select-none flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: `translate3d(${parallaxX}px, ${parallaxY}px, 0)`,
                willChange: 'transform'
              }}
            >
              {/* Card 1: Center - Problem Detail Card */}
              <div className="absolute z-10 w-[280px] sm:w-[320px] rounded-xl border border-white/[0.08] bg-[#0E1118]/90 p-5 shadow-2xl animate-showcase-float-1">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">PROBLEM #104</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>
                </div>
                <h3 className="text-sm font-bold text-gray-100 mb-1">Reverse Linked List II</h3>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-4 font-mono">
                  <span>68.2% Accept</span>
                  <span>·</span>
                  <span>142 Solves</span>
                </div>

                {/* mini tabs */}
                <div className="flex border-b border-white/[0.04] mb-3">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={cn(
                      "text-[10px] pb-1.5 font-bold mr-4 border-b transition-colors cursor-pointer",
                      activeTab === 'editor' ? "border-[#4F7DFF] text-white" : "border-transparent text-gray-500"
                    )}
                  >
                    solution.js
                  </button>
                  <button
                    onClick={() => setActiveTab('cases')}
                    className={cn(
                      "text-[10px] pb-1.5 font-bold border-b transition-colors cursor-pointer",
                      activeTab === 'cases' ? "border-[#4F7DFF] text-white" : "border-transparent text-gray-500"
                    )}
                  >
                    Test Cases
                  </button>
                </div>

                {activeTab === 'editor' ? (
                  <pre className="text-[10px] font-mono text-gray-400 leading-relaxed bg-[#06080c]/50 p-2.5 rounded border border-white/[0.03] overflow-hidden">
                    <code>{`function reverse(head, l, r) {
  let dummy = new Node(0);
  dummy.next = head;
  let pre = dummy;
  // ...
  return dummy.next;
}`}</code>
                  </pre>
                ) : (
                  <div className="text-[10px] space-y-1.5 bg-[#06080c]/50 p-2.5 rounded border border-white/[0.03]">
                    <div className="flex justify-between"><span className="text-gray-500">Input:</span><span className="font-mono text-gray-400">head = [1,2,3,4,5]</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Expected:</span><span className="font-mono text-emerald-400">[1,4,3,2,5]</span></div>
                  </div>
                )}
              </div>

              {/* Card 2: Floating - Leaderboard Snippet */}
              <div className="absolute top-2 -left-2 sm:left-4 z-20 w-[170px] rounded-lg border border-white/[0.06] bg-[#0E1118]/85 p-3.5 shadow-xl animate-showcase-float-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">LEADERBOARD</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white font-mono">#24</span>
                  <span className="text-[9px] text-gray-500">Global Rank</span>
                </div>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/[0.04]">
                  <span className="text-[9px] text-gray-400 font-mono">1,824 ELO</span>
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded font-mono">+35 Today</span>
                </div>
              </div>

              {/* Card 3: Floating - Arena Status */}
              <div className="absolute -top-8 right-0 sm:right-6 z-20 w-[180px] rounded-lg border border-white/[0.06] bg-[#0E1118]/85 p-3.5 shadow-xl animate-showcase-float-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-bold text-[#d97706] uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#d97706] animate-pulse" />
                    1v1 ARENA
                  </span>
                  <Swords className="w-3.5 h-3.5 text-[#d97706]" />
                </div>
                <p className="text-[11px] font-semibold text-gray-300 leading-tight">Ranked Match</p>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-gray-400 font-mono">5 min</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-[10px] text-amber-400 font-bold font-mono">ELO Ranked</span>
                </div>
              </div>

              {/* Card 4: Floating - Topic Tags */}
              <div className="absolute bottom-6 right-2 sm:right-10 z-20 w-[160px] rounded-lg border border-white/[0.06] bg-[#0E1118]/80 p-3 shadow-xl animate-showcase-float-2">
                <div className="flex gap-1.5 flex-wrap">
                  {['Dynamic Prog.', 'Graphs', 'Trees', 'Arrays'].map((tag, i) => (
                    <span
                      key={tag}
                      className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full border font-semibold",
                        i === 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        i === 1 ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        i === 2 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 5: Floating - Submission Result */}
              <div className="absolute -bottom-4 left-6 sm:left-14 z-20 w-[170px] rounded-lg border border-[#10b981]/30 bg-[#0E1118]/85 p-3 shadow-xl animate-showcase-float-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACCEPTED
                  </span>
                  <span className="text-[8px] font-mono text-gray-500">12/12 Passed</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                  <div>
                    <p className="text-[8px] text-gray-500 font-mono">RUNTIME</p>
                    <p className="text-xs font-bold text-white font-mono">96 ms</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-500 font-mono">MEMORY</p>
                    <p className="text-xs font-bold text-white font-mono">14.2 MB</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Scroll indicator */}
      <div className="w-full flex justify-center py-6 select-none animate-fade-in">
        <div className="flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
          <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center p-1.5">
            <div className="w-1 h-1.5 rounded-full bg-[#4F7DFF] animate-bounce" />
          </div>
          <span className="mt-1">Scroll to explore</span>
        </div>
      </div>

      {/* ═══════════════════ WHAT BUGX OFFERS ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <ScrollReveal className="max-w-3xl mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3">What bugX offers</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Code2 className="w-4 h-4 text-[#4F7DFF]" />,
                title: 'Solve Problems',
                description: 'Practice across multiple topics with curated coding challenges. Test constraints and runtime metrics in real time.'
              },
              {
                icon: <Swords className="w-4 h-4 text-amber-500" />,
                title: 'Compete',
                description: 'Join timed 1v1 contests and compare your performance with code builders on the global ranked board.'
              },
              {
                icon: <Activity className="w-4 h-4 text-emerald-400" />,
                title: 'Track Progress',
                description: 'Monitor solved problems, rankings, streaks, and category performance over time with visual analytics.'
              }
            ].map((offer, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div
                  className="p-6 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-[#4F7DFF]/25 hover:bg-white/[0.02] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#4F7DFF]/[0.01] hover:rotate-[0.5deg] transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group-hover:bg-white/[0.04] group-hover:border-white/10 w-fit mb-5 transition-all duration-300">
                    {offer.icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2.5 leading-relaxed group-hover:text-gray-400 transition-colors duration-300">
                    {offer.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PROBLEM CATEGORIES ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <ScrollReveal className="max-w-3xl mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Problem Set</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3">Practice by category</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isTopicsLoading ? (
              Array.from({ length: 8 }).map((_, idx) => <TopicSkeleton key={idx} />)
            ) : topics.length === 0 ? (
              <div className="col-span-full text-center py-8 text-xs text-gray-500">
                No topics available
              </div>
            ) : (
              topics.map((topic, idx) => {
                const total = topic.totalProblems || 1;
                const easyPct = Math.round((topic.easyCount / total) * 100);
                const medPct = Math.round((topic.mediumCount / total) * 100);
                const hardPct = Math.round((topic.hardCount / total) * 100);
                const split = `${easyPct}% Easy · ${medPct}% Med · ${hardPct}% Hard`;
                
                return (
                  <ScrollReveal key={topic.id} delay={idx * 40}>
                    <Link
                      to={`/problems?topic=${topic.slug}`}
                      className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-[#4F7DFF]/25 hover:bg-white/[0.02] hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group h-full cursor-pointer"
                    >
                      <div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] group-hover:bg-white/[0.04] group-hover:border-white/10 w-fit mb-4 transition-all">
                          {getTopicIcon(topic.slug)}
                        </div>
                        <h3 className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{topic.name}</h3>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{split}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-600 mt-4 block group-hover:text-[#4F7DFF] transition-colors">{topic.totalProblems} Problems</span>
                    </Link>
                  </ScrollReveal>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ COMPANIES SECTION ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <ScrollReveal className="max-w-3xl mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Company Sets</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3">Targeted Interview Questions</h2>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isCompaniesLoading ? (
              Array.from({ length: 6 }).map((_, idx) => <CompanySkeleton key={idx} />)
            ) : companies.length === 0 ? (
              <div className="col-span-full text-center py-8 text-xs text-gray-500">
                No companies available
              </div>
            ) : (
              companies.map((company, idx) => (
                <ScrollReveal key={company.id} delay={idx * 50}>
                  <Link
                    to={`/problems?company=${company.slug}`}
                    className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-[#4F7DFF]/25 hover:bg-[#0E1118]/80 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between h-full cursor-pointer"
                    style={{
                      borderColor: company.brand_color ? `${company.brand_color}33` : undefined,
                    }}
                  >
                    <div className="space-y-4">
                      {company.logo_dark ? (
                        <div className="h-6 flex items-center">
                          <img
                            src={company.logo_dark}
                            alt={company.name}
                            className="h-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      ) : (
                        <h3 className="text-xs font-bold tracking-wider text-gray-500 group-hover:text-white uppercase font-mono transition-colors">
                          {company.name}
                        </h3>
                      )}
                      <div className="space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-[9px] font-semibold text-gray-400">
                          Easy {company.easyCount} · Med {company.mediumCount} · Hard {company.hardCount}
                        </p>
                        <p className="text-[9px] font-semibold" style={{ color: company.brand_color || '#4F7DFF' }}>
                          {company.totalProblems} Problems
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-600 block mt-4 group-hover:text-white transition-colors">
                      {company.totalProblems} Questions
                    </span>
                  </Link>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURED PROBLEM INTERACTIVE ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            
            <ScrollReveal className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Practice Spotlight</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Reverse Linked List</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Reverse a singly linked list. Given the head of a singly linked list, reverse the list, and return the reversed list. A clean, classic pointer problem that tests your reference manipulations.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">Medium</span>
                <span>·</span>
                <span>68.2% Acceptance</span>
                <span>·</span>
                <span className="text-gray-600">Tagged: Amazon, Google, Microsoft</span>
              </div>
              <Link to="/problems/reverse-linked-list" className="block w-fit">
                <Button variant="primary" className="h-10 rounded-lg px-5 text-xs font-semibold bg-[#4F7DFF] hover:bg-[#5f8aff] text-white transition-all cursor-pointer">
                  Open Problem
                </Button>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={120} className="w-full">
              <pre className="text-xs font-mono text-gray-400 leading-relaxed bg-[#0E1118]/60 p-5 rounded-xl border border-white/[0.05] overflow-x-auto shadow-2xl">
                <code>{`/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
var reverseList = function(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    let nextTemp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }
  return prev;
};`}</code>
              </pre>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════ DAILY CHALLENGE & COUNTDOWN ═══════════════════ */}
      {FEATURES.DAILY_CHALLENGE && (
        <section className="py-24 border-b border-white/[0.03] bg-white/[0.005]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <ScrollReveal className="max-w-3xl space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Consistency challenge
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Daily Challenge Problem
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  A new problem is generated every day at midnight UTC. Solve the challenge within 24 hours to increase your score, maintain your streak, and build daily coding consistency.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={120} className="w-full">
                <DailyChallengeCard />
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ ARENA & LEADERBOARD ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            
            <ScrollReveal className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Ranked Competition</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">1v1 Battle Arena</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Enter the arena and compete head-to-head against another developer. Both players receive the same problem and a 5-minute window. Solve it faster and more accurately to win ELO points on the global ranked ladder.
              </p>
              <div className="border-t border-white/[0.04] pt-5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Format:</span>
                  <span className="text-gray-300 font-mono">1v1 Head-to-Head</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Round Duration:</span>
                  <span className="text-gray-300 font-mono">5 Minutes</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Ranking System:</span>
                  <span className="text-gray-300 font-mono">ELO-Based Ladder</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">Verdict:</span>
                  <span className="text-gray-300 font-mono">Real-Time Streaming</span>
                </div>
              </div>
              <Link to="/battle" className="block w-fit">
                <Button variant="primary" className="h-10 rounded-lg px-6 text-xs font-semibold bg-[#d97706] hover:bg-amber-600 text-white hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer flex items-center gap-2 group">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Enter Arena</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <LeaderboardPreview />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════ NEW FEATURE: AI JUDGE HIGHLIGHT ═══════════════════ */}
      <section className="py-24 border-b border-white/[0.03] bg-gradient-to-b from-transparent via-[#4F7DFF]/[0.015] to-transparent relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(122,95,255,0.03),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            
            <ScrollReveal className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 border border-[#7A5FFF]/35 bg-[#7A5FFF]/5 px-3 py-1 rounded-full text-[10px] font-bold text-[#b8a6ff] tracking-wider uppercase select-none animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-[#7A5FFF]" />
                  Realtime AI Code Review
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                  AI Arena Judge & Match Report Cards
                </h2>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Step into the future of competitive coding. Every contest in the 1v1 Arena is evaluated in real-time by our advanced AI Judge. Receive structured, high-fidelity Match Report Cards detailing your time/space complexity (Big-O), code efficiency comparisons, logical gaps, and custom suggestions to accelerate your problem solving velocity.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  { icon: <Bot className="w-4 h-4 text-cyan-400" />, title: 'Real-time Verdict', desc: 'Instantly stream technical evaluations after submission.' },
                  { icon: <Cpu className="w-4 h-4 text-purple-400" />, title: 'Complexity Breakdown', desc: 'Detailed O(N) review comparing code performance.' },
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, title: 'Bug & Edge Cases', desc: 'Find hidden logical flaws before you submit to prod.' },
                  { icon: <Sparkles className="w-4 h-4 text-amber-400" />, title: 'Actionable Advice', desc: 'Custom tailored feedback to level up your algorithms.' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-3 p-4 rounded-xl border border-white/[0.04] bg-[#0c0f16]/30 hover:border-[#7A5FFF]/20 transition-all duration-300">
                    <div className="p-2 h-fit rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-200">{feature.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link to="/battle" className="block w-fit">
                  <Button variant="primary" className="h-10 rounded-lg px-5 text-xs font-semibold bg-[#7A5FFF] hover:bg-[#8b75ff] text-white shadow-[0_4px_16px_rgba(122,95,255,0.15)] hover:shadow-[0_4px_24px_rgba(122,95,255,0.25)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer flex items-center gap-2 group">
                    <Swords className="w-3.5 h-3.5" />
                    <span>Duel in the Arena</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120} className="w-full flex justify-center">
              <AIMatchReportShowcase />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════ PROGRESS TRACKING PROFILE ═══════════════════ */}
      <section ref={statsRef} className="py-24 border-b border-white/[0.03] bg-white/[0.005]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            
            {/* Visual Progress Mockup Card */}
            <ScrollReveal className="w-full">
              <div className="p-6 rounded-xl border border-white/[0.05] bg-[#090d14]/40 hover:border-white/[0.08] transition-colors duration-300 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">Developer Profile</p>
                    <p className="text-sm font-semibold text-white">Analytics Overview</p>
                  </div>
                  <Activity className="w-4 h-4 text-[#4F7DFF] animate-pulse" />
                </div>

                {/* Counter statistics grid */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white/[0.01] rounded-lg border border-white/[0.03]">
                    <p className="text-[8px] text-gray-500 font-mono uppercase">SOLVED</p>
                    <p className="text-xl font-bold text-white font-mono mt-1">{solvedCount}</p>
                  </div>
                  <div className="p-3 bg-white/[0.01] rounded-lg border border-white/[0.03]">
                    <p className="text-[8px] text-gray-500 font-mono uppercase">RATING</p>
                    <p className="text-xl font-bold text-[#4F7DFF] font-mono mt-1">{ratingCount}</p>
                  </div>
                  <div className="p-3 bg-white/[0.01] rounded-lg border border-white/[0.03]">
                    <p className="text-[8px] text-gray-500 font-mono uppercase">STREAK</p>
                    <p className="text-xl font-bold text-amber-500 font-mono mt-1">{streakCount}d</p>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-3">
                  {[
                    { label: 'Easy Solved', pct: (overviewStats?.difficultyDistribution?.easy ?? 0) > 0 ? Math.round(((userStats?.easy_solved ?? 0) / (overviewStats?.difficultyDistribution?.easy ?? 1)) * 100) : 0, color: 'bg-emerald-400', count: `${userStats?.easy_solved ?? 0} / ${overviewStats?.difficultyDistribution?.easy ?? 0}` },
                    { label: 'Medium Solved', pct: (overviewStats?.difficultyDistribution?.medium ?? 0) > 0 ? Math.round(((userStats?.medium_solved ?? 0) / (overviewStats?.difficultyDistribution?.medium ?? 1)) * 100) : 0, color: 'bg-amber-400', count: `${userStats?.medium_solved ?? 0} / ${overviewStats?.difficultyDistribution?.medium ?? 0}` },
                    { label: 'Hard Solved', pct: (overviewStats?.difficultyDistribution?.hard ?? 0) > 0 ? Math.round(((userStats?.hard_solved ?? 0) / (overviewStats?.difficultyDistribution?.hard ?? 1)) * 100) : 0, color: 'bg-rose-400', count: `${userStats?.hard_solved ?? 0} / ${overviewStats?.difficultyDistribution?.hard ?? 0}` },
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-400">
                        <span>{stat.label}</span>
                        <span className="font-mono text-gray-500">{stat.count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", stat.color)} style={{ width: `${stat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Streak summary */}
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.03] rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[11px] text-gray-400">Bookmarked Problems</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-300 font-mono">{(overviewStats?.bookmarkedCount ?? 0) + ' saved'}</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120} className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Skill verification</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Progress & activity metrics</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Analyze your problem solving patterns with granular user logs. bugX stores your submissions, streaks, topic counts, runtime benchmark scores, and memory constraints. Bookmark challenging problems to revisit them later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Solved Counts', detail: 'By difficulty' },
                  { title: 'Streak Tracking', detail: 'Daily solved logs' },
                  { title: 'Topic Mastery', detail: 'Algorithmic performance' },
                  { title: 'Bookmarks', detail: 'Save complex challenges' }
                ].map((item, idx) => (
                  <div key={idx} className="border-l border-[#4F7DFF]/40 pl-3">
                    <h4 className="text-xs font-semibold text-gray-300">{item.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/[0.04] py-12 bg-[#05070a]/30">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-xs text-gray-500">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-white transition-colors duration-150">
            <BugXLogo className="h-5 w-5 text-[#d97706]" />
            <span className="font-sans font-medium tracking-tight lowercase">
              bug<span className="text-[#d97706] font-semibold uppercase">X</span>
            </span>
          </Link>
          <nav className="flex gap-6">
            <Link to="/problems" className="hover:text-white transition-colors">Problems</Link>
            <Link to="/battle" className="hover:text-white transition-colors">Arena</Link>
            <Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </nav>
          <p>© {new Date().getFullYear()} bugX. Clean, focused coding practice.</p>
        </div>
      </footer>
    </div>
  );
};
