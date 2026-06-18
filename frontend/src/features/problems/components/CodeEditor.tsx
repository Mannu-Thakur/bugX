import React, { useState, useRef, useEffect } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { RotateCcw, History, ChevronDown, Lightbulb, AlignJustify, Braces, Maximize2 } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { useAuth } from '../../../features/auth/useAuth';
import { userStorage } from '../../../shared/lib/userState';

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
  isRunning?: boolean;
  isSubmitting?: boolean;
  onRun?: () => void;
  onSubmit?: () => void;
  focusMode?: boolean;
  onShowComingSoon?: (feature: string) => void;
  submissionCooldown?: number;
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
  isRunning = false,
  isSubmitting = false,
  onRun,
  onSubmit,
  focusMode = false,
  onShowComingSoon,
  submissionCooldown = 0,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => !document.documentElement.classList.contains('light'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Font size with localStorage persistence
  const { user } = useAuth();
  const getInitialFontSize = () => {
    if (user) {
      const saved = userStorage.getFontSize(user.id);
      if (saved) return Math.min(Math.max(saved, 10), 28);
    }
    const savedGlobal = localStorage.getItem('editor_font_size');
    return savedGlobal ? Math.min(Math.max(Number(savedGlobal), 10), 28) : 13;
  };
  const [fontSize, setFontSize] = useState(getInitialFontSize);
  const [tabSize, setTabSize] = useState(() => Number(localStorage.getItem('editor_tab_size') || '4'));

  // Real-time cursor and save state tracking
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reference to the Monaco editor instance for wheel propagation
  const editorRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Callback refs to avoid stale closures in Monaco actions
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onRunRef.current = onRun;
    onSubmitRef.current = onSubmit;
  }, [onRun, onSubmit]);

  // Sync font size when user loads or changes
  useEffect(() => {
    if (user) {
      const saved = userStorage.getFontSize(user.id);
      if (saved) {
        setFontSize(Math.min(Math.max(saved, 10), 28));
      }
    }
  }, [user?.id]);

  const changeFontSize = (delta: number) => {
    setFontSize(prev => {
      const next = Math.min(Math.max(prev + delta, 10), 28);
      localStorage.setItem('editor_font_size', String(next));
      if (user) {
        userStorage.setFontSize(user.id, next);
      }
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

  // Live settings update (font size & tab size) from Settings modal
  useEffect(() => {
    const handler = () => {
      const savedFont = Number(localStorage.getItem('editor_font_size'));
      if (savedFont && savedFont !== fontSize) {
        setFontSize(Math.min(Math.max(savedFont, 10), 28));
        if (user) userStorage.setFontSize(user.id, savedFont);
      }
      const savedTab = Number(localStorage.getItem('editor_tab_size') || '4');
      if (savedTab && savedTab !== tabSize) {
        setTabSize(savedTab);
      }
    };
    window.addEventListener('bugx-settings-changed', handler);
    return () => window.removeEventListener('bugx-settings-changed', handler);
  }, [fontSize, tabSize, user]);

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
        'editor.background': '#1e1e1e',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editorCursor.foreground': '#ffffff',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#555555',
        'editorLineNumber.activeForeground': '#aaaaaa',
        'editor.selectionHighlightBackground': '#264f7844',
        'editorIndentGuide.background': '#333333',
        'editorIndentGuide.activeBackground': '#555555',
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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Run shortcut (Ctrl + Enter)
    editor.addAction({
      id: 'bugx-run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      precondition: undefined,
      keybindingContext: undefined,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: () => { onRunRef.current?.(); }
    });

    // Add Submit shortcut (Ctrl + Shift + Enter)
    editor.addAction({
      id: 'bugx-submit-code',
      label: 'Submit Solution',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      precondition: undefined,
      keybindingContext: undefined,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,
      run: () => { onSubmitRef.current?.(); }
    });

    // Track cursor location in real time
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
    });

    // Track model content changes to simulate real-time DB autosaving
    editor.onDidChangeModelContent(() => {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saved');
      }, 750);
    });

    // Propagate wheel events to the page when editor is at scroll boundary
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('wheel', (e: WheelEvent) => {
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const layoutInfo = editor.getLayoutInfo();
        const contentHeight = layoutInfo.height;

        const atTop = scrollTop <= 0 && e.deltaY < 0;
        const atBottom = scrollTop + contentHeight >= scrollHeight - 1 && e.deltaY > 0;

        if (atTop || atBottom) {
          // Allow the page to scroll naturally
          e.stopPropagation();
          window.scrollBy({ top: e.deltaY, behavior: 'auto' });
        }
      }, { passive: true, capture: true });
    }
  };

  // Format code action
  const handleFormat = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  };

  // Expand editor to full screen
  const handleExpand = () => {
    const el = document.getElementById('bugx-editor-container');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  return (
    <div id="bugx-editor-container" className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">

      {/* ── Header bar: "</>  Code" title */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 bg-[#252526] select-none shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
          <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 6L22 12L16 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[13px] font-semibold text-gray-200 tracking-wide">Code</span>
      </div>

      {/* ── Toolbar: Language (left) | Icons (right) */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#252526] select-none shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* LEFT: Language Selector */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <span>{currentLangOption.label}</span>
            <ChevronDown className={cn("w-3 h-3 text-gray-500 transition-transform", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-[#1e1e1e] rounded-lg shadow-2xl z-50 overflow-hidden py-1"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChangeLanguage(opt.value as any); setDropdownOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all cursor-pointer",
                    language === opt.value
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
                  )}
                >
                  <span>{opt.label}</span>
                  {language === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Icon Toolbar */}
        <div className="flex items-center gap-0.5">
          

          {/* Reset */}
          <button
            onClick={onReset}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Reset code to template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Expand */}
          <button
            onClick={handleExpand}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Monaco Editor */}
      <div className="flex-1 min-h-0 relative" style={{ background: '#1e1e1e' }}>
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={(val) => onChangeCode(val || '')}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          theme={isDarkTheme ? 'bugx-dark' : 'bugx-light'}
          loading={
            <div className="absolute inset-0 flex flex-col gap-2.5 p-5" style={{ background: '#1e1e1e' }}>
              {[72, 55, 88, 40, 65, 78, 30, 50, 70, 45, 82, 38].map((w, i) => (
                <div
                  key={i}
                  className="h-[13px] rounded-sm animate-pulse"
                  style={{
                    width: `${w}%`,
                    background: 'linear-gradient(90deg, #2a2a2a 0%, #333 50%, #2a2a2a 100%)',
                    animationDelay: `${i * 80}ms`,
                    animationDuration: '1.8s',
                  }}
                />
              ))}
            </div>
          }

          options={{
            fontSize: fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Menlo', monospace",
            minimap: { enabled: false },
            lineNumbersMinChars: 3,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            tabSize: tabSize,
            insertSpaces: true,
            scrollbar: {
              verticalScrollbarSize: 5,
              horizontalScrollbarSize: 5,
              useShadows: false,
            },
            alwaysConsumeMouseWheel: false,
            scrollBeyondLastLine: false,
            overviewRulerLanes: 0,
            renderLineHighlight: 'gutter',
            automaticLayout: true,
          }}
        />
      </div>

      {/* ── Status Bar */}
      <div
        className="flex items-center justify-between px-4 h-[34px] bg-[#1e1e1e] select-none shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Left: Save status */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {saveStatus === 'saving' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-pulse" />
              <span className="text-gray-500">Saving...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
              <span className="text-gray-500">Saved</span>
            </>
          )}
        </div>

        {/* Right: Cursor position + focus mode actions */}
        <div className="flex items-center gap-3">
          {focusMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onShowComingSoon?.('Hints')}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-yellow-400 hover:bg-white/[0.05] transition-all cursor-pointer"
                title="Hints (Coming Soon)"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRun}
                disabled={isRunning || isSubmitting}
                className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Run'}
              </button>
              <button
                onClick={onSubmit}
                disabled={isRunning || isSubmitting || submissionCooldown > 0}
                className="px-2.5 py-0.5 rounded bg-emerald-600/80 text-white text-[11px] font-semibold hover:bg-emerald-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : submissionCooldown > 0 ? `Retry in ${submissionCooldown}s` : 'Submit'}
              </button>
            </div>
          )}
          <span className="text-[11px] font-mono text-gray-600">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        </div>
      </div>
    </div>
  );
};

