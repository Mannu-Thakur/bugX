import React, { useState, useEffect } from 'react';
import { X, Clock, Code, Keyboard } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../../features/auth/useAuth';
import { userStorage } from '../../lib/userState';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'timer' | 'editor' | 'shortcuts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('timer');

  // Load initial settings
  const [autoReset, setAutoReset] = useState(() => localStorage.getItem('bugx_autoReset') === 'true');
  const [superAlarm, setSuperAlarm] = useState(() => localStorage.getItem('bugx_superAlarm') === 'true');
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('bugx_focusMode') === 'true');
  const [fontSize, setFontSize] = useState(() => {
    if (user) {
      const saved = userStorage.getFontSize(user.id);
      if (saved) return String(saved);
    }
    return localStorage.getItem('editor_font_size') || '13';
  });
  const [tabSize, setTabSize] = useState(() => localStorage.getItem('editor_tab_size') || '4');

  // Keep state in sync with localStorage when external changes occur
  useEffect(() => {
    const handleSync = () => {
      setAutoReset(localStorage.getItem('bugx_autoReset') === 'true');
      setSuperAlarm(localStorage.getItem('bugx_superAlarm') === 'true');
      setFocusMode(localStorage.getItem('bugx_focusMode') === 'true');
      if (user) {
        const saved = userStorage.getFontSize(user.id);
        if (saved) setFontSize(String(saved));
      } else {
        setFontSize(localStorage.getItem('editor_font_size') || '13');
      }
      setTabSize(localStorage.getItem('editor_tab_size') || '4');
    };
    window.addEventListener('bugx-settings-changed', handleSync);
    return () => window.removeEventListener('bugx-settings-changed', handleSync);
  }, [user]);

  if (!isOpen) return null;

  const toggleAutoReset = () => {
    const next = !autoReset;
    setAutoReset(next);
    localStorage.setItem('bugx_autoReset', String(next));
    window.dispatchEvent(new Event('bugx-settings-changed'));
  };

  const toggleSuperAlarm = () => {
    const next = !superAlarm;
    setSuperAlarm(next);
    localStorage.setItem('bugx_superAlarm', String(next));
    window.dispatchEvent(new Event('bugx-settings-changed'));
  };

  const toggleFocusMode = () => {
    if (focusMode) {
      // Only allow turning on, cannot turn off from settings modal
      return;
    }
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem('bugx_focusMode', String(next));
    window.dispatchEvent(new Event('bugx-settings-changed'));
    onClose();
  };

  const handleFontSizeChange = (val: string) => {
    setFontSize(val);
    localStorage.setItem('editor_font_size', val);
    if (user) {
      userStorage.setFontSize(user.id, Number(val));
    }
    window.dispatchEvent(new Event('bugx-settings-changed'));
  };

  const handleTabSizeChange = (val: string) => {
    setTabSize(val);
    localStorage.setItem('editor_tab_size', val);
    window.dispatchEvent(new Event('bugx-settings-changed'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className="relative z-10 w-[560px] max-w-[95vw] bg-dark-panel border border-dark-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        style={{ maxHeight: '80vh', minHeight: 340 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border shrink-0">
          <span className="text-sm font-bold text-dark-text">Settings</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-dark-text/40 hover:text-dark-text hover:bg-dark-hover transition-all cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-38 shrink-0 border-r border-dark-border p-2.5 flex flex-col gap-1 bg-dark-panel">
            <button
              onClick={() => setActiveTab('timer')}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 select-none',
                activeTab === 'timer'
                  ? 'bg-dark-hover text-dark-text shadow-sm'
                  : 'text-dark-text/60 hover:text-dark-text hover:bg-dark-hover/40'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Timer
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 select-none',
                activeTab === 'editor'
                  ? 'bg-dark-hover text-dark-text shadow-sm'
                  : 'text-dark-text/60 hover:text-dark-text hover:bg-dark-hover/40'
              )}
            >
              <Code className="w-3.5 h-3.5" />
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 select-none',
                activeTab === 'shortcuts'
                  ? 'bg-dark-hover text-dark-text shadow-sm'
                  : 'text-dark-text/60 hover:text-dark-text hover:bg-dark-hover/40'
              )}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Shortcuts
            </button>
          </div>

          {/* Tab Panel */}
          <div className="flex-1 p-5 overflow-y-auto bg-dark-panel">
            {activeTab === 'timer' && (
              <div className="space-y-6">
                {/* Auto Reset */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-dark-text">Auto Reset</p>
                    <p className="text-xs text-dark-text/50 mt-1 leading-relaxed">
                      Resets timer automatically on accepted submissions or problem switches.
                    </p>
                  </div>
                  <button
                    onClick={toggleAutoReset}
                    className={cn(
                      'relative shrink-0 mt-0.5 h-5 rounded-full transition-colors duration-200 cursor-pointer w-9',
                      autoReset ? 'bg-[#4F7DFF]' : 'bg-dark-input border border-dark-border'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200',
                        autoReset ? 'left-[18px]' : 'left-[2px]'
                      )}
                    />
                  </button>
                </div>

                <hr className="border-dark-border" />

                {/* Super Alarm */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-dark-text">Super Alarm</p>
                    <p className="text-xs text-dark-text/50 mt-1 leading-relaxed">
                      Plays alert sound at 10 minutes remaining and when the timer runs out.
                    </p>
                  </div>
                  <button
                    onClick={toggleSuperAlarm}
                    className={cn(
                      'relative shrink-0 mt-0.5 h-5 rounded-full transition-colors duration-200 cursor-pointer w-9',
                      superAlarm ? 'bg-[#4F7DFF]' : 'bg-dark-input border border-dark-border'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200',
                        superAlarm ? 'left-[18px]' : 'left-[2px]'
                      )}
                    />
                  </button>
                </div>

                <hr className="border-dark-border" />

                {/* Focus Mode */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-dark-text">Focus Mode</p>
                    <p className="text-xs text-dark-text/50 mt-1 leading-relaxed">
                      Hides distractions (navbar, footer, sidebars) while solving problems. Only exit via the dedicated button on the problem page.
                    </p>
                  </div>
                  <button
                    onClick={toggleFocusMode}
                    disabled={focusMode}
                    className={cn(
                      'w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                      focusMode
                        ? 'bg-[#4F7DFF]/15 text-[#4F7DFF] border border-[#4F7DFF]/20 cursor-not-allowed opacity-70'
                        : 'bg-gradient-to-r from-[#4F7DFF] to-[#6366f1] text-white hover:from-[#6366f1] hover:to-[#4F7DFF] cursor-pointer shadow-lg shadow-[#4F7DFF]/20 hover:shadow-[#4F7DFF]/40 active:scale-[0.98]'
                    )}
                    title={focusMode ? "Exit Focus Mode from the problem page" : "Enter Focus Mode"}
                  >
                    {focusMode ? '✦  Focus Mode Active' : '⚡  Enter Focus Mode'}
                  </button>
                  {focusMode && (
                    <p className="text-[10px] text-dark-text/40 text-center">
                      Use the "Exit Focus" button on the problem page to leave Focus Mode.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                {/* Font Size */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-dark-text">Font Size</p>
                    <p className="text-xs text-dark-text/50 mt-0.5">Adjusts text size in the code editor live.</p>
                  </div>
                  <select
                    value={fontSize}
                    onChange={e => handleFontSizeChange(e.target.value)}
                    className="bg-dark-bg border border-dark-border text-dark-text text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28].map(s => (
                      <option key={s} value={String(s)} className="bg-dark-panel text-dark-text">
                        {s}px
                      </option>
                    ))}
                  </select>
                </div>

                <hr className="border-dark-border" />

                {/* Tab Size */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-dark-text">Tab Indentation</p>
                    <p className="text-xs text-dark-text/50 mt-0.5">Spaces per tab (takes effect on next reload).</p>
                  </div>
                  <select
                    value={tabSize}
                    onChange={e => handleTabSizeChange(e.target.value)}
                    className="bg-dark-bg border border-dark-border text-dark-text text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    {[2, 4, 8].map(s => (
                      <option key={s} value={String(s)} className="bg-dark-panel text-dark-text">
                        {s} spaces
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="divide-y divide-dark-border/40">
                {[
                  ['Ctrl + Enter', 'Run Code'],
                  ['Ctrl + Shift + Enter', 'Submit Solution'],
                  ['Ctrl + /', 'Toggle Comment'],
                  ['Ctrl + Z', 'Undo Change'],
                  ['Ctrl + Shift + Z', 'Redo Change'],
                  ['Alt + ↑ / ↓', 'Move Line Up/Down'],
                  ['Ctrl + D', 'Select Next Occurrence'],
                  ['Ctrl + F', 'Find in Editor'],
                ].map(([keys, action]) => (
                  <div key={keys} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <span className="text-xs font-medium text-dark-text/80">{action}</span>
                    <kbd className="px-2 py-0.5 bg-dark-bg border border-dark-border rounded text-[10px] font-mono text-dark-text/60 whitespace-nowrap">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
