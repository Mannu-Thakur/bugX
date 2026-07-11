import React, { useState } from 'react';
import { useInterview } from './InterviewContext';
import { RadarChart } from './components/RadarChart';
import { BADGES, type BadgeId } from './types';
import { Award, Calendar, Flame, Layers, Star, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InterviewDashboard: React.FC = () => {
  const { sessions, getStats } = useInterview();
  const stats = getStats();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.report);

  // Render stats summary cards
  const summaryCards = [
    {
      label: 'Total Sessions',
      value: stats.totalInterviews,
      sub: 'loops completed',
      icon: <Layers className="w-4 h-4 text-indigo-400" />
    },
    {
      label: 'Average Score',
      value: stats.totalInterviews > 0 ? `${stats.averageScore}%` : '—',
      sub: 'aggregate rating',
      icon: <TrendingUp className="w-4 h-4 text-indigo-400" />
    },
    {
      label: 'Best Score',
      value: stats.totalInterviews > 0 ? `${stats.bestScore}%` : '—',
      sub: 'personal record',
      icon: <Star className="w-4 h-4 text-indigo-400" />
    },
    {
      label: 'Current Streak',
      value: stats.currentStreak > 0 ? `${stats.currentStreak} Days` : '0 Days',
      sub: 'consecutive active days',
      icon: <Flame className="w-4 h-4 text-indigo-400" />
    }
  ];

  // Get selected session for detail viewing
  const selectedSession = completedSessions.find(s => s.id === selectedSessionId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 select-none" style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>
      {/* Header Banner */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          AI Mock Interview Dashboard
        </h1>
        <p className="text-xs text-white/50">
          Track complexity scores, study trends, and collect verified certification badges.
        </p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/50 p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                {card.label}
              </span>
              {card.icon}
            </div>
            <div>
              <span className="text-2xl font-black text-white">{card.value}</span>
            </div>
            <p className="text-[9px] text-white/40">{card.sub}</p>
          </div>
        ))}
      </div>

      {completedSessions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f14]/50 p-10 text-center space-y-4">
          <div className="p-3 bg-white/[0.04] rounded-full w-fit mx-auto">
            <Award className="w-6 h-6 text-white/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white/80">No mock history yet</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Solve code challenges, get your submission accepted, and click the "Start AI Interview" button to build analytics.
            </p>
          </div>
          <Link to="/problems">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer">
              Go to catalog
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topics & Radarchart analysis (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Charts & Strongest/Weakest block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-2xl border border-white/[0.06] bg-[#0d0f14]/50 p-5">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                  Skill Radar
                </span>
                {completedSessions[0]?.report && (
                  <RadarChart scores={completedSessions[completedSessions.length - 1].report!.scores} size={220} />
                )}
              </div>

              {/* Topic performance block */}
              <div className="flex flex-col justify-between py-2 space-y-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 block">
                    Focus Topics Focus
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">
                        Strongest Topics
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {stats.strongestTopics.map(topic => (
                          <span key={topic} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 rounded">
                            {topic.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block">
                        Weakest Topics
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {stats.weakestTopics.map(topic => (
                          <span key={topic} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-400 rounded">
                            {topic.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-3 space-y-2 text-[10px]">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 block">
                    Collected credentials
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(completedSessions.flatMap(s => s.report?.badges || []))).map(badgeId => {
                      const badge = BADGES[badgeId as BadgeId];
                      return badge ? (
                        <span key={badgeId} className="px-1.5 py-0.5 border border-white/[0.06] bg-white/[0.02] rounded text-[9px] font-bold text-white/60" title={badge.description}>
                          {badge.icon} {badge.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Interview Log History List */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f14]/50 p-4.5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 block pb-1 border-b border-white/[0.04]">
                Mock history logs
              </span>

              <div className="divide-y divide-zinc-900 overflow-x-auto">
                <table className="w-full text-left text-xs text-white/60">
                  <thead>
                    <tr className="text-[9px] text-white/30 font-bold uppercase tracking-wider border-b border-white/[0.04] pb-2">
                      <th className="py-2.5">Date</th>
                      <th>Problem</th>
                      <th>Mode</th>
                      <th>Score</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {completedSessions.map(sess => (
                      <tr key={sess.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-white/30" />
                          {new Date(sess.completedAt!).toLocaleDateString()}
                        </td>
                        <td className="font-bold text-white/80">
                          {sess.submissionContext.problemTitle}
                        </td>
                        <td className="capitalize text-[11px]">
                          {sess.config.mode.replace('_', ' ')}
                        </td>
                        <td>
                          <span className={`font-mono font-bold ${
                            sess.report!.overallScore >= 90 ? 'text-emerald-400' : 'text-white/85'
                          }`}>
                            {sess.report!.overallScore}%
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setSelectedSessionId(sess.id)}
                            className="px-2.5 py-1 bg-[#0d0f14]/80 border border-white/[0.06] rounded-lg text-[10px] font-bold text-white/80 hover:bg-[#131316]/80 hover:border-white/[0.1] transition-all cursor-pointer inline-flex items-center gap-0.5"
                          >
                            View report
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Details / Review card view for selected session (1 col) */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f14]/50 p-5 shadow-sm space-y-4">
            {selectedSession ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">
                      Active review log
                    </span>
                    <h3 className="text-xs font-black text-white/85">
                      {selectedSession.submissionContext.problemTitle}
                    </h3>
                  </div>
                  <div className="font-mono text-xl font-black text-indigo-400 shrink-0">
                    {selectedSession.report!.overallScore}%
                  </div>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-white/30 font-bold">Type:</span>
                    <span className="text-white/80 capitalize">{selectedSession.config.mode.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/30 font-bold">Rigor:</span>
                    <span className="text-white/80 capitalize">{selectedSession.config.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/30 font-bold">Duration:</span>
                    <span className="text-white/80">
                      {Math.round(
                        selectedSession.answers.reduce((acc, a) => acc + a.durationSec, 0) / 60
                      )}{' '}
                      mins
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/[0.04] pt-3 space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 block">
                    Report Overview
                  </span>
                  <p className="text-[11px] text-white/60 leading-relaxed italic bg-[#07090e]/40 p-2.5 rounded-lg border border-white/[0.04]">
                    "{selectedSession.report!.summary}"
                  </p>
                </div>

                <div className="pt-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 block mb-2">
                    Evaluation Details
                  </span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSession.report!.detailedFeedback.map((fb, fIdx) => (
                      <div key={fIdx} className="p-2 border border-white/[0.04] bg-[#07090e]/40 rounded-lg space-y-1 text-[10px]">
                        <div className="flex justify-between font-bold">
                          <span className="text-white/30 font-mono">Q{fIdx + 1}</span>
                          <span className="text-indigo-400">{fb.score}/10</span>
                        </div>
                        <p className="text-white/85 font-medium truncate">"{fb.question}"</p>
                        <p className="text-white/40 italic truncate">A: "{fb.candidateAnswer}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none text-white/35 space-y-2">
                <Star className="w-8 h-8 text-white/20" />
                <span className="text-[10px] font-bold">Select a mock session on the left log history to review details here.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
