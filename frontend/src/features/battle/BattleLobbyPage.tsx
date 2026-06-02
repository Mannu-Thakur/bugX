import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swords, Clock, Users, Code2, Zap, Trophy, ChevronRight, Plus, FileCode2, Copy } from 'lucide-react';
import { MOCK_PROBLEMS } from '../../shared/lib/mockData';
import { api } from '../../shared/lib/api';
import { useAuth } from '../auth/useAuth';

interface CustomProblem {
  title: string;
  description: string;
  testCases: { input: string; expectedOutput: string }[];
  pythonTemplate: string;
  jsTemplate: string;
  cppTemplate: string;
  javaTemplate: string;
}

const TIME_OPTIONS = [
  { value: 5, label: '5 min', desc: 'Speed Round' },
  { value: 10, label: '10 min', desc: 'Quick Match' },
  { value: 15, label: '15 min', desc: 'Standard' },
  { value: 20, label: '20 min', desc: 'Extended' },
  { value: 30, label: '30 min', desc: 'Marathon' },
];

export const BattleLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Player Config
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  
  // Problem Source
  const [problemSource, setProblemSource] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSlug, setSelectedSlug] = useState(MOCK_PROBLEMS[0]?.slug || '');

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['battle', 'catalog-problems'],
    queryFn: async () => {
      try {
        return await api.problems.list({ page: 1, limit: 100, sort: 'newest' });
      } catch {
        return {
          items: MOCK_PROBLEMS,
          total: MOCK_PROBLEMS.length,
          page: 1,
          limit: 100,
          pages: 1,
        };
      }
    },
    retry: 0,
  });

  const catalogProblems = catalogData?.items || MOCK_PROBLEMS;

  useEffect(() => {
    if (!user || player1Name.trim()) return;
    setPlayer1Name(user.username || user.email.split('@')[0]);
  }, [player1Name, user]);

  useEffect(() => {
    if (!catalogProblems.length) return;
    if (!catalogProblems.some(p => p.slug === selectedSlug)) {
      setSelectedSlug(catalogProblems[0].slug);
    }
  }, [catalogProblems, selectedSlug]);
  
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
    cppTemplate: 'class Solution {\npublic:\n    vector<int> solve(vector<int>& nums) {\n        // Write your solution here\n        return {};\n    }\n};',
    javaTemplate: 'import java.util.*;\n\nclass Solution {\n    public List<Integer> solve(List<Integer> nums) {\n        // Write your solution here\n        return new ArrayList<>();\n    }\n}',
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

  const validateBattleSetup = () => {
    const normalizedTimeLimit = Math.max(1, Math.min(240, Number(timeLimit) || 15));

    if (normalizedTimeLimit !== timeLimit) {
      setTimeLimit(normalizedTimeLimit);
    }

    if (!player1Name.trim()) {
      alert('Please enter your display name.');
      return false;
    }

    if (!player2Name.trim()) {
      alert('Please enter the opponent display name.');
      return false;
    }

    if (problemSource === 'custom') {
      if (!customProblem.title.trim()) {
        alert('Please enter a problem title.');
        return false;
      }
      if (!customProblem.description.trim()) {
        alert('Please enter a problem description.');
        return false;
      }
      if (customProblem.testCases.some(tc => !tc.input.trim() || !tc.expectedOutput.trim())) {
        alert('Please fill all test case inputs and expected outputs.');
        return false;
      }
    } else if (!selectedSlug) {
      alert('Please choose a catalog problem.');
      return false;
    }

    return true;
  };

  const createBattleConfig = (mode: 'local' | 'invite') => ({
      battleId: crypto.randomUUID?.() || `battle-${Date.now()}`,
      mode,
      player1: player1Name.trim(),
      player2: player2Name.trim(),
      timeLimit: Math.max(1, Math.min(240, Number(timeLimit) || 15)),
      problemSource,
      selectedSlug: problemSource === 'catalog' ? selectedSlug : null,
      customProblem: problemSource === 'custom' ? customProblem : null,
  });

  const handleStartBattle = () => {
    if (!validateBattleSetup()) return;
    const battleConfig = createBattleConfig('local');

    sessionStorage.setItem('battleConfig', JSON.stringify(battleConfig));
    navigate('/battle/arena');
  };

  const handleInviteBattle = async () => {
    if (!validateBattleSetup()) return;
    setIsCreatingInvite(true);
    setInviteCopied(false);

    try {
      const payload = {
        player1_username: player1Name.trim(),
        player2_username: player2Name.trim(),
        time_limit: Math.max(1, Math.min(240, Number(timeLimit) || 15)),
        problem_source: problemSource,
        selected_slug: problemSource === 'catalog' ? selectedSlug : null,
        custom_problem: problemSource === 'custom' ? customProblem : null,
      };

      const res = await api.battle.create(payload);
      const battleId = res.id;
      const safeUrl = `${window.location.origin}/battle/arena?room=${battleId}&player=2`;
      
      setInviteUrl(safeUrl);
      sessionStorage.setItem('battleConfig', JSON.stringify({
        battleId,
        mode: 'invite',
        player1: player1Name.trim(),
        player2: player2Name.trim(),
        timeLimit: payload.time_limit,
        problemSource,
        selectedSlug: payload.selected_slug,
        customProblem: payload.custom_problem
      }));

      try {
        await navigator.clipboard.writeText(safeUrl);
        setInviteCopied(true);
      } catch {
        // User can copy from the visible textbox
      }
    } catch (err: any) {
      alert(`Failed to generate invite. Error: ${err.message || err}`);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 space-y-6 animate-fade-in text-gray-200">
      
      {/* Sleek Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-dark-panel/60 via-dark-panel/40 to-dark-panel/60 border border-dark-border rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 select-none">
        {/* Glowing backdrop elements */}
        <div className="absolute top-0 left-1/4 w-72 h-32 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-72 h-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-yellow-500 rounded-2xl blur-md opacity-40 animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-500/20">
              <Swords className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              1v1 Code Battle Arena
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-xl leading-relaxed">
              Challenge a friend or local opponent in a real-time coding race. One shared problem, one clock, separate workspaces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2 text-xs text-gray-400 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-gray-300">Arena Servers Online</span>
        </div>
      </div>

      {/* Row 1: Adjacent Config Cards (Combatants & Time Limit side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Card - Combatants Setup */}
        <div className="relative bg-dark-panel border border-dark-border rounded-2xl p-5 shadow-2xl overflow-hidden flex flex-col justify-between space-y-5">
          {/* Top border ambient line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-500/25 via-transparent to-red-500/25" />
          
          <div className="flex items-center justify-between border-b border-dark-border pb-3">
            <h2 className="text-xs md:text-sm font-bold text-gray-200 flex items-center gap-2 select-none">
              <Users className="w-4 h-4 text-blue-400" />
              Combatants
            </h2>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase select-none">
              Lobby Setup
            </span>
          </div>
          
          {/* Inputs Grid with "VS" element */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 items-center">
            
            {/* Player 1 (Host) Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Host Player (P1)
              </label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 font-extrabold text-[11px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 group-focus-within:bg-blue-500/20 transition-all select-none">
                  P1
                </span>
                <input
                  type="text"
                  value={player1Name}
                  onChange={e => setPlayer1Name(e.target.value)}
                  maxLength={20}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2.5 pl-12 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                  placeholder="Your display name"
                />
              </div>
            </div>

            {/* Decorative Absolute VS in the middle (only on sm: screens) */}
            <div className="hidden sm:flex absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-dark-panel border border-dark-border items-center justify-center shadow-lg shadow-black/40">
              <span className="text-[10px] font-black bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent italic select-none">
                VS
              </span>
            </div>

            {/* Player 2 (Opponent) Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Opponent Player (P2)
              </label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-extrabold text-[11px] bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 group-focus-within:bg-red-500/20 transition-all select-none">
                  P2
                </span>
                <input
                  type="text"
                  value={player2Name}
                  onChange={e => setPlayer2Name(e.target.value)}
                  maxLength={20}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2.5 pl-12 text-sm text-gray-100 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                  placeholder="Opponent display name"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Right Card - Time Limit Setup */}
        <div className="relative bg-dark-panel border border-dark-border rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-dark-border pb-3 select-none">
            <h2 className="text-xs md:text-sm font-bold text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Time Limit
            </h2>
            <span className="text-[10px] text-gray-400 font-medium">Choose match duration</span>
          </div>

          {/* Time Grid options */}
          <div className="grid grid-cols-5 gap-2 select-none flex-1 items-center content-center py-2">
            {TIME_OPTIONS.map(opt => {
              const isActive = timeLimit === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTimeLimit(opt.value)}
                  className={`relative p-2 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20 scale-[1.02]'
                      : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600 hover:text-gray-300 hover:bg-dark-hover/30'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  <div className="text-sm font-extrabold">{opt.label}</div>
                  <div className="text-[8px] text-gray-500 mt-0.5 tracking-tight font-medium uppercase truncate">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Custom Input */}
          <div className="flex items-center gap-4 pt-2 border-t border-dark-border bg-dark-bg/25 p-2 rounded-xl border border-dark-border select-none">
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider shrink-0 pl-1 select-none">
              Custom Duration:
            </label>
            <div className="flex items-center bg-dark-input border border-dark-border rounded-lg p-0.5 max-w-[150px] shadow-inner">
              {/* Decrement Button */}
              <button
                type="button"
                onClick={() => setTimeLimit(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-amber-400 hover:bg-dark-hover transition-colors font-bold text-sm focus:outline-none cursor-pointer"
              >
                &minus;
              </button>
              
              {/* Value Input Area */}
              <div className="flex-1 flex items-center justify-center px-1.5 min-w-[50px] text-center">
                <input
                  type="text"
                  value={timeLimit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTimeLimit(val === '' ? 1 : Math.max(1, Math.min(240, Number(val))));
                  }}
                  onBlur={() => setTimeLimit(prev => Math.max(1, Math.min(240, Number(prev) || 15)))}
                  className="w-full bg-transparent border-0 text-center text-xs text-amber-400 font-extrabold focus:outline-none focus:ring-0 p-0"
                />
                <span className="text-[9px] uppercase text-gray-500 font-bold ml-1">
                  min
                </span>
              </div>
              
              {/* Increment Button */}
              <button
                type="button"
                onClick={() => setTimeLimit(prev => Math.min(240, prev + 1))}
                className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-amber-400 hover:bg-dark-hover transition-colors font-bold text-sm focus:outline-none cursor-pointer"
              >
                +
              </button>
            </div>
            <span className="text-xs text-gray-500 font-medium select-none">Maximum 240m</span>
          </div>
        </div>

      </div>

      {/* Row 2: Action Buttons (Generate Invite / Start Arena) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Generate Invite Link Button */}
        <button
          onClick={handleInviteBattle}
          disabled={isCreatingInvite}
          className="py-3 px-4 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 border border-transparent active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
        >
          {isCreatingInvite ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {isCreatingInvite ? 'Generating...' : inviteCopied ? 'Invite Copied!' : 'Generate Invite Link'}
        </button>

        {/* Start Local Split Workspace Button */}
        <button
          onClick={handleStartBattle}
          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-sm rounded-xl border border-slate-700 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          Start Local Arena
          <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
        </button>
      </div>

      {/* Generated Invite URL Display Section */}
      {inviteUrl && (
        <div className="relative bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in select-none">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-xs md:text-sm font-bold text-gray-200">
              Invite Link Ready!
            </h3>
          </div>
          
          <p className="text-xs text-gray-400">
            Opponent: <span className="font-semibold text-blue-400">{player2Name}</span>. Send them this link to connect:
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none shadow-inner"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setInviteCopied(true);
                } catch {
                  alert("Please select the text and copy manually.");
                }
              }}
              className="px-4 py-2 bg-dark-bg border border-dark-border hover:bg-dark-hover rounded-xl text-xs font-bold transition-all text-gray-300 hover:text-white"
            >
              {inviteCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <button
            onClick={() => {
              const parsedConfig = JSON.parse(sessionStorage.getItem('battleConfig') || '{}');
              navigate(`/battle/arena?room=${parsedConfig.battleId}&player=1`);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-transparent transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Enter Battle Arena (Host Room)
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Row 3: Problem Selection (Spanning full-width below configurations) */}
      <div className="bg-dark-panel border border-dark-border rounded-2xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-5 animate-fade-in">
        
        {/* Header + Source Tab Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border pb-3">
          <h2 className="text-xs md:text-sm font-bold text-gray-200 flex items-center gap-2 select-none">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Problem Selection
          </h2>

          {/* Tabs Toggle buttons */}
          <div className="flex bg-dark-bg/60 p-1 rounded-xl border border-dark-border select-none">
            <button
              onClick={() => setProblemSource('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                problemSource === 'catalog'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              From Catalog
            </button>
            <button
              onClick={() => setProblemSource('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                problemSource === 'custom'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Custom Problem
            </button>
          </div>
        </div>

        {/* Catalog Selection List */}
        {problemSource === 'catalog' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none px-1">
              <span>Available Problems ({catalogProblems.length})</span>
              <span>Select to Battle</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
              {catalogLoading && (
                <div className="text-xs text-gray-500 px-3 py-8 text-center bg-dark-bg/30 border border-dark-border rounded-xl select-none animate-pulse">
                  Loading catalog problems...
                </div>
              )}
              
              {!catalogLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catalogProblems.map(p => {
                    const isSelected = selectedSlug === p.slug;
                    return (
                      <button
                        key={p.slug}
                        onClick={() => setSelectedSlug(p.slug)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.06)]'
                            : 'bg-dark-bg/40 border-dark-border hover:border-dark-hover/80 hover:bg-dark-hover/10 text-gray-300 hover:text-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 border tracking-wider select-none ${
                            p.difficulty === 'EASY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {p.difficulty}
                          </span>
                          <span className="text-sm font-semibold truncate group-hover:translate-x-0.5 transition-transform duration-150">
                            {p.title}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0 select-none">
                          <span className="text-xs text-amber-400/90 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                            {p.score_base} pts
                          </span>
                          
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500 text-white scale-110'
                              : 'bg-dark-bg border-dark-border group-hover:border-blue-500/50 group-hover:text-blue-400 text-transparent'
                          }`}>
                            <ChevronRight className="w-3 h-3 font-black" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Problem Creator Form */}
        {problemSource === 'custom' && (
          <div className="flex-1 custom-scrollbar space-y-4">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Custom Problem Meta Inputs (Left 5 Columns) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Custom Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Problem Title</label>
                  <input
                    type="text"
                    value={customProblem.title}
                    onChange={e => setCustomProblem(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                    placeholder="e.g. Reverse Array In Place"
                  />
                </div>
                
                {/* Custom Description Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Problem Description</label>
                  <textarea
                    value={customProblem.description}
                    onChange={e => setCustomProblem(p => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-gray-600 resize-none shadow-inner"
                    placeholder="Given an array of integers, return the array reversed. Example: Input [1,2,3] -> Output [3,2,1]..."
                  />
                </div>

                {/* Test Cases Area */}
                <div className="space-y-2 border-t border-dark-border pt-3">
                  <div className="flex items-center justify-between select-none">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Test Cases (Verification)</label>
                    <button
                      onClick={addTestCase}
                      className="text-[9px] font-extrabold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Testcase
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {customProblem.testCases.map((tc, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-3 bg-dark-bg/40 p-3 rounded-xl border border-dark-border relative group animate-fade-in shadow-inner">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Input (JSON format)</label>
                          <input
                            type="text"
                            value={tc.input}
                            onChange={e => updateTestCase(idx, 'input', e.target.value)}
                            className="w-full bg-dark-panel border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-gray-600"
                            placeholder='[1, 2, 3]'
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Expected Output (JSON)</label>
                          <input
                            type="text"
                            value={tc.expectedOutput}
                            onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                            className="w-full bg-dark-panel border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-gray-600"
                            placeholder='[3, 2, 1]'
                          />
                        </div>
                        
                        {customProblem.testCases.length > 1 && (
                          <button
                            onClick={() => removeTestCase(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 rounded-full text-rose-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all select-none hover:scale-105"
                            title="Remove this test case"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Boilerplate code templates area (Right 7 Columns) */}
              <div className="lg:col-span-7 space-y-4">
                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block select-none">
                  Boilerplate Code Templates (Starter Codes)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Python */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block select-none pl-1">Python 3</span>
                    <textarea
                      value={customProblem.pythonTemplate}
                      onChange={e => setCustomProblem(p => ({ ...p, pythonTemplate: e.target.value }))}
                      rows={5}
                      className="w-full bg-dark-input border border-dark-border rounded-xl px-2.5 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner"
                    />
                  </div>
                  {/* JS */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block select-none pl-1">JavaScript (Node.js)</span>
                    <textarea
                      value={customProblem.jsTemplate}
                      onChange={e => setCustomProblem(p => ({ ...p, jsTemplate: e.target.value }))}
                      rows={5}
                      className="w-full bg-dark-input border border-dark-border rounded-xl px-2.5 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner"
                    />
                  </div>
                  {/* C++ */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block select-none pl-1">C++ (GCC 17)</span>
                    <textarea
                      value={customProblem.cppTemplate}
                      onChange={e => setCustomProblem(p => ({ ...p, cppTemplate: e.target.value }))}
                      rows={5}
                      className="w-full bg-dark-input border border-dark-border rounded-xl px-2.5 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner"
                    />
                  </div>
                  {/* Java */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block select-none pl-1">Java (JDK 17)</span>
                    <textarea
                      value={customProblem.javaTemplate}
                      onChange={e => setCustomProblem(p => ({ ...p, javaTemplate: e.target.value }))}
                      rows={5}
                      className="w-full bg-dark-input border border-dark-border rounded-xl px-2.5 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
