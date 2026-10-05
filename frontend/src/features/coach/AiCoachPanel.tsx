import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  X,
  Send,
  Square,
  Lightbulb,
  Brain,
  Layers,
  AlertTriangle,
  Timer,
  Bug,
  RotateCcw,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useX } from '../x/XContext';
import { useXChat, type ChatContext } from '../x/useXChat';
import { XMessageList } from '../x/XMessageList';
import { ModelSwitcher } from '../x/ModelSwitcher';
import { cn } from '../../shared/lib/cn';

const COACH_NS = '_coach_:';

interface CoachMode {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  prompt: string;
}

const COACH_MODES: CoachMode[] = [
  {
    id: 'hint',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    label: 'Hint',
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/12',
    activeBorder: 'border-amber-500/35',
    activeText: 'text-amber-300',
    prompt: "Give me a single concise hint for this problem. Don't reveal the approach — just one key insight to nudge my thinking (2–3 sentences max).",
  },
  {
    id: 'intuition',
    icon: <Brain className="w-3.5 h-3.5" />,
    label: 'Intuition',
    color: 'text-violet-400',
    activeBg: 'bg-violet-500/12',
    activeBorder: 'border-violet-500/35',
    activeText: 'text-violet-300',
    prompt: 'Explain the key intuition behind this problem. What pattern or insight should I recognize? Build the right mental model without giving the full algorithm.',
  },
  {
    id: 'approach',
    icon: <Layers className="w-3.5 h-3.5" />,
    label: 'Approach',
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/12',
    activeBorder: 'border-blue-500/35',
    activeText: 'text-blue-300',
    prompt: 'Walk me through the recommended high-level approach to solve this problem step-by-step. Describe the algorithm design, data structures to use, and why — without writing full code.',
  },
  {
    id: 'edge-cases',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Edge Cases',
    color: 'text-orange-400',
    activeBg: 'bg-orange-500/12',
    activeBorder: 'border-orange-500/35',
    activeText: 'text-orange-300',
    prompt: 'List the important edge cases I should test for this problem. Include both obvious and non-obvious scenarios. For each, briefly explain why it might trip up a naive solution.',
  },
  {
    id: 'complexity',
    icon: <Timer className="w-3.5 h-3.5" />,
    label: 'Complexity',
    color: 'text-cyan-400',
    activeBg: 'bg-cyan-500/12',
    activeBorder: 'border-cyan-500/35',
    activeText: 'text-cyan-300',
    prompt: 'Analyze the time and space complexity of my current solution. Provide Big O notation for both, explain the reasoning, and say if better complexity is achievable.',
  },
  {
    id: 'debug',
    icon: <Bug className="w-3.5 h-3.5" />,
    label: 'Debug Reasoning',
    color: 'text-rose-400',
    activeBg: 'bg-rose-500/12',
    activeBorder: 'border-rose-500/35',
    activeText: 'text-rose-300',
    prompt: "Review my current code and reasoning. Find logical flaws, off-by-one errors, incorrect assumptions, or missing cases. Don't give the full solution — just point out what's wrong and why.",
  },
];

export interface AiCoachPanelProps {
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

const StreamingSkeleton: React.FC = () => (
  <div className="px-4 pt-4 pb-2 space-y-2 animate-pulse">
    <div className="h-2.5 bg-white/[0.06] rounded-full w-3/4" />
    <div className="h-2.5 bg-white/[0.05] rounded-full w-full" />
    <div className="h-2.5 bg-white/[0.05] rounded-full w-5/6" />
    <div className="h-2.5 bg-white/[0.04] rounded-full w-2/3 mt-3" />
    <div className="h-2.5 bg-white/[0.05] rounded-full w-full" />
  </div>
);

export const AiCoachPanel: React.FC<AiCoachPanelProps> = ({
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
  const { messages, isStreaming, setProblemSlug, startNewConversation } = useX();
  const { sendMessage, resubmitActiveChat, stopStreaming } = useXChat();

  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<CoachMode | null>(null);
  const [isFirstStreamReceived, setIsFirstStreamReceived] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingPromptRef = useRef<{ prompt: string; ctx: ChatContext } | null>(null);

  const coachSlug = `${COACH_NS}${problemSlug}`;

  useEffect(() => {
    setProblemSlug(coachSlug);
    return () => { setProblemSlug(problemSlug); };
  }, [coachSlug, problemSlug, setProblemSlug]);

  const buildChatCtx = useCallback((): ChatContext => ({
    code, language, problemTitle, problemStatement, constraints,
    compilerError, runtimeError, sampleInput,
  }), [code, language, problemTitle, problemStatement, constraints, compilerError, runtimeError, sampleInput]);

  // Fire queued prompt once startNewConversation clears messages
  useEffect(() => {
    if (messages.length === 0 && pendingPromptRef.current) {
      const { prompt, ctx } = pendingPromptRef.current;
      pendingPromptRef.current = null;
      sendMessage(prompt, ctx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Detect first token arrival to clear skeleton
  const lastMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== lastMsgCount.current) {
      lastMsgCount.current = messages.length;
      setIsFirstStreamReceived(false);
    }
  }, [messages.length]);

  const handleModeClick = useCallback((mode: CoachMode) => {
    if (isStreaming) return;
    setActiveMode(mode);
    setIsFirstStreamReceived(true);
    pendingPromptRef.current = { prompt: mode.prompt, ctx: buildChatCtx() };
    startNewConversation();
  }, [isStreaming, startNewConversation, buildChatCtx]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    setInput('');
    setIsFirstStreamReceived(true);
    await sendMessage(msg, buildChatCtx());
  }, [input, isStreaming, sendMessage, buildChatCtx]);

  const handleRegenerate = useCallback(async () => {
    setIsFirstStreamReceived(true);
    await resubmitActiveChat(buildChatCtx());
  }, [resubmitActiveChat, buildChatCtx]);

  const handleEditMessage = useCallback(async (msgId: string, newContent: string) => {
    setIsFirstStreamReceived(true);
    await resubmitActiveChat(buildChatCtx(), msgId, newContent);
  }, [resubmitActiveChat, buildChatCtx]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
  }, [input]);

  const handleNewSession = () => {
    if (!isStreaming) { startNewConversation(); setActiveMode(null); setIsFirstStreamReceived(true); }
  };

  const isWaiting = isStreaming && isFirstStreamReceived &&
    messages.length > 0 && messages[messages.length - 1]?.content === '' &&
    messages[messages.length - 1]?.role === 'assistant';

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#161618', borderLeft: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-3 shrink-0 h-[38px]"
        style={{ background: '#1c1c1f', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[12px] font-semibold text-gray-200">AI Coach</span>
          <span className={cn('w-1.5 h-1.5 rounded-full', isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500/70')} />
        </div>
        <div className="flex items-center">
          <button onClick={handleNewSession} disabled={isStreaming || messages.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title="New session">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRegenerate} disabled={isStreaming || messages.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title="Regenerate">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Coaching mode grid */}
        <div className="shrink-0 px-2.5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-3 gap-1.5">
            {COACH_MODES.map((mode) => {
              const isActive = activeMode?.id === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode)}
                  disabled={isStreaming}
                  title={mode.label}
                  className={cn(
                    'group flex items-center gap-1.5 px-2 py-2 rounded-lg border text-left transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                    isActive
                      ? cn(mode.activeBg, mode.activeBorder)
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                  )}
                >
                  <span className={cn('shrink-0 transition-colors', isActive ? mode.color : 'text-gray-600 group-hover:text-gray-400')}>
                    {mode.icon}
                  </span>
                  <span className={cn(
                    'text-[11px] font-medium leading-tight truncate transition-colors',
                    isActive ? mode.activeText : 'text-gray-500 group-hover:text-gray-300'
                  )}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation thread */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 select-none text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.12)' }}>
                <Sparkles className="w-4.5 h-4.5 text-emerald-400 w-[18px] h-[18px]" />
              </div>
              <p className="text-[12px] font-medium text-gray-400 mb-0.5">Ready to coach</p>
              <p className="text-[11px] text-gray-600 max-w-[160px] leading-relaxed">
                Pick a mode above or ask anything below.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeMode && (
                <div className="px-3 pt-2.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                    activeMode.activeBg, activeMode.activeBorder, activeMode.color
                  )}>
                    {activeMode.icon}
                    {activeMode.label}
                  </span>
                </div>
              )}
              {isWaiting
                ? <StreamingSkeleton />
                : <XMessageList messages={messages} onRegenerate={handleRegenerate} onEditMessage={handleEditMessage} />
              }
            </div>
          )}
        </div>
      </div>

      {/* ── COMPOSER ── */}
      <div className="shrink-0 px-2.5 pb-2.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Thinking...' : 'Ask anything about this problem...'}
            disabled={isStreaming}
            rows={1}
            className="w-full bg-transparent px-3 pt-2.5 pb-1 text-[12px] text-gray-200 placeholder-gray-600 resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: '110px' }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <ModelSwitcher />
            <div className="flex items-center gap-1.5">
              {isStreaming ? (
                <button onClick={stopStreaming}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer">
                  <Square className="w-2.5 h-2.5" />
                  Stop
                </button>
              ) : (
                <button onClick={() => handleSend()} disabled={!input.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:opacity-30 text-white transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]">
                  <Send className="w-2.5 h-2.5" />
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
