import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, value, defaultValue, onChange, disabled, id, name, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ''));

    const selectedValue = String(value ?? internalValue);
    const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

    useEffect(() => {
      if (!isOpen) return;

      const handlePointerDown = (event: PointerEvent) => {
        if (!wrapperRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setIsOpen(false);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    const handleSelect = (nextValue: string) => {
      setInternalValue(nextValue);
      onChange?.({
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      } as React.ChangeEvent<HTMLSelectElement>);
      setIsOpen(false);
    };

    return (
      <div ref={wrapperRef} className="relative flex flex-col gap-1.5 w-full select-text">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-gray-400 select-none">
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          name={name}
          value={selectedValue}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={onChange}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${selectId}-listbox`}
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            'relative h-9 w-full min-w-0 bg-dark-input border border-white/[0.08] text-sm text-gray-200 rounded-md py-2 pl-3 pr-9 text-left transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            error && 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50',
            className,
          )}
        >
          <span className="block truncate">{selectedOption?.label ?? 'Select'}</span>
          <ChevronDown
            className={cn(
              'absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform',
              isOpen && 'rotate-180 text-gray-300',
            )}
          />
        </button>

        {isOpen && (
          <div
            id={`${selectId}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-52 overflow-y-auto overscroll-contain rounded-md border border-white/[0.08] bg-dark-panel shadow-2xl shadow-black/40"
          >
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-dark-hover hover:text-white',
                    selected && 'bg-blue-500/10 text-blue-200',
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-300" />}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <span className="text-xs text-rose-400 font-sans mt-0.5 select-none">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
