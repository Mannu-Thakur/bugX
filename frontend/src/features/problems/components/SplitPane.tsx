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
      className="flex w-full h-[calc(100vh-125px)] bg-transparent gap-1.5"
    >
      {/* Left Pane */}
      <div
        className="h-full overflow-hidden rounded-xl bg-dark-panel flex flex-col"
        style={{ width: `${leftWidth}%`, border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        onMouseDown={startResize}
        onTouchStart={startResize}
        className="w-1 h-full rounded-full cursor-col-resize flex flex-col justify-center items-center select-none z-10 group shrink-0"
        style={{ background: 'transparent' }}
      >
        <div className="w-px h-10 bg-white/[0.07] group-hover:bg-white/20 rounded-full transition-colors duration-200" />
      </div>

      {/* Right Pane */}
      <div
        className="h-full overflow-hidden flex-1 rounded-xl flex flex-col"
        style={{ width: `${100 - leftWidth}%`, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {right}
      </div>
    </div>
  );
};

