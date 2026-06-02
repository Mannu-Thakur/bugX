import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Terminal, Award, ShieldAlert, Database, CheckCircle2, LogOut, User, Sun, Moon, BookOpen, Swords } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from '../button/IconButton';
import { useAuth } from '../../../features/auth/useAuth';
import { UserMenu } from '../../../features/auth/ui/UserMenu';
import { EditProfileModal } from '../../../features/auth/ui/EditProfileModal';
import { ENV } from '../../config/env';
import { BugXLogo } from '../logo/BugXLogo';

export const PageShell: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({ children, fullWidth = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'loading' | 'online' | 'degraded' | 'offline'>('loading');
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const { user, logout } = useAuth();

  // Dark/Light Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default theme is dark
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Live health check on backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${ENV.API_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'degraded') {
            setHealthStatus('degraded');
          } else {
            setHealthStatus('online');
          }
        } else {
          setHealthStatus('offline');
        }
      } catch {
        setHealthStatus('offline');
      }
    };
    checkHealth();
    const intervalId = window.setInterval(checkHealth, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  const navLinks = [
    { to: '/problems', label: 'Problems', icon: <Terminal className="w-4 h-4" /> },
    { to: '/battle', label: '1v1 Battle', icon: <Swords className="w-4 h-4 text-orange-400" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Award className="w-4 h-4" /> },
    ...(user ? [{ to: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> }] : []),
    { to: '/settings', label: 'Vault', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-gray-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-screen max-w-full bg-dark-panel/85 backdrop-blur border-b border-white/[0.06] select-none relative">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 w-full min-w-0 gap-3">
            
            {/* Logo */}
            <div className="flex items-center gap-6 min-w-0">
              <Link to="/problems" className="flex items-center gap-2 group shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gray-900/60 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-all duration-150 overflow-hidden border border-white/[0.08] text-gray-300 group-hover:text-blue-400 p-1.5">
                  <BugXLogo className="w-full h-full" />
                </div>
                <span className="font-sans font-bold text-lg tracking-tight text-gray-100 group-hover:text-white transition-colors duration-150 lowercase">
                  bug<span className="text-blue-500 font-extrabold uppercase">X</span>
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
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
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
              </nav>
            </div>

            {/* Right-side Auth & Actions */}
            <div className="hidden md:flex items-center gap-4">
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors border border-white/[0.08] select-none cursor-pointer"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-500" />
                )}
              </button>

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
                      cn("px-4 py-1.5 text-sm font-medium transition-colors duration-150 rounded-md", isActive ? "text-white bg-dark-hover" : "text-gray-400 hover:text-gray-200")
                    }
                  >
                    Login
                  </NavLink>
                  <NavLink 
                    to="/register" 
                    className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors duration-150 shadow-md shadow-blue-500/10 active:scale-[0.98]"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 md:hidden shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors border border-white/[0.08] select-none cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-500" />
                )}
              </button>
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
          <div className="md:hidden border-t border-white/[0.06] bg-dark-panel/95 animate-fade-in">
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

              <div className="border-t border-white/[0.04] my-2 pt-2">
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
                    
                    <div className="px-3 py-2 flex flex-col gap-0.5 border border-white/[0.04] bg-dark-bg/30 rounded-md">
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
                      className="flex items-center justify-center py-2 text-center text-gray-400 hover:text-gray-200 hover:bg-dark-hover border border-white/[0.08] rounded-md text-sm font-medium"
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
        fullWidth ? "max-w-none p-0" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-6"
      )}>
        <div className="flex-1 w-full h-full">
          {children}
        </div>
      </main>

      {/* App Sticky Footer */}
      <footer className="bg-dark-panel border-t border-white/[0.06] select-none mt-auto py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          
          <p className="text-[11px] text-gray-500 tracking-wide font-sans">
            &copy; {new Date().getFullYear()} bugX. All rights reserved. Built with React, Vite & Tailwind CSS.
          </p>

          {/* Health Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-sans">Backend Core:</span>
            {healthStatus === 'loading' && (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">checking</span>
              </div>
            )}
            {healthStatus === 'online' && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <Database className="w-3 h-3 text-emerald-500" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider">online</span>
              </div>
            )}
            {healthStatus === 'degraded' && (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs" title="Backend is reachable, but one or more dependencies need attention.">
                <Database className="w-3 h-3 text-amber-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider font-semibold">degraded</span>
              </div>
            )}
            {healthStatus === 'offline' && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs">
                <Database className="w-3 h-3 text-rose-500" />
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">offline (mocked)</span>
              </div>
            )}
          </div>

        </div>
      </footer>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </div>
  );
};
