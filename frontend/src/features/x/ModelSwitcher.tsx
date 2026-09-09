import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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

  // Show all enabled providers, or fallback to all providers
  const providersToShow = PROVIDERS.filter(p => enabledProviders.has(p.id));
  const activeProviders = providersToShow.length > 0 ? providersToShow : PROVIDERS;

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer max-w-[170px]"
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            current?.provider.requiresKey && !getEffectiveKey(current.provider.id)
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          )}
        />
        <span className="text-[11px] font-semibold text-gray-300 truncate">
          {current?.model.displayName || 'Select model'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-gray-500 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown — pops upward directly above the trigger */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-2xl z-[9999] overflow-hidden border border-white/[0.12]"
          style={{ background: '#1c1c1e', boxShadow: '0 12px 40px rgba(0,0,0,0.65)' }}
        >
          <div className="flex flex-col gap-1.5 px-1.5 py-2 max-h-80 overflow-y-auto x-scroll-hide">
            {activeProviders.map(provider => {
              const hasKey = !!getEffectiveKey(provider.id);
              return (
                <div key={provider.id} className="flex flex-col">
                  {/* Provider Header */}
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <span>{provider.name}</span>
                    {hasKey ? (
                      <span className="text-[9px] text-emerald-400 font-semibold lowercase">ready</span>
                    ) : (
                      <span className="text-[9px] text-gray-600 font-semibold lowercase">no key</span>
                    )}
                  </div>

                  {/* Provider Models */}
                  {provider.models.map(model => {
                    const isSelected = selectedModelId === model.id;
                    const isDisabled = provider.requiresKey && !hasKey;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            setSelectedModelId(model.id);
                            setIsOpen(false);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left',
                          isSelected
                            ? 'bg-orange-500/20 text-orange-300 font-semibold'
                            : 'text-gray-300 hover:bg-white/[0.08] hover:text-white',
                          isDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              hasKey ? 'bg-emerald-400' : 'bg-gray-600'
                            )}
                          />
                          <span className="truncate">{model.displayName}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {model.isPlatformFree && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-normal">
                              Free
                            </span>
                          )}
                          {isSelected && <Check className="w-3 h-3 text-orange-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

