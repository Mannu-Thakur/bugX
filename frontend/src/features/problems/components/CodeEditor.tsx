import React, { useState, useRef, useEffect } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import { RotateCcw, Plus, Minus, History, ChevronDown } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

interface Template {
  language: string;
  source_code?: string;
  template_code?: string;
}

interface CodeEditorProps {
  problemSlug: string;
  templates: Template[];
  code: string;
  onChangeCode: (code: string) => void;
  language: 'python' | 'javascript' | 'cpp' | 'java';
  onChangeLanguage: (lang: 'python' | 'javascript' | 'cpp' | 'java') => void;
  onReset: () => void;
  onLoadLastSubmission?: () => void;
  isLoadingLastSubmission?: boolean;
  // Timer props
  timerSeconds?: number;
  timerIsActive?: boolean;
  onTimerToggle?: () => void;
  onTimerReset?: () => void;
  formatTimerTime?: (secs: number) => string;
  // Run/Submit props (passed through but not used directly in CodeEditor)
  isRunning?: boolean;
  isSubmitting?: boolean;
  onRun?: () => void;
  onSubmit?: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
] as const;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  problemSlug: _problemSlug,
  templates: _templates,
  code,
  onChangeCode,
  language,
  onChangeLanguage,
  onReset,
  onLoadLastSubmission,
  isLoadingLastSubmission,
  timerSeconds: _timerSeconds = 0,
  timerIsActive: _timerIsActive = false,
  onTimerToggle: _onTimerToggle,
  onTimerReset: _onTimerReset,
  formatTimerTime: _formatTimerTime,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => !document.documentElement.classList.contains('light'));
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

  // Observe theme changes on <html> element
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkTheme(!document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const getMonacoLanguage = (lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    if (lang === 'python') return 'python';
    if (lang === 'javascript') return 'javascript';
    if (lang === 'cpp') return 'cpp';
    return 'java';
  };

  const currentLangOption = LANGUAGE_OPTIONS.find(l => l.value === language) || LANGUAGE_OPTIONS[0];

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
        'editor.background': '#282828',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorCursor.foreground': '#ffffff',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionHighlightBackground': '#264f7844',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorBracketMatch.background': '#264f7833',
        'editorBracketMatch.border': '#58a6ff55',
      },
    });

    monaco.editor.defineTheme('bugx-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'string', foreground: '059669' },
        { token: 'keyword', foreground: 'dc2626' },
        { token: 'type', foreground: 'dc2626' },
        { token: 'identifier', foreground: '0f172a' },
        { token: 'function', foreground: '7c3aed' },
        { token: 'variable', foreground: 'd97706' },
        { token: 'number', foreground: 'd97706' },
        { token: 'operator', foreground: '0f172a' },
        { token: 'delimiter', foreground: '0f172a' },
      ],
      colors: {
        'editor.background': '#f8fafc',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editorCursor.foreground': '#2563eb',
        'editor.selectionBackground': '#bfdbfe',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#0f172a',
        'editor.selectionHighlightBackground': '#bfdbfe44',
        'editorIndentGuide.background': '#e2e8f0',
        'editorIndentGuide.activeBackground': '#cbd5e1',
        'editorBracketMatch.background': '#bfdbfe33',
        'editorBracketMatch.border': '#2563eb55',
      },
    });
  };

  return (
    <div className="editor-glow flex flex-col h-full bg-dark-panel overflow-hidden border-b border-transparent">
      {/* Gradient accent line */}
      <div className="h-[1px] w-full bg-[#3e3e3e]" />
      {/* Grouped, premium borderless segmented toolbar: Language & Run/Submit (left) | Utilities & Timer & Size (right) */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#282828] border-b border-[#3e3e3e] select-none gap-3 flex-wrap sm:flex-nowrap">
        {/* LEFT ACTIONS GROUP */}
        <div className="flex items-center gap-3">
          {/* Language Selector (Pill 1) */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel-active/90 hover:bg-dark-hover/90 transition-all text-xs font-bold text-gray-300 hover:text-gray-100 min-w-[95px] cursor-pointer shadow-sm"
            >
              <span>{currentLangOption.label}</span>
              <ChevronDown className={cn(
                "w-3 h-3 text-gray-500 ml-auto transition-transform",
                dropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-dark-bg border border-dark-border/40 rounded-lg shadow-xl shadow-black/60 z-50 overflow-hidden animate-zoom-in">
                <div className="max-h-48 overflow-y-auto py-1">
                  {LANGUAGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onChangeLanguage(opt.value as 'python' | 'javascript' | 'cpp' | 'java');
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
        </div>

        {/* RIGHT ACTIONS GROUPS */}
        <div className="flex items-center gap-3">

          {/* Utilities (History & Reset code) Pill */}
          <div className="flex items-center bg-dark-panel-active/70 rounded-lg p-0.5 shadow-sm gap-1">
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
              onClick={onReset}
              className="p-1.5 rounded-md hover:bg-dark-hover text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset code to template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>


          {/* Font Size Pill */}
          <div className="flex items-center bg-dark-panel-active/70 rounded-lg p-0.5 shadow-sm gap-1">
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
      <div className="flex-1 min-h-[300px] bg-[#1e1e1e] relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={(val) => onChangeCode(val || '')}
          beforeMount={handleBeforeMount}
          theme={isDarkTheme ? 'bugx-dark' : 'bugx-light'}
          loading={
            <div className="absolute inset-0 flex flex-col gap-2.5 p-5 bg-dark-bg">
              {[72, 55, 88, 40, 65, 78, 30, 50, 70, 45, 82, 38].map((w, i) => (
                <div
                  key={i}
                  className="h-[14px] rounded-sm animate-pulse"
                  style={{
                    width: `${w}%`,
                    background: isDarkTheme
                      ? 'linear-gradient(90deg, #161b22 0%, #1c2129 50%, #161b22 100%)'
                      : 'linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%)',
                    animationDelay: `${i * 80}ms`,
                    animationDuration: '1.8s',
                  }}
                />
              ))}
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className={`w-3 h-3 border ${isDarkTheme ? 'border-gray-600' : 'border-gray-300'} border-t-transparent rounded-full animate-spin`} />
                <span className={`text-[10px] ${isDarkTheme ? 'text-gray-600' : 'text-gray-400'} font-medium tracking-wide`}>Initializing editor…</span>
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
