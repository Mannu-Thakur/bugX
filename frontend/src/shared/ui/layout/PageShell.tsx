import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Terminal, Award, ShieldAlert, LogOut, User, BookOpen, Swords, Flame, Palette, Settings, Play, Pause, RotateCcw, ChevronLeft, Clock } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from '../button/IconButton';
import { useAuth } from '../../../features/auth/useAuth';
import { useToast } from '../toast/ToastProvider';
import { UserMenu } from '../../../features/auth/ui/UserMenu';
import { EditProfileModal } from '../../../features/auth/ui/EditProfileModal';
import { BugXLogo } from '../logo/BugXLogo';
import { api } from '../../lib/api';
import { SettingsModal } from './SettingsModal';

export const PageShell: React.FC<{ children: React.ReactNode; fullWidth?: boolean; hideFooter?: boolean }> = ({ children, fullWidth = false }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync Focus Mode setting
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('bugx_focusMode') === 'true');

  useEffect(() => {
    const handleSync = () => {
      setFocusMode(localStorage.getItem('bugx_focusMode') === 'true');
    };
    window.addEventListener('bugx-settings-changed', handleSync);
    return () => window.removeEventListener('bugx-settings-changed', handleSync);
  }, []);

  const segments = location.pathname.split('/').filter(Boolean);
  const isProblemPage = segments.length === 2 && segments[0] === 'problems';
  const isFocusModeActive = focusMode && isProblemPage;

  // Global Timer/Stopwatch State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'timer'>('stopwatch');
  const [timerPopoverOpen, setTimerPopoverOpen] = useState(false);
  const [tempHours, setTempHours] = useState(1);
  const [tempMinutes, setTempMinutes] = useState(0);
  const [activeProblem, setActiveProblem] = useState<{ title: string; slug: string } | null>(null);
  const [timerCollapsing, setTimerCollapsing] = useState(false);

  const popoverRef = React.useRef<HTMLDivElement>(null);
  const { success: showToastSuccess } = useToast();

  useEffect(() => {
    const handleProblemLoaded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setActiveProblem({ title: detail.title, slug: detail.slug });
      }
    };
    const handleProblemUnloaded = () => {
      setActiveProblem(null);
      setTimerIsActive(false);
      setTimerSeconds(0);
      setTimerPopoverOpen(false);
    };
    const handleTimerResetSignal = () => {
      setTimerIsActive(false);
      setTimerSeconds(0);
    };

    window.addEventListener('bugx-problem-loaded', handleProblemLoaded);
    window.addEventListener('bugx-problem-unloaded', handleProblemUnloaded);
    window.addEventListener('bugx-timer-reset-signal', handleTimerResetSignal);

    return () => {
      window.removeEventListener('bugx-problem-loaded', handleProblemLoaded);
      window.removeEventListener('bugx-problem-unloaded', handleProblemUnloaded);
      window.removeEventListener('bugx-timer-reset-signal', handleTimerResetSignal);
    };
  }, []);

  // Tick effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerIsActive) {
      interval = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds(prev => prev + 1);
        } else {
          setTimerSeconds(prev => {
            if (prev <= 1) {
              setTimerIsActive(false);
              showToastSuccess('Timer finished! Time is up!');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsActive, timerMode, showToastSuccess]);

  // Click outside to close timer popover
  const timerTriggerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (timerTriggerRef.current && timerTriggerRef.current.contains(target)) return;
      setTimerPopoverOpen(false);
    };
    if (timerPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [timerPopoverOpen]);

  // Reset timer on path change
  useEffect(() => {
    setTimerSeconds(0);
    setTimerIsActive(false);
    setTimerMode('stopwatch');
    setTempHours(1);
    setTempMinutes(0);
    setTimerPopoverOpen(false);
  }, [location.pathname]);

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const renderTimerWidget = () => {
    if (!activeProblem) return null;

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.floor((timerSeconds % 3600) / 60);
    const s = timerSeconds % 60;
    const inlineTime = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

    const isRunning = timerIsActive;
    const isPaused = !timerIsActive && timerSeconds > 0;
    const showPill = isRunning || isPaused || timerCollapsing;
    const countdownTotal = tempHours * 3600 + tempMinutes * 60;

    // Animated stop: collapse first, then reset
    const handleStop = () => {
      setTimerIsActive(false);
      setTimerCollapsing(true);
    };
    const handleCollapseEnd = () => {
      setTimerSeconds(0);
      setTimerCollapsing(false);
    };

    return (
      <div className="relative" ref={timerTriggerRef}>
        {/* Spring animations */}
        <style>{`
          @keyframes bugx-pill-spring {
            0%   { opacity:0; transform:scaleX(0.3); transform-origin:right center; }
            50%  { opacity:1; transform:scaleX(1.06); }
            70%  { transform:scaleX(0.97); }
            85%  { transform:scaleX(1.02); }
            100% { opacity:1; transform:scaleX(1); }
          }
          @keyframes bugx-pill-collapse {
            0%   { opacity:1; transform:scaleX(1); transform-origin:right center; }
            15%  { transform:scaleX(1.06); }
            100% { opacity:0; transform:scaleX(0.2); }
          }
          @keyframes bugx-popup-spring {
            0%   { opacity:0; transform:scale(0.92) translateY(-6px); }
            50%  { opacity:1; transform:scale(1.03) translateY(1px); }
            75%  { transform:scale(0.99) translateY(-1px); }
            100% { opacity:1; transform:scale(1) translateY(0); }
          }
        `}</style>

        {/* Idle — just the clock icon */}
        {!showPill && (
          <button
            onClick={() => setTimerPopoverOpen(prev => !prev)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border border-dark-border bg-dark-panel",
              "text-dark-text/50 hover:text-amber-500 hover:bg-dark-hover transition-colors cursor-pointer select-none"
            )}
            title={`Timer – ${activeProblem.title}`}
          >
            <Clock className="w-4 h-4" />
          </button>
        )}

        {/* Running / Paused / Collapsing — inline pill */}
        {showPill && (
          <div
            className={cn(
              "flex items-center gap-0.5 h-8 rounded-lg border bg-dark-panel pl-0.5 pr-1 select-none",
              isRunning ? "border-amber-500/25" : "border-dark-border"
            )}
            style={{
              animation: timerCollapsing
                ? 'bugx-pill-collapse 0.4s ease-in both'
                : 'bugx-pill-spring 0.5s ease-out both',
              ...(isRunning ? { boxShadow: '0 0 12px rgba(245,158,11,0.06)' } : {}),
            }}
            onAnimationEnd={() => { if (timerCollapsing) handleCollapseEnd(); }}
          >
            {/* ◂ Stop & collapse */}
            <button
              onClick={handleStop}
              className="flex items-center justify-center w-6 h-6 rounded text-dark-text/40 hover:text-dark-text/80 hover:bg-dark-hover transition-colors cursor-pointer"
              title="Stop"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* ⏸ / ▶ */}
            <button
              onClick={() => { if (!timerCollapsing) setTimerIsActive(!timerIsActive); }}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded transition-colors cursor-pointer",
                isRunning
                  ? "text-dark-text/60 hover:text-dark-text hover:bg-dark-hover"
                  : "text-emerald-500 hover:bg-emerald-500/10"
              )}
              title={isRunning ? 'Pause' : 'Resume'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Time */}
            <span
              className={cn(
                "text-[11px] font-bold font-mono tracking-tight tabular-nums text-center px-0.5",
                isRunning ? "text-[#5B9BFF]" : "text-dark-text/50"
              )}
              style={{ minWidth: '3.75rem' }}
            >
              {inlineTime}
            </span>

            {/* ↻ Reset */}
            <button
              onClick={handleStop}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded transition-colors cursor-pointer",
                isRunning
                  ? "text-[#5B9BFF]/60 hover:text-[#5B9BFF] hover:bg-[#5B9BFF]/10"
                  : "text-dark-text/30 hover:text-dark-text/70 hover:bg-dark-hover"
              )}
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Configuration popup */}
        {timerPopoverOpen && (
          <div
            ref={popoverRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-2 w-[17rem] bg-dark-panel rounded-xl shadow-2xl p-3.5 text-dark-text z-50 flex flex-col gap-3.5 border border-dark-border"
            style={{ animation: 'bugx-popup-spring 0.4s ease-out both' }}
          >
            {/* Mode cards */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTimerMode('stopwatch')}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all cursor-pointer",
                  timerMode === 'stopwatch'
                    ? "border-[#5B9BFF]/40 bg-[#5B9BFF]/[0.06] text-[#5B9BFF]"
                    : "border-dark-border bg-dark-bg/30 text-dark-text/35 hover:text-dark-text/55 hover:border-dark-border"
                )}
              >
                <Clock className={cn("w-5 h-5", timerMode === 'stopwatch' ? "text-[#5B9BFF]" : "text-dark-text/25")} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Stopwatch</span>
              </button>
              <button
                onClick={() => setTimerMode('timer')}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all cursor-pointer",
                  timerMode === 'timer'
                    ? "border-amber-500/40 bg-amber-500/[0.06] text-amber-500"
                    : "border-dark-border bg-dark-bg/30 text-dark-text/35 hover:text-dark-text/55 hover:border-dark-border"
                )}
              >
                <Clock className={cn("w-5 h-5", timerMode === 'timer' ? "text-amber-500" : "text-dark-text/25")} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Timer</span>
              </button>
            </div>

            {/* Countdown inputs */}
            {timerMode === 'timer' && (
              <div className="flex items-center justify-center gap-3 w-full">
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number" min={0} max={23} value={tempHours}
                    onChange={(e) => setTempHours(Math.min(Math.max(Number(e.target.value), 0), 23))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-[3.25rem] h-10 rounded-lg text-center font-mono font-bold text-base focus:outline-none text-dark-text bg-dark-bg border border-dark-border focus:border-amber-500/40 transition-colors"
                  />
                  <span className="text-[8px] text-dark-text/25 uppercase font-semibold tracking-widest">hr</span>
                </div>
                <span className="text-dark-text/20 font-bold text-lg mb-5 select-none">:</span>
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number" min={0} max={59} value={tempMinutes}
                    onChange={(e) => setTempMinutes(Math.min(Math.max(Number(e.target.value), 0), 59))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-[3.25rem] h-10 rounded-lg text-center font-mono font-bold text-base focus:outline-none text-dark-text bg-dark-bg border border-dark-border focus:border-amber-500/40 transition-colors"
                  />
                  <span className="text-[8px] text-dark-text/25 uppercase font-semibold tracking-widest">min</span>
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={() => {
                if (timerMode === 'timer') {
                  const total = tempHours * 3600 + tempMinutes * 60;
                  if (total === 0) return;
                  setTimerSeconds(total);
                }
                setTimerIsActive(true);
                setTimerPopoverOpen(false);
              }}
              disabled={timerMode === 'timer' && countdownTotal === 0}
              className={cn(
                "w-full h-9 rounded-lg font-semibold text-[13px] transition-all cursor-pointer active:scale-[0.97] flex items-center justify-center gap-2 border",
                timerMode === 'stopwatch'
                  ? "bg-[#5B9BFF]/10 text-[#5B9BFF] border-[#5B9BFF]/20 hover:bg-[#5B9BFF]/[0.18] hover:border-[#5B9BFF]/30"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/[0.18] hover:border-amber-500/30",
                "disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              <Play className="w-3.5 h-3.5" />
              {timerMode === 'stopwatch' ? 'Start Stopwatch' : 'Start Timer'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setPopoverOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('default', { month: 'short' }).toUpperCase();

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak!";
    if (streak === 1) return "Now or Never!";
    if (streak < 4) return "Keep the fire burning!";
    if (streak < 7) return "You are on a roll!";
    return "Unstoppable coder!";
  };

  const { user, logout } = useAuth();

  // Fetch daily streak when user is logged in
  useEffect(() => {
    if (!user) {
      setCurrentStreak(0);
      return;
    }
    let cancelled = false;
    api.users.getStats()
      .then((stats) => {
        if (!cancelled) {
          let streak = stats.current_streak ?? 0;
          if (stats.last_active_date) {
            const parts = stats.last_active_date.split('-');
            if (parts.length === 3) {
              const lastActive = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              const today = new Date();
              lastActive.setHours(0, 0, 0, 0);
              today.setHours(0, 0, 0, 0);
              const diffTime = today.getTime() - lastActive.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 1) {
                streak = 0;
              }
            }
          }
          setCurrentStreak(streak);
        }
      })
      .catch(() => {
        if (!cancelled) setCurrentStreak(0);
      });
    return () => { cancelled = true; };
  }, [user]);

  const navLinks = [
    { to: '/problems', label: 'Problems', icon: <Terminal className="w-4 h-4" /> },
    { to: '/battle', label: 'Code Battle', icon: <Swords className="w-4 h-4 text-[#d97706]" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Award className="w-4 h-4" /> },
    ...(user ? [{ to: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> }] : []),
    { to: '/settings', label: 'Vault', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-gray-200">
      {/* Top Navbar */}
      {!isFocusModeActive && (
        <header className="sticky top-0 z-40 w-full bg-[#05070A]/80 backdrop-blur-md border-b border-white/[0.05] select-none">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 w-full min-w-0 gap-3">

            {/* Logo */}
            <div className="flex items-center gap-6 min-w-0 h-full">
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden text-[#d97706] p-0.5">
                  <BugXLogo className="w-full h-full" />
                </div>
                <span className="font-sans font-medium text-sm tracking-tight text-white transition-colors duration-150 lowercase">
                  bug<span className="text-[#d97706] font-semibold uppercase">X</span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-6 h-full">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-1.5 h-full text-[13px] font-medium transition-colors duration-150 hover:text-white",
                        isActive
                          ? "text-white font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-[#4F7DFF]"
                          : "text-[#eff1f6bf]"
                      )
                    }
                  >
                    {link.icon}
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Right-side Auth & Actions */}
            <div className="hidden md:flex items-center gap-4">

              {/* Daily Streak Button & Popover */}
              {user && (
                <div
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold bg-[#ffffff05] hover:bg-[#ffffff10] rounded-lg transition-colors border border-white/[0.06] select-none cursor-pointer group"
                  >
                    <Flame className={cn(
                      "w-4 h-4 transition-colors",
                      currentStreak > 0
                        ? "text-[#d97706] group-hover:text-[#f59e0b] animate-pulse"
                        : "text-gray-500 group-hover:text-gray-400"
                    )} />
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      currentStreak > 0 ? "text-[#d97706]" : "text-gray-500"
                    )}>
                      {currentStreak}
                    </span>
                  </Link>

                  {/* Popover */}
                  {popoverOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 bg-[#05070a]/95 border border-white/[0.06] rounded-xl shadow-2xl p-2.5 text-white z-50 flex items-center justify-between backdrop-blur-md animate-scale-in"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Left Side */}
                      <div className="flex flex-col">
                        <span className="text-[#d97706] font-semibold text-xs leading-tight tracking-wide">
                          {currentStreak} Streak
                        </span>
                        <span className="text-gray-300 font-medium text-[10px] mt-0.5">
                          {getStreakMessage(currentStreak)}
                        </span>
                      </div>

                      {/* Right Side - Hexagonal Badge */}
                      <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                        <svg className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 60 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="badgeBorder" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4f4f4f" />
                              <stop offset="50%" stopColor="#3a3a3a" />
                              <stop offset="100%" stopColor="#1e1e1e" />
                            </linearGradient>
                            <linearGradient id="badgeBg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2c2c2c" />
                              <stop offset="100%" stopColor="#161616" />
                            </linearGradient>
                            <linearGradient id="badgeGoldBorder" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d97706" />
                              <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                            <linearGradient id="badgeGoldBg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3d2a0f" />
                              <stop offset="100%" stopColor="#1e1507" />
                            </linearGradient>
                          </defs>

                          {/* Outer regular hexagon with smooth border */}
                          <path
                            d="M30 3 L57 18.5 L57 49.5 L30 65 L3 49.5 L3 18.5 Z"
                            fill={currentStreak > 0 ? "url(#badgeGoldBg)" : "url(#badgeBg)"}
                            stroke={currentStreak > 0 ? "url(#badgeGoldBorder)" : "url(#badgeBorder)"}
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                          />

                          {/* Inner accent ring */}
                          <path
                            d="M30 8 L52 20.7 L52 47.3 L30 60 L8 47.3 L8 20.7 Z"
                            fill="none"
                            stroke={currentStreak > 0 ? "#ffb34015" : "#3e3e3e"}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>

                        {/* Date Text Centered inside the hexagon */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pt-0.5">
                          <span className={cn(
                            "text-xs font-bold leading-none tracking-tight",
                            currentStreak > 0 ? "text-[#d97706]" : "text-gray-300"
                          )}>
                            {day}
                          </span>
                          <span className="text-[7.5px] font-semibold tracking-wider text-gray-500 uppercase mt-0.5">
                            {month}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timer Widget */}
              {renderTimerWidget()}

              {/* Settings Button - only for logged in users */}
              {user && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-dark-border bg-dark-panel text-dark-text/60 hover:text-dark-text hover:bg-dark-hover transition-colors select-none cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              )}

              {user ? (
                <div className="flex items-center gap-4">
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-medium px-2 py-1 rounded border border-amber-500/10 bg-amber-500/5 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Admin Panel
                    </Link>
                  )}
                  <UserMenu onEditProfile={() => setEditProfileOpen(true)} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      cn("px-4 py-1.5 text-sm font-medium transition-colors duration-150 rounded-md", isActive ? "text-white bg-dark-hover" : "text-[#eff1f6bf] hover:text-white")
                    }
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="px-4 py-1.5 text-sm font-semibold bg-[#4F7DFF] hover:bg-[#6B8FFF] text-white rounded-md transition-colors duration-150 shadow-sm shadow-[#4F7DFF]/10 active:scale-[0.98]"
                  >
                    Sign Up
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 md:hidden shrink-0">
              {user && (
                <Link
                  to="/profile"
                  className="flex items-center gap-1 p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors border border-dark-border select-none cursor-pointer"
                  title={currentStreak > 0 ? `🔥 ${currentStreak} day streak! Keep coding!` : `⚡ Start your streak!`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Flame className={cn(
                    "w-4 h-4",
                    currentStreak > 0 ? "text-[#d97706]" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    currentStreak > 0 ? "text-[#d97706]" : "text-gray-500"
                  )}>
                    {currentStreak}
                  </span>
                </Link>
              )}
              {/* Timer Widget */}
              {renderTimerWidget()}

              {user && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center p-1.5 text-dark-text/60 hover:text-dark-text hover:bg-dark-hover rounded-lg transition-colors border border-dark-border select-none cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              )}
              <IconButton
                icon={mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                aria-label="Toggle mobile navigation menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              />
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-border bg-dark-panel/95 animate-fade-in">
            <div className="px-4 pt-2 pb-4 space-y-1.5 select-none">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors",
                      isActive
                        ? "text-blue-400 bg-blue-500/5 font-semibold"
                        : "text-gray-400 hover:text-gray-200 hover:bg-dark-hover"
                    )
                  }
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}

              <div className="border-t border-dark-border/40 my-2 pt-2">
                {user ? (
                  <div className="space-y-2">
                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-amber-400 hover:text-amber-300 text-base font-semibold"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    )}

                    <div className="px-3 py-2 flex flex-col gap-0.5 border border-dark-border/40 bg-dark-bg/30 rounded-md">
                      <span className="text-xs text-gray-500">Signed in as</span>
                      <span className="text-sm font-bold text-gray-200 truncate">{user.username}</span>
                      <span className="text-[11px] text-gray-400 truncate">{user.email}</span>
                    </div>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setEditProfileOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-400 hover:text-gray-200 hover:bg-dark-hover text-base rounded-md"
                    >
                      <Terminal className="w-4 h-4 text-gray-500" />
                      Edit Profile
                    </button>

                    <Link
                      to="/appearance"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-400 hover:text-gray-200 hover:bg-dark-hover text-base rounded-md"
                    >
                      <Palette className="w-4 h-4 text-gray-500" />
                      Appearance
                    </Link>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 text-base rounded-md font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-400/80" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center py-2 text-center text-gray-400 hover:text-gray-200 hover:bg-dark-hover border border-dark-border rounded-md text-sm font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center py-2 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium shadow-md shadow-blue-500/10"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    )}

      {/* Main Page Area */}
      <main className={cn(
        "flex-1 w-full flex flex-col mx-auto",
        (fullWidth || isFocusModeActive) ? "max-w-none p-0" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-3"
      )}>
        <div className="flex-1 w-full h-full">
          {children}
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
