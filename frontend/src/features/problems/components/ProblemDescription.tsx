import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Database, Shield, Award, Tag as TagIcon, StickyNote, ChevronDown, Lightbulb, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { userStorage } from '../../../shared/lib/userState';
import { getHintsForProblem } from '../hints';

interface Tag {
  id: string;
  name: string;
}

interface Template {
  language: string;
  template_code?: string;
  source_code?: string;
  function_name?: string;
}

interface SampleTestCase {
  id: string;
  input: string | null;
  expected_output: string | null;
  is_sample: boolean;
}

interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  description: string;
  constraints?: string | null;
  acceptance_rate?: number | null;
  score_base: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  tags?: Tag[];
  templates?: Template[];
  sample_test_cases?: SampleTestCase[];
  hints?: string[];
  source?: string | null;
  external_problem_id?: string | null;
}

interface ProblemDescriptionProps {
  problem: ProblemDetail;
  user?: { id: string; username: string } | null;
  focusMode?: boolean;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  activeLanguage?: 'python' | 'javascript' | 'cpp' | 'java';
  isNotesExpanded?: boolean;
  onNotesExpandedChange?: (expanded: boolean) => void;
  similarQuestions?: { id: string; title: string; slug: string; difficulty: string }[];
  hideHints?: boolean;
}

const CollapsibleHint: React.FC<{ index: number; hint: string }> = ({ index, hint }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-250 transition-colors"
      >
        <span className="flex items-center gap-1.5 select-none">
          <Lightbulb className="w-3 h-3 text-amber-500/80" /> Hint {index + 1}
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div 
          className="p-3 text-xs text-gray-300 bg-black/20 leading-relaxed select-text hint-content"
          dangerouslySetInnerHTML={{ __html: hint }}
        />
      )}
    </div>
  );
};

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({
  problem,
  user,
  focusMode = false,
  notes = '',
  onNotesChange,
  isNotesExpanded,
  onNotesExpandedChange,
  similarQuestions = [],
  hideHints = false,
}) => {
  const [isNotesExpandedInternal, setIsNotesExpandedInternal] = useState(false);
  const isNotesExpandedActual = isNotesExpanded !== undefined ? isNotesExpanded : isNotesExpandedInternal;

  const toggleNotesExpanded = () => {
    if (onNotesExpandedChange) {
      onNotesExpandedChange(!isNotesExpandedActual);
    } else {
      setIsNotesExpandedInternal(!isNotesExpandedInternal);
    }
  };

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHtmlDescription = problem.description.includes('<') && problem.description.includes('>');

  const handleNotesChangeLocal = (value: string) => {
    if (onNotesChange) {
      onNotesChange(value);
    }
    // Save to user storage
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      if (user) {
        userStorage.setNote(user.id, problem.slug, value);
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, []);

  const getExternalLink = () => {
    if (!problem.source) return null;
    const src = problem.source.toLowerCase();
    if (src === 'leetcode') {
      return {
        url: `https://leetcode.com/problems/${problem.slug}/`,
        name: 'LeetCode'
      };
    } else if (src === 'gfg' || src === 'geeksforgeeks') {
      return {
        url: `https://www.geeksforgeeks.org/problems/${problem.slug}/`,
        name: 'GeeksforGeeks'
      };
    }
    return null;
  };



  return (
    <div className="space-y-5 p-5 select-text h-auto overflow-visible font-sans">
      {/* Title only */}
      {!focusMode && (
        <div className="pb-4 border-b border-[#3e3e3e] select-none flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight break-words">
            {problem.title}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              style={
                problem.difficulty.toLowerCase() === 'easy' ? { background: '#063b2e', color: '#34d399' } :
                problem.difficulty.toLowerCase() === 'medium' ? { background: '#3f2b00', color: '#fbbf24' } :
                { background: '#3b1010', color: '#f87171' }
              }
              className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider select-none shrink-0 border-none"
            >
              {problem.difficulty}
            </span>
            <span
              style={{ background: 'rgba(79,70,229,.18)', color: '#a5b4fc' }}
              className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider select-none shrink-0 border-none"
            >
              {problem.score_base} {problem.score_base === 1 ? 'PT' : 'PTS'}
            </span>
          </div>
        </div>
      )}

      {/* Description Body */}
      <div className="space-y-4">
        <div
          className={`text-gray-300 text-sm leading-relaxed problem-description-content break-words overflow-x-auto ${
            isHtmlDescription ? 'whitespace-normal' : 'whitespace-pre-wrap'
          }`}
          dangerouslySetInnerHTML={{ __html: problem.description }}
        />
      </div>



      {/* Examples */}
      {!problem.description.toLowerCase().includes('example 1') &&
       !problem.description.toLowerCase().includes('example:') &&
       problem.sample_test_cases &&
       problem.sample_test_cases.length > 0 && (
        <div className="space-y-4 pt-2 pb-4 problem-description-content">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider select-none">Examples</h3>
          <div className="space-y-3">
            {problem.sample_test_cases.map((tc, index) => (
              <div key={tc.id || index} className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 select-none">Example {index + 1}</div>
                <pre>
                  <strong>Input:</strong> {tc.input}
                  {"\n"}
                  <strong>Output:</strong> {tc.expected_output}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints */}
      {problem.constraints && (
        <div className="space-y-2 pb-4">
          <h3 className="text-xs font-bold text-gray-300 select-none flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
            Constraints
          </h3>
          <div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: 'none',
              borderRadius: '18px',
              boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
            }}
            className="text-gray-400 text-xs font-mono p-4 leading-normal whitespace-pre-wrap break-words overflow-x-auto"
          >
            {problem.constraints}
          </div>
        </div>
      )}

      {/* Execution specs & Tags grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        {/* Specs */}
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
          }}
          className="p-4 shadow-sm space-y-3 select-none"
        >
          <h2 className="text-xs font-extrabold uppercase text-gray-500 pb-1.5">Execution Specs</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Limit
              </span>
              <span className="text-gray-300 font-mono font-medium">{problem.time_limit_ms} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Memory Limit
              </span>
              <span className="text-gray-300 font-mono font-medium">{(problem.memory_limit_kb / 1024).toFixed(0)} MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Visibility
              </span>
              <span className="text-gray-400 font-medium font-sans">Published</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Base Score
              </span>
              <span className="text-gray-300 font-mono font-semibold">{problem.score_base} pts</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: 'none',
              borderRadius: '18px',
              boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
            }}
            className="p-4 shadow-sm space-y-3 select-none"
          >
            <h2 className="text-xs font-extrabold uppercase text-gray-500 pb-1.5 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5" /> Tags
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map((t) => {
                const badgeClass = "text-[10px] px-2.5 py-1 rounded-md text-gray-550 hover:text-gray-300 transition-colors font-semibold select-none";
                const badgeStyle = { background: 'rgba(255,255,255,0.015)', border: 'none', borderRadius: '6px' };
                return focusMode ? (
                  <div key={t.id} className={badgeClass} style={badgeStyle}>
                    {t.name}
                  </div>
                ) : (
                  <Link
                    key={t.id}
                    to={`/problems?tag=${encodeURIComponent(t.name)}`}
                    className={badgeClass}
                    style={badgeStyle}
                  >
                    {t.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hints Collapsible */}
      {(() => {
        const displayedHints = (problem.hints && problem.hints.length > 0)
          ? problem.hints
          : getHintsForProblem(problem.slug);

        return !hideHints && displayedHints && displayedHints.length > 0 && (
          <div
            id="problem-hints-section"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: 'none',
              borderRadius: '18px',
              boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
            }}
            className="p-4 shadow-sm space-y-3"
          >
            <h2 className="text-xs font-extrabold uppercase text-gray-500 pb-1.5 select-none">
              Problem Hints
            </h2>
            <div className="space-y-2">
              {displayedHints.map((hint, idx) => (
                <CollapsibleHint key={idx} index={idx} hint={hint} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Notes Section */}
      {onNotesChange && (
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
          }}
          className="p-4 shadow-sm space-y-3"
        >
          <button
            onClick={toggleNotesExpanded}
            className="w-full text-xs font-extrabold uppercase text-gray-500 pb-1.5 flex items-center justify-between select-none cursor-pointer hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-gray-600" /> My Notes
            </span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", isNotesExpandedActual && "rotate-180")} />
          </button>
          {isNotesExpandedActual && (
            <div className="space-y-2 animate-fade-in">
              <textarea
                id="notes-textarea"
                value={notes}
                onChange={(e) => handleNotesChangeLocal(e.target.value)}
                placeholder="Write your personal notes, approach ideas, or key observations..."
                className="w-full min-h-[120px] max-h-[300px] p-3 rounded-lg text-xs text-gray-300 font-sans leading-relaxed resize-y placeholder:text-gray-700 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.015)', border: 'none' }}
              />
              <p className="text-[10px] text-gray-750 select-none">
                Notes are saved automatically to your browser.
              </p>
            </div>
          )}
        </div>
      )}

      {/* External Link & Similar Questions Section */}
      {getExternalLink() && (
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
          }}
          className="p-4 shadow-sm space-y-3"
        >
          <h2 className="text-xs font-extrabold uppercase text-gray-550 pb-1.5 select-none flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-gray-600" /> External Reference
          </h2>
          <div>
            <a
              href={getExternalLink()!.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-350 transition-all font-semibold text-xs border border-emerald-500/20 select-none shadow-sm cursor-pointer"
            >
              <span>Solve on {getExternalLink()!.name}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {similarQuestions && similarQuestions.length > 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)',
          }}
          className="p-4 shadow-sm space-y-3"
        >
          <h2 className="text-xs font-extrabold uppercase text-gray-550 pb-1.5 select-none flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-gray-600" /> Similar Questions
          </h2>
          <div className="flex flex-col gap-2">
            {similarQuestions.slice(0, 5).map((q) => (
              <Link
                key={q.id}
                to={`/problems/${q.slug}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.015] hover:bg-white/[0.04] transition-all border border-white/[0.02] cursor-pointer group"
              >
                <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors truncate max-w-[200px]">
                  {q.title}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    style={
                      q.difficulty.toLowerCase() === 'easy' ? { background: '#063b2e', color: '#34d399' } :
                      q.difficulty.toLowerCase() === 'medium' ? { background: '#3f2b00', color: '#fbbf24' } :
                      { background: '#3b1010', color: '#f87171' }
                    }
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider scale-90 select-none shrink-0"
                  >
                    {q.difficulty}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
