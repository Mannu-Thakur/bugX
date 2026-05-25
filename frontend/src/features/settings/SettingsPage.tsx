import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Sun, Moon, Globe, Save, CheckCircle2, StickyNote } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const LeetcodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M16.102 17.93l-2.69 2.607c-.466.451-1.211.451-1.677 0l-4.51-4.375a1.233 1.233 0 0 1 0-1.707l4.51-4.375c.466-.452 1.211-.452 1.677 0l2.69 2.607c.28.272.732.272 1.012 0l1.01-1.008a.734.734 0 0 0 0-1.026l-3.7-3.61c-1.396-1.353-3.666-1.353-5.062 0l-7.79 7.554c-1.397 1.354-1.397 3.553 0 4.907l7.79 7.553c1.396 1.354 3.666 1.354 5.062 0l3.7-3.609a.734.734 0 0 0 0-1.027l-1.01-1.008a.727.727 0 0 0-1.012 0z" />
    <path d="M12.115 12.304l-2.69 2.607c-.466.452-1.211.452-1.677 0l-1.01-1.008a.734.734 0 0 1 0-1.026l2.69-2.608c.466-.452 1.211-.452 1.677 0l1.01 1.008c.28.272.28.714 0 .987z" />
  </svg>
);

interface SocialLinks {
  leetcode: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  leetcode: '',
  linkedin: '',
  github: '',
  portfolio: '',
};

export const SettingsPage: React.FC = () => {
  const { success } = useToast();

  // ─── Theme ───────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
      }
      localStorage.setItem('theme', next);
      return next;
    });
  };

  // ─── Social Links ────────────────────────────────────────
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(() => {
    try {
      const saved = localStorage.getItem('social_links');
      if (saved) return { ...DEFAULT_SOCIAL_LINKS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_SOCIAL_LINKS;
  });

  const handleSocialChange = (field: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({ ...prev, [field]: value }));
  };

  const saveSocialLinks = () => {
    localStorage.setItem('social_links', JSON.stringify(socialLinks));
    success('Social links saved successfully!');
  };

  // ─── Notes ───────────────────────────────────────────────
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem('user_notes') || '';
  });
  const [notesSaved, setNotesSaved] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback((value: string) => {
    localStorage.setItem('user_notes', value);
    setNotesSaved(true);
  }, []);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    setNotesSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const MAX_NOTES_CHARS = 5000;

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500">Manage your local preferences and profile links</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Section 1: Appearance ──────────────────────── */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 transition-all duration-200 hover:border-dark-border/80">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-amber-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">Appearance</h2>
              <p className="text-xs text-gray-500">Customize the look and feel</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-dark-bg/60 border border-dark-border/60 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-dark-input border border-dark-border flex items-center justify-center">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-xs text-gray-500">
                  {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clear'}
                </p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'light'}
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className={`
                relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg
                ${theme === 'light' ? 'bg-blue-600' : 'bg-dark-border'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-flex h-[24px] w-[24px] items-center justify-center rounded-full
                  bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out
                  ${theme === 'light' ? 'translate-x-[24px]' : 'translate-x-0'}
                `}
              >
                {theme === 'dark' ? (
                  <Moon className="w-3 h-3 text-gray-700" />
                ) : (
                  <Sun className="w-3 h-3 text-amber-500" />
                )}
              </span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-amber-500'}`} />
            Currently using <span className="font-medium text-gray-400">{theme === 'dark' ? 'Dark' : 'Light'}</span> theme
          </div>
        </div>

        {/* ─── Section 3: Personal Notes ─────────────────── */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 transition-all duration-200 hover:border-dark-border/80 lg:row-span-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <StickyNote className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-100">Personal Notes</h2>
                <p className="text-xs text-gray-500">Quick reminders and scratchpad</p>
              </div>
            </div>

            {/* Saved Indicator */}
            <div
              className={`
                flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all duration-300
                ${notesSaved
                  ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/5 border-amber-500/20'
                }
              `}
            >
              {notesSaved ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Saving...
                </>
              )}
            </div>
          </div>

          <textarea
            value={notes}
            onChange={handleNotesChange}
            maxLength={MAX_NOTES_CHARS}
            placeholder="Type your notes, reminders, or anything here..."
            rows={7}
            className="w-full bg-dark-input border border-dark-border text-sm text-gray-200 rounded-lg py-3 px-4 transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-gray-600">Auto-saves after 500ms of inactivity</p>
            <p className={`text-[11px] font-mono ${notes.length > MAX_NOTES_CHARS * 0.9 ? 'text-amber-400' : 'text-gray-500'}`}>
              {notes.length.toLocaleString()} / {MAX_NOTES_CHARS.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ─── Section 2: Social Links ───────────────────── */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 transition-all duration-200 hover:border-dark-border/80 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-100">Social Links</h2>
                <p className="text-xs text-gray-500">Add your coding profiles and website</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="LeetCode Profile"
              placeholder="https://leetcode.com/u/your-username"
              icon={<LeetcodeIcon className="w-4 h-4" />}
              value={socialLinks.leetcode}
              onChange={(e) => handleSocialChange('leetcode', e.target.value)}
            />
            <Input
              label="LinkedIn Profile"
              placeholder="https://linkedin.com/in/your-username"
              icon={<LinkedinIcon className="w-4 h-4" />}
              value={socialLinks.linkedin}
              onChange={(e) => handleSocialChange('linkedin', e.target.value)}
            />
            <Input
              label="GitHub Profile"
              placeholder="https://github.com/your-username"
              icon={<GithubIcon className="w-4 h-4" />}
              value={socialLinks.github}
              onChange={(e) => handleSocialChange('github', e.target.value)}
            />
            <Input
              label="Portfolio / Website"
              placeholder="https://your-website.com"
              icon={<Globe className="w-4 h-4" />}
              value={socialLinks.portfolio}
              onChange={(e) => handleSocialChange('portfolio', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-border/60">
            <p className="text-xs text-gray-500">Links are stored locally in your browser</p>
            <Button onClick={saveSocialLinks} size="sm">
              <Save className="w-3.5 h-3.5 mr-2" />
              Save Links
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
