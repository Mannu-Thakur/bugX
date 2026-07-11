import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { BattleProblem } from '../types/battle.types';
import { ProblemDescription } from '../../problems/components/ProblemDescription';
import type { ProblemDetail } from '../../../shared/lib/api';

interface BattleProblemPanelProps {
  problem: BattleProblem | null;
  width: number;
  onResize: (newWidth: number) => void;
  onClose: () => void;
  user?: any;
  activeLanguage?: 'python' | 'javascript' | 'cpp' | 'java';
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export const BattleProblemPanel: React.FC<BattleProblemPanelProps> = ({
  problem,
  width,
  onResize,
  onClose,
  user,
  activeLanguage,
  notes,
  onNotesChange,
}) => {
  if (!problem) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startWidth = width;
    const startX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      onResize(Math.max(300, Math.min(800, startWidth + (moveEvent.clientX - startX))));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      style={{ width: `${width}px` }}
      className="border-r border-dark-border bg-dark-panel flex flex-col h-full overflow-hidden shrink-0 relative animate-fade-in"
    >
      {/* Header: Title + Points */}
      <div className="p-3 select-none bg-dark-bg/25 flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-black text-gray-100 truncate flex-1" title={problem.title}>
          {problem.title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <span
            style={
              problem.difficulty.toLowerCase() === 'easy' ? { background: '#063b2e', color: '#34d399' } :
              problem.difficulty.toLowerCase() === 'medium' ? { background: '#3f2b00', color: '#fbbf24' } :
              { background: '#3b1010', color: '#f87171' }
            }
            className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full select-none"
          >
            {problem.difficulty}
          </span>
          <span
            style={{ background: 'rgba(79,70,229,.18)', color: '#a5b4fc' }}
            className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full select-none"
          >
            {problem.score_base} {problem.score_base === 1 ? 'PT' : 'PTS'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-250 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Description Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ProblemDescription
          problem={problem as unknown as ProblemDetail}
          user={user}
          focusMode={true}
          notes={notes}
          onNotesChange={onNotesChange}
          activeLanguage={activeLanguage}
          hideHints={true}
        />
      </div>

      {/* Resize Slider Indicator */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 bottom-0 right-0 w-[5px] cursor-col-resize hover:bg-[#4F7DFF]/50 hover:shadow-[0_0_10px_rgba(79,125,255,0.5)] transition-all z-20"
      />
    </div>
  );
};
