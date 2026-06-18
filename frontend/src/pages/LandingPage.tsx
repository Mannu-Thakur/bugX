import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  GitBranch,
  ShieldCheck,
  Swords,
  Trophy,
} from 'lucide-react';
import { Button } from '../shared/ui/button/Button';
import { BugXLogo } from '../shared/ui/logo/BugXLogo';
import { cn } from '../shared/lib/cn';

const trustMetrics = [
  { value: '1v1', label: 'Pressure format' },
  { value: 'Live', label: 'Verdict stream' },
  { value: 'Elo', label: 'Ranked ladder' },
  { value: '5 min', label: 'Focused rounds' },
];

const leaderboard = [
  { rank: '01', name: 'Aarav M.', rating: '2481', delta: '+42' },
  { rank: '02', name: 'Maya R.', rating: '2417', delta: '+31' },
  { rank: '03', name: 'Nikhil S.', rating: '2364', delta: '+28' },
  { rank: '04', name: 'Isha K.', rating: '2319', delta: '+19' },
  { rank: '05', name: 'Dev P.', rating: '2290', delta: '+16' },
];

const validationSteps = [
  {
    title: 'Submitted',
    detail: 'Source locked at 04:38 remaining',
    icon: GitBranch,
  },
  {
    title: 'Verified',
    detail: 'All hidden cases passed',
    icon: CheckCircle2,
  },
  {
    title: 'Benchmarked',
    detail: 'Runtime placed in the top band',
    icon: Gauge,
  },
  {
    title: 'Ranked',
    detail: 'Rating updated in real time',
    icon: Trophy,
  },
];

const codeLines = [
  'function settle(match) {',
  '  const signal = verdict.stream();',
  '  return rank.update(signal);',
  '}',
];

const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        timer = window.setTimeout(() => setVisible(true), delay);
        observer.disconnect();
      },
      { threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
};

const SectionHeader: React.FC<{
  eyebrow: string;
  title: string;
  copy: string;
  align?: 'left' | 'center';
}> = ({ eyebrow, title, copy, align = 'left' }) => (
  <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9CA3AF]/60">
      {eyebrow}
    </p>
    <h2 className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">
      {title}
    </h2>
    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#9CA3AF] sm:text-base">
      {copy}
    </p>
  </div>
);

const PrimaryLink: React.FC<{
  to: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}> = ({ to, children, variant = 'primary' }) => (
  <Link to={to}>
    <Button
      size="lg"
      variant={variant === 'primary' ? 'primary' : 'outline'}
      className={cn(
        'h-11 rounded-md px-5 text-sm font-medium transition duration-300 group',
        variant === 'primary'
          ? 'border border-white/10 bg-[#4F7DFF] text-white shadow-[0_4px_20px_rgba(79,125,255,0.25)] hover:bg-[#6B8FFF]'
          : 'border-white/[0.08] bg-white/[0.02] text-white hover:border-white/20 hover:bg-white/[0.06]'
      )}
    >
      {children}
    </Button>
  </Link>
);

const ArenaPreview: React.FC = () => (
  <div className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#05070A] shadow-2xl shadow-black/85">
    <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4F7DFF] animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]/70">
          Live qualification
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-white/90">
        <Clock className="h-3.5 w-3.5 text-[#4F7DFF]" />
        04:38
      </div>
    </div>

    <div className="grid lg:grid-cols-[1fr_200px_1fr] divide-y divide-white/[0.04] lg:divide-y-0 lg:divide-x lg:divide-white/[0.04]">
      {/* Candidate A */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/50">Candidate A</p>
            <p className="mt-0.5 text-sm font-medium text-white">settle.js</p>
          </div>
          <span className="font-mono text-[10px] text-[#9CA3AF]/70 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">O(n log n)</span>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div className="h-full w-[78%] rounded-full bg-[#4F7DFF]" />
        </div>
        <div className="mt-5 space-y-2.5 font-mono text-[11px] leading-5 text-[#9CA3AF]/80">
          {codeLines.map((line) => (
            <p key={line} className="whitespace-pre">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Arena Info (Middle) */}
      <div className="flex flex-col justify-between bg-white/[0.01] p-6 min-h-[180px]">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/50">Arena</p>
          <p className="mt-1 text-2xl font-medium tracking-tight text-white">Ranked</p>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]/75">
            <span>Verdicts</span>
            <span className="font-mono text-white">9/12</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]/75">
            <span>Pressure</span>
            <span className="text-white font-medium">High</span>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#4F7DFF]">
            <Activity className="h-3 w-3" />
            Live stream
          </div>
        </div>
      </div>

      {/* Candidate B */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/50">Candidate B</p>
            <p className="mt-0.5 text-sm font-medium text-white">fast_solve.js</p>
          </div>
          <span className="font-mono text-[10px] text-[#9CA3AF]/70 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">O(n)</span>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div className="h-full w-[91%] rounded-full bg-[#7A5FFF]" />
        </div>
        <div className="mt-5 space-y-3">
          {['Hidden suite passed', 'Memory within band', 'Tie-break active'].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-xs text-[#9CA3AF]/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#4F7DFF]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LeaderboardPreview: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.01] shadow-xl">
    <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]/60">
        Season ranking
      </p>
      <Link to="/leaderboard" className="flex items-center gap-0.5 text-xs font-medium text-white/80 transition hover:text-white group">
        Full board
        <ChevronRight className="h-3.5 w-3.5 text-[#4F7DFF] group-hover:translate-x-0.5 transition-transform duration-200" />
      </Link>
    </div>
    <div className="divide-y divide-white/[0.03]">
      {leaderboard.map((player) => (
        <div key={player.rank} className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors duration-200 group">
          <span className="font-mono text-xs text-[#9CA3AF]/40 group-hover:text-[#9CA3AF]/70 transition-colors">{player.rank}</span>
          <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{player.name}</span>
          <span className="font-mono text-sm text-white/80 group-hover:text-white transition-colors">{player.rating}</span>
          <span className="font-mono text-xs font-semibold text-[#B9C8FF] bg-[#4F7DFF]/10 px-2 py-0.5 rounded group-hover:bg-[#4F7DFF]/20 transition-colors">
            {player.delta}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const ValidationShowcase: React.FC = () => (
  <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
    <div className="space-y-6">
      {validationSteps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.01] text-white/80 shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
              {index < validationSteps.length - 1 && <div className="mt-3.5 h-10 w-px bg-white/[0.04]" />}
            </div>
            <div className="pt-1.5">
              <h3 className="text-sm font-medium text-white">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]/80">{step.detail}</p>
            </div>
          </div>
        );
      })}
    </div>

    <div className="rounded-xl border border-white/[0.05] bg-[#05070A] p-6 shadow-2xl shadow-black/85">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]/50">Validation run</p>
          <p className="mt-1 text-lg font-medium text-white">Solution accepted</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-[#4F7DFF]/80" />
      </div>
      <div className="grid gap-4 py-5 sm:grid-cols-3 border-b border-white/[0.04]">
        {[
          ['12/12', 'Cases'],
          ['91 ms', 'Runtime'],
          ['42 MB', 'Memory'],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="text-xl font-medium tracking-tight text-white">{value}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]/60">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 pt-4">
        {['Hidden cases', 'Runtime band', 'Leaderboard sync'].map((label, index) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]/80">{label}</span>
            <span className={cn('font-medium', index === 2 ? 'text-[#B9C8FF]' : 'text-white/90')}>
              {index === 2 ? 'Updated' : 'Passed'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen overflow-hidden bg-[#05070A] text-white">
      <section className="relative min-h-[calc(100vh-56px)] flex items-center border-b border-white/[0.04]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/premium_developer_coding.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-[1.02] object-cover opacity-[0.14] filter brightness-75 select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#05070A_0%,rgba(5,7,10,0.96)_35%,rgba(5,7,10,0.75)_65%,#05070A_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,#05070A_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(79,125,255,0.12),transparent_40%),radial-gradient(circle_at_68%_22%,rgba(122,95,255,0.08),transparent_35%)]" />
          <div className="absolute inset-0 grid-bg opacity-[0.25] pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4F7DFF]/5 blur-[120px] rounded-full pointer-events-none" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-center px-5 py-20 sm:px-8 lg:px-10 z-10">
          <Reveal className="max-w-5xl">
            <div className="inline-flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 rounded-full text-[11px] font-medium text-[#9CA3AF] backdrop-blur-xl shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4F7DFF] animate-pulse" />
              Season 01 is open for ranked contenders
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl xl:leading-[1.05]">
              The engineering arena<br className="hidden sm:inline" /> for serious builders.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#9CA3AF] sm:text-lg">
              bugX turns live problem solving into proof. Compete under pressure, earn a rank,
              and make your ability visible.
            </p>

            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
              <PrimaryLink to="/battle">
                <Swords className="mr-1.5 h-4 w-4" />
                Enter arena
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </PrimaryLink>
              <PrimaryLink to="/leaderboard" variant="secondary">
                View leaderboard
              </PrimaryLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-white/[0.04] bg-[#05070A]/30">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {trustMetrics.map((metric, index) => (
              <div key={metric.label} className="relative flex flex-col items-start lg:pl-8 first:pl-0">
                {index > 0 && (
                  <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px bg-white/[0.06]" />
                )}
                <p className="text-3xl font-medium tracking-tight text-white sm:text-4xl">{metric.value}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]/60">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <Reveal className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeader
            eyebrow="Battle Arena Showcase"
            title="A quiet room with a very loud clock."
            copy="Every match is pared down to what matters: the prompt, the clock, the verdict, and the opponent solving beside you."
          />
          <ArenaPreview />
        </Reveal>
      </section>

      <section className="border-y border-white/[0.04] bg-white/[0.005]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
          <Reveal>
            <SectionHeader
              eyebrow="Why Competition Matters"
              title="The pressure is the point."
              copy="Great engineers are not defined by trivia. They are defined by judgment, speed, clarity, and the ability to recover while the system is still moving."
              align="center"
            />
          </Reveal>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              ['01', 'Skill becomes observable', 'A live match exposes tradeoffs that static profiles hide.'],
              ['02', 'Speed meets restraint', 'The fastest solution only matters when it is still correct.'],
              ['03', 'Rank has memory', 'Every result compounds into a signal other builders understand.'],
            ].map(([number, title, copy], index) => (
              <Reveal key={title} delay={index * 120}>
                <div className="border-t border-white/[0.05] pt-5">
                  <p className="font-mono text-xs font-semibold text-[#4F7DFF]">{number}</p>
                  <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#9CA3AF]/70 max-w-xs">{copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <Reveal className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeader
            eyebrow="Live Leaderboard Preview"
            title="A rank that has to be defended."
            copy="The ladder rewards repeatable execution, not a single lucky solve. Every match moves the field."
          />
          <LeaderboardPreview />
        </Reveal>
      </section>

      <section className="border-y border-white/[0.04] bg-white/[0.005]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
          <Reveal className="mb-12">
            <SectionHeader
              eyebrow="Real-Time Validation Showcase"
              title="The verdict arrives while the match is still warm."
              copy="Submissions are validated, benchmarked, and reflected in rank without turning the landing page into an operations console."
            />
          </Reveal>
          <Reveal delay={140}>
            <ValidationShowcase />
          </Reveal>
        </div>
      </section>

      <section className="relative px-5 py-24 sm:px-8 sm:py-32 lg:px-10 border-b border-white/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(79,125,255,0.06),transparent_45%)] pointer-events-none" />
        <Reveal className="relative mx-auto max-w-4xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9CA3AF]/50">
            Final CTA
          </p>
          <h2 className="mt-4 text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-6xl">
            Earn the rank.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#9CA3AF]/70">
            Step into a ranked arena built for developers who want proof, not polish.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryLink to="/battle">
              Start competing
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </PrimaryLink>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.04] px-5 py-12 sm:px-8 lg:px-10 bg-[#05070A]/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 text-xs text-[#9CA3AF]/60 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
            <BugXLogo className="h-5 w-5 text-[#d97706]" />
            <span className="font-sans font-medium tracking-tight lowercase">bug<span className="text-[#d97706] font-semibold uppercase">X</span></span>
          </Link>
          <nav className="flex flex-wrap gap-6">
            <Link to="/problems" className="transition hover:text-white">Problems</Link>
            <Link to="/battle" className="transition hover:text-white">Arena</Link>
            <Link to="/leaderboard" className="transition hover:text-white">Leaderboard</Link>
            <Link to="/terms" className="transition hover:text-white">Terms</Link>
          </nav>
          <p>Built for ranked engineering pressure.</p>
        </div>
      </footer>
    </div>
  );
};
