import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROVIDERS, getModelById } from './xModels';
import { useX } from './XContext';
import { cn } from '../../shared/lib/cn';

export const ModelSwitcher: React.FC = () => {
  const { selectedModelId, setSelectedModelId, enabledProviders, getEffectiveKey } = useX();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = getModelById(selectedModelId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableProviders = PROVIDERS.filter(
    p => enabledProviders.has(p.id) && !!getEffectiveKey(p.id)
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer max-w-[160px]"
      >
        {current?.model.isPlatformFree && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        )}
        <span className="text-[11px] font-semibold text-gray-300 truncate">
          {current?.model.displayName || 'Select model'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-gray-500 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown — model name only, editor-color background */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 w-52 rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5 max-h-72 overflow-y-auto">
            {availableProviders.flatMap(provider => {
              const hasKey = !!getEffectiveKey(provider.id);
              return provider.models.map(model => {
                const isSelected = selectedModelId === model.id;
                const isDisabled = provider.requiresKey && !hasKey;
                return (
                  <button
                    key={model.id}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedModelId(model.id);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                      isSelected
                        ? 'bg-orange-500/20 text-white'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200',
                      isDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  >
                    {model.displayName}
                  </button>
                );
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
};
