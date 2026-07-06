import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ChevronLeft, Settings, Square, Send,
} from 'lucide-react';
import { useX } from './XContext';
import { useXChat, type ChatContext } from './useXChat';
import { XMessageList } from './XMessageList';
import { XEmptyState } from './XEmptyState';
import { ModelSwitcher } from './ModelSwitcher';
import { getModelById } from './xModels';
import { cn } from '../../shared/lib/cn';

interface QuickAction {
  label: string;
  prompt: string;
  icon: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: '🐛', label: 'Debug', prompt: '/debug' },
  { icon: '💡', label: 'Hint', prompt: '/hint' },
  { icon: '⏱️', label: 'Complexity', prompt: '/complexity' },
  { icon: '🚀', label: 'Optimize', prompt: '/optimize' },
  { icon: '🔍', label: 'Find Bug', prompt: '/debug' },
  { icon: '🧪', label: 'Test Cases', prompt: 'Generate 5 edge-case test cases for this problem with expected outputs.' },
  { icon: '🔥', label: 'Dry Run', prompt: '/dryrun' },
  { icon: '📖', label: 'Explain', prompt: '/explain' },
];

export interface XPanelProps {
  code: string;
  language: string;
  problemTitle: string;
  problemStatement: string;
  constraints: string;
  compilerError: string;
  runtimeError: string;
  sampleInput: string;
  problemSlug: string;
  onClose: () => void;
}

export const XPanel: React.FC<XPanelProps> = ({
  code,
  language,
  problemTitle,
  problemStatement,
  constraints,
  compilerError,
  runtimeError,
  sampleInput,
  problemSlug,
  onClose,
}) => {
  const {
    messages,
    clearMessages,
    isStreaming,
    selectedModelId,
    setProblemSlug,
  } = useX();
  const { sendMessage, stopStreaming } = useXChat();

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(350);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setWidth(entries[0].contentRect.width);
    });

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, []);

  const isCollapsed = width < 90;
  const isIconOnly = width >= 90 && width < 220;
  const isCompact = width >= 220 && width < 320;

  // Register current problem with context
  useEffect(() => {
    setProblemSlug(problemSlug);
  }, [problemSlug, setProblemSlug]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;
    setInput('');
    const chatCtx: ChatContext = {
      code,
      language,
      problemTitle,
      problemStatement,
      constraints,
      compilerError,
      runtimeError,
      sampleInput,
    };
    await sendMessage(msg, chatCtx);
  }, [
    input,
    isStreaming,
    sendMessage,
    code,
    language,
    problemTitle,
    problemStatement,
    constraints,
    compilerError,
    runtimeError,
    sampleInput,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const currentModel = getModelById(selectedModelId);

  if (isCollapsed) {
    return (
      <div
        ref={containerRef}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('bugx-expand-x-panel'));
        }}
        className="flex flex-col items-center justify-between py-4 h-full bg-[#1e1e1e] border-l border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-all select-none group"
        title="Click to expand X AI Panel"
      >
        {/* Top: X logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-600/40 to-amber-600/25 border border-orange-500/25 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-[12px] font-black text-white">X</span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 tracking-widest [writing-mode:vertical-lr] uppercase whitespace-nowrap">
            X AI Panel
          </span>
        </div>

        {/* Bottom: Expand Chevron */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/[0.08] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#1e1e1e] x-panel overflow-hidden">

      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-3 bg-[#252526] shrink-0 select-none h-[38px]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Left: X logo + model badge */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-600/40 to-amber-600/25 border border-orange-500/25 flex items-center justify-center">
            <span className="text-[11px] font-black text-white">X</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-white">X</span>
            {!isCompact && !isIconOnly && currentModel && (
              <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[80px]">
                · {currentModel.model.displayName}
              </span>
            )}
          </div>

          {/* Status dot */}
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          )} />
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-0.5">
          {!isIconOnly ? (
            <>
              <button
                onClick={clearMessages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
                title="New chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearMessages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
                title="Clear chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const win = window as unknown as { bugxOpenSettings?: (tab: string) => void };
                  if (typeof win.bugxOpenSettings === 'function') {
                    win.bugxOpenSettings('x');
                  } else {
                    window.dispatchEvent(new CustomEvent('bugx-open-settings', { detail: { tab: 'x' } }));
                  }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
                title="X Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={clearMessages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
              title="New chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Collapse X"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CONTEXT INDICATORS ── */}
      {(compilerError || runtimeError) && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <span className="text-[11px] text-red-400 font-medium truncate">
            {compilerError ? 'Compiler error detected' : 'Runtime error detected'}
          </span>
        </div>
      )}

      {/* ── MESSAGES or EMPTY STATE ── */}
      {messages.length === 0 ? (
        <XEmptyState onSuggestion={(prompt) => handleSend(prompt)} isCompact={isCompact} isIconOnly={isIconOnly} />
      ) : (
        <XMessageList
          messages={messages}
          onRegenerate={() => {
            // Regenerate: resend the last user message
            const lastUser = [...messages].reverse().find(m => m.role === 'user');
            if (lastUser) {
              handleSend(lastUser.content);
            }
          }}
        />
      )}

      {/* ── QUICK ACTIONS ── */}
      {messages.length > 0 && !isIconOnly && (
        <div
          className="shrink-0 px-3 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex gap-1.5 overflow-x-auto x-scroll-hide pb-0.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSend(action.prompt)}
                disabled={isStreaming}
                title={action.label}
                className={cn(
                  "flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-orange-500/30 text-gray-400 hover:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed",
                  isCompact ? "w-7 h-7 p-0" : "gap-1 px-2.5 py-1.5 text-[11px] font-medium"
                )}
              >
                <span className="text-[12px] leading-none">{action.icon}</span>
                {!isCompact && action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── COMPOSER ── */}
      <div
        className="shrink-0 px-3 pb-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="rounded-xl transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming 
                ? 'X is thinking...' 
                : isIconOnly 
                ? 'Ask X...' 
                : 'Ask X anything... (Shift+Enter for newline)'
            }
            disabled={isStreaming}
            rows={1}
            className="w-full bg-transparent px-3 pt-3 pb-1 text-[13px] text-gray-200 placeholder-gray-600 resize-none outline-none leading-relaxed disabled:opacity-60"
            style={{ maxHeight: '120px', boxShadow: 'none', outline: 'none' }}
          />

          {/* Composer footer */}
          <div className="flex items-center justify-between px-2 pb-2">
            {!isIconOnly ? (
              <ModelSwitcher />
            ) : (
              <div className="w-1" />
            )}

            <div className="flex items-center gap-1.5">
              {/* Hint: Shift+Enter for newline */}
              {!isCompact && !isIconOnly && (
                <span className="text-[10px] text-gray-600 hidden sm:block">⏎ Send</span>
              )}

              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className={cn(
                    "flex items-center justify-center bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 transition-all cursor-pointer",
                    isIconOnly ? "w-7 h-7 rounded-lg" : "gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                  )}
                  title="Stop streaming"
                >
                  <Square className="w-3 h-3" />
                  {!isIconOnly && 'Stop'}
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={cn(
                    "flex items-center justify-center bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:opacity-50 text-white transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]",
                    isIconOnly ? "w-7 h-7 rounded-lg" : "gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  )}
                  title="Send message"
                >
                  <Send className="w-3 h-3" />
                  {!isIconOnly && 'Send'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
