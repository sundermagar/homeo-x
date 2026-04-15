import { useState } from 'react';
import { Input } from '../ui/input';
import { cn } from '../../lib/cn';
import './shared.css';

interface ChipSelectorProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  size?: 'sm' | 'md';
}

export function ChipSelector({
  options,
  value,
  onChange,
  allowCustom = false,
  customPlaceholder = 'Custom...',
  size = 'sm',
}: ChipSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const isCustom = value && !options.includes(value);
  const sizeClass = size === 'sm' ? 'chip--sm' : 'chip--md';

  return (
    <div className="chip-selector">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => { onChange(opt); setShowCustom(false); }}
          className={cn('chip', sizeClass, value === opt && 'chip--selected')}
        >
          {opt}
        </button>
      ))}
      {allowCustom && (
        <>
          {!showCustom && !isCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className={cn('chip chip--custom', sizeClass)}
            >
              Other
            </button>
          ) : (
            <Input
              autoFocus
              value={isCustom ? value : ''}
              placeholder={customPlaceholder}
              style={{ width: '6rem', height: '2rem', fontSize: '0.75rem' }}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => { if (!value || options.includes(value)) setShowCustom(false); }}
            />
          )}
        </>
      )}
    </div>
  );
}
