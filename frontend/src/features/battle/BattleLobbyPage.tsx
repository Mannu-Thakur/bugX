import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Clock, Users, Code2, Zap, Trophy, ChevronRight, Plus, FileCode2 } from 'lucide-react';
import { MOCK_PROBLEMS } from '../../shared/lib/mockData';

interface CustomProblem {
  title: string;
  description: string;
  testCases: { input: string; expectedOutput: string }[];
  pythonTemplate: string;
  jsTemplate: string;
}

const TIME_OPTIONS = [
  { value: 5, label: '5 min ⚡', desc: 'Speed Round' },
  { value: 10, label: '10 min', desc: 'Quick Match' },
  { value: 15, label: '15 min', desc: 'Standard' },
  { value: 20, label: '20 min', desc: 'Extended' },
  { value: 30, label: '30 min', desc: 'Marathon' },
];

export const BattleLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Player Config
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [timeLimit, setTimeLimit] = useState(15);
  
  // Problem Source
  const [problemSource, setProblemSource] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSlug, setSelectedSlug] = useState(MOCK_PROBLEMS[0]?.slug || '');
  
  // Custom Problem
  const [customProblem, setCustomProblem] = useState<CustomProblem>({
    title: '',
    description: '',
    testCases: [
      { input: '', expectedOutput: '' },
      { input: '', expectedOutput: '' },
    ],
    pythonTemplate: 'def solve(data):\n    # Write your solution\n    pass',
    jsTemplate: 'function solve(data) {\n    // Write your solution\n}',
  });

  const addTestCase = () => {
    setCustomProblem(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }],
    }));
  };

  const removeTestCase = (idx: number) => {
    if (customProblem.testCases.length <= 1) return;
    setCustomProblem(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== idx),
    }));
  };

  const updateTestCase = (idx: number, field: 'input' | 'expectedOutput', value: string) => {
    setCustomProblem(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc),
    }));
  };

  const handleStartBattle = () => {
    const battleConfig = {
      player1: player1Name.trim() || 'Player 1',
      player2: player2Name.trim() || 'Player 2',
      timeLimit,
      problemSource,
      selectedSlug: problemSource === 'catalog' ? selectedSlug : null,
      customProblem: problemSource === 'custom' ? customProblem : null,
    };

    // Validate custom problem
    if (problemSource === 'custom') {
      if (!customProblem.title.trim()) {
        alert('Please enter a problem title.');
        return;
      }
      if (!customProblem.description.trim()) {
        alert('Please enter a problem description.');
        return;
      }
      if (customProblem.testCases.some(tc => !tc.input.trim() || !tc.expectedOutput.trim())) {
        alert('Please fill all test case inputs and expected outputs.');
        return;
      }
    }

    // Store config and navigate
    sessionStorage.setItem('battleConfig', JSON.stringify(battleConfig));
    navigate('/battle/arena');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4 select-none">
        <div className="inline-flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-orange-500/20">
            <Swords className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
          1v1 Code Battle Arena
        </h1>
        <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
          Challenge a friend to a head-to-head coding duel. Two editors, one problem, real-time timer — may the fastest coder win!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Player Setup */}
        <div className="space-y-5">
          {/* Player Names Card */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 select-none">
              <Users className="w-4 h-4 text-blue-400" />
              Combatants
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Player 1</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">🔵</span>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={e => setPlayer1Name(e.target.value)}
                    maxLength={20}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 pl-8 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                    placeholder="Player 1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Player 2</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-bold text-sm">🔴</span>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={e => setPlayer2Name(e.target.value)}
                    maxLength={20}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 pl-8 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-gray-600"
                    placeholder="Player 2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time Limit Card */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 select-none">
              <Clock className="w-4 h-4 text-amber-400" />
              Time Limit
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeLimit(opt.value)}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    timeLimit === opt.value
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                      : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Battle Button */}
          <button
            onClick={handleStartBattle}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-500 hover:via-orange-500 hover:to-yellow-500 text-white font-black text-lg rounded-xl shadow-xl shadow-orange-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-3 select-none"
          >
            <Zap className="w-5 h-5" />
            Start Battle
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Problem Selection */}
        <div className="space-y-5">
          {/* Problem Source Toggle */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 select-none">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Problem Selection
            </h2>

            <div className="flex bg-dark-bg p-1 rounded-lg border border-dark-border">
              <button
                onClick={() => setProblemSource('catalog')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  problemSource === 'catalog'
                    ? 'bg-dark-hover text-blue-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                From Catalog
              </button>
              <button
                onClick={() => setProblemSource('custom')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  problemSource === 'custom'
                    ? 'bg-dark-hover text-emerald-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                Custom Problem
              </button>
            </div>
          </div>

          {/* Catalog Selection */}
          {problemSource === 'catalog' && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-lg space-y-3 max-h-[420px] overflow-y-auto">
              {MOCK_PROBLEMS.map(p => (
                <button
                  key={p.slug}
                  onClick={() => setSelectedSlug(p.slug)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    selectedSlug === p.slug
                      ? 'bg-blue-500/5 border-blue-500/30 shadow-sm'
                      : 'bg-dark-bg border-dark-border hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      p.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-400' :
                      p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {p.difficulty}
                    </span>
                    <span className="text-sm text-gray-200 font-medium truncate">{p.title}</span>
                  </div>
                  <span className="text-xs text-amber-400 font-bold shrink-0">{p.score_base} pts</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom Problem Creator */}
          {problemSource === 'custom' && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-lg space-y-4 max-h-[500px] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Problem Title</label>
                <input
                  type="text"
                  value={customProblem.title}
                  onChange={e => setCustomProblem(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600"
                  placeholder="e.g. Reverse Array"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Problem Description</label>
                <textarea
                  value={customProblem.description}
                  onChange={e => setCustomProblem(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600 resize-none"
                  placeholder="Given an array of integers, return the array reversed..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Test Cases</label>
                  <button
                    onClick={addTestCase}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/5 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {customProblem.testCases.map((tc, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 bg-dark-bg p-2.5 rounded-lg border border-dark-border relative group">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold">Input (JSON)</label>
                      <input
                        type="text"
                        value={tc.input}
                        onChange={e => updateTestCase(idx, 'input', e.target.value)}
                        className="w-full bg-dark-panel border border-dark-border rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-gray-600"
                        placeholder='[1, 2, 3]'
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold">Expected Output</label>
                      <input
                        type="text"
                        value={tc.expectedOutput}
                        onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                        className="w-full bg-dark-panel border border-dark-border rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-gray-600"
                        placeholder='[3, 2, 1]'
                      />
                    </div>
                    {customProblem.testCases.length > 1 && (
                      <button
                        onClick={() => removeTestCase(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/30"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Python Template</label>
                <textarea
                  value={customProblem.pythonTemplate}
                  onChange={e => setCustomProblem(p => ({ ...p, pythonTemplate: e.target.value }))}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">JavaScript Template</label>
                <textarea
                  value={customProblem.jsTemplate}
                  onChange={e => setCustomProblem(p => ({ ...p, jsTemplate: e.target.value }))}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
