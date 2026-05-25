import React, { useState, useRef, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftWidthPercent?: number;
  minLeftWidthPercent?: number;
  maxLeftWidthPercent?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  initialLeftWidthPercent = 50,
  minLeftWidthPercent = 20,
  maxLeftWidthPercent = 80,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidthPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const relativeX = clientX - containerRect.left;
      let newWidthPercent = (relativeX / containerRect.width) * 100;

      if (newWidthPercent < minLeftWidthPercent) newWidthPercent = minLeftWidthPercent;
      if (newWidthPercent > maxLeftWidthPercent) newWidthPercent = maxLeftWidthPercent;

      setLeftWidth(newWidthPercent);
    };

    const handleStop = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleStop);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleStop);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleStop);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleStop);
    };
  }, [minLeftWidthPercent, maxLeftWidthPercent]);

  return (
    <div
      ref={containerRef}
      className="flex w-full h-[calc(100vh-140px)] overflow-hidden rounded-lg border border-dark-border bg-dark-bg"
    >
      {/* Left Pane */}
      <div
        className="h-full overflow-y-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        onMouseDown={startResize}
        onTouchStart={startResize}
        className="w-1.5 h-full bg-dark-border hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize flex flex-col justify-center items-center gap-1 select-none z-10"
      >
        <div className="w-0.5 h-6 bg-gray-600/40 rounded-full" />
      </div>

      {/* Right Pane */}
      <div
        className="h-full overflow-y-auto flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {right}
      </div>
    </div>
  );
};
