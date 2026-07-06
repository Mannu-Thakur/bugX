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
  { value: 5,  label: '5m',  desc: 'Speed' },
  { value: 10, label: '10m', desc: 'Quick' },
  { value: 15, label: '15m', desc: 'Standard' },
  { value: 20, label: '20m', desc: 'Extended' },
  { value: 30, label: '30m', desc: 'Marathon' },
];

export const BattleLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Player Config
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [battleMode, setBattleMode] = useState<'local' | 'invite'>('invite');
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [timeLimit, setTimeLimit] = useState(15);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  // Problem Source
  const [problemSource, setProblemSource] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

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
    setSelectedSlugs(prev => {
      const valid = prev.filter(slug => catalogProblems.some(p => p.slug === slug));
      return valid.length ? valid : [catalogProblems[0].slug];
    });
  }, [catalogProblems]);

  // Custom Problems (up to 3)
  const [customProblems, setCustomProblems] = useState<CustomProblem[]>([
    {
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
    }
  ]);
  const [activeCustomIdx, setActiveCustomIdx] = useState<number>(0);

  const addCustomProblem = () => {
    if (customProblems.length >= 3) return;
    setCustomProblems(prev => [
      ...prev,
      {
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
      }
    ]);
    setActiveCustomIdx(customProblems.length);
  };

  const removeCustomProblem = (idx: number) => {
    if (customProblems.length <= 1) return;
    setCustomProblems(prev => prev.filter((_, i) => i !== idx));
    setActiveCustomIdx(prev => Math.max(0, prev - 1));
  };

  const updateActiveCustomProblem = (updater: (prev: CustomProblem) => CustomProblem) => {
    setCustomProblems(prev => prev.map((p, i) => i === activeCustomIdx ? updater(p) : p));
  };

  const addTestCase = () => {
    updateActiveCustomProblem(p => ({
      ...p,
      testCases: [...p.testCases, { input: '', expectedOutput: '' }],
    }));
  };

  const removeTestCase = (idx: number) => {
    updateActiveCustomProblem(p => {
      if (p.testCases.length <= 1) return p;
      return {
        ...p,
        testCases: p.testCases.filter((_, i) => i !== idx),
      };
    });
  };

  const updateTestCase = (idx: number, field: 'input' | 'expectedOutput', value: string) => {
    updateActiveCustomProblem(p => ({
      ...p,
      testCases: p.testCases.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc),
    }));
  };

  const validateBattleSetup = (mode: 'local' | 'invite') => {
    const normalizedTimeLimit = Math.max(1, Math.min(240, Number(timeLimit) || 15));
    if (normalizedTimeLimit !== timeLimit) setTimeLimit(normalizedTimeLimit);

    if (!player1Name.trim()) { alert('Please enter your display name.'); return false; }
    if (mode === 'local' && !player2Name.trim()) { alert('Please enter the opponent display name.'); return false; }

    if (problemSource === 'custom') {
      if (customProblems.length === 0) { alert('Please add at least one custom problem.'); return false; }
      for (let i = 0; i < customProblems.length; i++) {
        const cp = customProblems[i];
        if (!cp.title.trim()) { alert(`Please enter a title for Problem ${i + 1}.`); return false; }
        if (!cp.description.trim()) { alert(`Please enter a description for Problem ${i + 1}.`); return false; }
        if (cp.testCases.some(tc => !tc.input.trim() || !tc.expectedOutput.trim())) {
          alert(`Please fill all test case inputs and expected outputs for Problem ${i + 1}.`); return false;
        }
      }
    } else if (selectedSlugs.length === 0) { alert('Please choose at least one catalog problem.'); return false; }

    return true;
  };

  const createBattleConfig = (mode: 'local' | 'invite') => ({
    battleId: crypto.randomUUID?.() || `battle-${Date.now()}`,
    mode,
    player1: player1Name.trim(),
    player2: mode === 'local' ? player2Name.trim() : 'Opponents',
    maxPlayers: mode === 'local' ? 2 : maxPlayers,
    timeLimit: Math.max(1, Math.min(240, Number(timeLimit) || 15)),
    problemSource,
    selectedSlug: problemSource === 'catalog' ? selectedSlugs[0] : null,
    selectedSlugs: problemSource === 'catalog' ? selectedSlugs : null,
    customProblem: problemSource === 'custom' ? customProblems[0] : null,
    customProblems: problemSource === 'custom' ? customProblems : null,
  });

  const handleStartBattle = () => {
    if (!validateBattleSetup('local')) return;
    const battleConfig = createBattleConfig('local');
    sessionStorage.setItem('battleConfig', JSON.stringify({
      ...battleConfig,
      playerNames: [player1Name.trim(), player2Name.trim()]
    }));
    navigate('/battle/arena');
  };

  const handleInviteBattle = async () => {
    if (!validateBattleSetup('invite')) return;
    setIsCreatingInvite(true);
    setInviteCopied(false);

    try {
      const payload = {
        host_username: player1Name.trim(),
        max_players: maxPlayers,
        player_usernames: [player1Name.trim()],
        time_limit: Math.max(1, Math.min(240, Number(timeLimit) || 15)),
        problem_source: problemSource,
        selected_slug: problemSource === 'catalog' ? selectedSlugs[0] : null,
        selected_slugs: problemSource === 'catalog' ? selectedSlugs : null,
        custom_problem: problemSource === 'custom' ? customProblems[0] : null,
        custom_problems: problemSource === 'custom' ? customProblems : null,
      };

      const res = await api.battle.create(payload);
      const battleId = res.id;
      const safeUrl = `${window.location.origin}/battle/${battleId}`;

      setInviteUrl(safeUrl);
      sessionStorage.setItem('battleConfig', JSON.stringify({
        battleId,
        mode: 'invite',
        player1: player1Name.trim(),
        player2: 'Opponents',
        maxPlayers,
        timeLimit: payload.time_limit,
        problemSource,
        selectedSlug: payload.selected_slug,
        selectedSlugs: payload.selected_slugs,
        customProblem: payload.custom_problem,
        customProblems: payload.custom_problems,
        myPlayerIndex: 0,
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 animate-fade-in text-gray-200">

      {/* ── Hero Area (Typography-First) ─────────────────── */}
      <div className="space-y-2 select-none">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#4F7DFF]/10 border border-[#4F7DFF]/20">
            <Swords className="w-4.5 h-4.5 text-[#4F7DFF]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium tracking-wide">Arena Servers Online</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-100">
          Contest Arena
        </h1>
        <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
          Challenge friends or run competitive coding contests. Select up to 3 problems, one clock, separate workspaces.
        </p>
      </div>

      {/* ── Setup Section ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Combatants Card */}
        <div className="bg-[#0b0e14]/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Combatants</span>
              </div>
              {/* Mode Toggle */}
              <div className="flex bg-dark-bg/85 rounded-lg border border-white/5 p-0.5 select-none">
                <button
                  onClick={() => setBattleMode('invite')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    battleMode === 'invite'
                      ? 'bg-[#4F7DFF] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setBattleMode('local')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    battleMode === 'local'
                      ? 'bg-[#7A5FFF] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Local 1v1
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Player 1 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DFF]" />
                  {battleMode === 'local' ? 'Host (P1)' : 'Your display name'}
                </label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={e => setPlayer1Name(e.target.value)}
                  maxLength={20}
                  className="battle-input"
                  placeholder="Your display name"
                />
              </div>

              {battleMode === 'local' ? (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7A5FFF]" />
                    Opponent (P2)
                  </label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={e => setPlayer2Name(e.target.value)}
                    maxLength={20}
                    className="battle-input"
                    placeholder="Opponent display name"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7A5FFF]" />
                    Max Participants
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="battle-input"
                  >
                    <option value={2} className="bg-[#0b0e14]">2 — 1v1 Duel</option>
                    <option value={5} className="bg-[#0b0e14]">5 Players</option>
                    <option value={10} className="bg-[#0b0e14]">10 Players</option>
                    <option value={20} className="bg-[#0b0e14]">20 Players</option>
                    <option value={50} className="bg-[#0b0e14]">50 Players</option>
                    <option value={100} className="bg-[#0b0e14]">100 Players</option>
                    <option value={200} className="bg-[#0b0e14]">200 Players (Contest)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 space-y-3">
            {battleMode === 'invite' ? (
              <button
                onClick={handleInviteBattle}
                disabled={isCreatingInvite}
                className="battle-btn-primary w-full"
              >
                {isCreatingInvite ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {isCreatingInvite ? 'Generating Lobby…' : inviteCopied ? 'Invite Link Copied!' : 'Create Lobby & Copy Invite Link'}
              </button>
            ) : (
              <button
                onClick={handleStartBattle}
                className="battle-btn-secondary w-full"
              >
                <Zap className="w-3.5 h-3.5" />
                Start Local Match
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}

            {inviteUrl && battleMode === 'invite' && (
              <div className="space-y-3 pt-2 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 battle-input font-mono text-[11px]"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        setInviteCopied(true);
                      } catch {
                        alert('Please copy manually.');
                      }
                    }}
                    className="px-3 py-2 bg-dark-bg border border-white/5 hover:border-[#4F7DFF]/40 rounded-xl text-[11px] font-semibold transition-all text-gray-400 hover:text-gray-200"
                  >
                    {inviteCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    const parsedConfig = JSON.parse(sessionStorage.getItem('battleConfig') || '{}');
                    navigate(`/battle/${parsedConfig.battleId}`);
                  }}
                  className="battle-btn-primary w-full"
                >
                  Enter Battle Arena
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time Limit Card */}
        <div className="bg-[#0b0e14]/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</span>
            </div>

            {/* Quick Select Grid */}
            <div className="grid grid-cols-5 gap-2 select-none">
              {TIME_OPTIONS.map(opt => {
                const isActive = timeLimit === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTimeLimit(opt.value)}
                    className={`relative py-3 px-1 rounded-xl text-center transition-all duration-150 ${
                      isActive
                        ? 'bg-[#4F7DFF]/10 border border-[#4F7DFF]/40 text-[#4F7DFF]'
                        : 'bg-dark-bg/50 border border-transparent hover:border-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-[#4F7DFF]" />
                    )}
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-[9px] opacity-60 mt-0.5 font-medium tracking-tight">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration Row */}
          <div className="flex items-center gap-4 pt-1 border-t border-white/5">
            <span className="text-[11px] text-gray-500 font-medium shrink-0">Custom duration</span>
            <div className="flex items-center bg-dark-bg border border-white/5 rounded-xl overflow-hidden shadow-inner">
              <button
                type="button"
                onClick={() => setTimeLimit(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors text-lg font-light"
              >
                −
              </button>
              <div className="flex items-center gap-1 px-2">
                <input
                  type="text"
                  value={timeLimit}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTimeLimit(val === '' ? 1 : Math.max(1, Math.min(240, Number(val))));
                  }}
                  onBlur={() => setTimeLimit(prev => Math.max(1, Math.min(240, Number(prev) || 15)))}
                  className="w-8 bg-transparent border-0 text-center text-xs text-gray-200 font-semibold focus:outline-none"
                />
                <span className="text-[9px] text-gray-600 font-medium">min</span>
              </div>
              <button
                type="button"
                onClick={() => setTimeLimit(prev => Math.min(240, prev + 1))}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors text-lg font-light"
              >
                +
              </button>
            </div>
            <span className="text-[10px] text-gray-600">max 240m</span>
          </div>
        </div>
      </div>

      {/* ── Problem Selection ──────────────────────────── */}
      <div className="space-y-6">

        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Problem Selection</span>
          </div>

          <div className="flex bg-dark-bg/85 rounded-lg border border-white/5 p-0.5 select-none">
            <button
              onClick={() => setProblemSource('catalog')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                problemSource === 'catalog'
                  ? 'bg-[#4F7DFF] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Trophy className="w-3 h-3" />
              Catalog
            </button>
            <button
              onClick={() => setProblemSource('custom')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                problemSource === 'custom'
                  ? 'bg-[#7A5FFF] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <FileCode2 className="w-3 h-3" />
              Custom
            </button>
          </div>
        </div>

        {/* Catalog Problems */}
        {problemSource === 'catalog' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium uppercase tracking-wider select-none px-0.5">
              <span>{catalogProblems.length} Problems Available (Select at most 3)</span>
              <span>Click to Add/Remove</span>
            </div>

            <div className="max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {catalogLoading && (
                <div className="text-xs text-gray-600 px-3 py-10 text-center animate-pulse select-none">
                  Loading catalog…
                </div>
              )}

              {!catalogLoading && catalogProblems.length === 0 && (
                <div className="text-xs text-gray-500 py-12 text-center select-none bg-[#0b0e14]/20 rounded-xl border border-white/5">
                  No challenges available in the catalog.
                </div>
              )}

              {!catalogLoading && catalogProblems.length > 0 && (
                <div className="space-y-1">
                  {catalogProblems.map(p => {
                    const slugIdx = selectedSlugs.indexOf(p.slug);
                    const isSelected = slugIdx !== -1;
                    return (
                      <button
                        key={p.slug}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSlugs(prev => prev.filter(s => s !== p.slug));
                          } else {
                            if (selectedSlugs.length >= 3) {
                              alert("You can select at most 3 problems.");
                              return;
                            }
                            setSelectedSlugs(prev => [...prev, p.slug]);
                          }
                        }}
                        className={`problem-row group w-full ${isSelected ? 'problem-row-selected' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`difficulty-badge difficulty-badge-${p.difficulty?.toLowerCase() || 'easy'}`}>
                            {p.difficulty}
                          </span>
                          <span className={`text-sm truncate transition-all duration-150 ${
                            isSelected ? 'text-gray-100 font-medium' : 'text-gray-400 group-hover:text-gray-200'
                          }`}>
                            {p.title}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-[#4F7DFF]/20 text-[#4F7DFF] px-1.5 py-0.5 rounded font-black select-none uppercase">
                              Q{slugIdx + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[11px] font-medium tabular-nums ${
                            isSelected ? 'text-[#4F7DFF]' : 'text-gray-600'
                          }`}>
                            {p.score_base} pts
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150 ${
                            isSelected
                              ? 'bg-[#4F7DFF] text-white scale-110'
                              : 'border border-transparent text-transparent group-hover:border-[#4F7DFF]/40 group-hover:text-gray-400'
                          }`}>
                            <ChevronRight className="w-2.5 h-2.5" />
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

        {/* Custom Problem Creator */}
        {problemSource === 'custom' && (
          <div className="space-y-6 animate-fade-in">
            {/* Custom Problems Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              {customProblems.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-[#0b0e14]/40 border border-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveCustomIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                      activeCustomIdx === idx
                        ? 'bg-[#7A5FFF] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Problem {idx + 1}{p.title ? `: ${p.title}` : ''}
                  </button>
                  {customProblems.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomProblem(idx);
                      }}
                      className="px-1 text-gray-500 hover:text-rose-400 transition-colors text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {customProblems.length < 3 && (
                <button
                  onClick={addCustomProblem}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-[#7A5FFF]/40 hover:border-[#7A5FFF] text-[11px] font-semibold text-[#7A5FFF] transition-all duration-150 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Problem
                </button>
              )}
            </div>

            {customProblems[activeCustomIdx] && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* Meta Inputs */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-500">Problem Title</label>
                    <input
                      type="text"
                      value={customProblems[activeCustomIdx].title}
                      onChange={e => {
                        const val = e.target.value;
                        updateActiveCustomProblem(p => ({ ...p, title: val }));
                      }}
                      className="battle-input"
                      placeholder="e.g. Reverse Array In Place"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-500">Problem Description</label>
                    <textarea
                      value={customProblems[activeCustomIdx].description}
                      onChange={e => {
                        const val = e.target.value;
                        updateActiveCustomProblem(p => ({ ...p, description: val }));
                      }}
                      rows={4}
                      className="battle-input resize-none"
                      placeholder="Given an array of integers, return the array reversed…"
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-gray-500">Test Cases</label>
                      <button
                        onClick={addTestCase}
                        className="text-[11px] font-medium text-[#4F7DFF] hover:text-[#7A5FFF] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                      {customProblems[activeCustomIdx].testCases.map((tc, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2 bg-dark-bg/40 p-3 rounded-xl border border-white/5 relative group animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-gray-600 font-medium tracking-wider">Input</label>
                            <input
                              type="text"
                              value={tc.input}
                              onChange={e => updateTestCase(idx, 'input', e.target.value)}
                              className="w-full bg-dark-panel border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#4F7DFF]/40 transition-all"
                              placeholder="[1, 2, 3]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-gray-600 font-medium tracking-wider">Expected Output</label>
                            <input
                              type="text"
                              value={tc.expectedOutput}
                              onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                              className="w-full bg-dark-panel border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#4F7DFF]/40 transition-all"
                              placeholder="[3, 2, 1]"
                            />
                          </div>
                          {customProblems[activeCustomIdx].testCases.length > 1 && (
                            <button
                              onClick={() => removeTestCase(idx)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-full text-rose-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Code Templates */}
                <div className="lg:col-span-7 space-y-3">
                  <label className="text-[11px] font-medium text-gray-500 block">Starter Code Templates</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'pythonTemplate', label: 'Python 3' },
                      { key: 'jsTemplate', label: 'JavaScript' },
                      { key: 'cppTemplate', label: 'C++ (GCC 17)' },
                      { key: 'javaTemplate', label: 'Java (JDK 17)' },
                    ].map(lang => (
                      <div key={lang.key} className="space-y-1">
                        <span className="text-[10px] text-gray-600 font-medium block">{lang.label}</span>
                        <textarea
                          value={(customProblems[activeCustomIdx] as any)[lang.key]}
                          onChange={e => {
                            const val = e.target.value;
                            updateActiveCustomProblem(p => ({ ...p, [lang.key]: val }));
                          }}
                          rows={5}
                          className="w-full bg-dark-bg border border-white/5 rounded-xl px-2.5 py-2 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#4F7DFF]/40 transition-all resize-none shadow-inner"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
