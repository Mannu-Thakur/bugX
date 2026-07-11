import React from 'react';
import { AlgorithmVisualizer } from '../features/problems/components/AlgorithmVisualizer';
import { Info, Layers } from 'lucide-react';

export const VisualizerPage: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in text-dark-text select-none">
      
      {/* Page Header (Typography First) */}
      <div className="space-y-2 border-b border-dark-border pb-6 relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#4F7DFF]/2 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#4F7DFF]/10 border border-[#4F7DFF]/20">
            <Layers className="w-4.5 h-4.5 text-[#4F7DFF]" />
          </div>
          <span className="text-[10px] font-black uppercase text-[#4F7DFF] tracking-wider">Playground</span>
        </div>

        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">
          Algorithmic Visualizer
        </h1>
        <p className="text-xs text-dark-text/50 max-w-xl leading-relaxed">
          Watch key algorithms execute step-by-step. Enter custom comma-separated inputs, control playback speeds, track line-by-line tracers, and visualize memory state stack frames dynamically in real-time.
        </p>
      </div>

      {/* Info / Guide Box */}
      <div className="bg-dark-panel border border-dark-border p-4 rounded-2xl flex items-start gap-3.5 text-xs text-dark-text/70 leading-relaxed shadow-sm">
        <Info className="w-4.5 h-4.5 text-[#4F7DFF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-dark-text">How to use the Visualizer:</p>
          <ul className="list-disc pl-4 space-y-1 text-dark-text/50">
            <li>Choose an algorithm from the selection dropdown — Linked List Reversal, Binary Search, Bubble Sort, Merge Sort, Quick Sort, Stack Operations, Queue Operations, or Fibonacci DP.</li>
            <li>Type custom numbers into the input field to test different array inputs.</li>
            <li>Use the playback controls at the bottom to step forward/backward, auto-play, or adjust execution speeds.</li>
          </ul>
        </div>
      </div>

      {/* Visualizer Canvas Card */}
      <div className="bg-dark-panel border border-dark-border rounded-3xl p-6 shadow-sm">
        <AlgorithmVisualizer />
      </div>

    </div>
  );
};
