import React, { useState } from 'react';
import { ScoreRing } from '../components/ScoreRing';
import { RadarChart } from '../components/RadarChart';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { ChevronDown, ChevronUp, Download, Award, ExternalLink, RefreshCw } from 'lucide-react';
import type { InterviewReport } from '../types';
import { Button } from '../../../shared/ui/button/Button';
import { useToast } from '../../../shared/ui/toast/ToastProvider';
import { Link } from 'react-router-dom';

interface ReportScreenProps {
  report: InterviewReport;
  onRetry: () => void;
  onClose: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({ report, onRetry, onClose }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { success: showToastSuccess, error: showToastError } = useToast();

  const handleDownloadCertificate = () => {
    if (report.overallScore < 90) {
      showToastError('Certificates are only issued for overall scores of 90 or higher.');
      return;
    }

    try {
      // Create offscreen canvas to render a beautiful mockup certificate
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Backdrop
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, 800, 600);

      // Gold outer border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 10;
      ctx.strokeRect(15, 15, 770, 570);

      // Inner thin border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(25, 25, 750, 550);

      // Header Text
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 36px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE OF EXCELLENCE', 400, 100);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px "Inter", sans-serif';
      ctx.fillText('THIS CERTIFICATE IS PROUDLY PRESENTED TO THE CANDIDATE FOR ACHIEVING', 400, 160);

      // Score Callout
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px "Outfit", sans-serif';
      ctx.fillText(`TOP ${report.overallScore}% PERFORMANCE`, 400, 230);

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'italic 16px Georgia, serif';
      ctx.fillText('in a high-complexity FAANG mock technical loop', 400, 280);

      // Grid dividers
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(150, 320);
      ctx.lineTo(650, 320);
      ctx.stroke();

      // Stats block
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.fillText(`TECHNICAL: ${report.scores.technicalAccuracy}/10   COMMUNICATION: ${report.scores.communication}/10   COMPLEXITY: ${report.scores.complexityUnderstanding}/10`, 400, 360);

      // Seal decoration
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(400, 460, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#07090e';
      ctx.font = 'bold 14px "Inter", sans-serif';
      ctx.fillText('bugX AI', 400, 455);
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText('VERIFIED SEAL', 400, 475);

      // Footer
      ctx.fillStyle = '#71717a';
      ctx.font = '11px monospace';
      ctx.fillText('Verification Code: BUGX-AI-MOCK-' + Math.random().toString(36).substring(2, 8).toUpperCase(), 400, 540);

      // Export & download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `bugx_interview_certificate_${report.overallScore}.png`;
      link.href = dataUrl;
      link.click();

      showToastSuccess('Certificate downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToastError('Failed to generate downloadable certificate.');
    }
  };

  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400';
    if (val >= 75) return 'text-indigo-400';
    if (val >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none p-2 py-4">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
            <Award className="w-6 h-6 text-indigo-400 shrink-0" />
            Interview Evaluation Report
          </h1>
          <p className="text-xs text-white/50">
            A comprehensive overview of your communication flow, coding rigor, and architectural trade-offs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
          <Button onClick={onClose} variant="primary" size="sm" className="text-xs">
            Exit Report
          </Button>
        </div>
      </div>

      {/* Main stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ring & Badges Panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f14]/50 p-5 flex flex-col items-center justify-center space-y-4 shadow-sm text-center">
          <ScoreRing score={report.overallScore} size={150} strokeWidth={11} />

          {/* Certificate Download Panel */}
          {report.overallScore >= 90 ? (
            <div className="w-full bg-amber-950/20 border border-amber-600/35 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">
                ⭐ Certified Performance
              </span>
              <p className="text-[10px] text-white/60 leading-relaxed">
                You scored in the top tier! Download your bugX Technical Interview Certificate.
              </p>
              <button
                onClick={handleDownloadCertificate}
                className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all select-none flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/10"
              >
                <Download className="w-3 h-3" />
                Certificate
              </button>
            </div>
          ) : (
            <div className="w-full bg-white/[0.015] border border-white/[0.06] rounded-xl p-3 text-[10px] text-white/40 text-center leading-relaxed">
              ⭐ Achieve a score of 90 or higher to unlock your downloadable Interview Certificate of Excellence.
            </div>
          )}

          {/* Badge Display */}
          <div className="w-full pt-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 block mb-2">
              Badges Unlocked
            </span>
            <BadgeDisplay badges={report.badges} size="sm" />
          </div>
        </div>

        {/* Radar Chart Panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f14]/50 p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-2 block">
            Rigor & Skills Breakdown
          </span>
          <RadarChart scores={report.scores} size={230} />
        </div>

        {/* Strengths & Weaknesses Panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f14]/50 p-5 flex flex-col justify-between shadow-sm space-y-4">
          <div className="space-y-4">
            {/* Strengths */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">
                Strengths
              </span>
              <ul className="space-y-1">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="text-[10px] text-white/80 flex items-start gap-1 leading-relaxed">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            {report.weaknesses.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block">
                  Areas For Improvement
                </span>
                <ul className="space-y-1">
                  {report.weaknesses.map((weak, idx) => (
                    <li key={idx} className="text-[10px] text-white/80 flex items-start gap-1 leading-relaxed">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Overall summary snippet */}
          <div className="border-t border-white/[0.06] pt-3 text-[10px] text-white/60 leading-relaxed italic bg-white/[0.01] p-2.5 rounded-lg">
            "{report.summary}"
          </div>
        </div>
      </div>

      {/* Topics & Problems recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Recommended Learning Topics */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4.5 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 block">
            Suggested study topics
          </span>
          <div className="flex flex-wrap gap-1.5">
            {report.suggestedTopics.map(topic => (
              <span
                key={topic}
                className="px-2.5 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-[9px] font-bold text-white/80"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Recommended Problems */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4.5 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 block">
            Recommended Practice Problems
          </span>
          <div className="space-y-1.5">
            {report.recommendedProblems.map((prob, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[10px] font-bold text-white/80 py-1 border-b border-white/[0.04] last:border-0"
              >
                <span>{prob}</span>
                <Link
                  to="/problems"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5"
                >
                  Solve
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accordion List for Detailed Question Feedback */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 overflow-hidden">
        <div className="px-4.5 py-3 border-b border-white/[0.06] bg-white/[0.02] select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
            Detailed question & answer breakdown
          </span>
        </div>

        <div className="divide-y divide-zinc-900">
          {report.detailedFeedback.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div key={idx} className="p-4 space-y-2">
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <div className="min-w-0 pr-4">
                    <span className="text-[9px] font-bold text-white/30 block font-mono">Question {idx + 1}</span>
                    <h3 className="text-xs font-bold text-white/85 truncate mt-0.5 leading-snug">
                      {item.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-black ${getScoreColor(item.score * 10)}`}>
                      {item.score}/10
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="pt-3 border-t border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">
                        Your Answer
                      </span>
                      <p className="text-white/60 bg-[#07090e]/40 p-2.5 rounded-lg border border-white/[0.04] select-text italic">
                        "{item.candidateAnswer}"
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">
                          Feedback & Review
                        </span>
                        <p className="text-white/85 select-text bg-white/[0.015] p-2.5 rounded-lg border border-white/[0.05]">
                          {item.feedback}
                        </p>
                      </div>

                      {item.expectedDiscussion && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">
                            Key discussion points you should cover
                          </span>
                          <p className="text-white/60 select-text bg-white/[0.015] p-2.5 rounded-lg border border-white/[0.05]">
                            {item.expectedDiscussion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
