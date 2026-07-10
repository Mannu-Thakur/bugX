import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Sliders, Info, ChevronDown, Check, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

type AlgorithmType = 'linked_list_reverse' | 'binary_search' | 'bubble_sort';

interface LLStep {
  prev: number | null;
  curr: number | null;
  nextTemp: number | null;
  description: string;
  codeLine: number;
  pointers: {
    prevIdx: number | null;
    currIdx: number | null;
    nextIdx: number | null;
  };
  reversedLinks: number[]; // indices that are reversed (pointing backwards)
}





interface BSStepItem {
  low: number;
  high: number;
  mid: number;
  found: boolean;
  notFound: boolean;
  description: string;
  codeLine: number;
}

interface BubbleStep {
  array: number[];
  compareIndices: [number, number] | null;
  swapped: boolean;
  sortedIndices: number[];
  description: string;
  codeLine: number;
}

export const AlgorithmVisualizer: React.FC = () => {
  const [algo, setAlgo] = useState<AlgorithmType>('linked_list_reverse');
  const [inputValue, setInputValue] = useState('1,2,3,4,5');
  const [targetValue, setTargetValue] = useState('3'); // For Binary Search
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1200); // ms per step

  // Custom dropdown states
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fullscreen state
  const [isMaximized, setIsMaximized] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) setIsMaximized(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMaximized]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulation steps states
  const [llSteps, setLlSteps] = useState<LLStep[]>([]);
  const [bsSteps, setBsSteps] = useState<BSStepItem[]>([]);
  const [bubbleSteps, setBubbleSteps] = useState<BubbleStep[]>([]);
  const [bsArray, setBsArray] = useState<number[]>([]);

  // Playback timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Linked List Reversal simulation
  const initLLSimulation = (valuesStr: string) => {
    const list = valuesStr.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v));

    if (list.length === 0) return;

    const steps: LLStep[] = [];
    
    // Step 0: Init
    steps.push({
      prev: null,
      curr: list[0],
      nextTemp: null,
      description: 'Initialize pointers: prev = null, curr = head.',
      codeLine: 1,
      pointers: { prevIdx: null, currIdx: 0, nextIdx: null },
      reversedLinks: [],
    });

    let prevIdx: number | null = null;
    let currIdx: number | null = 0;
    const reversedLinks: number[] = [];

    while (currIdx !== null && currIdx < list.length) {
      // Step 1: Store nextTemp
      const nextIdx: number | null = currIdx + 1 < list.length ? currIdx + 1 : null;
      steps.push({
        prev: prevIdx !== null ? list[prevIdx] : null,
        curr: list[currIdx],
        nextTemp: nextIdx !== null ? list[nextIdx] : null,
        description: `Store next node reference: nextTemp = curr.next (${nextIdx !== null ? list[nextIdx] : 'null'}).`,
        codeLine: 3,
        pointers: { prevIdx, currIdx, nextIdx },
        reversedLinks: [...reversedLinks],
      });

      // Step 2: Reverse pointer
      reversedLinks.push(currIdx);
      steps.push({
        prev: prevIdx !== null ? list[prevIdx] : null,
        curr: list[currIdx],
        nextTemp: nextIdx !== null ? list[nextIdx] : null,
        description: `Reverse current node's pointer direction: curr.next = prev.`,
        codeLine: 4,
        pointers: { prevIdx, currIdx, nextIdx },
        reversedLinks: [...reversedLinks],
      });

      // Step 3: Advance prev
      prevIdx = currIdx;
      steps.push({
        prev: list[prevIdx],
        curr: list[currIdx],
        nextTemp: nextIdx !== null ? list[nextIdx] : null,
        description: `Advance prev pointer: prev = curr.`,
        codeLine: 5,
        pointers: { prevIdx, currIdx, nextIdx },
        reversedLinks: [...reversedLinks],
      });

      // Step 4: Advance curr
      currIdx = nextIdx;
      steps.push({
        prev: list[prevIdx],
        curr: currIdx !== null ? list[currIdx] : null,
        nextTemp: null,
        description: `Advance curr pointer: curr = nextTemp.`,
        codeLine: 6,
        pointers: { prevIdx, currIdx, nextIdx: null },
        reversedLinks: [...reversedLinks],
      });
    }

    // Step Final: Return prev
    steps.push({
      prev: prevIdx !== null ? list[prevIdx] : null,
      curr: null,
      nextTemp: null,
      description: 'Algorithm finished. Return prev node as the new head.',
      codeLine: 8,
      pointers: { prevIdx, currIdx: null, nextIdx: null },
      reversedLinks: [...reversedLinks],
    });

    setLlSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // Initialize Binary Search simulation
  const initBSSimulation = (valuesStr: string, targetVal: string) => {
    const list = valuesStr.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b); // Must be sorted

    const target = parseInt(targetVal.trim());
    if (list.length === 0 || isNaN(target)) return;

    setBsArray(list);

    const steps: BSStepItem[] = [];
    let low = 0;
    let high = list.length - 1;

    // Step 0: Init
    steps.push({
      low,
      high,
      mid: Math.floor((low + high) / 2),
      found: false,
      notFound: false,
      description: `Initialize search bounds: low = 0, high = ${list.length - 1}.`,
      codeLine: 1,
    });

    let found = false;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      steps.push({
        low,
        high,
        mid,
        found: false,
        notFound: false,
        description: `Calculate mid-point: mid = floor((low + high) / 2) = ${mid} (value: ${list[mid]}).`,
        codeLine: 3,
      });

      if (list[mid] === target) {
        found = true;
        steps.push({
          low,
          high,
          mid,
          found: true,
          notFound: false,
          description: `Target ${target} matches mid-value ${list[mid]}! Value found.`,
          codeLine: 5,
        });
        break;
      } else if (list[mid] < target) {
        low = mid + 1;
        steps.push({
          low,
          high,
          mid,
          found: false,
          notFound: false,
          description: `Mid-value ${list[mid]} is less than target ${target}. Shift search range right: low = mid + 1 (${low}).`,
          codeLine: 7,
        });
      } else {
        high = mid - 1;
        steps.push({
          low,
          high,
          mid,
          found: false,
          notFound: false,
          description: `Mid-value ${list[mid]} is greater than target ${target}. Shift search range left: high = mid - 1 (${high}).`,
          codeLine: 9,
        });
      }
    }

    if (!found) {
      steps.push({
        low,
        high,
        mid: -1,
        found: false,
        notFound: true,
        description: `Search space exhausted (low > high). Target value ${target} is not in the array.`,
        codeLine: 12,
      });
    }

    setBsSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // Initialize Bubble Sort simulation
  const initBubbleSimulation = (valuesStr: string) => {
    const list = valuesStr.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v));

    if (list.length === 0) return;

    const arr = [...list];
    const steps: BubbleStep[] = [];
    const sortedIndices: number[] = [];

    steps.push({
      array: [...arr],
      compareIndices: null,
      swapped: false,
      sortedIndices: [],
      description: 'Initialize array for Bubble Sort. Double nested loops will compare adjacent elements.',
      codeLine: 1,
    });

    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        steps.push({
          array: [...arr],
          compareIndices: [j, j + 1],
          swapped: false,
          sortedIndices: [...sortedIndices],
          description: `Compare adjacent elements at indices ${j} and ${j + 1} (${arr[j]} vs ${arr[j + 1]}).`,
          codeLine: 3,
        });

        if (arr[j] > arr[j + 1]) {
          // Swap
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          swapped = true;

          steps.push({
            array: [...arr],
            compareIndices: [j, j + 1],
            swapped: true,
            sortedIndices: [...sortedIndices],
            description: `Swap elements: ${temp} > ${arr[j]} is true.`,
            codeLine: 5,
          });
        }
      }
      sortedIndices.push(n - i - 1);
      if (!swapped) {
        steps.push({
          array: [...arr],
          compareIndices: null,
          swapped: false,
          sortedIndices: Array.from({ length: n }).map((_, idx) => idx),
          description: 'No swaps occurred during this pass. Array is fully sorted!',
          codeLine: 9,
        });
        break;
      }
    }

    if (sortedIndices.length < n) {
      steps.push({
        array: [...arr],
        compareIndices: null,
        swapped: false,
        sortedIndices: Array.from({ length: n }).map((_, idx) => idx),
        description: 'Sorting complete. All passes finished successfully.',
        codeLine: 12,
      });
    }

    setBubbleSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // Re-run initialization when algorithm or input inputs change
  useEffect(() => {
    if (algo === 'linked_list_reverse') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initLLSimulation(inputValue);
    } else if (algo === 'binary_search') {
      initBSSimulation(inputValue, targetValue);
    } else if (algo === 'bubble_sort') {
      initBubbleSimulation(inputValue);
    }
  }, [algo, inputValue, targetValue]);

  // Handle auto-playback play/pause
  useEffect(() => {
    if (isPlaying) {
      const maxSteps = 
        algo === 'linked_list_reverse' ? llSteps.length :
        algo === 'binary_search' ? bsSteps.length :
        bubbleSteps.length;

      timerRef.current = setInterval(() => {
        setStepIdx(prev => {
          if (prev < maxSteps - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            return prev;
          }
        });
      }, playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, algo, llSteps, bsSteps, bubbleSteps, playbackSpeed]);

  const maxSteps = 
    algo === 'linked_list_reverse' ? llSteps.length :
    algo === 'binary_search' ? bsSteps.length :
    bubbleSteps.length;

  const currentStep = 
    algo === 'linked_list_reverse' ? llSteps[stepIdx] :
    algo === 'binary_search' ? bsSteps[stepIdx] :
    bubbleSteps[stepIdx];

  const handleStepForward = () => {
    setIsPlaying(false);
    if (stepIdx < maxSteps - 1) setStepIdx(stepIdx + 1);
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIdx(0);
  };

  return (
    <div className="flex flex-col gap-5 text-xs select-none">
      
      {/* Configuration Header */}
      <div className="flex flex-wrap items-center gap-4 bg-dark-panel-active p-4 rounded-2xl border border-dark-border justify-between shadow-sm relative z-30">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-dark-text/60">Select Algorithm:</span>
          
          {/* Custom Select Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between gap-3 bg-dark-input border border-dark-border text-dark-text px-3.5 py-2 rounded-xl focus:outline-none hover:bg-dark-hover transition-colors font-medium text-[11px] cursor-pointer min-w-[180px]"
            >
              <span>
                {algo === 'linked_list_reverse' && 'Linked List Reversal'}
                {algo === 'binary_search' && 'Binary Search'}
                {algo === 'bubble_sort' && 'Bubble Sort'}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-dark-text/40 transition-transform duration-200", isDropdownOpen && "transform rotate-180")} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-[190px] bg-dark-panel border border-dark-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-in">
                {[
                  { value: 'linked_list_reverse', label: 'Linked List Reversal' },
                  { value: 'binary_search', label: 'Binary Search' },
                  { value: 'bubble_sort', label: 'Bubble Sort' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const selected = opt.value as AlgorithmType;
                      setAlgo(selected);
                      if (selected === 'linked_list_reverse') setInputValue('1,2,3,4,5');
                      else if (selected === 'binary_search') {
                        setInputValue('1,3,7,12,19,25,32,45,60');
                        setTargetValue('25');
                      } else setInputValue('8,4,1,9,5');
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 text-[11px] font-medium flex items-center justify-between hover:bg-dark-hover transition-colors cursor-pointer",
                      algo === opt.value ? "text-[#4F7DFF] bg-[#4F7DFF]/5" : "text-dark-text/80"
                    )}
                  >
                    <span>{opt.label}</span>
                    {algo === opt.value && <Check className="w-3.5 h-3.5 text-[#4F7DFF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-grow sm:flex-grow-0 min-w-[220px]">
          <span className="font-semibold text-dark-text/60">Input array:</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="bg-dark-input border border-dark-border text-dark-text px-3.5 py-2 rounded-xl flex-1 focus:outline-none focus:border-[#4F7DFF]/50 hover:bg-dark-hover/50 transition-colors font-mono text-[11px]"
            placeholder="1,2,3,4"
          />
        </div>

        {algo === 'binary_search' && (
          <div className="flex items-center gap-3 w-32">
            <span className="font-semibold text-dark-text/60">Target:</span>
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="bg-dark-input border border-dark-border text-dark-text px-3.5 py-2 rounded-xl w-full focus:outline-none focus:border-[#4F7DFF]/50 hover:bg-dark-hover/50 transition-colors font-mono text-[11px]"
              placeholder="3"
            />
          </div>
        )}
      </div>

      {/* ── Fullscreen Overlay (portal to body) ── */}
      {isMaximized && createPortal(
        <div className="fixed inset-0 z-[9999] bg-dark-bg flex flex-col">
          {/* Fullscreen Header Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-dark-panel-active border-b border-dark-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 flex items-center justify-center">
                <Maximize2 className="w-3.5 h-3.5 text-[#4F7DFF]" />
              </div>
              <span className="text-xs font-bold text-dark-text tracking-tight">Algorithmic Visualizer</span>
              <span className="text-[10px] text-dark-text/40 font-mono ml-2">— Fullscreen Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-dark-text/30 select-none">Press <kbd className="px-1.5 py-0.5 bg-dark-input border border-dark-border rounded text-[9px] font-mono text-dark-text/50">Esc</kbd> to exit</span>
              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input border border-dark-border text-dark-text/60 hover:text-dark-text hover:bg-dark-hover transition-all cursor-pointer text-[11px] font-medium"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-8 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,125,255,0.03),transparent_65%)] pointer-events-none" />
            {/* Linked List Canvas */}
            {algo === 'linked_list_reverse' && currentStep && (
              <div className="flex items-center gap-2 overflow-x-auto py-6">
                {inputValue.split(',').map((v, idx) => {
                  const step = currentStep as LLStep;
                  const isCurr = step.pointers.currIdx === idx;
                  const isPrev = step.pointers.prevIdx === idx;
                  const isNext = step.pointers.nextIdx === idx;
                  const isReversed = step.reversedLinks.includes(idx);
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && !isReversed && (
                        <span className="text-dark-text/20 font-mono text-2xl mx-3 select-none">→</span>
                      )}
                      {idx > 0 && isReversed && (
                        <span className="text-[#4F7DFF] font-mono text-2xl mx-3 select-none">←</span>
                      )}
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-5 flex items-center justify-center text-[10px] font-black tracking-tight uppercase select-none">
                          {isCurr && <span className="bg-[#4F7DFF]/15 border border-[#4F7DFF]/30 text-[#4F7DFF] px-2 py-0.5 rounded-md">curr</span>}
                          {isPrev && <span className="bg-dark-hover border border-dark-border text-dark-text/60 px-2 py-0.5 rounded-md">prev</span>}
                          {isNext && <span className="bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 text-[#4F7DFF] px-2 py-0.5 rounded-md">next</span>}
                        </div>
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center border-2 font-bold font-mono transition-all duration-300 text-lg shadow-lg",
                          isCurr ? "bg-[#4F7DFF] text-white border-transparent scale-105 shadow-[0_0_24px_rgba(79,125,255,0.4)]" :
                          isPrev ? "bg-dark-input text-dark-text border-dark-border" :
                          isNext ? "bg-dark-hover text-dark-text/80 border-dark-border" :
                          "bg-dark-panel text-dark-text/40 border-dark-border"
                        )}>
                          {v.trim()}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Binary Search Canvas */}
            {algo === 'binary_search' && currentStep && (
              <div className="flex flex-wrap items-end justify-center gap-4">
                {bsArray.map((val, idx) => {
                  const step = currentStep as BSStepItem;
                  const isLow = step.low === idx;
                  const isHigh = step.high === idx;
                  const isMid = step.mid === idx;
                  const isFound = step.found && isMid;
                  const inRange = idx >= step.low && idx <= step.high;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border-2 font-bold font-mono transition-all duration-300 text-base shadow-md",
                        isFound ? "bg-[#10b981] text-white border-transparent scale-110 shadow-[0_0_24px_rgba(16,185,129,0.35)]" :
                        isMid ? "bg-[#4F7DFF] text-white border-transparent scale-110 shadow-[0_0_24px_rgba(79,125,255,0.35)]" :
                        isLow ? "bg-dark-hover border-2 border-[#4F7DFF]/50 text-dark-text" :
                        isHigh ? "bg-dark-hover border-2 border-rose-500/50 text-dark-text" :
                        inRange ? "bg-dark-panel text-dark-text border-dark-border" :
                        "bg-dark-input text-dark-text/20 border-dark-border/40 opacity-30"
                      )}>
                        {val}
                      </div>
                      <div className="h-5 flex items-center gap-0.5 text-[10px] font-black font-mono uppercase select-none">
                        {isLow && <span className="text-[#4F7DFF] bg-[#4F7DFF]/10 px-1.5 rounded">L</span>}
                        {isMid && <span className="text-amber-500 bg-amber-500/10 px-1.5 rounded">M</span>}
                        {isHigh && <span className="text-rose-500 bg-rose-500/10 px-1.5 rounded">H</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bubble Sort Canvas */}
            {algo === 'bubble_sort' && currentStep && (
              <div className="flex items-end justify-center gap-5 h-64 w-full px-8">
                {(currentStep as BubbleStep).array.map((val, idx) => {
                  const step = currentStep as BubbleStep;
                  const isComparing = step.compareIndices?.includes(idx);
                  const isSorted = step.sortedIndices?.includes(idx);
                  const values = inputValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                  const maxVal = Math.max(...values, 1);
                  const heightVal = Math.max(12, Math.min(100, (val / maxVal) * 100));
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 max-w-[60px]">
                      <div
                        style={{ height: `${heightVal}%` }}
                        className={cn(
                          "w-full rounded-t-xl border-2 transition-all duration-300 flex items-start justify-center pt-2.5 font-bold font-mono text-xs",
                          step.swapped && isComparing ? "bg-[#10b981] text-white border-transparent shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-pulse" :
                          isComparing ? "bg-[#4F7DFF] text-white border-transparent shadow-[0_0_16px_rgba(79,125,255,0.3)]" :
                          isSorted ? "bg-dark-input text-dark-text/30 border-dark-border/40" :
                          "bg-dark-hover text-dark-text border-dark-border"
                        )}
                      >
                        {val}
                      </div>
                      <span className="text-[10px] font-mono text-dark-text/30 select-none">i:{idx}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen Step Description Bar */}
          {currentStep && (
            <div className="shrink-0 mx-6 mb-3 p-3.5 bg-dark-panel border border-dark-border rounded-xl text-[11px] text-dark-text/80 leading-relaxed font-sans flex gap-2 items-start">
              <span className="text-[#4F7DFF] font-bold select-none mt-0.5">▶</span>
              <span>{currentStep.description}</span>
            </div>
          )}

          {/* Fullscreen Playback Controls */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 bg-dark-panel-active border-t border-dark-border px-6 py-3.5 select-none">
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all cursor-pointer flex items-center justify-center" title="Reset">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleStepBackward} disabled={stepIdx === 0} className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center" title="Previous Step">
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-xl bg-[#4F7DFF] hover:bg-[#4F7DFF]/90 text-white shadow-md shadow-[#4F7DFF]/20 transition-all cursor-pointer flex items-center justify-center active:scale-[0.96]" title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={handleStepForward} disabled={stepIdx === maxSteps - 1} className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center" title="Next Step">
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-dark-text/50 font-mono">
              <Sliders className="w-3.5 h-3.5 text-dark-text/40" />
              <span className="select-none">Speed:</span>
              <input type="range" min="400" max="3000" step="200" value={3400 - playbackSpeed} onChange={(e) => setPlaybackSpeed(3400 - parseInt(e.target.value))} className="w-28 accent-[#4F7DFF] bg-dark-input h-1.5 rounded-lg cursor-pointer" />
              <span className="select-none w-14 text-right">{Math.round(playbackSpeed / 100) / 10}s/step</span>
            </div>

            <div className="bg-dark-input border border-dark-border px-3.5 py-1.5 rounded-xl font-mono text-[10px] text-dark-text/50">
              Step <span className="text-[#4F7DFF] font-bold">{stepIdx + 1}</span> of <span className="text-dark-text/80 font-bold">{maxSteps}</span>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Primary Visualizer Workspace Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch min-h-[260px]">
        {/* Left pane: Visual display (bars, links, etc.) */}
        <div className="md:col-span-8 bg-dark-panel border border-dark-border rounded-2xl p-6 flex flex-col justify-center items-center overflow-x-auto relative shadow-sm min-h-[220px]">
          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsMaximized(true)}
            className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-dark-input border border-dark-border text-dark-text/50 hover:text-dark-text hover:bg-dark-hover transition-all cursor-pointer z-20 flex items-center justify-center"
            title="Expand to Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,125,255,0.015),transparent_70%)] pointer-events-none" />
          
          {/* Linked List Canvas */}
          {algo === 'linked_list_reverse' && currentStep && (
            <div className="flex items-center gap-1 overflow-x-auto py-6">
              {inputValue.split(',').map((v, idx) => {
                const step = currentStep as LLStep;
                const isCurr = step.pointers.currIdx === idx;
                const isPrev = step.pointers.prevIdx === idx;
                const isNext = step.pointers.nextIdx === idx;
                const isReversed = step.reversedLinks.includes(idx);
                
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && !isReversed && (
                      <span className="text-dark-text/20 font-mono text-base mx-1.5 select-none">→</span>
                    )}
                    {idx > 0 && isReversed && (
                      <span className="text-[#4F7DFF] font-mono text-base mx-1.5 select-none">←</span>
                    )}

                    <div className="flex flex-col items-center gap-2">
                      {/* Pointer labels */}
                      <div className="h-4 flex items-center justify-center text-[9px] font-black tracking-tight uppercase select-none">
                        {isCurr && <span className="bg-[#4F7DFF]/15 border border-[#4F7DFF]/30 text-[#4F7DFF] px-1.5 py-0.5 rounded-md">curr</span>}
                        {isPrev && <span className="bg-dark-hover border border-dark-border text-dark-text/60 px-1.5 py-0.5 rounded-md">prev</span>}
                        {isNext && <span className="bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 text-[#4F7DFF] px-1.5 py-0.5 rounded-md">next</span>}
                      </div>

                      {/* Node Circle */}
                      <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center border font-bold font-mono transition-all duration-300 shadow-sm",
                        isCurr ? "bg-[#4F7DFF] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(79,125,255,0.35)]" :
                        isPrev ? "bg-dark-input text-dark-text border-dark-border" :
                        isNext ? "bg-dark-hover text-dark-text/80 border-dark-border" :
                        "bg-dark-panel text-dark-text/40 border-dark-border"
                      )}>
                        {v.trim()}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Binary Search Canvas */}
          {algo === 'binary_search' && currentStep && (
            <div className="flex flex-col items-center gap-4 py-6 w-full">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {bsArray.map((val, idx) => {
                  const step = currentStep as BSStepItem;
                  const isLow = step.low === idx;
                  const isHigh = step.high === idx;
                  const isMid = step.mid === idx;
                  const isFound = step.found && isMid;
                  const inRange = idx >= step.low && idx <= step.high;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      {/* Node Box */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border font-bold font-mono transition-all duration-300 text-xs shadow-sm",
                        isFound ? "bg-[#10b981] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(16,185,129,0.3)]" :
                        isMid ? "bg-[#4F7DFF] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(79,125,255,0.3)]" :
                        isLow ? "bg-dark-hover border-2 border-dark-border text-dark-text" :
                        isHigh ? "bg-dark-hover border-2 border-dark-border text-dark-text" :
                        inRange ? "bg-dark-panel text-dark-text border-dark-border" :
                        "bg-dark-input text-dark-text/20 border-dark-border/40 opacity-30"
                      )}>
                        {val}
                      </div>
                      
                      {/* Pointer Indicator Labels */}
                      <div className="h-4 flex items-center gap-0.5 text-[8.5px] font-black font-mono tracking-wider select-none uppercase">
                        {isLow && <span className="text-[#4F7DFF] bg-[#4F7DFF]/10 px-1 rounded-sm">L</span>}
                        {isMid && <span className="text-amber-500 bg-amber-500/10 px-1 rounded-sm">M</span>}
                        {isHigh && <span className="text-rose-500 bg-rose-500/10 px-1 rounded-sm">H</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bubble Sort Canvas */}
          {algo === 'bubble_sort' && currentStep && (
            <div className="flex items-end justify-center gap-4 h-40 w-full py-4 select-none">
              {(currentStep as BubbleStep).array.map((val, idx) => {
                const step = currentStep as BubbleStep;
                const isComparing = step.compareIndices?.includes(idx);
                const isSorted = step.sortedIndices?.includes(idx);
                
                const values = inputValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                const maxVal = Math.max(...values, 1);
                const heightVal = Math.max(12, Math.min(100, (val / maxVal) * 100));
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 w-10">
                    <div 
                      style={{ height: `${heightVal}%` }} 
                      className={cn(
                        "w-full rounded-t-lg border transition-all duration-300 relative flex items-start justify-center pt-2 font-bold font-mono text-[10px]",
                        step.swapped && isComparing ? "bg-[#10b981] text-white border-transparent shadow-[0_0_10px_rgba(16,185,129,0.25)] animate-pulse" :
                        isComparing ? "bg-[#4F7DFF] text-white border-transparent shadow-[0_0_10px_rgba(79,125,255,0.25)]" :
                        isSorted ? "bg-dark-input text-dark-text/30 border-dark-border/40" :
                        "bg-dark-hover text-dark-text border-dark-border"
                      )}
                    >
                      {val}
                    </div>
                    <span className="text-[9px] font-mono text-dark-text/30 select-none">i:{idx}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Code & Trace Log */}
        {!isMaximized && (
          <div className="md:col-span-4 bg-dark-panel border border-dark-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 border-b border-dark-border bg-dark-panel-active flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#4F7DFF]" />
              <span className="text-[9px] font-black uppercase text-dark-text/60 tracking-wider">Line Trace & Variables</span>
            </div>

            {/* Trace instructions */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Description */}
              <div className="p-3.5 bg-dark-bg/40 rounded-xl border border-dark-border text-[11px] text-dark-text/80 leading-relaxed font-sans flex gap-2">
                <span className="text-[#4F7DFF] font-bold select-none">▶</span>
                <span>{currentStep ? currentStep.description : 'Click Play/Forward to begin.'}</span>
              </div>

              {/* Simulated Stack Frame */}
              {currentStep && (
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-dark-text/40 font-sans block select-none">Variables State</span>
                  <div className="bg-dark-bg/60 border border-dark-border p-3.5 rounded-xl font-mono text-[10px] space-y-2.5">
                    {algo === 'linked_list_reverse' && (() => {
                      const step = currentStep as LLStep;
                      return (
                        <>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">prev:</span><span className="text-dark-text font-bold">{step.prev !== null ? step.prev : 'null'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">curr:</span><span className="text-[#4F7DFF] font-bold">{step.curr !== null ? step.curr : 'null'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">nextTemp:</span><span className="text-dark-text/80 font-bold">{step.nextTemp !== null ? step.nextTemp : 'null'}</span></div>
                        </>
                      );
                    })()}

                    {algo === 'binary_search' && (() => {
                      const step = currentStep as BSStepItem;
                      return (
                        <>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">lowIdx:</span><span className="text-dark-text font-bold">{step.low}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">midIdx:</span><span className="text-[#4F7DFF] font-bold">{step.mid !== -1 ? step.mid : 'n/a'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">highIdx:</span><span className="text-dark-text font-bold">{step.high}</span></div>
                          <div className="flex justify-between items-center border-t border-dark-border/40 pt-2 mt-2"><span className="text-dark-text/50">found:</span><span className={cn("font-bold", step.found ? "text-[#10b981]" : "text-rose-500")}>{String(step.found)}</span></div>
                        </>
                      );
                    })()}

                    {algo === 'bubble_sort' && (() => {
                      const step = currentStep as BubbleStep;
                      return (
                        <>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">comparing:</span><span className="text-[#4F7DFF] font-bold">{step.compareIndices ? JSON.stringify(step.compareIndices) : 'none'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">swapped:</span><span className="text-dark-text font-bold">{String(step.swapped)}</span></div>
                          <div className="flex justify-between items-center"><span className="text-dark-text/50">sorted:</span><span className="text-dark-text/80 font-bold">{JSON.stringify(step.sortedIndices)}</span></div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dark-panel p-4 rounded-2xl border border-dark-border shadow-sm select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all cursor-pointer flex items-center justify-center"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleStepBackward}
            disabled={stepIdx === 0}
            className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            title="Previous Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-xl bg-[#4F7DFF] hover:bg-[#4F7DFF]/90 text-white border-transparent shadow-md shadow-[#4F7DFF]/15 transition-all cursor-pointer flex items-center justify-center active:scale-[0.96]"
            title={isPlaying ? "Pause Playback" : "Auto Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={handleStepForward}
            disabled={stepIdx === maxSteps - 1}
            className="w-9 h-9 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-hover text-dark-text/60 hover:text-dark-text transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Playback speed selector */}
        <div className="flex items-center gap-3 text-[10px] text-dark-text/50 font-mono">
          <Sliders className="w-3.5 h-3.5 text-dark-text/40" />
          <span className="select-none">Speed:</span>
          <input
            type="range"
            min="400"
            max="3000"
            step="200"
            value={3400 - playbackSpeed} // Reverse slider direction
            onChange={(e) => setPlaybackSpeed(3400 - parseInt(e.target.value))}
            className="w-24 accent-[#4F7DFF] bg-dark-input h-1.5 rounded-lg cursor-pointer transition-colors"
          />
          <span className="select-none w-14 text-right">{Math.round(playbackSpeed / 100) / 10}s/step</span>
        </div>

        {/* Step Counter */}
        <div className="bg-dark-input border border-dark-border px-3.5 py-1.5 rounded-xl font-mono text-[10px] text-dark-text/50">
          Step <span className="text-[#4F7DFF] font-bold">{stepIdx + 1}</span> of <span className="text-dark-text/80 font-bold">{maxSteps}</span>
        </div>
      </div>
    </div>
  );
};
