import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface ConfidenceMeterProps {
  value: number; // 0 to 100
  isVoiceActive?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ value, isVoiceActive }) => {
  const getStatus = (val: number) => {
    if (val >= 80) return { label: 'Confident & Fluent', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (val >= 60) return { label: 'Optimal Pace', color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
    if (val >= 40) return { label: 'Moderate Hesitation', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { label: 'Low Confidence / Pauses', color: 'text-rose-400', bg: 'bg-rose-500/20' };
  };

  const status = getStatus(value);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4 space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
            Confidence Meter
          </span>
          <span className={`text-[11px] font-bold mt-0.5 ${status.color}`}>
            {status.label}
          </span>
        </div>
        {value >= 60 ? (
          <ShieldCheck className={`w-4 h-4 ${status.color}`} />
        ) : (
          <ShieldAlert className={`w-4 h-4 ${status.color}`} />
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-indigo-400`}
            style={{ width: `${value}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-white/30 font-medium">
          <span>0%</span>
          <span>{isVoiceActive ? 'Analyzing speech pattern...' : 'Analyzing response structure...'}</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};
