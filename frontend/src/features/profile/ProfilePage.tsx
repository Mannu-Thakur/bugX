import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  MapPin,
  Pencil,
  ExternalLink,
  Share2,
  Zap,
  Trophy,
  Flame,
  Target,
  BarChart3,
  FileText,
  Sword,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useUserStats, usePlatformStats, useUserSubmissions } from '../profile/hooks';
import { SubmissionHistoryTable } from './ui/SubmissionHistoryTable';
import { ConnectedPlatforms } from './ui/ConnectedPlatforms';
import { cn } from '../../shared/lib/cn';
import { EditProfileModal } from '../auth/ui/EditProfileModal';
import { safeParseDate } from '../../shared/lib/date';
import { FEATURES } from '../../shared/config/features';

const LIMIT = 10;

// ─── Custom Inline SVGs ───
const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ─── Animated Particle Component ───
export const FloatingOrb: React.FC<{ style: React.CSSProperties; className?: string }> = ({ style, className }) => (
  <div
    className={cn('absolute rounded-full pointer-events-none', className)}
    style={{ filter: 'blur(60px)', ...style }}
  />
);

// ─── Glass Card ───
export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'none';
  hover?: boolean;
  style?: React.CSSProperties;
}> = ({ children, className, glow = 'none', hover = false, style }) => {
  const glowMap: Record<string, { border: string; shadow: string }> = {
    blue:    { border: 'hover:border-[#6c9aff]/60', shadow: 'hover:shadow-[0_0_40px_rgba(79,125,255,0.25),inset_0_0_30px_rgba(79,125,255,0.05)]' },
    purple:  { border: 'hover:border-[#9b7fff]/60', shadow: 'hover:shadow-[0_0_40px_rgba(122,95,255,0.25),inset_0_0_30px_rgba(122,95,255,0.05)]' },
    emerald: { border: 'hover:border-emerald-400/60', shadow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]' },
    amber:   { border: 'hover:border-amber-400/60',  shadow: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.25)]' },
    rose:    { border: 'hover:border-rose-400/60',   shadow: 'hover:shadow-[0_0_40px_rgba(244,63,94,0.25)]' },
    none:    { border: '', shadow: '' },
  };
  const g = glowMap[glow];

  return (
    <div
      style={style}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-500',
        // true frosted glass: visible white frost + strong blur
        'border border-white/[0.15]',
        'bg-white/[0.08]',
        'backdrop-blur-2xl',
        'shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.04)]',
        hover && g.border,
        hover && g.shadow,
        hover && 'cursor-pointer',
        className,
      )}
    >
      {/* Top shine */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {/* Left edge glint */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
      {children}
    </div>
  );
};

// ─── Interactive Donut Chart ───
type SegmentKey = 'easy' | 'medium' | 'hard' | null;

const SEGMENT_CONFIG = [
  {
    key: 'easy' as SegmentKey,
    label: 'Easy',
    color: '#10b981',
    stroke: '#34d399',
    glow: 'rgba(52,211,153,0.7)',
    bgGlow: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(52,211,153,0.35)',
    textClass: 'text-emerald-400',
    pill: 'bg-emerald-500/10 border-emerald-500/25',
  },
  {
    key: 'medium' as SegmentKey,
    label: 'Medium',
    color: '#f59e0b',
    stroke: '#fbbf24',
    glow: 'rgba(251,191,36,0.7)',
    bgGlow: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(251,191,36,0.35)',
    textClass: 'text-amber-400',
    pill: 'bg-amber-500/10 border-amber-500/25',
  },
  {
    key: 'hard' as SegmentKey,
    label: 'Hard',
    color: '#f43f5e',
    stroke: '#fb7185',
    glow: 'rgba(251,113,133,0.7)',
    bgGlow: 'rgba(244,63,94,0.08)',
    borderColor: 'rgba(251,113,133,0.35)',
    textClass: 'text-rose-400',
    pill: 'bg-rose-500/10 border-rose-500/25',
  },
] as const;

const DonutChart: React.FC<{
  easy: number;
  medium: number;
  hard: number;
  total: number;
}> = ({ easy, medium, hard, total }) => {
  const [hovered, setHovered] = React.useState<SegmentKey>(null);

  // Calm enter/leave — no spring ref, just simple state
  const onEnter = (key: SegmentKey) => setHovered(key);
  const onLeave = () => setHovered(null);

  const R = 70;
  const C = 2 * Math.PI * R;
  const CX = 90; const CY = 90;
  // Subtle stroke width change — calm, not dramatic
  const STROKE_IDLE   = 9;
  const STROKE_ACTIVE = 12;
  const SIZE = 180;

  const easyDash   = total > 0 ? (easy   / total) * C : 0;
  const medDash    = total > 0 ? (medium / total) * C : 0;
  const hardDash   = total > 0 ? (hard   / total) * C : 0;
  const easyOffset = 0;
  const medOffset  = -(easyDash);
  const hardOffset = -(easyDash + medDash);

  const activeSeg  = SEGMENT_CONFIG.find(s => s.key === hovered);
  const activeValue = hovered === 'easy' ? easy : hovered === 'medium' ? medium : hovered === 'hard' ? hard : null;

  // Soothing ease — no overshoot, no bounce
  const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const SLOW = '600ms';
  const MED  = '450ms';
  const FAST = '300ms';

  // Gentle glow on the whole donut — barely perceptible, soothing
  const donutFilter = activeSeg
    ? `drop-shadow(0 0 10px ${activeSeg.glow.replace('0.7', '0.35')})`
    : 'none';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
      {/* ── DONUT ── */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{
          width: SIZE, height: SIZE,
          filter: donutFilter,
          transition: `filter ${SLOW} ${EASE}`,
        }}
      >
        <svg
          width={SIZE} height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE_IDLE}
          />

          {total > 0 ? (
            <>
              {/* EASY */}
              <circle
                cx={CX} cy={CY} r={R} fill="none"
                stroke="#34d399"
                strokeWidth={hovered === 'easy' ? STROKE_ACTIVE : STROKE_IDLE}
                strokeLinecap="round"
                strokeDasharray={`${easyDash} ${C}`}
                strokeDashoffset={easyOffset}
                style={{
                  // soothing slow ease — stroke width breathes, not pops
                  transition: `stroke-width ${MED} ${EASE}, opacity ${MED} ${EASE}, filter ${MED} ${EASE}`,
                  // gentle dim on non-active — 0.45 not 0.25, so it's soft not harsh
                  opacity: hovered && hovered !== 'easy' ? 0.45 : 1,
                  filter: hovered === 'easy'
                    ? 'drop-shadow(0 0 5px rgba(52,211,153,0.55))'
                    : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => onEnter('easy')}
                onMouseLeave={onLeave}
              />

              {/* MEDIUM */}
              <circle
                cx={CX} cy={CY} r={R} fill="none"
                stroke="#fbbf24"
                strokeWidth={hovered === 'medium' ? STROKE_ACTIVE : STROKE_IDLE}
                strokeLinecap="round"
                strokeDasharray={`${medDash} ${C}`}
                strokeDashoffset={medOffset}
                style={{
                  transition: `stroke-width ${MED} ${EASE}, opacity ${MED} ${EASE}, filter ${MED} ${EASE}`,
                  opacity: hovered && hovered !== 'medium' ? 0.45 : 1,
                  filter: hovered === 'medium'
                    ? 'drop-shadow(0 0 5px rgba(251,191,36,0.55))'
                    : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => onEnter('medium')}
                onMouseLeave={onLeave}
              />

              {/* HARD */}
              <circle
                cx={CX} cy={CY} r={R} fill="none"
                stroke="#fb7185"
                strokeWidth={hovered === 'hard' ? STROKE_ACTIVE : STROKE_IDLE}
                strokeLinecap="round"
                strokeDasharray={`${hardDash} ${C}`}
                strokeDashoffset={hardOffset}
                style={{
                  transition: `stroke-width ${MED} ${EASE}, opacity ${MED} ${EASE}, filter ${MED} ${EASE}`,
                  opacity: hovered && hovered !== 'hard' ? 0.45 : 1,
                  filter: hovered === 'hard'
                    ? 'drop-shadow(0 0 5px rgba(251,113,133,0.55))'
                    : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => onEnter('hard')}
                onMouseLeave={onLeave}
              />
            </>
          ) : (
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE_IDLE}
              strokeDasharray={`${C * 0.3} ${C}`}
            />
          )}
        </svg>

        {/* ── Center label — crossfade layers, no layout shift ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">

          {/* "Total" layer — fades out when something hovered */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: hovered ? 0 : 1,
              transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
              transition: `opacity ${FAST} ${EASE}, transform ${FAST} ${EASE}`,
              pointerEvents: 'none',
            }}
          >
            <span className="text-[1.75rem] font-black font-mono leading-none text-white"
              style={{ textShadow: '0 0 12px rgba(255,255,255,0.15)' }}
            >
              {total}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1 text-gray-500">
              Solved
            </span>
          </div>

          {/* "Active" layer — fades in when something hovered */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(4px)',
              transition: `opacity ${MED} ${EASE}, transform ${MED} ${EASE}`,
              pointerEvents: 'none',
            }}
          >
            <span
              className="text-[1.75rem] font-black font-mono leading-none"
              style={{
                color: activeSeg ? activeSeg.stroke : '#ffffff',
                textShadow: activeSeg ? `0 0 16px ${activeSeg.glow.replace('0.7','0.4')}` : 'none',
                transition: `color ${MED} ${EASE}, text-shadow ${MED} ${EASE}`,
              }}
            >
              {activeValue ?? total}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1"
              style={{
                color: activeSeg ? activeSeg.stroke : 'rgba(156,163,175,0.8)',
                opacity: 0.8,
                transition: `color ${MED} ${EASE}`,
              }}
            >
              {activeSeg?.label ?? 'Solved'}
            </span>
            {/* % — always present, no mount flicker */}
            <span
              className="text-[9px] font-semibold mt-0.5"
              style={{
                color: activeSeg ? activeSeg.stroke : 'rgba(156,163,175,0.5)',
                opacity: hovered && total > 0 ? 0.6 : 0,
                transition: `opacity ${MED} ${EASE}, color ${MED} ${EASE}`,
              }}
            >
              {total > 0 ? `${Math.round(((activeValue ?? 0) / total) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex flex-col gap-3 flex-1 min-w-0 w-full">
        <div className="mb-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: activeSeg ? activeSeg.stroke : '#10b981',
                boxShadow: activeSeg ? `0 0 6px ${activeSeg.stroke}` : '0 0 6px #10b981',
                transition: `background ${SLOW} ${EASE}, box-shadow ${SLOW} ${EASE}`,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            Problems Solved
          </span>

          {/* Big number — crossfade same technique */}
          <div className="relative h-14 mt-1" style={{ minHeight: '3.5rem' }}>
            {/* Total number */}
            <p
              className="absolute text-4xl font-black font-mono leading-none text-white"
              style={{
                opacity: hovered ? 0 : 1,
                transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                transition: `opacity ${FAST} ${EASE}, transform ${FAST} ${EASE}`,
              }}
            >
              {total}
            </p>
            {/* Active number */}
            <p
              className="absolute text-4xl font-black font-mono leading-none"
              style={{
                color: activeSeg ? activeSeg.stroke : '#ffffff',
                textShadow: activeSeg ? `0 0 28px ${activeSeg.glow.replace('0.7','0.3')}` : 'none',
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity ${MED} ${EASE}, transform ${MED} ${EASE}, color ${MED} ${EASE}, text-shadow ${MED} ${EASE}`,
              }}
            >
              {activeValue ?? total}
            </p>
          </div>

          {/* Subtitle — fades in smoothly, no layout jump */}
          <p
            className="text-xs font-medium"
            style={{
              color: activeSeg ? activeSeg.stroke : '#9ca3af',
              opacity: hovered ? 0.65 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(3px)',
              transition: `opacity ${MED} ${EASE}, transform ${MED} ${EASE}, color ${MED} ${EASE}`,
            }}
          >
            of {total} total · {total > 0 ? Math.round(((activeValue ?? 0) / total) * 100) : 0}%
          </p>
        </div>

        {/* Pills — gentle lift, no overshoot */}
        <div className="grid grid-cols-3 gap-2">
          {SEGMENT_CONFIG.map((seg) => {
            const val = seg.key === 'easy' ? easy : seg.key === 'medium' ? medium : hard;
            const isActive = hovered === seg.key;
            const isDimmed = hovered !== null && !isActive;
            return (
              <div
                key={seg.key}
                className="relative flex flex-col items-center py-3 px-2 rounded-xl border cursor-default overflow-hidden"
                style={{
                  background: isActive ? seg.bgGlow : 'rgba(255,255,255,0.03)',
                  borderColor: isActive ? seg.borderColor : 'rgba(255,255,255,0.07)',
                  // Gentle dim — 0.55 not 0.4, soft not harsh
                  opacity: isDimmed ? 0.55 : 1,
                  // Gentle lift — scale 1.035 not 1.07, translateY -1px not -2px
                  transform: isActive ? 'scale(1.035) translateY(-1px)' : 'scale(1) translateY(0)',
                  boxShadow: isActive
                    ? `0 6px 20px ${seg.bgGlow}, inset 0 1px 0 ${seg.borderColor}`
                    : 'none',
                  // Soothing ease — everything at same cadence
                  transition: `all ${SLOW} ${EASE}`,
                }}
                onMouseEnter={() => onEnter(seg.key)}
                onMouseLeave={onLeave}
              >
                {/* Soft glow blob — always present, just fades */}
                <div
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-full blur-xl"
                  style={{
                    background: seg.stroke,
                    opacity: isActive ? 0.22 : 0,
                    transition: `opacity ${SLOW} ${EASE}`,
                  }}
                />

                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{
                    color: isActive ? seg.stroke : 'rgba(156,163,175,0.65)',
                    transition: `color ${SLOW} ${EASE}`,
                  }}
                >
                  {seg.label}
                </span>

                <span
                  className="text-2xl font-black font-mono mt-1 leading-none"
                  style={{
                    color: isActive ? seg.stroke : 'rgba(255,255,255,0.8)',
                    textShadow: isActive ? `0 0 14px ${seg.glow.replace('0.7','0.4')}` : 'none',
                    transition: `color ${SLOW} ${EASE}, text-shadow ${SLOW} ${EASE}`,
                  }}
                >
                  {val}
                </span>

                {total > 0 && (
                  <span
                    className="text-[8px] font-semibold mt-0.5"
                    style={{
                      color: isActive ? seg.stroke : 'rgba(107,114,128,0.7)',
                      opacity: 0.75,
                      transition: `color ${SLOW} ${EASE}`,
                    }}
                  >
                    {Math.round((val / total) * 100)}%
                  </span>
                )}

                {/* Bottom line — soft fade in */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[1px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${seg.stroke}, transparent)`,
                    opacity: isActive ? 0.5 : 0,
                    transition: `opacity ${SLOW} ${EASE}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Stat Glass Card ───
export const StatCard: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  delay?: number;
}> = ({ label, value, unit, icon, color, gradient, delay = 0 }) => (
  <GlassCard
    className="p-5 group"
    glow="none"
    hover={false}
    style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
  >
    {/* Gradient blob */}
    <div
      className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
      style={{ background: gradient }}
    />
    <div className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black tracking-tight text-white font-mono leading-none">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </div>
    </div>
    {/* Bottom gradient line */}
    <div
      className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl"
      style={{ background: gradient }}
    />
  </GlassCard>
);

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const toast = useToast();

  const handleShareProfile = () => {
    const shareUrl = `${window.location.origin}/u/${user?.username || ''}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success('Public profile link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link. Please manually copy: ' + shareUrl);
      });
  };

  const { data: stats } = useUserStats();
  const { data: platformStats, isLoading: platformLoading } = usePlatformStats();
  const { data: submissionsPage, isLoading: subsLoading, error: subsError } = useUserSubmissions(page, LIMIT);

  const [editOpen, setEditOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    dateLabel: string;
    count: number;
    accepted: number;
    topics: string[];
    problems: string[];
    targetRect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Animated orb positions
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const fullName = user.fullName || (user.username.toLowerCase().includes('mannu') ? 'Mannu Kumar Thakur' : user.username);
  const bio = user.bio || (user.username.toLowerCase().includes('mannu') ? 'B.Tech CE | I breathe brackets & bugs | From Brute Force to Optimised one.' : 'No bio written yet.');
  const location = user.location || (user.username.toLowerCase().includes('mannu') ? 'India' : null);

  const totalPages = submissionsPage?.pages ?? 1;
  const rawItems = submissionsPage?.items ?? [];
  const items = rawItems.filter(
    (item) => !item.run_samples_only && item.status !== 'Sample Pass' && item.status !== 'SAMPLE_PASSED'
  );

  const joinDate = safeParseDate(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Solved Stats
  const totalEasy = stats?.easy_solved ?? 0;
  const totalMed = stats?.medium_solved ?? 0;
  const totalHard = stats?.hard_solved ?? 0;
  const totalSolved = stats?.total_solved ?? (totalEasy + totalMed + totalHard);

  // Competitive stats
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;
  const accumulatedScore = stats?.total_score ?? 0;
  const battlesPlayed = stats?.battles_played ?? 0;
  const battlesWon = stats?.battles_won ?? 0;
  const winRate = battlesPlayed > 0 ? ((battlesWon / battlesPlayed) * 100).toFixed(0) : '0';

  // ─── Heatmap: Sunday-aligned 53-week grid ───
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayDow = today.getDay();
  const daysToSaturday = 6 - todayDow;
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + daysToSaturday);

  const COLS = 53;
  const DAYS = 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - (COLS * DAYS - 1));

  const formatYYYYMMDD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return '';
    if (count === 0) return 'bg-white/[0.03] border border-white/[0.05]';
    if (count === 1) return 'bg-emerald-900/60 border border-emerald-700/40 shadow-[0_0_4px_rgba(16,185,129,0.2)]';
    if (count === 2) return 'bg-emerald-700/70 border border-emerald-600/50 shadow-[0_0_6px_rgba(16,185,129,0.3)]';
    if (count === 3) return 'bg-emerald-500/80 border border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    if (count <= 6)  return 'bg-emerald-400 border border-emerald-300/70 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
    return 'bg-emerald-300 border border-emerald-200/80 shadow-[0_0_12px_rgba(110,231,183,0.6)]';
  };

  const monthLabels: { col: number; label: string }[] = [];
  let prevMonthStr = '';
  for (let w = 0; w < COLS; w++) {
    const sunday = new Date(gridStart);
    sunday.setDate(gridStart.getDate() + w * 7);
    const mStr = sunday.toLocaleDateString('en-US', { month: 'short' });
    if (mStr !== prevMonthStr) {
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || (w - prev.col) >= 2) {
        monthLabels.push({ col: w, label: mStr });
        prevMonthStr = mStr;
      }
    }
  }

  const activeSubmissionsCount = stats?.submission_activity
    ? Object.values(stats.submission_activity).reduce((a, b) => a + b, 0)
    : 0;

  const realActiveDays = stats?.submission_activity
    ? Object.keys(stats.submission_activity).length
    : 0;

  // Social links array for chip rendering
  const socialLinks = [
    user.githubUrl    && { icon: <GithubIcon className="w-3.5 h-3.5 text-gray-300" />, label: 'GitHub', url: user.githubUrl },
    user.leetcodeUrl  && { icon: <Code2 className="w-3.5 h-3.5 text-amber-400" />, label: 'LeetCode', url: user.leetcodeUrl.startsWith('http') ? user.leetcodeUrl : `https://leetcode.com/u/${user.leetcodeUrl}` },
    user.codeforcesUrl && { icon: <Code2 className="w-3.5 h-3.5 text-blue-400" />, label: 'Codeforces', url: user.codeforcesUrl.startsWith('http') ? user.codeforcesUrl : `https://codeforces.com/profile/${user.codeforcesUrl}` },
    user.gfgUrl       && { icon: <Code2 className="w-3.5 h-3.5 text-emerald-400" />, label: 'GFG', url: user.gfgUrl.startsWith('http') ? user.gfgUrl : `https://www.geeksforgeeks.org/user/${user.gfgUrl}` },
    user.linkedinUrl  && { icon: <LinkedInIcon className="w-3.5 h-3.5 text-blue-300" />, label: 'LinkedIn', url: user.linkedinUrl },
    user.portfolioUrl && { icon: <ExternalLink className="w-3.5 h-3.5 text-purple-400" />, label: 'Portfolio', url: user.portfolioUrl },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; url: string }[];

  return (
    <div
      ref={containerRef}
      className="max-w-5xl mx-auto space-y-6 pb-16 px-4 sm:px-6 select-none animate-fade-in relative"
    >
      {/* ══════════════════════════════════════════════
           VIVID GLASSMORPHISM BACKGROUND
           Must be colourful for glass blur to be visible
         ══════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
        style={{ background: 'linear-gradient(135deg, #0a0612 0%, #07090f 40%, #0a0612 100%)' }}
      >
        {/* ── Primary violet-blue orb — follows cursor ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 700, height: 700,
            background: 'radial-gradient(circle at center, #6366f1 0%, #4F7DFF 30%, transparent 70%)',
            opacity: 0.28,
            filter: 'blur(80px)',
            left: `${mousePos.x * 0.7}%`,
            top: `${mousePos.y * 0.5}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 2.5s cubic-bezier(0.25,0.46,0.45,0.94), top 2.5s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        />
        {/* ── Hot purple — top right ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            background: 'radial-gradient(circle at center, #a855f7 0%, #7A5FFF 35%, transparent 70%)',
            opacity: 0.30,
            filter: 'blur(90px)',
            right: '-5%', top: '-5%',
            animation: 'orb-float 12s ease-in-out infinite',
          }}
        />
        {/* ── Cyan-teal — left mid ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            background: 'radial-gradient(circle at center, #06b6d4 0%, #10b981 40%, transparent 70%)',
            opacity: 0.22,
            filter: 'blur(80px)',
            left: '-8%', bottom: '25%',
            animation: 'orb-float 9s ease-in-out infinite reverse',
          }}
        />
        {/* ── Rose-amber — bottom right ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 450, height: 450,
            background: 'radial-gradient(circle at center, #f59e0b 0%, #f43f5e 40%, transparent 70%)',
            opacity: 0.18,
            filter: 'blur(70px)',
            right: '5%', bottom: '10%',
            animation: 'orb-float 11s ease-in-out infinite 3s',
          }}
        />
        {/* ── Noise grain overlay for glass texture ── */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* ════════════════════════ PROFILE HERO ════════════════════════ */}
      <GlassCard className="p-6 sm:p-8" glow="blue">
        {/* Top chromatic accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4F7DFF] via-[#a78bfa] to-[#06b6d4] rounded-t-2xl"
          style={{ boxShadow: '0 0 20px rgba(79,125,255,0.6), 0 0 40px rgba(167,139,250,0.3)' }}
        />
        {/* Vivid inner blobs that bleed through the glass */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4F7DFF] opacity-30 blur-[60px]" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-gradient-to-tr from-[#a855f7] to-[#7A5FFF] opacity-25 blur-[50px]" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-[#06b6d4] opacity-10 blur-[40px]" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-br from-[#4F7DFF] via-[#7A5FFF] to-[#a78bfa] opacity-70 blur-[2px] group-hover:opacity-100 transition-opacity duration-500" />
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="relative w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F7DFF] to-[#7A5FFF] flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-[#4F7DFF]/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Online pulse */}
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#05070A] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </span>
          </div>

          {/* Name + Bio + Meta */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text">
                  {fullName}
                </h1>
                <p className="text-sm text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#4F7DFF] inline-block" />
                  @{user.username}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:ml-auto self-start">
                {/* Share Profile button */}
                {FEATURES.PUBLIC_PROFILES && (
                  <button
                    onClick={handleShareProfile}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all duration-300 cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,125,255,0.15)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,125,255,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(79,125,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Profile
                  </button>
                )}

                {/* Edit Profile */}
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(122,95,255,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(122,95,255,0.4)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(122,95,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-gray-300 leading-relaxed max-w-xl border-l-[3px] border-[#6366f1] pl-3"
              style={{ textShadow: '0 0 30px rgba(255,255,255,0.05)' }}
            >
              {bio}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              {location && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.10] border border-white/[0.18] backdrop-blur-md"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
                >
                  <MapPin className="w-3 h-3" style={{ color: '#6c9aff' }} />
                  {location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.10] border border-white/[0.18] backdrop-blur-md"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                <CalendarDays className="w-3 h-3" style={{ color: '#9b7fff' }} />
                Joined {joinDate}
              </span>

              {socialLinks.length > 0 && socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.10] border border-white/[0.18] backdrop-blur-md text-gray-300 hover:text-white hover:bg-white/[0.18] hover:border-white/[0.30] transition-all duration-300"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
                >
                  {link.icon}
                  <span className="font-medium">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ════════════════════════ QUICK ACTIONS ════════════════════════ */}
      {(FEATURES.ANALYTICS || FEATURES.RESUME_EXPORT) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.ANALYTICS && (
            <Link to="/analytics" className="group block">
              <GlassCard className="p-5" glow="blue" hover>
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-[40px] pointer-events-none transition-all duration-500"
                  style={{ background: 'radial-gradient(circle, #4F7DFF, #6366f1)', opacity: 0.35 }}
                />
                <div className="relative flex items-center gap-4">
                  <div className="relative p-3 rounded-xl text-white transition-all duration-300"
                    style={{ background: 'rgba(79,125,255,0.25)', boxShadow: '0 0 20px rgba(79,125,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                  >
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">Analytics Dashboard</h3>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#4F7DFF] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-emerald-400 font-mono text-xs">{totalSolved}</span> solved
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-amber-400 font-mono text-xs">{currentStreak}</span> day streak
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-[#4F7DFF] font-mono text-xs">{accumulatedScore}</span> score
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          )}
          {FEATURES.RESUME_EXPORT && (
            <Link to="/resume" className="group block">
              <GlassCard className="p-5" glow="purple" hover>
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-[40px] pointer-events-none transition-all duration-500"
                  style={{ background: 'radial-gradient(circle, #a855f7, #7A5FFF)', opacity: 0.35 }}
                />
                <div className="relative flex items-center gap-4">
                  <div className="relative p-3 rounded-xl text-white transition-all duration-300"
                    style={{ background: 'rgba(122,95,255,0.25)', boxShadow: '0 0 20px rgba(122,95,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">Export Resume</h3>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#7A5FFF] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-emerald-400 font-mono text-xs">{totalEasy}</span>E
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-amber-400 font-mono text-xs">{totalMed}</span>M
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="text-rose-400 font-mono text-xs">{totalHard}</span>H
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Print-ready PDF</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          )}
        </section>
      )}

      {/* ════════════════════════ ACCOMPLISHMENTS ════════════════════════ */}
      <GlassCard className="p-6">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-[#4F7DFF]/10">
            <Zap className="w-4 h-4 text-[#4F7DFF]" />
          </div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Accomplishments</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        {/* ── Top row: Score card + Problems Solved big donut ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

          {/* ══ Total Score — NEOMORPHISM ══ */}
          <div
            className="relative rounded-2xl p-5 flex flex-col items-center justify-center gap-4 overflow-hidden group"
            style={{
              /* Dark neomorphic base — slightly lighter than bg */
              background: 'linear-gradient(145deg, #111827, #0d1117)',
              boxShadow: [
                /* Outer convex light (top-left highlight) */
                '6px 6px 16px rgba(0,0,0,0.7)',
                '-4px -4px 12px rgba(255,255,255,0.035)',
                /* Inner glow rim on hover — done via group */
                'inset 0 1px 0 rgba(255,255,255,0.06)',
              ].join(', '),
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'box-shadow 0.4s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = [
                '8px 8px 20px rgba(0,0,0,0.8)',
                '-5px -5px 15px rgba(255,255,255,0.05)',
                'inset 0 1px 0 rgba(255,255,255,0.08)',
                '0 0 30px rgba(79,125,255,0.15)',
              ].join(', ');
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = [
                '6px 6px 16px rgba(0,0,0,0.7)',
                '-4px -4px 12px rgba(255,255,255,0.035)',
                'inset 0 1px 0 rgba(255,255,255,0.06)',
              ].join(', ');
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Label */}
            <span
              className="text-[9px] font-black uppercase tracking-[0.25em] w-full"
              style={{
                color: 'rgba(156,163,175,0.55)',
                /* Embossed text effect */
                textShadow: '0 1px 0 rgba(255,255,255,0.07), 0 -1px 0 rgba(0,0,0,0.5)',
                letterSpacing: '0.22em',
              }}
            >
              Total Score
            </span>

            {/* Neomorphic score ring */}
            <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
              {/* Outer pressed-in ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: [
                    'inset 4px 4px 10px rgba(0,0,0,0.8)',
                    'inset -3px -3px 8px rgba(255,255,255,0.04)',
                  ].join(', '),
                  background: 'linear-gradient(145deg, #0c1220, #111827)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              />

              {/* Glowing accent arc (SVG) */}
              <svg
                className="absolute inset-0"
                width={110} height={110}
                viewBox="0 0 110 110"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Track */}
                <circle cx={55} cy={55} r={46} fill="none"
                  stroke="rgba(255,255,255,0.04)" strokeWidth={4} />
                {/* Animated glow arc — always full for score (decorative) */}
                <circle cx={55} cy={55} r={46} fill="none"
                  stroke="url(#scoreGrad)" strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46 * 0.72} ${2 * Math.PI * 46}`}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.8))' }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#4F7DFF" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Pulse ring */}
              <div
                className="absolute inset-2 rounded-full opacity-0 group-hover:opacity-100"
                style={{
                  boxShadow: '0 0 20px rgba(79,125,255,0.25)',
                  transition: 'opacity 0.4s ease',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              />

              {/* Center score value — embossed neomorphic number */}
              <div className="relative flex flex-col items-center justify-center">
                <span
                  className="font-black font-mono leading-none"
                  style={{
                    fontSize: accumulatedScore >= 1000 ? '1.4rem' : '1.9rem',
                    background: 'linear-gradient(160deg, #a5b4fc 0%, #818cf8 40%, #4F7DFF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))',
                    textShadow: 'none',
                  }}
                >
                  {accumulatedScore.toLocaleString()}
                </span>
                <span
                  className="text-[7px] font-black uppercase tracking-widest mt-0.5"
                  style={{ color: 'rgba(99,102,241,0.55)' }}
                >
                  pts
                </span>
              </div>
            </div>

            {/* Bottom embossed divider */}
            <div
              className="w-full h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
              }}
            />
          </div>

          {/* ── Problems Solved — spans 2 cols — BIG INTERACTIVE DONUT ── */}
          <div
            className="sm:col-span-2 relative rounded-xl p-5 overflow-hidden"
            style={{
              background: 'rgba(16,185,129,0.03)',
              border: '1px solid rgba(16,185,129,0.10)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-[0.05] pointer-events-none" />
            <DonutChart
              easy={totalEasy}
              medium={totalMed}
              hard={totalHard}
              total={totalSolved}
            />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-emerald-500/10 via-emerald-400/40 to-emerald-500/10" />
          </div>
        </div>

        {/* ── Streaks row ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Streak */}
          <div
            className="relative rounded-xl p-4 flex flex-col gap-2 overflow-hidden group"
            style={{
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.15)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-400 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity duration-500" />
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.8))' }} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Streak</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight font-mono">{currentStreak}</span>
              <span className="text-sm font-medium text-gray-500">{currentStreak === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          </div>

          {/* Max Streak */}
          <div
            className="relative rounded-xl p-4 flex flex-col gap-2 overflow-hidden group"
            style={{
              background: 'rgba(244,63,94,0.05)',
              border: '1px solid rgba(244,63,94,0.15)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-rose-500 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity duration-500" />
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-rose-400" style={{ filter: 'drop-shadow(0 0 4px rgba(251,113,133,0.8))' }} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Max Streak</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight font-mono">{bestStreak}</span>
              <span className="text-sm font-medium text-gray-500">{bestStreak === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
          </div>
        </div>
      </GlassCard>

      {/* ════════════════════════ CONNECTED PLATFORMS ════════════════════════ */}
      <ConnectedPlatforms
        stats={platformStats}
        isLoading={platformLoading}
        onConnectClick={() => setEditOpen(true)}
      />

      {/* ════════════════════════ BATTLE PERFORMANCE ════════════════════════ */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-rose-500/10">
            <Sword className="w-4 h-4 text-rose-400" />
          </div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Battle Arena</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        {battlesPlayed > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Battles Played', value: battlesPlayed, color: '#4F7DFF', bg: 'rgba(79,125,255,0.06)', border: 'rgba(79,125,255,0.15)', icon: <Target className="w-4 h-4" /> },
              { label: 'Battles Won', value: battlesWon, color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', icon: <Trophy className="w-4 h-4" /> },
              { label: 'Win Rate', value: `${winRate}%`, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', icon: <TrendingUp className="w-4 h-4" /> },
            ].map((item) => (
              <div
                key={item.label}
                className="relative rounded-xl p-4 flex flex-col gap-2 overflow-hidden group"
                style={{ background: item.bg, border: `1px solid ${item.border}`, backdropFilter: 'blur(10px)' }}
              >
                <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ background: item.color }} />
                <div className="flex items-center gap-1.5">
                  <div style={{ color: item.color, filter: `drop-shadow(0 0 4px ${item.color}80)` }}>{item.icon}</div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                </div>
                <span
                  className="text-3xl font-black tracking-tight font-mono"
                  style={{ color: item.color, textShadow: `0 0 20px ${item.color}40` }}
                >
                  {item.value}
                </span>
                <div
                  className="absolute bottom-0 left-0 right-0 h-[1px] opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Sword className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed text-center max-w-xs">
              Participate in your first battle to start building competitive statistics.
            </p>
          </div>
        )}
      </GlassCard>

      {/* ════════════════════════ CONSISTENCY HEATMAP ════════════════════════ */}
      <GlassCard className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Activity Heatmap</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono">
            {[
              { label: 'Submissions', value: activeSubmissionsCount.toLocaleString(), color: '#4F7DFF' },
              { label: 'Active days', value: realActiveDays, color: '#10b981' },
              { label: 'Streak', value: `${currentStreak}d`, color: '#f59e0b' },
              { label: 'Best', value: `${bestStreak}d`, color: '#f43f5e' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <span className="text-gray-600">{item.label}:</span>
                <strong className="font-bold" style={{ color: item.color }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap Grid Wrapper */}
        <div
          ref={heatmapRef}
          className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent relative"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Sleek Glassmorphism React Portal Tooltip — Offset to the side so hovered cell is 100% visible */}
          {tooltip && typeof document !== 'undefined' && (() => {
            const TOOLTIP_W = 210;
            // Position to the RIGHT of the cell by default (14px offset)
            let left = tooltip.targetRect.left + tooltip.targetRect.width + 14;

            // If placing to the right overflows the right screen edge, flip to the LEFT of the cell
            if (left + TOOLTIP_W > window.innerWidth - 16) {
              left = tooltip.targetRect.left - TOOLTIP_W - 14;
            }
            left = Math.max(12, left);

            // Align top near cell, clamped safely inside viewport
            let top = tooltip.targetRect.top - 12;
            top = Math.max(16, Math.min(window.innerHeight - 210, top));

            return createPortal(
              <div
                className="pointer-events-none fixed z-[99999] p-3 rounded-xl text-xs font-semibold text-gray-200 w-[210px] transition-all duration-150"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  background: 'rgba(10, 12, 18, 0.96)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(59, 130, 246, 0.12)',
                }}
              >
                {/* Top glint */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 via-emerald-400/50 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.1] pb-1.5 mb-2">
                  <span className="text-[10px] font-extrabold text-gray-200 font-mono tracking-tight">{tooltip.dateLabel}</span>
                  {tooltip.count > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {tooltip.accepted}/{tooltip.count} Acc
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-mono font-bold bg-gray-500/15 text-gray-400 border border-gray-500/20">
                      No Activity
                    </span>
                  )}
                </div>

                {tooltip.count > 0 ? (
                  <div className="space-y-2">
                    {/* Compact Stat Bar */}
                    <div className="flex items-center justify-between bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06] text-[9.5px]">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 uppercase font-bold text-[8px]">Subs:</span>
                        <span className="font-mono text-white font-black">{tooltip.count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-400/90 uppercase font-bold text-[8px]">Accepted:</span>
                        <span className="font-mono text-emerald-400 font-black">{tooltip.accepted}</span>
                      </div>
                    </div>

                    {/* Topics Covered */}
                    {tooltip.topics.length > 0 && (
                      <div>
                        <span className="text-[8px] uppercase font-black tracking-wider text-gray-400 block mb-1">Topics</span>
                        <div className="flex flex-wrap gap-1">
                          {tooltip.topics.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[90px]">
                              {t}
                            </span>
                          ))}
                          {tooltip.topics.length > 3 && (
                            <span className="text-gray-500 text-[8.5px] font-bold">+{tooltip.topics.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Problems */}
                    {tooltip.problems.length > 0 && (
                      <div>
                        <span className="text-[8px] uppercase font-black tracking-wider text-gray-400 block mb-0.5">Problems</span>
                        <div className="space-y-0.5">
                          {tooltip.problems.slice(0, 2).map((p, idx) => (
                            <div key={idx} className="text-[9px] text-gray-300 flex items-center gap-1.5 truncate">
                              <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                              <span className="truncate">{p}</span>
                            </div>
                          ))}
                          {tooltip.problems.length > 2 && (
                            <span className="text-gray-500 text-[8px] font-semibold italic pl-2 block">
                              +{tooltip.problems.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[9px] text-gray-500 font-medium py-0.5 text-center">No submissions recorded.</p>
                )}
              </div>,
              document.body
            );
          })()}

          <div className="flex gap-0 min-w-max">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] mr-[5px] pt-[17px]">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <div
                  key={i}
                  className="h-[11px] text-[8.5px] font-bold text-gray-600 leading-[11px]"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 53 week columns */}
            <div className="flex flex-col">
              {/* Month labels */}
              <div className="relative h-[14px] mb-[3px]">
                {monthLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="absolute text-[9px] font-bold text-gray-600 uppercase leading-none"
                    style={{ left: `${lbl.col * 14}px` }}
                  >
                    {lbl.label}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-[3px]">
                {Array.from({ length: COLS }).map((_, w) => (
                  <div key={w} className="flex flex-col gap-[3px]">
                    {Array.from({ length: DAYS }).map((_, d) => {
                      const cellDate = new Date(gridStart);
                      cellDate.setDate(gridStart.getDate() + w * 7 + d);

                      const isFuture = cellDate > today;
                      const dateStr = formatYYYYMMDD(cellDate);
                      const count = isFuture ? 0 : (stats?.submission_activity?.[dateStr] ?? 0);

                      const dateLabel = cellDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      if (isFuture) {
                        return <div key={d} className="w-[11px] h-[11px] rounded-sm opacity-0" />;
                      }

                      return (
                        <div
                          key={d}
                          className={cn(
                            'w-[11px] h-[11px] rounded-sm transition-all duration-150 cursor-pointer hover:scale-125 hover:ring-1 hover:ring-white/30',
                            getHeatmapColor(count, false)
                          )}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const detail = stats?.daily_details?.[dateStr];
                            setTooltip({
                              dateLabel,
                              count: detail ? detail.total : count,
                              accepted: detail ? detail.accepted : (count > 0 ? count : 0),
                              topics: detail ? detail.topics : [],
                              problems: detail ? detail.problems : [],
                              targetRect: {
                                left: rect.left,
                                top: rect.top,
                                width: rect.width,
                                height: rect.height,
                              },
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-gray-600 font-bold pt-1">
          <span className="uppercase tracking-widest">Less</span>
          <div className="flex items-center gap-[3px]">
            {[
              'bg-white/[0.03] border border-white/[0.05]',
              'bg-emerald-900/60 border border-emerald-700/40',
              'bg-emerald-700/70 border border-emerald-600/50',
              'bg-emerald-500/80 border border-emerald-400/60',
              'bg-emerald-400',
              'bg-emerald-300',
            ].map((cls, i) => (
              <div key={i} className={cn('w-[11px] h-[11px] rounded-sm', cls)} />
            ))}
          </div>
          <span className="uppercase tracking-widest">More</span>
        </div>
      </GlassCard>

      {/* ════════════════════════ SUBMISSION HISTORY ════════════════════════ */}
      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7A5FFF]/10">
              <Code2 className="w-4 h-4 text-[#7A5FFF]" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Recent Submissions</h3>
          </div>
          {submissionsPage && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-500">
              {submissionsPage.total} total
            </span>
          )}
        </div>

        <SubmissionHistoryTable
          items={items}
          isLoading={subsLoading}
          error={subsError}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <button
              id="profile-subs-prev"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer',
                page <= 1
                  ? 'border-white/[0.04] text-gray-700 cursor-not-allowed opacity-50'
                  : 'border-white/[0.08] text-gray-400 hover:text-white hover:border-[#4F7DFF]/40 hover:bg-[#4F7DFF]/[0.08] hover:shadow-[0_0_15px_rgba(79,125,255,0.15)]',
              )}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            <span className="text-xs text-gray-600 font-mono px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              {page} / {totalPages}
            </span>

            <button
              id="profile-subs-next"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer',
                page >= totalPages
                  ? 'border-white/[0.04] text-gray-700 cursor-not-allowed opacity-50'
                  : 'border-white/[0.08] text-gray-400 hover:text-white hover:border-[#4F7DFF]/40 hover:bg-[#4F7DFF]/[0.08] hover:shadow-[0_0_15px_rgba(79,125,255,0.15)]',
              )}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </GlassCard>

      <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
};
