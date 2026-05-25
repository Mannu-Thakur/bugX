import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { RotateCcw, Play, Send } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

interface Template {
  language: string;
  source_code: string;
}

interface CodeEditorProps {
  problemSlug: string;
  templates: Template[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  isRunning: boolean;
  isSubmitting: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  problemSlug,
  templates,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
}) => {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');

  // Find template for current language
  const getStarterCode = (lang: 'python' | 'javascript') => {
    const found = templates.find(t => t.language === lang);
    if (found) return found.source_code;
    return lang === 'python'
      ? '# Write your python code here\n'
      : '// Write your javascript code here\n';
  };

  const getSavedCode = (lang: 'python' | 'javascript') => {
    const draftKey = `draft_${problemSlug}_${lang}`;
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft !== null ? savedDraft : getStarterCode(lang);
  };

  const [code, setCode] = useState(() => getSavedCode(language));

  // Render synchronization pattern for props changing
  const [prevLang, setPrevLang] = useState(language);
  const [prevSlug, setPrevSlug] = useState(problemSlug);

  if (language !== prevLang || problemSlug !== prevSlug) {
    setPrevLang(language);
    setPrevSlug(problemSlug);
    setCode(getSavedCode(language));
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

  const getMonacoLanguage = (lang: 'python' | 'javascript') => {
    return lang === 'python' ? 'python' : 'javascript';
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel overflow-hidden border-b border-dark-border">
      {/* Top bar with language toggles and reset */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-dark-border bg-dark-bg/40 select-none">
        <div className="flex bg-dark-bg p-0.5 rounded-lg border border-dark-border">
          <button
            onClick={() => setLanguage('python')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-bold transition-all',
              language === 'python'
                ? 'bg-dark-hover text-blue-400 shadow-sm border border-dark-border/40'
                : 'text-gray-400 hover:text-gray-200 border border-transparent'
            )}
          >
            Python 3
          </button>
          <button
            onClick={() => setLanguage('javascript')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-bold transition-all',
              language === 'javascript'
                ? 'bg-dark-hover text-blue-400 shadow-sm border border-dark-border/40'
                : 'text-gray-400 hover:text-gray-200 border border-transparent'
            )}
          >
            JavaScript
          </button>
        </div>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-md hover:bg-dark-hover text-gray-400 hover:text-gray-200 transition-colors border border-transparent hover:border-dark-border flex items-center gap-1.5 text-xs font-semibold"
          title="Reset code to original template"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Editor component */}
      <div className="flex-1 min-h-[300px] bg-dark-bg relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-dark-bg text-xs text-gray-500 font-medium">
              Loading editor environment...
            </div>
          }
          options={{
            fontSize: 13,
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

      {/* Action buttons footer */}
      <div className="px-4 py-3 border-t border-dark-border bg-dark-bg/25 flex justify-end gap-3 select-none">
        <button
          onClick={() => onRun(code, language)}
          disabled={isRunning || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-md text-xs font-extrabold flex items-center gap-2 border shadow-sm transition-all',
            isRunning
              ? 'bg-dark-hover border-dark-border text-gray-500 cursor-not-allowed'
              : 'bg-dark-bg border-dark-border text-gray-300 hover:text-gray-100 hover:bg-dark-hover active:scale-95'
          )}
        >
          {isRunning ? (
            <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 text-gray-400" />
          )}
          Run Code
        </button>

        <button
          onClick={() => onSubmit(code, language)}
          disabled={isRunning || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-md text-xs font-black flex items-center gap-2 shadow transition-all',
            isSubmitting
              ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-glow-primary active:scale-95'
          )}
        >
          {isSubmitting ? (
            <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Submit Solution
        </button>
      </div>
    </div>
  );
};
