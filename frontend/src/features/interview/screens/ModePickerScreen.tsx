import React, { useState } from 'react';
import { Award, Briefcase, Network, Cpu, ChevronRight, Check } from 'lucide-react';
import type { InterviewMode, InterviewDifficulty, InterviewConfig } from '../types';
import { CUSTOM_TOPICS, DIFFICULTY_QUESTION_COUNT, MODE_LABELS } from '../types';
import { Button } from '../../../shared/ui/button/Button';

interface ModePickerScreenProps {
  onStart: (config: InterviewConfig) => void;
  isLoading: boolean;
}

export const ModePickerScreen: React.FC<ModePickerScreenProps> = ({ onStart, isLoading }) => {
  const [mode, setMode] = useState<InterviewMode>('technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const modesList: Array<{ id: InterviewMode; title: string; desc: string; icon: React.ReactNode }> = [
    {
      id: 'technical',
      title: 'Technical Interview',
      desc: 'Deep dive into complexity analysis, edge cases, trade-offs, and alternative optimal approaches.',
      icon: <Cpu className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'hr',
      title: 'HR / Behavioral Loop',
      desc: 'Simulate behavioral rounds probing leadership, failures, team alignment, and cultural fit.',
      icon: <Briefcase className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'system_design',
      title: 'System Design Session',
      desc: 'Architect large-scale distributed setups, databases, caching layers, and load balancing.',
      icon: <Network className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'custom',
      title: 'Custom Focus Topics',
      desc: 'Tailor-make your session focused specifically on DP, Graphs, Databases, Networking, or OS.',
      icon: <Award className="w-5 h-5 text-indigo-400" />
    }
  ];

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleStartClick = () => {
    const config: InterviewConfig = {
      mode,
      difficulty,
      customTopics: mode === 'custom' ? selectedTopics : undefined,
      questionCount: DIFFICULTY_QUESTION_COUNT[difficulty]
    };
    onStart(config);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 select-none p-1 py-3">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
          Choose Your Mock Loop
        </h1>
        <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
          Ready to face realistic FAANG engineering loops? Select a simulated format to receive adaptive question sets and scores.
        </p>
      </div>

      {/* Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {modesList.map(item => {
          const isActive = mode === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`relative rounded-xl border p-4 flex gap-3.5 items-start cursor-pointer transition-all duration-200 overflow-hidden ${
                isActive
                  ? 'border-indigo-500/40 bg-[#12111c]/60 shadow-lg shadow-indigo-500/[0.04]'
                  : 'border-white/[0.06] bg-[#0d0f14]/50 hover:bg-[#131316]/50 hover:border-white/[0.1]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 h-full w-[3px] bg-indigo-500" />
              )}
              <div className={`p-2 rounded-lg shrink-0 ${
                isActive ? 'bg-indigo-500/10' : 'bg-white/[0.04]'
              }`}>
                {item.icon}
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className={`text-xs font-black tracking-wide uppercase ${
                  isActive ? 'text-indigo-400' : 'text-white/80'
                }`}>
                  {item.title}
                </h3>
                <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Topics (when custom mode is selected) */}
      {mode === 'custom' && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
            Select Topics of Focus
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CUSTOM_TOPICS.map(topic => {
              const isChecked = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                    isChecked
                      ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 font-extrabold shadow-sm'
                      : 'border-white/[0.04] bg-white/[0.01] text-white/40 hover:text-white/80 hover:border-white/[0.1]'
                  }`}
                >
                  {topic}
                  {isChecked && <Check className="w-3 h-3 shrink-0 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Difficulty & Details row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Difficulty Selector */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
            Difficulty Level
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['easy', 'medium', 'hard', 'expert'] as InterviewDifficulty[]).map(level => {
              const isActive = difficulty === level;
              return (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`py-2 rounded-lg border text-[10px] font-bold capitalize transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 font-black shadow-sm'
                      : 'border-white/[0.04] bg-white/[0.01] text-white/40 hover:text-white/80 hover:border-white/[0.1]'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Config Info */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4 flex flex-col justify-center space-y-2 text-xs">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 block mb-1">
            Loop Configuration Overview
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
              <span>Interview Type</span>
              <span className="font-extrabold text-white/85">{MODE_LABELS[mode]}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
              <span>Target Question Count</span>
              <span className="font-extrabold text-white/85">
                {DIFFICULTY_QUESTION_COUNT[difficulty]} Questions
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
              <span>Adaptability Engine</span>
              <span className="font-extrabold text-indigo-400">Adaptive Feedback Loop</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2 text-center space-y-2">
        <Button
          onClick={handleStartClick}
          disabled={isLoading || (mode === 'custom' && selectedTopics.length === 0)}
          className="w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-550 border-indigo-600 hover:border-indigo-550 text-white shadow-lg shadow-indigo-600/10 active:scale-[0.98] select-none flex items-center justify-center gap-1.5"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-white rounded-full animate-spin" />
              Building Question Set...
            </>
          ) : (
            <>
              Initialize Live Session
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
        {mode === 'custom' && selectedTopics.length === 0 && (
          <p className="text-[9px] text-rose-400 font-bold">
            * Please select at least one topic to customize your experience.
          </p>
        )}
      </div>
    </div>
  );
};
