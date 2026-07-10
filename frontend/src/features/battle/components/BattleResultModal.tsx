import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, ArrowLeft, Sparkles, RefreshCw, AlertCircle, X } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { safeParseDate } from '../../../shared/lib/date';
import type { BattlePlayerState } from '../types/battle.types';
import { XCtx } from '../../x/XContext';
import { getModelById, PROVIDERS, type ProviderId } from '../../x/xModels';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/atom-one-dark.css';

// Register languages for syntax highlighting inside AI report card
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);

interface BattleResultModalProps {
  players: BattlePlayerState[];
  problemTitle: string;
  onReturn: () => void;
  startTime?: string | null;
  timeLimit?: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', dot: 'bg-amber-500' },
];

// Simple markdown-to-html converter (no external deps needed)
function parseMarkdown(text: string): string {
  const html = text
    // escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="x-inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-black text-gray-200 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-black text-[#4F7DFF] mt-5 mb-2.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-black text-[#4F7DFF] mt-6 mb-3">$1</h1>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="text-xs text-gray-300 ml-4 list-disc my-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-xs text-gray-300 ml-4 list-decimal my-1">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-white/5 my-4" />')
    // Line breaks
    .replace(/\n/g, '<br />');
  return html;
}

interface ParsedBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    blocks.push({ type: 'code', language: match[1] || 'text', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return blocks;
}

const ResultCodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/5 bg-[#0c0f16]/60 font-mono text-xs select-text">
      <div className="flex justify-between items-center px-3 py-1 bg-white/[0.02] border-b border-white/5 text-[9px] text-gray-550 font-sans select-none">
        <span>{language.toUpperCase()}</span>
      </div>
      <pre className="p-3 overflow-x-auto custom-scrollbar leading-relaxed text-gray-300">
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  players,
  problemTitle,
  onReturn,
  startTime,
  timeLimit,
}) => {
  const navigate = useNavigate();
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [reportCardText, setReportCardText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [showReportCard, setShowReportCard] = useState(true);

  // Retrieve X integration context for LLM credentials & model
  const xCtx = useContext(XCtx);

  const [matchDuration, setMatchDuration] = useState('N/A');
  const [fastestSolve, setFastestSolve] = useState('N/A');

  // Compute match duration and fastest solve time purely inside useEffect (where Date.now is allowed)
  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const solvedPlayers = players.filter(p => p.solved && p.solved_at);
    
    let end: number;
    if (players.length <= 2 && solvedPlayers.length > 0) {
      const firstSolvedTime = Math.min(...solvedPlayers.map(p => new Date(p.solved_at!).getTime()));
      end = firstSolvedTime;
    } else {
      if (timeLimit) {
        end = start + timeLimit * 60 * 1000;
        if (end > Date.now()) {
          end = Date.now();
        }
      } else {
        end = Date.now();
      }
    }
    
    const diffSeconds = Math.max(0, Math.round((end - start) / 1000));
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatchDuration(`${mins}m ${secs}s`);

    if (solvedPlayers.length > 0) {
      const solveTimes = solvedPlayers.map(p => {
        const elapsed = new Date(p.solved_at!).getTime() - start;
        return Math.max(0, Math.round(elapsed / 1000));
      });
      const fastest = Math.min(...solveTimes);
      const fMins = Math.floor(fastest / 60);
      const fSecs = fastest % 60;
      setFastestSolve(`${fMins}m ${fSecs}s`);
    }
  }, [startTime, players, timeLimit]);

  // Loop through available providers to find the first one that has a verified key configured.
  // Falls back to active/default model if no keys are found.
  const getAvailableModelWithKey = () => {
    if (!xCtx) return null;
    const preferredProviders: ProviderId[] = ['gemini', 'groq', 'deepseek', 'openai', 'anthropic'];
    for (const pid of preferredProviders) {
      const key = xCtx.getEffectiveKey(pid);
      if (key && key.trim() !== '' && !key.startsWith('YOUR_')) {
        const prov = PROVIDERS.find(p => p.id === pid);
        if (prov && prov.models.length > 0) {
          const matchedModel = prov.models.find(m => m.id === xCtx.selectedModelId) || prov.models[0];
          return {
            provider: prov,
            model: matchedModel,
            apiKey: key.trim()
          };
        }
      }
    }

    // Fallback: If no provider has a custom key, use the active model anyway
    const activeModelId = xCtx.selectedModelId || 'gemini-2.0-flash';
    const fallback = getModelById(activeModelId) || getModelById('gemini-2.0-flash');
    if (fallback) {
      return {
        provider: fallback.provider,
        model: fallback.model,
        apiKey: xCtx.getEffectiveKey(fallback.provider.id) || ''
      };
    }
    return null;
  };

  const activeModelWithKey = getAvailableModelWithKey();

  const getSuccessRate = () => {
    const solved = players.filter(p => p.solved).length;
    return `${solved}/${players.length}`;
  };

  const generateReportCard = async (provider: XProvider, model: XModel, apiKey: string) => {
    setIsGenerating(true);
    setGenerationError('');
    setReportCardText('');

    try {
      const participantsDetails = players.map(p => {
        return `Player: ${p.username}
Solved: ${p.solved ? 'Yes' : 'No'}
Score: ${p.score} PTS
Attempts: ${p.attempts}
Language: ${p.lang}
Code submitted:
\`\`\`${p.lang}
${p.code || '// No code submitted or empty'}
\`\`\``;
      }).join('\n\n');

      const systemPrompt = `You are the AI Arena Judge for bugX, a competitive coding platform.
Analyze the competitive coding match results and generate a beautiful "AI Match Report Card" in markdown.
Focus on comparing code structures, logic, efficiency (time/space complexity), and giving specific, high-value, constructive suggestions for improvement.`;

      const prompt = `Analyze the following competitive coding match:

Match Details:
Problem: ${problemTitle}
Duration: ${matchDuration}
Success Rate: ${getSuccessRate()}
Winner: ${winnerUsername || 'None'}

Participants details & code submissions:
${participantsDetails}

Generate a concise report card. No intro/outro.`;

      let response: Response;
      if (provider.id === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: 2000,
            messages: [{ role: 'user', content: `${systemPrompt}\n\n${prompt}` }],
            stream: true,
          }),
        });
      } else {
        response = await fetch(provider.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            stream: true,
          }),
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API returned ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const token =
                json.choices?.[0]?.delta?.content ||
                json.choices?.[0]?.text ||
                '';
              if (token) {
                accumulated += token;
                setReportCardText(accumulated);
              }
            } catch { /* ignore parse error */ }
          }
        }
      }
    } catch (err) {
      console.error('Report card generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate report card.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate confetti and auto-trigger report card on mount
  useEffect(() => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
    const particles: ConfettiParticle[] = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -20 - 5,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      duration: Math.random() * 2.5 + 3,
      angle: Math.random() * 360,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfetti(particles);

    if (activeModelWithKey) {
      generateReportCard(activeModelWithKey.provider, activeModelWithKey.model, activeModelWithKey.apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTriggerAutoGeneration = () => {
    const freshModel = getAvailableModelWithKey();
    if (freshModel) {
      generateReportCard(freshModel.provider, freshModel.model, freshModel.apiKey);
    }
  };

  const sortedLeaderboard = [...players].sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.solved_at && b.solved_at) {
      const timeA = safeParseDate(a.solved_at).getTime();
      const timeB = safeParseDate(b.solved_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
    } else if (a.solved_at) {
      return -1;
    } else if (b.solved_at) {
      return 1;
    }
    return a.player_index - b.player_index;
  });

  const winner = sortedLeaderboard[0];
  const winnerUsername = (winner && (winner.solved || winner.score > 0)) ? winner.username : null;

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-250 flex flex-col items-center justify-center p-6 relative overflow-y-auto select-none">
      {/* Confetti raining */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm pointer-events-none z-50 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.angle}deg)`,
            opacity: 0.8,
          }}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          position: absolute;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1);
          animation-fill-mode: forwards;
        }
      `}} />

      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-[#4F7DFF]/4 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7A5FFF]/3 rounded-full blur-[140px] pointer-events-none" />

      <div className={cn(
        "relative w-full z-10 grid gap-6 backdrop-blur-md rounded-2xl p-6 sm:p-8 animate-fade-in my-8 shadow-2xl bg-[#0a0e17] border border-[#1f293d] items-stretch",
        activeModelWithKey && showReportCard ? "max-w-6xl grid-cols-1 lg:grid-cols-12" : "max-w-xl grid-cols-1"
      )}>
        {/* Left Column: Battle Info, Standings & Navigation */}
        <div className={cn(
          "flex flex-col justify-between space-y-5",
          activeModelWithKey && showReportCard ? "lg:col-span-5" : ""
        )}>
          <div className="space-y-5">
            {/* Header Title */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-gray-150 animate-pulse">Battle Complete</h2>
                <p className="text-xs text-gray-500">Problem: {problemTitle}</p>
                {winnerUsername && (
                  <p className="text-sm font-bold text-yellow-400 mt-1">
                    🎉 Winner: {winnerUsername} 🎉
                  </p>
                )}
              </div>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-3 bg-[#131926] p-3.5 rounded-xl border border-[#1f2a3f]">
              <div className="text-center">
                <span className="block text-[9px] text-[#9CA3AF] uppercase font-sans font-bold">Duration</span>
                <span className="text-xs font-bold text-gray-250 mt-1 block">{matchDuration}</span>
              </div>
              <div className="text-center border-x border-[#1f2a3f]">
                <span className="block text-[9px] text-[#9CA3AF] uppercase font-sans font-bold">Fastest Solve</span>
                <span className="text-xs font-bold text-emerald-450 mt-1 block">{fastestSolve}</span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] text-[#9CA3AF] uppercase font-sans font-bold">Success Rate</span>
                <span className="text-xs font-bold text-blue-450 mt-1 block">{getSuccessRate()}</span>
              </div>
            </div>

            {/* Podium Standings list */}
            <div className="space-y-2">
              {sortedLeaderboard.map((p, idx) => {
                const color = PLAYER_COLORS[p.player_index % PLAYER_COLORS.length];
                const isWinner = idx === 0 && p.solved;

                const highlightClass = 
                  idx === 0 && p.solved
                    ? "bg-yellow-500/10 border-yellow-500/25 shadow-[0_0_15px_rgba(234,179,8,0.05)]" 
                    : idx === 1 && p.solved
                      ? "bg-slate-400/10 border-slate-400/25 shadow-[0_0_15px_rgba(148,163,184,0.03)]"
                      : idx === 2 && p.solved
                        ? "bg-amber-700/10 border-amber-700/25 shadow-[0_0_15px_rgba(180,83,9,0.03)]"
                        : "bg-[#111724] border border-[#1e273b] hover:bg-[#161f30] hover:border-[#25324c]";

                return (
                  <div
                    key={p.player_index}
                    className={cn(
                      "flex items-center justify-between py-3.5 px-4 rounded-xl border border-transparent transition-all duration-300",
                      highlightClass
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-dark-bg/60 shrink-0">
                        {idx === 0 ? <Medal className="w-4 h-4 text-yellow-500" /> :
                         idx === 1 ? <Medal className="w-4 h-4 text-slate-400" /> :
                         idx === 2 ? <Medal className="w-4 h-4 text-amber-600" /> :
                         <span className="text-[10px] font-black text-gray-600">#{idx + 1}</span>}
                      </div>

                      <div className="min-w-0">
                        <span className={cn("text-xs font-black flex items-center gap-1.5 truncate", color.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", color.dot)} />
                          {p.username}
                        </span>
                        <span className="text-[9px] text-gray-550 block mt-0.5 font-medium">
                          {p.attempts} attempt{p.attempts !== 1 ? 's' : ''} · {p.solved ? 'Solved' : 'Failed'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn("text-sm font-black block", isWinner ? 'text-yellow-400 font-extrabold' : 'text-gray-250')}>
                        {p.score} <span className="text-[9px] text-gray-555 font-bold">PTS</span>
                      </span>
                      {p.solved_at && (
                        <span className="text-[8px] text-gray-600 font-mono">
                          {safeParseDate(p.solved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Show Report Card button if it was dismissed */}
          {activeModelWithKey && !showReportCard && (
            <button
              onClick={() => setShowReportCard(true)}
              className="w-full py-2.5 bg-[#0d1018] hover:bg-[#111622] border border-white/[0.05] hover:border-[#4F7DFF]/25 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4F7DFF]/60" />
              Show AI Report Card
            </button>
          )}

          <div className="h-px bg-white/[0.03]" />

          {/* Navigation Actions (moved to left column) */}
          <div className="grid grid-cols-2 gap-3 select-none">
            <button
              onClick={() => navigate('/')}
              className="py-3 px-4 bg-[#090b11] hover:bg-[#111520] border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </button>
            <button
              onClick={onReturn}
              className="py-3 px-4 bg-[#161b29] hover:bg-[#1f2639] border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center"
            >
              Return to Arena Setup
            </button>
          </div>
        </div>

        {/* Right Column: AI Report Card (fills the height and is side-by-side with left column) */}
        {activeModelWithKey && showReportCard && (
          <div className="lg:col-span-7 flex flex-col h-full min-h-[460px] max-h-[580px] border border-[#1d273a] bg-[#0d121d] rounded-2xl overflow-hidden shadow-lg">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#212d44] bg-[#131928]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#4F7DFF]/15 border border-[#4F7DFF]/25 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#4F7DFF] animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-gray-300 tracking-wider">AI Match Report</span>
                  <span className="text-[9px] text-gray-500 block font-mono">{activeModelWithKey.provider.name} · {activeModelWithKey.model.displayName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isGenerating ? (
                  <button
                    onClick={handleTriggerAutoGeneration}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b29] hover:bg-[#1f2639] border border-white/[0.06] hover:border-[#4F7DFF]/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="text-[9px] text-gray-500 font-mono font-bold">Judging...</span>
                  </div>
                )}
                <button
                  onClick={() => setShowReportCard(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#161b29] hover:bg-rose-500/15 border border-white/[0.05] hover:border-rose-500/30 text-gray-500 hover:text-rose-400 transition-all"
                  title="Close report card"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Side-by-side inside report card: Left metadata bar + Right scrollable contents */}
            <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
              {/* Left panel inside Report Card: Light Dark styling */}
              <div className="w-[170px] bg-[#182030] border-r border-[#26324d] p-4 flex flex-col justify-between shrink-0">
                <div className="space-y-4">
                  <div>
                    <span className="block text-[8px] uppercase text-[#4F7DFF] font-bold tracking-wider mb-1">Provider</span>
                    <span className="text-[11px] font-black text-gray-200">{activeModelWithKey.provider.name}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase text-[#4F7DFF] font-bold tracking-wider mb-1">Model</span>
                    <span className="text-[10px] font-bold text-gray-400 block truncate" title={activeModelWithKey.model.displayName}>
                      {activeModelWithKey.model.displayName}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase text-[#4F7DFF] font-bold tracking-wider mb-1">Players</span>
                    <span className="text-[10px] font-bold text-gray-400">{players.length} combatants</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase text-[#4F7DFF] font-bold tracking-wider mb-1">Status</span>
                    <span className={`text-[10px] font-bold ${isGenerating ? 'text-emerald-400' : generationError ? 'text-rose-400' : 'text-gray-400'}`}>
                      {isGenerating ? 'Analyzing...' : generationError ? 'Error' : reportCardText ? 'Complete' : 'Idle'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#26324d]">
                  <div className="text-[8px] text-gray-500 font-mono leading-relaxed">
                    {isGenerating ? 'Streaming analysis in real-time...' : 'AI-powered judge feedback.'}
                  </div>
                </div>
              </div>

              {/* Right content panel: Deep Dark styling */}
              <div className="flex-1 p-5 bg-[#0c101b] flex flex-col min-h-0 overflow-hidden">
                {/* Loading / Generating State */}
                {isGenerating && reportCardText === '' && (
                  <div className="flex-grow flex flex-col items-center justify-center py-10 gap-3">
                    <RefreshCw className="w-5 h-5 text-[#4F7DFF] animate-spin" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider animate-pulse">
                      Analyzing match code submissions...
                    </span>
                  </div>
                )}

                {/* Error State */}
                {generationError && (
                  <div className="flex-grow p-4 rounded-xl bg-rose-500/[0.03] border border-rose-500/10 flex items-start gap-3 text-rose-400 text-xs leading-relaxed overflow-y-auto">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <span>{generationError}</span>
                    </div>
                  </div>
                )}

                {/* Report Content */}
                {reportCardText !== '' && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-2 select-text min-h-0">
                    {parseBlocks(reportCardText).map((block, i) => {
                      if (block.type === 'code') {
                        return (
                          <ResultCodeBlock
                            key={i}
                            code={block.content}
                            language={block.language || 'text'}
                          />
                        );
                      }
                      const html = parseMarkdown(block.content);
                      return (
                        <div
                          key={i}
                          className="text-xs leading-relaxed font-normal select-text break-words text-gray-300"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {!isGenerating && !generationError && reportCardText === '' && (
                  <div className="flex-grow flex flex-col items-center justify-center gap-3 text-center">
                    <Sparkles className="w-6 h-6 text-gray-600" />
                    <span className="text-[11px] text-gray-600 font-medium">AI report will appear here</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

