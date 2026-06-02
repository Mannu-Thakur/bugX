import React, { useState, useRef, useEffect } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import { RotateCcw, Play, Send, Plus, Minus, History, ChevronDown, Clock, TimerReset } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

interface Template {
  language: string;
  source_code?: string;
  template_code?: string;
}

interface CodeEditorProps {
  problemSlug: string;
  templates: Template[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  isRunning: boolean;
  isSubmitting: boolean;
  onLoadLastSubmission?: () => void;
  isLoadingLastSubmission?: boolean;
  lastSubmission?: { source_code: string; language: string } | null;
  // Timer props (lifted to parent so it persists across re-renders)
  timerSeconds?: number;
  timerIsActive?: boolean;
  onTimerToggle?: () => void;
  onTimerReset?: () => void;
  formatTimerTime?: (secs: number) => string;
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
] as const;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  problemSlug,
  templates,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  onLoadLastSubmission,
  isLoadingLastSubmission,
  lastSubmission,
  timerSeconds = 0,
  timerIsActive = false,
  onTimerToggle,
  onTimerReset,
  formatTimerTime,
}) => {
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>('cpp');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Font size with localStorage persistence
  const FONT_SIZE_KEY = 'editor_font_size';
  const getInitialFontSize = () => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? Math.min(Math.max(Number(saved), 10), 28) : 13;
  };
  const [fontSize, setFontSize] = useState(getInitialFontSize);

  const changeFontSize = (delta: number) => {
    setFontSize(prev => {
      const next = Math.min(Math.max(prev + delta, 10), 28);
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find template for current language
  const getStarterCode = (lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    const found = templates.find(t => t.language === lang);
    const defaultCode = lang === 'python'
      ? '# Write your python code here\n'
      : lang === 'javascript'
      ? '// Write your javascript code here\n'
      : lang === 'cpp'
      ? '// Write your C++ code here\n'
      : '// Write your Java code here\n';
    if (found) return found.source_code || found.template_code || defaultCode;
    return defaultCode;
  };

  const getSavedCode = (lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    const draftKey = `draft_${problemSlug}_${lang}`;
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft !== null ? savedDraft : getStarterCode(lang);
  };

  const [code, setCode] = useState(() => getSavedCode(language));

  // Render synchronization pattern for props changing
  const [prevLang, setPrevLang] = useState(language);
  const [prevSlug, setPrevSlug] = useState(problemSlug);
  const [prevLastSub, setPrevLastSub] = useState(lastSubmission);

  if (language !== prevLang || problemSlug !== prevSlug) {
    setPrevLang(language);
    setPrevSlug(problemSlug);
    setCode(getSavedCode(language));
  }

  // When lastSubmission prop changes (loaded from API), apply it
  if (lastSubmission && lastSubmission !== prevLastSub) {
    setPrevLastSub(lastSubmission);
    const lang = lastSubmission.language as 'python' | 'javascript' | 'cpp' | 'java';
    if (['python', 'javascript', 'cpp', 'java'].includes(lang)) {
      setLanguage(lang);
      setPrevLang(lang);
    }
    setCode(lastSubmission.source_code);
    // Save to draft too
    const draftKey = `draft_${problemSlug}_${lang}`;
    localStorage.setItem(draftKey, lastSubmission.source_code);
  }

  // Handle code change and save draft
  const handleEditorChange = (value?: string) => {
    const updated = value || '';
    setCode(updated);
    const draftKey = `draft_${problemSlug}_${language}`;
    localStorage.setItem(draftKey, updated);
  };

  // Reset to original template
  const handleReset = () => {
    if (window.confirm('Reset code to template? Your unsaved draft will be lost.')) {
      const draftKey = `draft_${problemSlug}_${language}`;
      localStorage.removeItem(draftKey);
      setCode(getStarterCode(language));
    }
  };

  const getMonacoLanguage = (lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    if (lang === 'python') return 'python';
    if (lang === 'javascript') return 'javascript';
    if (lang === 'cpp') return 'cpp';
    return 'java';
  };

  const currentLangOption = LANGUAGE_OPTIONS.find(l => l.value === language) || LANGUAGE_OPTIONS[0];

  const defaultFormatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerDisplay = formatTimerTime ? formatTimerTime(timerSeconds) : defaultFormatTime(timerSeconds);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('bugx-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'type', foreground: 'ff7b72' },
        { token: 'identifier', foreground: 'e6edf3' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'ffa657' },
        { token: 'number', foreground: 'ffa657' },
        { token: 'operator', foreground: 'e6edf3' },
        { token: 'delimiter', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#0a0c10',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#58a6ff',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#e6edf3',
        'editor.selectionHighlightBackground': '#264f7844',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#30363d',
        'editorBracketMatch.background': '#264f7833',
        'editorBracketMatch.border': '#58a6ff55',
      },
    });
  };

  return (
    <div className="editor-glow flex flex-col h-full bg-dark-panel overflow-hidden border-b border-transparent">
      {/* Gradient accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-purple-500/0" />
      {/* Grouped, premium borderless segmented toolbar: Language & Run/Submit (left) | Utilities & Timer & Size (right) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#090b0e] select-none gap-4 flex-wrap sm:flex-nowrap">
        {/* LEFT ACTIONS GROUP */}
        <div className="flex items-center gap-3">
          {/* Language Selector (Pill 1) */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11141d]/90 hover:bg-[#161a26]/90 transition-all text-xs font-bold text-gray-300 hover:text-gray-100 min-w-[95px] cursor-pointer shadow-sm"
            >
              <span>{currentLangOption.label}</span>
              <ChevronDown className={cn(
                "w-3 h-3 text-gray-500 ml-auto transition-transform",
                dropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-[#0d1017] border border-dark-border/40 rounded-lg shadow-xl shadow-black/60 z-50 overflow-hidden animate-zoom-in">
                <div className="max-h-48 overflow-y-auto py-1">
                  {LANGUAGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLanguage(opt.value as 'python' | 'javascript' | 'cpp' | 'java');
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                        language === opt.value
                          ? "bg-blue-500/10 text-blue-400"
                          : "text-gray-400 hover:text-gray-200 hover:bg-dark-hover"
                      )}
                    >
                      <span>{opt.label}</span>
                      {language === opt.value && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution Pill (Run & Submit combined) */}
          <div className="flex items-center bg-[#11141d]/90 rounded-lg p-0.5 shadow-sm gap-1">
            {/* Run Code */}
            <button
              onClick={() => onRun(code, language)}
              disabled={isRunning || isSubmitting}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                isRunning
                  ? "bg-dark-hover text-gray-500 cursor-not-allowed"
                  : "text-gray-400 hover:text-gray-200 hover:bg-dark-hover active:scale-95"
              )}
              title="Run Code"
            >
              {isRunning ? (
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span className="hidden sm:inline">Run</span>
            </button>
            
            {/* Submit Solution */}
            <button
              onClick={() => onSubmit(code, language)}
              disabled={isRunning || isSubmitting}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                isSubmitting
                  ? "bg-blue-600/50 text-blue-200 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/10 active:scale-95"
              )}
              title="Submit Solution"
            >
              {isSubmitting ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* RIGHT ACTIONS GROUPS */}
        <div className="flex items-center gap-3">
          {/* Utilities (History & Reset code) Pill */}
          <div className="flex items-center bg-[#11141d]/70 rounded-lg p-0.5 shadow-sm gap-1">
            {onLoadLastSubmission && (
              <button
                onClick={onLoadLastSubmission}
                disabled={isLoadingLastSubmission}
                className="p-1.5 rounded-md hover:bg-dark-hover text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
                title="Load last submission"
              >
                {isLoadingLastSubmission ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <History className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-1.5 rounded-md hover:bg-dark-hover text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset code to template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timer Pill */}
          <div className="flex items-center bg-[#11141d]/70 rounded-lg p-0.5 shadow-sm gap-1.5 px-2">
            <button
              onClick={onTimerToggle}
              className="p-1 rounded hover:bg-dark-hover text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
              title={timerIsActive ? 'Pause timer' : 'Start timer'}
            >
              <Clock className={cn("w-3.5 h-3.5", timerIsActive && "text-emerald-400")} />
            </button>
            <span className={cn(
              "font-mono text-[10px] font-bold tracking-wider min-w-[34px] text-center select-none",
              timerIsActive ? "text-emerald-400" : "text-gray-500"
            )}>
              {timerDisplay}
            </span>
            <button
              onClick={onTimerReset}
              className="p-1 rounded hover:bg-dark-hover text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset timer"
            >
              <TimerReset className="w-3 h-3" />
            </button>
          </div>

          {/* Font Size Pill */}
          <div className="flex items-center bg-[#11141d]/70 rounded-lg p-0.5 shadow-sm gap-1">
            <button
              onClick={() => changeFontSize(-1)}
              className="p-1 h-6 w-6 flex items-center justify-center rounded hover:bg-dark-hover text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              title="Decrease font size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-gray-500 min-w-[20px] text-center select-none font-bold">
              {fontSize}
            </span>
            <button
              onClick={() => changeFontSize(1)}
              className="p-1 h-6 w-6 flex items-center justify-center rounded hover:bg-dark-hover text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              title="Increase font size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor component */}
      <div className="flex-1 min-h-[300px] bg-dark-bg relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={handleEditorChange}
          beforeMount={handleBeforeMount}
          theme="bugx-dark"
          loading={
            <div className="absolute inset-0 flex flex-col gap-2.5 p-5 bg-[#0a0c10]">
              {[72, 55, 88, 40, 65, 78, 30, 50, 70, 45, 82, 38].map((w, i) => (
                <div
                  key={i}
                  className="h-[14px] rounded-sm animate-pulse"
                  style={{
                    width: `${w}%`,
                    background: 'linear-gradient(90deg, #161b22 0%, #1c2129 50%, #161b22 100%)',
                    animationDelay: `${i * 80}ms`,
                    animationDuration: '1.8s',
                  }}
                />
              ))}
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-gray-600 font-medium tracking-wide">Initializing editor…</span>
              </div>
            </div>
          }
          options={{
            fontSize: fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'",
            minimap: { enabled: false },
            lineNumbersMinChars: 3,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            tabSize: 4,
            insertSpaces: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
};
