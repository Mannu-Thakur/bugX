import React, { useState, useEffect } from 'react';
import { Check, Sun, Moon } from 'lucide-react';
import { cn } from '../../shared/lib/cn';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export const AppearancePage: React.FC = () => {
  const toast = useToast();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

  // Sync state if theme is toggled elsewhere (e.g. from header UserMenu)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const selectTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      toast.success('Switched to light appearance');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      toast.success('Switched to dark appearance');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, newTheme: 'dark' | 'light') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectTheme(newTheme);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16 select-none animate-fade-in">

      {/* ════════════════════════ HERO SECTION ════════════════════════ */}
      <section className="border-b border-white/[0.04] pb-6 relative select-none">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#4F7DFF]/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="space-y-2 relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500">
            Workspace Preference
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-1">
            Appearance
          </h1>
          <p className="text-sm text-gray-400 max-w-md leading-relaxed">
            Customize how bugX looks across your workspace.
          </p>
        </div>
      </section>

      {/* ════════════════════════ THEME SELECTION ════════════════════════ */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-gray-300 tracking-tight">Theme Interface</h2>
          <p className="text-xs text-gray-500">Select your preferred system theme layout.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── DARK PREVIEW CARD ── */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => selectTheme('dark')}
            onKeyDown={(e) => handleKeyDown(e, 'dark')}
            aria-label="Select Dark Mode Theme"
            className={cn(
              "group relative flex flex-col rounded-2xl border bg-[#0A0D14] p-4 gap-4 transition-all duration-350 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4F7DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A] hover:bg-white/[0.015]",
              theme === 'dark'
                ? "border-[#4F7DFF] shadow-lg shadow-[#4F7DFF]/5 ring-1 ring-[#4F7DFF]/20"
                : "border-white/[0.04] hover:border-white/[0.08]"
            )}
          >
            {/* Miniature Mockup Representation */}
            <div style={{ background: '#05070A', borderColor: 'rgba(255,255,255,0.04)' }} className="relative h-44 rounded-xl border p-3 flex flex-col gap-2 overflow-hidden shadow-inner select-none pointer-events-none">
              {/* Fake Sidebar / Navigation bar */}
              <div style={{ borderColor: 'rgba(255,255,255,0.04)' }} className="flex items-center justify-between border-b pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>
                <div style={{ background: '#0B0E14', borderColor: 'rgba(255,255,255,0.04)' }} className="h-3 w-16 rounded border flex items-center justify-center">
                  <span className="text-[7px] text-gray-600 font-mono">bugX</span>
                </div>
              </div>

              {/* Fake Workspace Area */}
              <div className="flex-1 grid grid-cols-12 gap-2">
                {/* Left panel mockup */}
                <div style={{ background: '#0B0E14', borderColor: 'rgba(255,255,255,0.04)' }} className="col-span-4 rounded border p-1.5 space-y-1.5">
                  <div style={{ background: 'rgba(255,255,255,0.04)' }} className="h-2 w-3/4 rounded" />
                  <div style={{ background: 'rgba(79,125,255,0.15)', borderColor: 'rgba(79,125,255,0.2)' }} className="h-2 w-1/2 rounded border" />
                  <div style={{ background: 'rgba(255,255,255,0.02)' }} className="h-2 w-2/3 rounded" />
                </div>
                {/* Main panel mockup */}
                <div style={{ background: '#0B0E14', borderColor: 'rgba(255,255,255,0.04)' }} className="col-span-8 rounded border p-2 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div style={{ background: 'rgba(255,255,255,0.05)' }} className="h-2 w-5/6 rounded" />
                    <div style={{ background: 'rgba(255,255,255,0.03)' }} className="h-2 w-3/5 rounded" />
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div style={{ background: 'rgba(79,125,255,0.8)' }} className="h-2.5 w-10 rounded" />
                    <div style={{ background: 'rgba(255,255,255,0.02)' }} className="h-2 w-6 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Label and Info */}
            <div className="flex items-center justify-between select-none">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-200">Dark Theme</span>
                </div>
                <p className="text-[10px] text-gray-500">LeetCode-style soft grey palette.</p>
              </div>

              {theme === 'dark' && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4F7DFF] text-white shadow-md shadow-[#4F7DFF]/20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>
          </div>

          {/* ── LIGHT PREVIEW CARD ── */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => selectTheme('light')}
            onKeyDown={(e) => handleKeyDown(e, 'light')}
            aria-label="Select Light Mode Theme"
            className={cn(
              "group relative flex flex-col rounded-2xl border bg-[#0A0D14] p-4 gap-4 transition-all duration-350 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4F7DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A] hover:bg-white/[0.015]",
              theme === 'light'
                ? "border-[#4F7DFF] shadow-lg shadow-[#4F7DFF]/5 ring-1 ring-[#4F7DFF]/20"
                : "border-white/[0.04] hover:border-white/[0.08]"
            )}
          >
            {/* Miniature Mockup Representation */}
            <div className="relative h-44 rounded-xl bg-[#F8FAFC] border border-white/[0.04] p-3 flex flex-col gap-2 overflow-hidden shadow-inner select-none pointer-events-none">
              {/* Fake Sidebar / Navigation bar */}
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-3 w-16 bg-white rounded border border-gray-200/60 flex items-center justify-center">
                  <span className="text-[7px] text-gray-400 font-mono">bugX</span>
                </div>
              </div>

              {/* Fake Workspace Area */}
              <div className="flex-1 grid grid-cols-12 gap-2">
                {/* Left panel mockup */}
                <div className="col-span-4 rounded bg-white border border-gray-200/60 p-1.5 space-y-1.5">
                  <div className="h-2 w-3/4 bg-gray-200/50 rounded" />
                  <div className="h-2 w-1/2 bg-[#4F7DFF]/10 rounded border border-[#4F7DFF]/15" />
                  <div className="h-2 w-2/3 bg-gray-100/30 rounded" />
                </div>
                {/* Main panel mockup */}
                <div className="col-span-8 rounded bg-white border border-gray-200/60 p-2 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="h-2 w-5/6 bg-gray-200/60 rounded" />
                    <div className="h-2 w-3/5 bg-gray-100/50 rounded" />
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="h-2.5 w-10 bg-[#4F7DFF] rounded" />
                    <div className="h-2 w-6 bg-gray-100/30 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Label and Info */}
            <div className="flex items-center justify-between select-none">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-200">Light Theme</span>
                </div>
                <p className="text-[10px] text-gray-500">Stripe/Linear-style slate white layout.</p>
              </div>

              {theme === 'light' && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4F7DFF] text-white shadow-md shadow-[#4F7DFF]/20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════ PERSISTENCE DETAILS ════════════════════════ */}
      <section className="bg-[#0A0D14] border border-white/[0.04] p-5 rounded-2xl select-none text-xs text-gray-500 leading-relaxed space-y-2">
        <h4 className="font-bold text-gray-300">Theme Synchronization</h4>
        <p>
          Your layout preferences are saved to your local browser profile. Toggling themes updates all platform sections—including the catalog feeds, study archives, duels arena, profile dashboard, and landing layouts—instantly and globally.
        </p>
      </section>

    </div>
  );
};
