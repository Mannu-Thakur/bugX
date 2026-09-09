import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, AlertCircle, RefreshCw, Plus, Trophy, ArrowRight } from 'lucide-react';
import type { PlatformStats, PlatformStatItem } from '../api';
import { useAuth } from '../../auth/useAuth';
import { RatingSparkline } from './RatingSparkline';

interface ConnectedPlatformsProps {
  stats?: PlatformStats;
  isLoading?: boolean;
  onConnectClick?: () => void;
}

export const ConnectedPlatforms: React.FC<ConnectedPlatformsProps> = ({
  stats,
  isLoading,
  onConnectClick,
}) => {
  const { updateProfile } = useAuth();
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const getRankColor = (_rankStr?: string, rating?: number) => {
    if (rating) {
      if (rating >= 2400) return 'text-red-500 shadow-red-500/50';
      if (rating >= 2100) return 'text-orange-400 shadow-orange-400/50';
      if (rating >= 1900) return 'text-purple-400 shadow-purple-400/50';
      if (rating >= 1600) return 'text-blue-400 shadow-blue-400/50';
      if (rating >= 1400) return 'text-cyan-400 shadow-cyan-400/50';
      if (rating >= 1200) return 'text-emerald-400 shadow-emerald-400/50';
      return 'text-gray-400';
    }
    return 'text-blue-400';
  };

  const cleanHandle = (val: string) => {
    if (!val) return '';
    const cleaned = val.trim().replace(/[\?#].*$/, '').replace(/\/$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    const skip = new Set(['http:', 'https:', 'www.leetcode.com', 'leetcode.com', 'u', 'user', 'profile', 'www.codeforces.com', 'codeforces.com', 'geeksforgeeks.org', 'auth.geeksforgeeks.org', 'www.geeksforgeeks.org', 'account', 'settings', 'edit', 'home']);
    for (let i = parts.length - 1; i >= 0; i--) {
      const token = parts[i].replace(/^@/, '').trim();
      if (!skip.has(token.toLowerCase()) && !token.startsWith('http')) {
        return token;
      }
    }
    return cleaned.replace(/^@/, '');
  };

  const handleInlineConnect = async (key: string) => {
    const val = (handleInput[key] || '').trim();
    if (!val) return;

    setSubmitting(key);
    try {
      const handle = cleanHandle(val);
      const payload: Record<string, string | null> = {};
      if (key === 'leetcode') {
        payload.leetcodeUrl = val;
        payload.leetcodeUsername = handle;
      } else if (key === 'codeforces') {
        payload.codeforcesUrl = val;
        payload.codeforcesUsername = handle;
      } else if (key === 'gfg') {
        payload.gfgUrl = val;
        payload.gfgUsername = handle;
      }

      await updateProfile(payload);
      setConnectingKey(null);
      setHandleInput((prev) => ({ ...prev, [key]: '' }));
    } catch {
      // Toast handles error
    } finally {
      setSubmitting(null);
    }
  };

  const platforms = [
    {
      key: 'leetcode',
      name: 'LeetCode',
      placeholder: 'username or URL',
      color: '#f59e0b',
      borderColor: 'rgba(245,158,11,0.25)',
      glowColor: 'rgba(245,158,11,0.15)',
      data: stats?.leetcode,
    },
    {
      key: 'codeforces',
      name: 'Codeforces',
      placeholder: 'handle or URL',
      color: '#3b82f6',
      borderColor: 'rgba(59,130,246,0.25)',
      glowColor: 'rgba(59,130,246,0.15)',
      data: stats?.codeforces,
    },
    {
      key: 'gfg',
      name: 'GeeksForGeeks',
      placeholder: 'username or URL',
      color: '#10b981',
      borderColor: 'rgba(16,185,129,0.25)',
      glowColor: 'rgba(16,185,129,0.15)',
      data: stats?.gfg,
    },
  ];

  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden transition-all duration-500 border border-white/[0.15] bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]"
    >
      {/* Top chromatic glint */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 via-blue-400/40 via-emerald-400/40 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">Connected Platforms</h3>
            <p className="text-[11px] text-gray-500 font-medium">Live stats synced from competitive coding platforms</p>
          </div>
        </div>

        {onConnectClick && (
          <button
            onClick={onConnectClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white rounded-xl bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.16] hover:border-white/[0.25] transition-all duration-300 cursor-pointer backdrop-blur-md"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Manage Handles
          </button>
        )}
      </div>

      {/* 3 Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map((p) => {
          const d = p.data as PlatformStatItem | undefined;
          const isConnected = d?.connected ?? false;
          const isInlineConnecting = connectingKey === p.key;

          return (
            <div
              key={p.key}
              className="relative rounded-xl p-4 flex flex-col justify-between overflow-hidden transition-all duration-300 group border min-h-[190px]"
              style={{
                background: isConnected ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                borderColor: isConnected ? p.borderColor : 'rgba(255,255,255,0.08)',
                boxShadow: isConnected ? `0 4px 20px ${p.glowColor}` : 'none',
              }}
            >
              {/* Inner gradient glow */}
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 ${
                  isConnected ? 'opacity-30 group-hover:opacity-50' : 'opacity-5'
                }`}
                style={{ background: p.color }}
              />

              {/* Platform Title & Status Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                  <span className="text-xs font-black text-white uppercase tracking-wider">{p.name}</span>
                </div>

                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-500/10 border border-white/10 text-gray-500">
                    Not Linked
                  </span>
                )}
              </div>

              {/* Content Body */}
              {isLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 my-auto">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-white/20 animate-spin" />
                  <span className="text-[10px] text-gray-500">Syncing stats...</span>
                </div>
              ) : isConnected && d ? (
                <div className="space-y-3 my-1">
                  {/* Handle & Profile Link */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 font-mono truncate">@{d.username}</span>
                    {d.profile_url && (
                      <a
                        href={d.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                        title={`View ${p.name} Profile`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* LeetCode Specific Stats */}
                  {p.key === 'leetcode' && (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Total Solved</span>
                        <span className="text-xl font-black font-mono text-amber-400">{d.total_solved ?? 0}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <div className="flex flex-col items-center py-1 px-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[7px] uppercase font-bold text-emerald-400">Easy</span>
                          <span className="text-xs font-black font-mono text-emerald-300">{d.easy_solved ?? 0}</span>
                        </div>
                        <div className="flex flex-col items-center py-1 px-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[7px] uppercase font-bold text-amber-400">Med</span>
                          <span className="text-xs font-black font-mono text-amber-300">{d.medium_solved ?? 0}</span>
                        </div>
                        <div className="flex flex-col items-center py-1 px-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <span className="text-[7px] uppercase font-bold text-rose-400">Hard</span>
                          <span className="text-xs font-black font-mono text-rose-300">{d.hard_solved ?? 0}</span>
                        </div>
                      </div>

                      {d.ranking && d.ranking > 0 ? (
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pt-1">
                          <span>Global Rank:</span>
                          <span className="font-mono text-gray-300">#{d.ranking.toLocaleString()}</span>
                        </div>
                      ) : null}

                      {/* Rating Line Graph */}
                      <RatingSparkline points={d.rating_history} color={p.color} gradientId={`grad-${p.key}`} />
                    </div>
                  )}

                  {/* Codeforces Specific Stats */}
                  {p.key === 'codeforces' && (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Rating</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-black font-mono ${getRankColor(d.rank, d.rating)}`}>
                            {d.rating ?? 'Unrated'}
                          </span>
                          {d.max_rating ? (
                            <span className="text-[9px] text-gray-500 font-mono">(max {d.max_rating})</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="uppercase font-bold text-gray-500">Rank Title</span>
                        <span className={`font-bold capitalize ${getRankColor(d.rank, d.rating)}`}>
                          {d.rank || 'Unrated'}
                        </span>
                      </div>

                      {d.total_solved !== undefined ? (
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                          <span>Solved Problems:</span>
                          <span className="font-mono text-blue-400 font-bold">{d.total_solved}</span>
                        </div>
                      ) : null}

                      {/* Rating Line Graph */}
                      <RatingSparkline points={d.rating_history} color={p.color} gradientId={`grad-${p.key}`} />
                    </div>
                  )}

                  {/* GeeksForGeeks Specific Stats */}
                  {p.key === 'gfg' && (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Coding Score</span>
                        <span className="text-xl font-black font-mono text-emerald-400">{d.coding_score ?? 0}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pt-1">
                        <span>Problems Solved:</span>
                        <span className="font-mono text-emerald-300 font-bold">{d.total_solved ?? 0}</span>
                      </div>

                      {d.streak ? (
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                          <span>Current Streak:</span>
                          <span className="font-mono text-amber-400 font-bold">{d.streak} days</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : isInlineConnecting ? (
                /* Inline Handle Input Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleInlineConnect(p.key);
                  }}
                  className="py-2 flex flex-col gap-2 my-auto"
                >
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Enter {p.name} handle or profile link:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={handleInput[p.key] || ''}
                      onChange={(e) =>
                        setHandleInput((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                      placeholder={p.placeholder}
                      className="flex-1 bg-[#0a0a0c] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={submitting === p.key}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                    >
                      {submitting === p.key ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConnectingKey(null)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 self-end mt-0.5"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                /* Not Linked state */
                <div className="py-5 flex flex-col items-center justify-center gap-2 text-center my-auto">
                  <div className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-[11px] text-gray-500">No profile linked yet.</p>
                  <button
                    onClick={() => setConnectingKey(p.key)}
                    className="mt-1 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-gray-200 transition-all duration-300 cursor-pointer"
                  >
                    Connect {p.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
