import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Sliders, Info, ChevronDown, Check, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';

type AlgorithmType =
  | 'linked_list_reverse'
  | 'binary_search'
  | 'bubble_sort'
  | 'merge_sort'
  | 'quick_sort'
  | 'stack_ops'
  | 'queue_ops'
  | 'fibonacci';

// ─── Existing Interfaces ───────────────────────────────────────────────────────

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

// ─── New Interfaces ────────────────────────────────────────────────────────────

interface MergeSortStep {
  array: number[];
  leftArr: number[];
  rightArr: number[];
  mergedArr: number[];
  phase: 'split' | 'merge';
  splitDepth: number;
  mergeIndices: number[];
  sortedIndices: number[];
  description: string;
  codeLine: number;
}

interface QuickSortStep {
  array: number[];
  pivotIdx: number;
  leftBound: number;
  rightBound: number;
  compareIdx: number | null;
  sortedIndices: number[];
  description: string;
  codeLine: number;
}

interface StackStep {
  stack: number[];
  operation: 'push' | 'pop' | 'peek' | 'idle';
  operand: number | null;
  isHighlighted: boolean;
  description: string;
  codeLine: number;
}

interface QueueStep {
  queue: number[];
  operation: 'enqueue' | 'dequeue' | 'peek' | 'idle';
  operand: number | null;
  frontIdx: number;
  rearIdx: number;
  description: string;
  codeLine: number;
}

interface FibStep {
  n: number;
  memo: Record<number, number>;
  currentCall: number;
  callStack: number[];
  phase: 'computing' | 'cached' | 'done';
  description: string;
  codeLine: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AlgorithmVisualizer: React.FC = () => {
  const [algo, setAlgo] = useState<AlgorithmType>('linked_list_reverse');
  const [inputValue, setInputValue] = useState('1,2,3,4,5');
  const [targetValue, setTargetValue] = useState('3'); // For Binary Search
  const [fibN, setFibN] = useState('8'); // For Fibonacci
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
  const [mergeSortSteps, setMergeSortSteps] = useState<MergeSortStep[]>([]);
  const [quickSortSteps, setQuickSortSteps] = useState<QuickSortStep[]>([]);
  const [stackSteps, setStackSteps] = useState<StackStep[]>([]);
  const [queueSteps, setQueueSteps] = useState<QueueStep[]>([]);
  const [fibSteps, setFibSteps] = useState<FibStep[]>([]);

  // Playback timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initialize Linked List Reversal simulation ────────────────────────────
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

  // ─── Initialize Binary Search simulation ──────────────────────────────────
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

  // ─── Initialize Bubble Sort simulation ────────────────────────────────────
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

  // ─── Initialize Merge Sort simulation ─────────────────────────────────────
  const initMergeSortSimulation = (valuesStr: string) => {
    const list = valuesStr.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v));

    if (list.length === 0) return;

    const steps: MergeSortStep[] = [];
    const sortedIdxSet: number[] = [];
    const workArr = [...list];

    steps.push({
      array: [...workArr],
      leftArr: [],
      rightArr: [],
      mergedArr: [],
      phase: 'split',
      splitDepth: 0,
      mergeIndices: [],
      sortedIndices: [],
      description: 'Begin Merge Sort. The array will be recursively split into halves.',
      codeLine: 1,
    });

    function mergeSortHelper(arr: number[], startIdx: number, depth: number): number[] {
      if (arr.length <= 1) return arr;
      const mid = Math.floor(arr.length / 2);
      const left = arr.slice(0, mid);
      const right = arr.slice(mid);

      steps.push({
        array: [...workArr],
        leftArr: left,
        rightArr: right,
        mergedArr: [],
        phase: 'split',
        splitDepth: depth,
        mergeIndices: Array.from({ length: arr.length }, (_, i) => startIdx + i),
        sortedIndices: [...sortedIdxSet],
        description: `Split at depth ${depth}: [${left.join(', ')}] | [${right.join(', ')}]`,
        codeLine: 2,
      });

      const sortedLeft = mergeSortHelper(left, startIdx, depth + 1);
      const sortedRight = mergeSortHelper(right, startIdx + mid, depth + 1);

      // Merge phase
      const merged: number[] = [];
      let li = 0, ri = 0;
      while (li < sortedLeft.length && ri < sortedRight.length) {
        if (sortedLeft[li] <= sortedRight[ri]) {
          merged.push(sortedLeft[li++]);
        } else {
          merged.push(sortedRight[ri++]);
        }
        steps.push({
          array: [...workArr],
          leftArr: sortedLeft,
          rightArr: sortedRight,
          mergedArr: [...merged],
          phase: 'merge',
          splitDepth: depth,
          mergeIndices: Array.from({ length: arr.length }, (_, i) => startIdx + i),
          sortedIndices: [...sortedIdxSet],
          description: `Merging at depth ${depth}: combined so far -> [${merged.join(', ')}]`,
          codeLine: 7,
        });
      }
      while (li < sortedLeft.length) { merged.push(sortedLeft[li++]); }
      while (ri < sortedRight.length) { merged.push(sortedRight[ri++]); }

      // Mark indices as sorted
      merged.forEach((_, i) => {
        const globalIdx = startIdx + i;
        if (!sortedIdxSet.includes(globalIdx)) sortedIdxSet.push(globalIdx);
      });

      // Update global array snapshot
      merged.forEach((val, i) => { workArr[startIdx + i] = val; });

      steps.push({
        array: [...workArr],
        leftArr: sortedLeft,
        rightArr: sortedRight,
        mergedArr: [...merged],
        phase: 'merge',
        splitDepth: depth,
        mergeIndices: Array.from({ length: arr.length }, (_, i) => startIdx + i),
        sortedIndices: [...sortedIdxSet],
        description: `Merge complete at depth ${depth}: [${merged.join(', ')}] placed back.`,
        codeLine: 10,
      });

      return merged;
    }

    mergeSortHelper([...list], 0, 0);

    steps.push({
      array: [...workArr],
      leftArr: [],
      rightArr: [],
      mergedArr: [...workArr],
      phase: 'merge',
      splitDepth: 0,
      mergeIndices: [],
      sortedIndices: Array.from({ length: workArr.length }, (_, i) => i),
      description: 'Merge Sort complete! The entire array is now sorted.',
      codeLine: 12,
    });

    setMergeSortSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // ─── Initialize Quick Sort simulation ─────────────────────────────────────
  const initQuickSortSimulation = (valuesStr: string) => {
    const list = valuesStr.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v));

    if (list.length === 0) return;

    const arr = [...list];
    const steps: QuickSortStep[] = [];
    const sortedSet = new Set<number>();

    steps.push({
      array: [...arr],
      pivotIdx: arr.length - 1,
      leftBound: 0,
      rightBound: arr.length - 1,
      compareIdx: null,
      sortedIndices: [],
      description: 'Begin Quick Sort. The last element of each partition is chosen as pivot.',
      codeLine: 1,
    });

    function partition(lo: number, hi: number): number {
      const pivot = arr[hi];
      let i = lo - 1;

      steps.push({
        array: [...arr],
        pivotIdx: hi,
        leftBound: lo,
        rightBound: hi,
        compareIdx: null,
        sortedIndices: Array.from(sortedSet),
        description: `Partition [${lo}..${hi}]. Pivot = ${pivot} at index ${hi}.`,
        codeLine: 2,
      });

      for (let j = lo; j < hi; j++) {
        steps.push({
          array: [...arr],
          pivotIdx: hi,
          leftBound: lo,
          rightBound: hi,
          compareIdx: j,
          sortedIndices: Array.from(sortedSet),
          description: `Compare arr[${j}]=${arr[j]} with pivot=${pivot}. ${arr[j] <= pivot ? 'Move left boundary.' : 'No swap.'}`,
          codeLine: 4,
        });

        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          if (i !== j) {
            steps.push({
              array: [...arr],
              pivotIdx: hi,
              leftBound: lo,
              rightBound: hi,
              compareIdx: j,
              sortedIndices: Array.from(sortedSet),
              description: `Swap arr[${i}] and arr[${j}].`,
              codeLine: 6,
            });
          }
        }
      }

      [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
      const pivotFinalIdx = i + 1;
      sortedSet.add(pivotFinalIdx);

      steps.push({
        array: [...arr],
        pivotIdx: pivotFinalIdx,
        leftBound: lo,
        rightBound: hi,
        compareIdx: null,
        sortedIndices: Array.from(sortedSet),
        description: `Place pivot ${pivot} at its final position index ${pivotFinalIdx}.`,
        codeLine: 8,
      });

      return pivotFinalIdx;
    }

    function quickSort(lo: number, hi: number) {
      if (lo < hi) {
        const p = partition(lo, hi);
        quickSort(lo, p - 1);
        quickSort(p + 1, hi);
      } else if (lo === hi) {
        sortedSet.add(lo);
      }
    }

    quickSort(0, arr.length - 1);

    steps.push({
      array: [...arr],
      pivotIdx: -1,
      leftBound: 0,
      rightBound: arr.length - 1,
      compareIdx: null,
      sortedIndices: Array.from({ length: arr.length }, (_, i) => i),
      description: 'Quick Sort complete! All elements are in their sorted positions.',
      codeLine: 12,
    });

    setQuickSortSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // ─── Initialize Stack Operations simulation ────────────────────────────────
  const initStackSimulation = () => {
    const steps: StackStep[] = [];
    let stack: number[] = [];

    const ops: Array<{ op: 'push' | 'pop' | 'peek'; val?: number }> = [
      { op: 'push', val: 5 },
      { op: 'push', val: 3 },
      { op: 'push', val: 8 },
      { op: 'peek' },
      { op: 'pop' },
      { op: 'push', val: 2 },
      { op: 'pop' },
      { op: 'pop' },
    ];

    steps.push({
      stack: [],
      operation: 'idle',
      operand: null,
      isHighlighted: false,
      description: 'Stack initialized. Empty. Ready to accept operations.',
      codeLine: 1,
    });

    for (const { op, val } of ops) {
      if (op === 'push' && val !== undefined) {
        stack = [...stack, val];
        steps.push({
          stack: [...stack],
          operation: 'push',
          operand: val,
          isHighlighted: true,
          description: `PUSH ${val} onto the stack. Top is now ${val}. Stack size: ${stack.length}.`,
          codeLine: 3,
        });
      } else if (op === 'pop') {
        const popped = stack[stack.length - 1];
        stack = stack.slice(0, -1);
        steps.push({
          stack: [...stack],
          operation: 'pop',
          operand: popped,
          isHighlighted: false,
          description: `POP -> removed ${popped} from top. New top: ${stack.length > 0 ? stack[stack.length - 1] : 'empty'}. Stack size: ${stack.length}.`,
          codeLine: 6,
        });
      } else if (op === 'peek') {
        const top = stack[stack.length - 1];
        steps.push({
          stack: [...stack],
          operation: 'peek',
          operand: top,
          isHighlighted: true,
          description: `PEEK -> top element is ${top}. Stack unchanged.`,
          codeLine: 9,
        });
      }
    }

    steps.push({
      stack: [...stack],
      operation: 'idle',
      operand: null,
      isHighlighted: false,
      description: `All operations complete. Final stack: [${stack.join(', ')}].`,
      codeLine: 12,
    });

    setStackSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // ─── Initialize Queue Operations simulation ────────────────────────────────
  const initQueueSimulation = () => {
    const steps: QueueStep[] = [];
    let queue: number[] = [];

    steps.push({
      queue: [],
      operation: 'idle',
      operand: null,
      frontIdx: 0,
      rearIdx: -1,
      description: 'Queue initialized. Empty. Operations: enqueue 1,2,3,4,5 then dequeue x3, enqueue 6.',
      codeLine: 1,
    });

    const enqueueVals = [1, 2, 3, 4, 5];
    for (const val of enqueueVals) {
      queue = [...queue, val];
      steps.push({
        queue: [...queue],
        operation: 'enqueue',
        operand: val,
        frontIdx: 0,
        rearIdx: queue.length - 1,
        description: `ENQUEUE ${val}. Rear pointer moves right. Queue size: ${queue.length}.`,
        codeLine: 3,
      });
    }

    for (let d = 0; d < 3; d++) {
      const removed = queue[0];
      queue = queue.slice(1);
      steps.push({
        queue: [...queue],
        operation: 'dequeue',
        operand: removed,
        frontIdx: 0,
        rearIdx: queue.length - 1,
        description: `DEQUEUE -> removed ${removed} from front. Queue size: ${queue.length}. Front is now ${queue[0] ?? 'empty'}.`,
        codeLine: 6,
      });
    }

    queue = [...queue, 6];
    steps.push({
      queue: [...queue],
      operation: 'enqueue',
      operand: 6,
      frontIdx: 0,
      rearIdx: queue.length - 1,
      description: `ENQUEUE 6. Rear pointer advances. Queue size: ${queue.length}.`,
      codeLine: 3,
    });

    steps.push({
      queue: [...queue],
      operation: 'idle',
      operand: null,
      frontIdx: 0,
      rearIdx: queue.length - 1,
      description: `All operations complete. Final queue: [${queue.join(', ')}].`,
      codeLine: 12,
    });

    setQueueSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // ─── Initialize Fibonacci DP simulation ───────────────────────────────────
  const initFibSimulation = (nStr: string) => {
    const n = parseInt(nStr.trim());
    if (isNaN(n) || n < 0 || n > 20) return;

    const steps: FibStep[] = [];
    const memo: Record<number, number> = {};

    steps.push({
      n,
      memo: {},
      currentCall: n,
      callStack: [n],
      phase: 'computing',
      description: `Start fib(${n}). Will build memoization table from fib(0) up to fib(${n}).`,
      codeLine: 1,
    });

    function fib(k: number, callStack: number[]): number {
      if (k <= 1) {
        memo[k] = k;
        steps.push({
          n,
          memo: { ...memo },
          currentCall: k,
          callStack: [...callStack],
          phase: 'cached',
          description: `Base case: fib(${k}) = ${k}. Stored in memo table.`,
          codeLine: 2,
        });
        return k;
      }

      steps.push({
        n,
        memo: { ...memo },
        currentCall: k,
        callStack: [...callStack],
        phase: 'computing',
        description: `Computing fib(${k}). Need fib(${k - 1}) + fib(${k - 2}).`,
        codeLine: 4,
      });

      const left = fib(k - 1, [...callStack, k - 1]);
      const right = fib(k - 2, [...callStack, k - 2]);

      memo[k] = left + right;
      steps.push({
        n,
        memo: { ...memo },
        currentCall: k,
        callStack: [...callStack],
        phase: 'cached',
        description: `fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${left} + ${right} = ${memo[k]}. Cached!`,
        codeLine: 6,
      });

      return memo[k];
    }

    fib(n, [n]);

    steps.push({
      n,
      memo: { ...memo },
      currentCall: n,
      callStack: [],
      phase: 'done',
      description: `Fibonacci DP complete! fib(${n}) = ${memo[n]}. Memo table fully populated.`,
      codeLine: 9,
    });

    setFibSteps(steps);
    setStepIdx(0);
    setIsPlaying(false);
  };

  // ─── Re-run initialization when algorithm or inputs change ────────────────
  useEffect(() => {
    if (algo === 'linked_list_reverse') {
      initLLSimulation(inputValue);
    } else if (algo === 'binary_search') {
      initBSSimulation(inputValue, targetValue);
    } else if (algo === 'bubble_sort') {
      initBubbleSimulation(inputValue);
    } else if (algo === 'merge_sort') {
      initMergeSortSimulation(inputValue);
    } else if (algo === 'quick_sort') {
      initQuickSortSimulation(inputValue);
    } else if (algo === 'stack_ops') {
      initStackSimulation();
    } else if (algo === 'queue_ops') {
      initQueueSimulation();
    } else if (algo === 'fibonacci') {
      initFibSimulation(fibN);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algo, inputValue, targetValue, fibN]);

  // ─── Computed max steps ────────────────────────────────────────────────────
  const maxSteps =
    algo === 'linked_list_reverse' ? llSteps.length :
    algo === 'binary_search' ? bsSteps.length :
    algo === 'bubble_sort' ? bubbleSteps.length :
    algo === 'merge_sort' ? mergeSortSteps.length :
    algo === 'quick_sort' ? quickSortSteps.length :
    algo === 'stack_ops' ? stackSteps.length :
    algo === 'queue_ops' ? queueSteps.length :
    fibSteps.length;

  // ─── Handle auto-playback play/pause ──────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStepIdx(prev => {
          if (prev < maxSteps - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            clearInterval(timerRef.current!);
            return prev;
          }
        });
      }, playbackSpeed);
    } else {
      clearInterval(timerRef.current!);
    }

    return () => clearInterval(timerRef.current!);
  }, [isPlaying, algo, llSteps, bsSteps, bubbleSteps, mergeSortSteps, quickSortSteps, stackSteps, queueSteps, fibSteps, playbackSpeed, maxSteps]);

  const currentStep =
    algo === 'linked_list_reverse' ? llSteps[stepIdx] :
    algo === 'binary_search' ? bsSteps[stepIdx] :
    algo === 'bubble_sort' ? bubbleSteps[stepIdx] :
    algo === 'merge_sort' ? mergeSortSteps[stepIdx] :
    algo === 'quick_sort' ? quickSortSteps[stepIdx] :
    algo === 'stack_ops' ? stackSteps[stepIdx] :
    algo === 'queue_ops' ? queueSteps[stepIdx] :
    fibSteps[stepIdx];

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

  // ─── Algorithm Options ─────────────────────────────────────────────────────
  const algoOptions = [
    { value: 'linked_list_reverse', label: 'Linked List Reversal' },
    { value: 'binary_search', label: 'Binary Search' },
    { value: 'bubble_sort', label: 'Bubble Sort' },
    { value: 'merge_sort', label: 'Merge Sort' },
    { value: 'quick_sort', label: 'Quick Sort' },
    { value: 'stack_ops', label: 'Stack Operations' },
    { value: 'queue_ops', label: 'Queue Operations' },
    { value: 'fibonacci', label: 'Fibonacci (DP)' },
  ];

  const currentAlgoLabel = algoOptions.find(o => o.value === algo)?.label ?? algo;

  const showArrayInput = algo !== 'stack_ops' && algo !== 'queue_ops' && algo !== 'fibonacci';
  const showTargetInput = algo === 'binary_search';
  const showFibInput = algo === 'fibonacci';

  // ─── Canvas Renderers ──────────────────────────────────────────────────────

  const renderLinkedListCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as LLStep;
    return (
      <div className={cn('flex items-center overflow-x-auto', compact ? 'gap-1 py-6' : 'gap-2 py-6')}>
        {inputValue.split(',').map((v, idx) => {
          const isCurr = step.pointers.currIdx === idx;
          const isPrev = step.pointers.prevIdx === idx;
          const isNext = step.pointers.nextIdx === idx;
          const isReversed = step.reversedLinks.includes(idx);
          return (
            <React.Fragment key={idx}>
              {idx > 0 && !isReversed && (
                <span className={cn('font-mono select-none', compact ? 'text-base mx-1.5 text-dark-text/20' : 'text-2xl mx-3 text-dark-text/20')}>{'→'}</span>
              )}
              {idx > 0 && isReversed && (
                <span className={cn('font-mono select-none text-[#4F7DFF]', compact ? 'text-base mx-1.5' : 'text-2xl mx-3')}>{'←'}</span>
              )}
              <div className="flex flex-col items-center gap-2">
                <div className={cn('flex items-center justify-center text-[9px] font-black tracking-tight uppercase select-none', compact ? 'h-4' : 'h-5')}>
                  {isCurr && <span className="bg-[#4F7DFF]/15 border border-[#4F7DFF]/30 text-[#4F7DFF] px-1.5 py-0.5 rounded-md">curr</span>}
                  {isPrev && <span className="bg-dark-hover border border-dark-border text-dark-text/60 px-1.5 py-0.5 rounded-md">prev</span>}
                  {isNext && <span className="bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 text-[#4F7DFF] px-1.5 py-0.5 rounded-md">next</span>}
                </div>
                <div className={cn(
                  'rounded-full flex items-center justify-center border font-bold font-mono transition-all duration-300 shadow-sm',
                  compact ? 'w-11 h-11' : 'w-16 h-16 text-lg shadow-lg border-2',
                  isCurr ? 'bg-[#4F7DFF] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(79,125,255,0.35)]' :
                  isPrev ? 'bg-dark-input text-dark-text border-dark-border' :
                  isNext ? 'bg-dark-hover text-dark-text/80 border-dark-border' :
                  'bg-dark-panel text-dark-text/40 border-dark-border'
                )}>
                  {v.trim()}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderBinarySearchCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as BSStepItem;
    return (
      <div className="flex flex-col items-center gap-4 py-6 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {bsArray.map((val, idx) => {
            const isLow = step.low === idx;
            const isHigh = step.high === idx;
            const isMid = step.mid === idx;
            const isFound = step.found && isMid;
            const inRange = idx >= step.low && idx <= step.high;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'rounded-xl flex items-center justify-center border font-bold font-mono transition-all duration-300 text-xs shadow-sm',
                  compact ? 'w-10 h-10' : 'w-14 h-14 text-base shadow-md border-2',
                  isFound ? 'bg-[#10b981] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
                  isMid ? 'bg-[#4F7DFF] text-white border-transparent scale-105 shadow-[0_0_12px_rgba(79,125,255,0.3)]' :
                  isLow ? 'bg-dark-hover border-2 border-dark-border text-dark-text' :
                  isHigh ? 'bg-dark-hover border-2 border-dark-border text-dark-text' :
                  inRange ? 'bg-dark-panel text-dark-text border-dark-border' :
                  'bg-dark-input text-dark-text/20 border-dark-border/40 opacity-30'
                )}>
                  {val}
                </div>
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
    );
  };

  const renderBubbleSortCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as BubbleStep;
    const values = inputValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    const maxVal = Math.max(...values, 1);
    return (
      <div className={cn('flex items-end justify-center w-full select-none', compact ? 'gap-4 h-40 py-4' : 'gap-5 h-64 px-8')}>
        {step.array.map((val, idx) => {
          const isComparing = step.compareIndices?.includes(idx);
          const isSorted = step.sortedIndices?.includes(idx);
          const heightVal = Math.max(12, Math.min(100, (val / maxVal) * 100));
          return (
            <div key={idx} className={cn('flex flex-col items-center gap-2', compact ? 'w-10' : 'flex-1 max-w-[60px]')}>
              <div
                style={{ height: `${heightVal}%` }}
                className={cn(
                  'w-full rounded-t-xl border-2 transition-all duration-300 flex items-start justify-center pt-2.5 font-bold font-mono text-xs',
                  step.swapped && isComparing ? 'bg-[#10b981] text-white border-transparent shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-pulse' :
                  isComparing ? 'bg-[#4F7DFF] text-white border-transparent shadow-[0_0_16px_rgba(79,125,255,0.3)]' :
                  isSorted ? 'bg-dark-input text-dark-text/30 border-dark-border/40' :
                  'bg-dark-hover text-dark-text border-dark-border'
                )}
              >
                {val}
              </div>
              <span className="text-[9px] font-mono text-dark-text/30 select-none">i:{idx}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMergeSortCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as MergeSortStep;
    const maxVal = Math.max(...step.array, 1);
    return (
      <div className="flex flex-col items-center gap-4 w-full py-4 select-none">
        <div className={cn('flex items-end justify-center w-full', compact ? 'gap-3 h-36' : 'gap-4 h-52 px-4')}>
          {step.array.map((val, idx) => {
            const isMerging = step.mergeIndices.includes(idx);
            const isSorted = step.sortedIndices.includes(idx);
            const heightVal = Math.max(12, Math.min(100, (val / maxVal) * 100));
            return (
              <div key={idx} className={cn('flex flex-col items-center gap-1.5', compact ? 'w-9' : 'flex-1 max-w-[54px]')}>
                <div
                  style={{ height: `${heightVal}%` }}
                  className={cn(
                    'w-full rounded-t-xl border-2 transition-all duration-300 flex items-start justify-center pt-2 font-bold font-mono text-[10px]',
                    step.phase === 'split' && isMerging
                      ? 'bg-[#4F7DFF]/70 text-white border-[#4F7DFF] shadow-[0_0_12px_rgba(79,125,255,0.25)]'
                      : step.phase === 'merge' && isMerging
                      ? 'bg-amber-500/80 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : isSorted
                      ? 'bg-[#10b981]/80 text-white border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-dark-hover text-dark-text border-dark-border'
                  )}
                >
                  {val}
                </div>
                <span className="text-[9px] font-mono text-dark-text/30">{idx}</span>
              </div>
            );
          })}
        </div>
        {/* Sub-array indicators */}
        <div className="flex items-center gap-4 text-[10px] font-mono flex-wrap justify-center">
          {step.leftArr.length > 0 && (
            <span className="bg-[#4F7DFF]/10 border border-[#4F7DFF]/25 text-[#4F7DFF] px-2 py-1 rounded-lg">
              L: [{step.leftArr.join(', ')}]
            </span>
          )}
          {step.rightArr.length > 0 && (
            <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-1 rounded-lg">
              R: [{step.rightArr.join(', ')}]
            </span>
          )}
          {step.mergedArr.length > 0 && (
            <span className="bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] px-2 py-1 rounded-lg">
              M: [{step.mergedArr.join(', ')}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[9px] select-none">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4F7DFF]/70 inline-block" />Split</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 inline-block" />Merging</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]/80 inline-block" />Sorted</span>
        </div>
      </div>
    );
  };

  const renderQuickSortCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as QuickSortStep;
    const maxVal = Math.max(...step.array, 1);
    return (
      <div className="flex flex-col items-center gap-3 w-full py-4 select-none">
        <div className={cn('flex items-end justify-center w-full', compact ? 'gap-3 h-36' : 'gap-4 h-52 px-4')}>
          {step.array.map((val, idx) => {
            const isPivot = step.pivotIdx === idx;
            const isSorted = step.sortedIndices.includes(idx);
            const isCompare = step.compareIdx === idx;
            const inBounds = idx >= step.leftBound && idx <= step.rightBound;
            const heightVal = Math.max(12, Math.min(100, (val / maxVal) * 100));
            return (
              <div key={idx} className={cn('flex flex-col items-center gap-1.5', compact ? 'w-9' : 'flex-1 max-w-[54px]')}>
                <div
                  style={{ height: `${heightVal}%` }}
                  className={cn(
                    'w-full rounded-t-xl border-2 transition-all duration-300 flex items-start justify-center pt-2 font-bold font-mono text-[10px]',
                    isPivot ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.35)] scale-105' :
                    isSorted ? 'bg-[#10b981]/80 text-white border-[#10b981]' :
                    isCompare ? 'bg-[#4F7DFF] text-white border-[#4F7DFF] shadow-[0_0_10px_rgba(79,125,255,0.3)]' :
                    inBounds ? 'bg-dark-hover text-dark-text border-dark-border' :
                    'bg-dark-input text-dark-text/20 border-dark-border/40 opacity-40'
                  )}
                >
                  {val}
                </div>
                <span className="text-[9px] font-mono text-dark-text/30">{idx}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[9px] select-none">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />Pivot</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4F7DFF] inline-block" />Comparing</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]/80 inline-block" />Sorted</span>
        </div>
      </div>
    );
  };

  const renderStackCanvas = (_compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as StackStep;
    const maxDisplay = 8;
    const displayStack = step.stack.slice(-maxDisplay);
    return (
      <div className="flex flex-col items-center gap-3 w-full py-4 select-none">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-[10px] font-bold px-3 py-1 rounded-full border',
            step.operation === 'push' ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' :
            step.operation === 'pop' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
            step.operation === 'peek' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
            'bg-dark-hover text-dark-text/50 border-dark-border'
          )}>
            {step.operation.toUpperCase()}
            {step.operand !== null ? ` (${step.operand})` : ''}
          </span>
        </div>
        <div className="flex flex-col-reverse items-center gap-2 min-h-[120px] justify-end">
          {displayStack.map((val, i) => {
            const isTop = i === displayStack.length - 1;
            return (
              <div key={i} className={cn(
                'w-28 h-11 rounded-xl border-2 flex items-center justify-center font-bold font-mono text-sm transition-all duration-300',
                isTop && step.isHighlighted
                  ? 'bg-[#4F7DFF] text-white border-[#4F7DFF] shadow-[0_0_20px_rgba(79,125,255,0.4)] scale-105'
                  : isTop
                  ? 'bg-dark-hover text-dark-text border-dark-border shadow-[0_0_10px_rgba(79,125,255,0.15)]'
                  : 'bg-dark-panel text-dark-text/70 border-dark-border'
              )}>
                {val}
                {isTop && <span className="ml-2 text-[9px] opacity-60">top</span>}
              </div>
            );
          })}
          {displayStack.length === 0 && (
            <div className="w-28 h-11 rounded-xl border-2 border-dashed border-dark-border/40 flex items-center justify-center text-[10px] text-dark-text/30">
              empty
            </div>
          )}
        </div>
        <div className="w-28 h-1 rounded-full bg-dark-border/60 mt-1" />
        <span className="text-[9px] text-dark-text/30 select-none">STACK BASE</span>
      </div>
    );
  };

  const renderQueueCanvas = (_compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as QueueStep;
    const isDequeuing = step.operation === 'dequeue';
    return (
      <div className="flex flex-col items-center gap-4 w-full py-4 select-none">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] font-bold px-3 py-1 rounded-full border',
            step.operation === 'enqueue' ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' :
            step.operation === 'dequeue' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
            'bg-dark-hover text-dark-text/50 border-dark-border'
          )}>
            {step.operation.toUpperCase()}
            {step.operand !== null ? ` (${step.operand})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto px-4">
          {step.queue.length === 0 && (
            <div className="w-28 h-12 rounded-xl border-2 border-dashed border-dark-border/40 flex items-center justify-center text-[10px] text-dark-text/30">
              empty
            </div>
          )}
          {step.queue.map((val, i) => {
            const isFront = i === 0;
            const isRear = i === step.queue.length - 1;
            const isAnimating = isDequeuing && isFront;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold font-mono text-sm transition-all duration-300',
                  isAnimating ? 'opacity-40 scale-90 border-rose-500/50 text-rose-400' :
                  isFront ? 'bg-[#4F7DFF]/20 text-[#4F7DFF] border-[#4F7DFF]/50 shadow-[0_0_10px_rgba(79,125,255,0.2)]' :
                  isRear ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
                  'bg-dark-hover text-dark-text border-dark-border'
                )}>
                  {val}
                </div>
                <span className={cn('text-[8.5px] font-bold uppercase select-none',
                  isFront ? 'text-[#4F7DFF]' : isRear ? 'text-[#10b981]' : 'text-transparent'
                )}>
                  {isFront && isRear ? 'F/R' : isFront ? 'Front' : isRear ? 'Rear' : '.'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-[9px] select-none mt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4F7DFF]/50 inline-block" />Front (dequeue side)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]/50 inline-block" />Rear (enqueue side)</span>
        </div>
      </div>
    );
  };

  const renderFibCanvas = (_compact: boolean) => {
    if (!currentStep) return null;
    const step = currentStep as FibStep;
    const cells = Array.from({ length: step.n + 1 }, (_, i) => i);
    return (
      <div className="flex flex-col items-center gap-4 w-full py-4 select-none">
        <div className="text-[10px] text-dark-text/50 font-mono mb-1">
          Computing <span className="text-[#4F7DFF] font-bold">fib({step.currentCall})</span>
          {step.callStack.length > 0 && (
            <span className="ml-3 text-dark-text/30">
              call stack depth: {step.callStack.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-center gap-2 max-w-full overflow-x-auto px-4">
          {cells.map(i => {
            const isComputing = step.currentCall === i && step.phase === 'computing';
            const isCached = step.memo[i] !== undefined;
            const val = step.memo[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold font-mono text-sm transition-all duration-300',
                  isComputing
                    ? 'bg-[#4F7DFF] text-white border-[#4F7DFF] shadow-[0_0_16px_rgba(79,125,255,0.45)] scale-110 animate-pulse'
                    : isCached
                    ? 'bg-[#10b981]/80 text-white border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-dark-panel text-dark-text/20 border-dark-border/40'
                )}>
                  {isCached ? val : '?'}
                </div>
                <span className="text-[8.5px] font-mono text-dark-text/40">f({i})</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-[9px] select-none mt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4F7DFF] inline-block animate-pulse" />Computing</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/80 inline-block" />Cached</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-dark-border inline-block" />Pending</span>
        </div>
      </div>
    );
  };

  const renderCanvas = (compact: boolean) => {
    if (!currentStep) return null;
    switch (algo) {
      case 'linked_list_reverse': return renderLinkedListCanvas(compact);
      case 'binary_search': return renderBinarySearchCanvas(compact);
      case 'bubble_sort': return renderBubbleSortCanvas(compact);
      case 'merge_sort': return renderMergeSortCanvas(compact);
      case 'quick_sort': return renderQuickSortCanvas(compact);
      case 'stack_ops': return renderStackCanvas(compact);
      case 'queue_ops': return renderQueueCanvas(compact);
      case 'fibonacci': return renderFibCanvas(compact);
      default: return null;
    }
  };

  const renderVariablePanel = () => {
    if (!currentStep) return null;
    return (
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
              <div className="flex justify-between items-center border-t border-dark-border/40 pt-2 mt-2"><span className="text-dark-text/50">found:</span><span className={cn('font-bold', step.found ? 'text-[#10b981]' : 'text-rose-500')}>{String(step.found)}</span></div>
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

        {algo === 'merge_sort' && (() => {
          const step = currentStep as MergeSortStep;
          return (
            <>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">phase:</span><span className={cn('font-bold', step.phase === 'split' ? 'text-[#4F7DFF]' : 'text-amber-400')}>{step.phase}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">splitDepth:</span><span className="text-dark-text font-bold">{step.splitDepth}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">leftArr len:</span><span className="text-dark-text font-bold">{step.leftArr.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">rightArr len:</span><span className="text-dark-text font-bold">{step.rightArr.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">merged count:</span><span className="text-[#10b981] font-bold">{step.mergedArr.length}</span></div>
            </>
          );
        })()}

        {algo === 'quick_sort' && (() => {
          const step = currentStep as QuickSortStep;
          return (
            <>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">pivotVal:</span><span className="text-orange-400 font-bold">{step.pivotIdx >= 0 ? step.array[step.pivotIdx] : 'n/a'}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">pivotIdx:</span><span className="text-orange-400 font-bold">{step.pivotIdx >= 0 ? step.pivotIdx : 'n/a'}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">leftBound:</span><span className="text-dark-text font-bold">{step.leftBound}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">rightBound:</span><span className="text-dark-text font-bold">{step.rightBound}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">compareIdx:</span><span className="text-[#4F7DFF] font-bold">{step.compareIdx !== null ? step.compareIdx : 'null'}</span></div>
            </>
          );
        })()}

        {algo === 'stack_ops' && (() => {
          const step = currentStep as StackStep;
          return (
            <>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">operation:</span><span className={cn('font-bold uppercase', step.operation === 'push' ? 'text-[#10b981]' : step.operation === 'pop' ? 'text-rose-400' : 'text-amber-400')}>{step.operation}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">stackSize:</span><span className="text-dark-text font-bold">{step.stack.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">topValue:</span><span className="text-[#4F7DFF] font-bold">{step.stack.length > 0 ? step.stack[step.stack.length - 1] : 'empty'}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">operand:</span><span className="text-dark-text/80 font-bold">{step.operand !== null ? step.operand : 'null'}</span></div>
            </>
          );
        })()}

        {algo === 'queue_ops' && (() => {
          const step = currentStep as QueueStep;
          return (
            <>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">operation:</span><span className={cn('font-bold uppercase', step.operation === 'enqueue' ? 'text-[#10b981]' : step.operation === 'dequeue' ? 'text-rose-400' : 'text-amber-400')}>{step.operation}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">queueSize:</span><span className="text-dark-text font-bold">{step.queue.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">frontValue:</span><span className="text-[#4F7DFF] font-bold">{step.queue.length > 0 ? step.queue[0] : 'empty'}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">rearValue:</span><span className="text-[#10b981] font-bold">{step.queue.length > 0 ? step.queue[step.queue.length - 1] : 'empty'}</span></div>
            </>
          );
        })()}

        {algo === 'fibonacci' && (() => {
          const step = currentStep as FibStep;
          const memoEntries = Object.entries(step.memo);
          return (
            <>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">n:</span><span className="text-dark-text font-bold">{step.n}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">currentCall:</span><span className="text-[#4F7DFF] font-bold">fib({step.currentCall})</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">phase:</span><span className={cn('font-bold', step.phase === 'computing' ? 'text-[#4F7DFF]' : step.phase === 'cached' ? 'text-[#10b981]' : 'text-amber-400')}>{step.phase}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">memoSize:</span><span className="text-[#10b981] font-bold">{memoEntries.length}</span></div>
              <div className="flex justify-between items-center"><span className="text-dark-text/50">callDepth:</span><span className="text-dark-text font-bold">{step.callStack.length}</span></div>
              {step.phase === 'done' && (
                <div className="flex justify-between items-center border-t border-dark-border/40 pt-2 mt-2">
                  <span className="text-dark-text/50">result:</span>
                  <span className="text-[#10b981] font-bold">{step.memo[step.n]}</span>
                </div>
              )}
            </>
          );
        })()}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
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
              className="flex items-center justify-between gap-3 bg-dark-input border border-dark-border text-dark-text px-3.5 py-2 rounded-xl focus:outline-none hover:bg-dark-hover transition-colors font-medium text-[11px] cursor-pointer min-w-[190px]"
            >
              <span>{currentAlgoLabel}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-dark-text/40 transition-transform duration-200', isDropdownOpen && 'transform rotate-180')} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-[210px] bg-dark-panel border border-dark-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-in">
                {algoOptions.map((opt) => (
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
                      } else if (selected === 'bubble_sort') setInputValue('8,4,1,9,5');
                      else if (selected === 'merge_sort') setInputValue('6,3,8,1,9,2,7,4');
                      else if (selected === 'quick_sort') setInputValue('7,2,9,4,1,8,3');
                      else if (selected === 'fibonacci') setFibN('8');
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3.5 py-2 text-[11px] font-medium flex items-center justify-between hover:bg-dark-hover transition-colors cursor-pointer',
                      algo === opt.value ? 'text-[#4F7DFF] bg-[#4F7DFF]/5' : 'text-dark-text/80'
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

        {/* Array Input */}
        {showArrayInput && (
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
        )}

        {/* Binary Search Target */}
        {showTargetInput && (
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

        {/* Fibonacci N input */}
        {showFibInput && (
          <div className="flex items-center gap-3 w-36">
            <span className="font-semibold text-dark-text/60">N =</span>
            <input
              type="number"
              min="1"
              max="20"
              value={fibN}
              onChange={(e) => setFibN(e.target.value)}
              className="bg-dark-input border border-dark-border text-dark-text px-3.5 py-2 rounded-xl w-full focus:outline-none focus:border-[#4F7DFF]/50 hover:bg-dark-hover/50 transition-colors font-mono text-[11px]"
              placeholder="8"
            />
          </div>
        )}

        {/* Stack / Queue notice */}
        {(algo === 'stack_ops' || algo === 'queue_ops') && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#4F7DFF]/8 border border-[#4F7DFF]/20 rounded-xl text-[10px] text-[#4F7DFF]/70">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Fixed operation sequence — no input required.</span>
          </div>
        )}
      </div>

      {/* Fullscreen Overlay (portal to body) */}
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
            {renderCanvas(false)}
          </div>

          {/* Fullscreen Step Description Bar */}
          {currentStep && (
            <div className="shrink-0 mx-6 mb-3 p-3.5 bg-dark-panel border border-dark-border rounded-xl text-[11px] text-dark-text/80 leading-relaxed font-sans flex gap-2 items-start">
              <span className="text-[#4F7DFF] font-bold select-none mt-0.5">{'▶'}</span>
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
        {/* Left pane: Visual display */}
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

          {renderCanvas(true)}
        </div>

        {/* Right pane: Code & Trace Log */}
        {!isMaximized && (
          <div className="md:col-span-4 bg-dark-panel border border-dark-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 border-b border-dark-border bg-dark-panel-active flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#4F7DFF]" />
              <span className="text-[9px] font-black uppercase text-dark-text/60 tracking-wider">Line Trace &amp; Variables</span>
            </div>

            {/* Trace instructions */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Description */}
              <div className="p-3.5 bg-dark-bg/40 rounded-xl border border-dark-border text-[11px] text-dark-text/80 leading-relaxed font-sans flex gap-2">
                <span className="text-[#4F7DFF] font-bold select-none">{'▶'}</span>
                <span>{currentStep ? currentStep.description : 'Click Play/Forward to begin.'}</span>
              </div>

              {/* Variable State */}
              {currentStep && (
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-dark-text/40 font-sans block select-none">Variables State</span>
                  {renderVariablePanel()}
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
            title={isPlaying ? 'Pause Playback' : 'Auto Play'}
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
            value={3400 - playbackSpeed}
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
