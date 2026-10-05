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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Sparkles,
  Code2,
  MessageSquare,
} from 'lucide-react';
import { useX } from '../x/XContext';
import { useXChat, type ChatContext } from '../x/useXChat';
import { XMessageList } from '../x/XMessageList';
import { ModelSwitcher } from '../x/ModelSwitcher';
import { cn } from '../../shared/lib/cn';

// ─── Coach Namespace ───────────────────────────────────────────────────────────
// Prefix ensures coach conversations are stored separately from X conversations
// in the shared XContext, so switching between panels doesn't bleed messages.
const COACH_NS = '_coach_:';

// ─── Coach Modes ───────────────────────────────────────────────────────────────

interface CoachMode {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  activeBg: string;
  borderColor: string;
  activeBorder: string;
  prompt: string;
}

const COACH_MODES: CoachMode[] = [
  {
    id: 'hint',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    label: 'Hint',
    description: 'A nudge in the right direction',
    color: 'text-amber-400',
    bgColor: 'bg-white/[0.03] hover:bg-amber-500/10',
    activeBg: 'bg-amber-500/15',
    borderColor: 'border-white/[0.07] hover:border-amber-500/30',
    activeBorder: 'border-amber-500/40',
    prompt:
      "Give me a single concise hint for this problem. Don't reveal the approach — just one key insight to nudge my thinking (2–3 sentences max).",
  },
  {
    id: 'intuition',
    icon: <Brain className="w-3.5 h-3.5" />,
    label: 'Intuition',
    description: 'Build the mental model',
    color: 'text-violet-400',
    bgColor: 'bg-white/[0.03] hover:bg-violet-500/10',
    activeBg: 'bg-violet-500/15',
    borderColor: 'border-white/[0.07] hover:border-violet-500/30',
    activeBorder: 'border-violet-500/40',
    prompt:
      'Explain the key intuition behind this problem. What pattern or insight should I recognize? Build the right mental model without giving the full algorithm.',
  },
  {
    id: 'approach',
    icon: <Layers className="w-3.5 h-3.5" />,
    label: 'Approach',
    description: 'Step-by-step strategy',
    color: 'text-blue-400',
    bgColor: 'bg-white/[0.03] hover:bg-blue-500/10',
    activeBg: 'bg-blue-500/15',
    borderColor: 'border-white/[0.07] hover:border-blue-500/30',
    activeBorder: 'border-blue-500/40',
    prompt:
      'Walk me through the recommended high-level approach to solve this problem step-by-step. Describe the algorithm design, data structures to use, and why — without writing full code.',
  },
  {
    id: 'edge-cases',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Edge Cases',
    description: 'Tricky corner cases',
    color: 'text-orange-400',
    bgColor: 'bg-white/[0.03] hover:bg-orange-500/10',
    activeBg: 'bg-orange-500/15',
    borderColor: 'border-white/[0.07] hover:border-orange-500/30',
    activeBorder: 'border-orange-500/40',
    prompt:
      'List the important edge cases I should test for this problem. Include both obvious and non-obvious scenarios. For each, briefly explain why it might trip up a naive implementation.',
  },
  {
    id: 'complexity',
    icon: <Timer className="w-3.5 h-3.5" />,
    label: 'Complexity',
    description: 'Time & space analysis',
    color: 'text-cyan-400',
    bgColor: 'bg-white/[0.03] hover:bg-cyan-500/10',
    activeBg: 'bg-cyan-500/15',
    borderColor: 'border-white/[0.07] hover:border-cyan-500/30',
    activeBorder: 'border-cyan-500/40',
    prompt:
      'Analyze the time and space complexity of my current solution. Provide Big O notation for both, explain the reasoning, and tell me if a better complexity is achievable for this problem.',
  },
  {
    id: 'debug',
    icon: <Bug className="w-3.5 h-3.5" />,
    label: 'Debug My Reasoning',
    description: 'Find flaws in my logic',
    color: 'text-rose-400',
    bgColor: 'bg-white/[0.03] hover:bg-rose-500/10',
    activeBg: 'bg-rose-500/15',
    borderColor: 'border-white/[0.07] hover:border-rose-500/30',
    activeBorder: 'border-rose-500/40',
    prompt:
      "Review my current code and reasoning. Find logical flaws, off-by-one errors, incorrect assumptions, or missing cases. Don't give the full solution — just point out what's wrong and why.",
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

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

// ─── Streaming Skeleton ────────────────────────────────────────────────────────

const StreamingSkeleton: React.FC = () => (
  <div className="px-4 py-4 space-y-2 animate-pulse">
    <div className="h-3 bg-white/[0.06] rounded-full w-3/4" />
    <div className="h-3 bg-white/[0.05] rounded-full w-full" />
    <div className="h-3 bg-white/[0.05] rounded-full w-5/6" />
    <div className="h-3 bg-white/[0.04] rounded-full w-2/3 mt-3" />
    <div className="h-3 bg-white/[0.05] rounded-full w-full" />
    <div className="h-3 bg-white/[0.04] rounded-full w-4/5" />
  </div>
);

// ─── Context Snapshot Bar ──────────────────────────────────────────────────────

interface ContextBarProps {
  language: string;
  hasCode: boolean;
  hasError: boolean;
}

const ContextBar: React.FC<ContextBarProps> = ({ language, hasCode, hasError }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 shrink-0 overflow-x-auto"
    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}
  >
    {hasCode && (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-white/[0.04] rounded px-1.5 py-0.5 shrink-0 border border-white/[0.06]">
        <Code2 className="w-2.5 h-2.5" />
        {language}
      </div>
    )}
    {hasError && (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-red-400/80 bg-red-500/[0.08] rounded px-1.5 py-0.5 shrink-0 border border-red-500/[0.15]">
        <Bug className="w-2.5 h-2.5" />
        error
      </div>
    )}
    <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400/70 bg-emerald-500/[0.07] rounded px-1.5 py-0.5 shrink-0 border border-emerald-500/[0.15]">
      <Sparkles className="w-2.5 h-2.5" />
      context ready
    </div>
  </div>
);

// ─── Main Panel ────────────────────────────────────────────────────────────────

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
  const {
    messages,
    isStreaming,
    setProblemSlug,
    startNewConversation,
  } = useX();
  const { sendMessage, resubmitActiveChat, stopStreaming } = useXChat();

  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<CoachMode | null>(null);
  const [isModesCollapsed, setIsModesCollapsed] = useState(false);
  const [isFirstStreamReceived, setIsFirstStreamReceived] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Conversation Isolation ──────────────────────────────────────────────────
  // Use a namespaced slug so coach conversations are stored separately from X.
  const coachSlug = `${COACH_NS}${problemSlug}`;

  useEffect(() => {
    setProblemSlug(coachSlug);
    // Restore problem slug on unmount so X panel resumes its own slug
    return () => {
      setProblemSlug(problemSlug);
    };
  }, [coachSlug, problemSlug, setProblemSlug]);

  // Track first token to remove skeleton
  const lastMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== lastMessageCount.current) {
      lastMessageCount.current = messages.length;
      setIsFirstStreamReceived(false);
    }
  }, [messages.length]);

  // ── Chat Context ────────────────────────────────────────────────────────────
  const buildChatCtx = useCallback((): ChatContext => ({
    code,
    language,
    problemTitle,
    problemStatement,
    constraints,
    compilerError,
    runtimeError,
    sampleInput,
  }), [code, language, problemTitle, problemStatement, constraints, compilerError, runtimeError, sampleInput]);

  // ── Mode Handler ────────────────────────────────────────────────────────────
  // Pending prompt queued after startNewConversation flushes message state
  const pendingPromptRef = useRef<{ prompt: string; ctx: ChatContext } | null>(null);

  // When messages are cleared (new conversation started), fire any queued prompt
  useEffect(() => {
    if (messages.length === 0 && pendingPromptRef.current) {
      const { prompt, ctx } = pendingPromptRef.current;
      pendingPromptRef.current = null;
      sendMessage(prompt, ctx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleModeClick = useCallback((mode: CoachMode) => {
    if (isStreaming) return;
    setActiveMode(mode);
    setIsFirstStreamReceived(true);
    // Queue the prompt, then start a fresh conversation.
    // The useEffect above will fire it once messages clear.
    pendingPromptRef.current = { prompt: mode.prompt, ctx: buildChatCtx() };
    startNewConversation();
  }, [isStreaming, startNewConversation, buildChatCtx]);

  // ── Free-form Send ──────────────────────────────────────────────────────────
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

  const handleClearSession = () => {
    if (!isStreaming) {
      startNewConversation();
      setActiveMode(null);
      setIsFirstStreamReceived(true);
    }
  };

  // Whether we're waiting for the first token after sending
  const isWaitingForFirstToken = isStreaming && isFirstStreamReceived && messages.length > 0 &&
    messages[messages.length - 1]?.content === '' && messages[messages.length - 1]?.role === 'assistant';

  const hasCode = !!code?.trim();
  const hasError = !!(compilerError || runtimeError);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#161618', borderLeft: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-3 shrink-0 h-[38px]"
        style={{
          background: 'linear-gradient(90deg, #1a1a1d 0%, #1c1f1c 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Left: branding */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[12px] font-bold text-gray-100 tracking-tight">AI Coach</span>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
          )} />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleClearSession}
            disabled={isStreaming || messages.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="New coaching session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isStreaming || messages.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Regenerate last response"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Close AI Coach"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CONTEXT SNAPSHOT ── */}
      <ContextBar language={language} hasCode={hasCode} hasError={hasError} />

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── COACHING MODES GRID ── */}
        <div className="shrink-0 px-3 pt-2.5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              Coaching Modes
            </span>
            <button
              onClick={() => setIsModesCollapsed(prev => !prev)}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-700 hover:text-gray-500 transition-all cursor-pointer"
              title={isModesCollapsed ? 'Expand' : 'Collapse'}
            >
              {isModesCollapsed
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isModesCollapsed && (
            <div className="grid grid-cols-2 gap-1.5">
              {COACH_MODES.map((mode) => {
                const isActive = activeMode?.id === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeClick(mode)}
                    disabled={isStreaming}
                    title={mode.description}
                    className={cn(
                      'group text-left px-2.5 py-2 rounded-lg border transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                      isActive
                        ? cn(mode.activeBg, mode.activeBorder)
                        : cn(mode.bgColor, mode.borderColor),
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'transition-colors shrink-0',
                        isActive ? mode.color : 'text-gray-600 group-hover:text-gray-400',
                      )}>
                        {mode.icon}
                      </span>
                      <span className={cn(
                        'text-[11px] font-semibold leading-tight transition-colors',
                        isActive ? mode.color : 'text-gray-400 group-hover:text-gray-200',
                      )}>
                        {mode.label}
                      </span>
                    </div>
                    <p className={cn(
                      'text-[10px] mt-0.5 leading-tight truncate transition-colors',
                      isActive ? 'text-gray-500' : 'text-gray-700 group-hover:text-gray-600',
                    )}>
                      {mode.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CONVERSATION THREAD ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 select-none text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
              >
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-200 mb-1.5 tracking-tight">
                Your AI Coach is ready
              </h3>
              <p className="text-[11px] text-gray-600 max-w-[190px] leading-relaxed mb-5">
                Pick a coaching mode above for structured guidance, or ask anything below.
              </p>
              {/* Quick suggestion pills */}
              <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
                {[
                  { icon: '🎯', text: "Where should I start?" },
                  { icon: '🤔', text: "What pattern is this?" },
                  { icon: '📝', text: "Explain the constraints" },
                ].map(s => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.text)}
                    disabled={isStreaming}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] font-medium text-gray-400 hover:text-gray-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Active mode pill */}
              {activeMode && (
                <div className="px-3 pt-2.5 pb-0">
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border',
                    activeMode.activeBg,
                    activeMode.activeBorder,
                    activeMode.color,
                  )}>
                    {activeMode.icon}
                    {activeMode.label} Mode
                  </div>
                </div>
              )}

              {/* Streaming skeleton while waiting for first token */}
              {isWaitingForFirstToken ? (
                <StreamingSkeleton />
              ) : (
                <XMessageList
                  messages={messages}
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── COMPOSER ── */}
      <div
        className="shrink-0 px-3 pb-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Section label */}
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-2.5 h-2.5 text-gray-700" />
          <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
            Conversation
          </span>
        </div>

        <div
          className="rounded-xl transition-all"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.025)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'Coach is thinking...'
                : 'Ask anything about this problem...'
            }
            disabled={isStreaming}
            rows={1}
            className="w-full bg-transparent px-3 pt-3 pb-1 text-[13px] text-gray-200 placeholder-gray-700 resize-none outline-none leading-relaxed disabled:opacity-60"
            style={{ maxHeight: '120px', boxShadow: 'none', outline: 'none' }}
          />

          {/* Composer footer */}
          <div className="flex items-center justify-between px-2 pb-2">
            <ModelSwitcher />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-700 hidden sm:block">⏎ Send</span>

              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 transition-all cursor-pointer"
                  title="Stop"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:opacity-40 text-white transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]"
                  title="Send"
                >
                  <Send className="w-3 h-3" />
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
