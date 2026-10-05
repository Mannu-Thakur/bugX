import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { PROVIDERS, getModelById } from './xModels';
import { useX } from './XContext';
import { cn } from '../../shared/lib/cn';

export const ModelSwitcher: React.FC = () => {
  const { selectedModelId, setSelectedModelId, getEffectiveKey } = useX();
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

  // A provider is "available" if it has a user key OR any of its models are platform-free
  const isProviderAvailable = (providerId: string) => {
    const p = PROVIDERS.find(pr => pr.id === providerId);
    if (!p) return false;
    return !!getEffectiveKey(p.id) || p.models.some(m => m.isPlatformFree);
  };

  // A model is available if its provider is available OR the model itself is platform-free
  const isModelAvailable = (model: { isPlatformFree?: boolean; provider: string }) => {
    return !!model.isPlatformFree || isProviderAvailable(model.provider);
  };

  // Selected model dot color: green if available, amber if needs key
  const isCurrentAvailable = current
    ? isModelAvailable({ isPlatformFree: current.model.isPlatformFree, provider: current.provider.id })
    : false;

  // Split providers into free (platform keys) and personal (user keys only)
  const freeProviders = PROVIDERS.filter(p => p.models.some(m => m.isPlatformFree));
  const personalProviders = PROVIDERS.filter(p =>
    !p.models.some(m => m.isPlatformFree) && !!getEffectiveKey(p.id)
  );
  const lockedProviders = PROVIDERS.filter(p =>
    !p.models.some(m => m.isPlatformFree) && !getEffectiveKey(p.id)
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer max-w-[160px]"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isCurrentAvailable ? 'bg-emerald-400' : 'bg-amber-400')} />
        <span className="text-[11px] font-semibold text-gray-300 truncate">
          {current?.model.displayName || 'Select model'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-gray-600 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-56 rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}
        >
          <div className="flex flex-col py-1.5 max-h-72 overflow-y-auto x-scroll-hide">

            {/* Free / Platform models */}
            {freeProviders.map(provider => (
              <div key={provider.id}>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{provider.name}</span>
                </div>
                {provider.models.filter(m => m.isPlatformFree).map(model => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { setSelectedModelId(model.id); setIsOpen(false); }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-medium text-left transition-all cursor-pointer',
                        isSelected
                          ? 'bg-white/[0.08] text-white'
                          : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSelected ? 'bg-emerald-400' : 'bg-emerald-500/50')} />
                        <span className="truncate">{model.displayName}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Personal API models (user has a key) */}
            {personalProviders.length > 0 && (
              <>
                <div className="mx-3 my-1.5 border-t border-white/[0.06]" />
                {personalProviders.map(provider => (
                  <div key={provider.id}>
                    <div className="px-3 pt-1 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{provider.name}</span>
                    </div>
                    {provider.models.map(model => {
                      const isSelected = selectedModelId === model.id;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => { setSelectedModelId(model.id); setIsOpen(false); }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-medium text-left transition-all cursor-pointer',
                            isSelected ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSelected ? 'bg-emerald-400' : 'bg-gray-500/50')} />
                            <span className="truncate">{model.displayName}</span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* Locked providers — no key, not platform-free */}
            {lockedProviders.length > 0 && (
              <>
                <div className="mx-3 my-1.5 border-t border-white/[0.06]" />
                <div className="px-3 pt-1 pb-0.5 flex items-center gap-1.5">
                  <Lock className="w-2.5 h-2.5 text-gray-700" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-700">Personal API key required</span>
                </div>
                {lockedProviders.map(provider =>
                  provider.models.map(model => (
                    <div
                      key={model.id}
                      className="flex items-center gap-2 px-3 py-1.5 opacity-30 cursor-not-allowed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-600" />
                      <span className="text-[12px] text-gray-500 truncate">{model.displayName}</span>
                    </div>
                  ))
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
