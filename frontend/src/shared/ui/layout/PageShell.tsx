import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Terminal, Award, ShieldAlert, LogOut, User, BookOpen, Swords, Flame } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from '../button/IconButton';
import { useAuth } from '../../../features/auth/useAuth';
import { UserMenu } from '../../../features/auth/ui/UserMenu';
import { EditProfileModal } from '../../../features/auth/ui/EditProfileModal';
import { BugXLogo } from '../logo/BugXLogo';
import { api } from '../../lib/api';

export const PageShell: React.FC<{ children: React.ReactNode; fullWidth?: boolean; hideFooter?: boolean }> = ({ children, fullWidth = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!cancelled) setCurrentStreak(stats.current_streak ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCurrentStreak(0);
      });
    return () => { cancelled = true; };
  }, [user]);

  const navLinks = [
    { to: '/problems', label: 'Problems', icon: <Terminal className="w-4 h-4" /> },
    { to: '/battle', label: 'Code Battle', icon: <Swords className="w-4 h-4 text-orange-400" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Award className="w-4 h-4" /> },
    ...(user ? [{ to: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> }] : []),
    { to: '/settings', label: 'Vault', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-gray-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-screen max-w-full bg-[#282828] border-b border-[#3e3e3e] select-none relative">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[50px] w-full min-w-0 gap-3">

            {/* Logo */}
            <div className="flex items-center gap-6 min-w-0">
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="w-[26px] h-[26px] rounded flex items-center justify-center overflow-hidden text-[#ffa116] p-0.5">
                  <BugXLogo className="w-full h-full" />
                </div>
                <span className="font-sans font-bold text-base tracking-tight text-white group-hover:text-white transition-colors duration-150 lowercase">
                  bug<span className="text-[#ffa116] font-extrabold uppercase">X</span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1.5">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "text-white bg-[#ffffff14] font-medium"
                          : "text-[#eff1f6bf] hover:text-white hover:bg-[#ffffff0a]"
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold bg-[#ffffff0a] hover:bg-[#ffffff14] rounded-lg transition-colors border border-[#ffffff14] select-none cursor-pointer group"
                  >
                    <Flame className={cn(
                      "w-4 h-4 transition-colors",
                      currentStreak > 0
                        ? "text-orange-400 group-hover:text-orange-300 animate-pulse"
                        : "text-gray-500 group-hover:text-gray-400"
                    )} />
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      currentStreak > 0 ? "text-orange-400" : "text-gray-500"
                    )}>
                      {currentStreak}
                    </span>
                  </Link>

                  {/* Popover */}
                  {popoverOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-[#1b1b1b]/95 border border-[#3e3e3e] rounded-xl shadow-2xl p-4 text-white z-50 flex items-center justify-between backdrop-blur-md animate-scale-in"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Left Side */}
                      <div className="flex flex-col">
                        <span className="text-[#ffa116] font-bold text-lg leading-tight tracking-wide">
                          {currentStreak} Streak
                        </span>
                        <span className="text-white font-extrabold text-sm mt-1">
                          {getStreakMessage(currentStreak)}
                        </span>
                      </div>

                      {/* Right Side - Hexagonal Badge */}
                      <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
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
                              <stop offset="0%" stopColor="#ffa116" />
                              <stop offset="100%" stopColor="#ff7b00" />
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
                            stroke={currentStreak > 0 ? "#ffb34033" : "#3e3e3e"}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>

                        {/* Date Text Centered inside the hexagon */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pt-0.5">
                          <span className={cn(
                            "text-base font-extrabold leading-none tracking-tight",
                            currentStreak > 0 ? "text-[#ffa116]" : "text-gray-300"
                          )}>
                            {day}
                          </span>
                          <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase mt-0.5">
                            {month}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user ? (
                <div className="flex items-center gap-4">
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded border border-amber-500/20 bg-amber-500/5 transition-colors"
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
                    className="px-4 py-1.5 text-sm font-semibold bg-[#ffa116] hover:bg-[#ffb340] text-[#1a1a1a] rounded-md transition-colors duration-150 active:scale-[0.98]"
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
                    currentStreak > 0 ? "text-orange-400" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    currentStreak > 0 ? "text-orange-400" : "text-gray-500"
                  )}>
                    {currentStreak}
                  </span>
                </Link>
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

      {/* Main Page Area */}
      <main className={cn(
        "flex-1 w-full flex flex-col mx-auto",
        fullWidth ? "max-w-none p-0" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-3"
      )}>
        <div className="flex-1 w-full h-full">
          {children}
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </div>
  );
};
