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

  const isModelUsable = (isPlatformFree?: boolean, providerId?: string): boolean => {
    if (isPlatformFree) return true;
    if (providerId) return !!getEffectiveKey(providerId as Parameters<typeof getEffectiveKey>[0]);
    return false;
  };

  const currentUsable = current
    ? isModelUsable(current.model.isPlatformFree, current.provider.id)
    : false;

  // Only show providers that have at least one usable model or are platform-free
  const visibleProviders = PROVIDERS.filter(p =>
    p.models.some(m => m.isPlatformFree) || !!getEffectiveKey(p.id as Parameters<typeof getEffectiveKey>[0])
  );
  // "Locked" providers — no key, no platform-free models, but still worth showing
  const lockedProviders = PROVIDERS.filter(p =>
    !p.models.some(m => m.isPlatformFree) && !getEffectiveKey(p.id as Parameters<typeof getEffectiveKey>[0])
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.08)',
          maxWidth: '150px',
        }}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 transition-colors', currentUsable ? 'bg-emerald-400' : 'bg-amber-400')} />
        <span className="text-[11px] font-medium text-gray-300 truncate">
          {current?.model.displayName || 'Select model'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-gray-600 shrink-0 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-[9999] rounded-xl overflow-hidden"
          style={{
            width: '200px',
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
          }}
        >
          <div className="py-1.5 max-h-64 overflow-y-auto x-scroll-hide">

            {visibleProviders.map((provider, pi) => (
              <div key={provider.id}>
                {pi > 0 && <div className="mx-2.5 my-1 border-t border-white/[0.05]" />}
                <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                  {provider.name}
                </p>
                {provider.models
                  .filter(m => m.isPlatformFree || !!getEffectiveKey(provider.id as Parameters<typeof getEffectiveKey>[0]))
                  .map(model => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { setSelectedModelId(model.id); setIsOpen(false); }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-[7px] text-[12px] font-medium text-left transition-colors duration-100 cursor-pointer',
                          isSelected
                            ? 'text-white bg-white/[0.07]'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isSelected ? 'bg-emerald-400' : 'bg-white/[0.15]'
                          )} />
                          <span className="truncate">{model.displayName}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
              </div>
            ))}

            {lockedProviders.length > 0 && (
              <>
                <div className="mx-2.5 my-1 border-t border-white/[0.05]" />
                <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-0.5">
                  <Lock className="w-2.5 h-2.5 text-gray-700" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-700">
                    Add key to unlock
                  </p>
                </div>
                {lockedProviders.map(provider =>
                  provider.models.map(model => (
                    <div key={model.id} className="flex items-center gap-2 px-3 py-[7px] opacity-25 cursor-not-allowed">
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
