import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
}

interface ModelSelectDropdownProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  variant?: 'primary' | 'fallback';
}

export function ModelSelectDropdown({ value, options, onChange, variant = 'primary' }: ModelSelectDropdownProps) {
  const isFallback = variant === 'fallback';
  const selectedOption = options.find(o => o.id === value);
  const displayLabel = selectedOption ? selectedOption.name : value;

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: isFallback ? 'auto' : '170px' }}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          padding: isFallback ? '2px 20px 2px 6px' : '6px 28px 6px 10px',
          background: isFallback ? 'transparent' : '#FFFFFF',
          border: isFallback ? 'none' : '1px solid #D1D5DB',
          borderRadius: isFallback ? '4px' : '6px',
          fontSize: isFallback ? '12px' : '13px',
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          boxShadow: isFallback ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
        onFocus={(e) => {
          if (!isFallback) {
            e.target.style.borderColor = '#2563EB';
            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
          }
        }}
        onBlur={(e) => {
          if (!isFallback) {
            e.target.style.borderColor = '#D1D5DB';
            e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }
        }}
      >
        {!value && <option value="" style={{ color: '#9CA3AF' }}>Select model...</option>}
        {value && !selectedOption && (
          <option value={value} style={{ color: '#111827', background: 'white', fontWeight: 500 }}>
            {value} (Not active)
          </option>
        )}
        {options.map(opt => (
          <option key={opt.id} value={opt.id} style={{ color: '#111827', background: 'white', fontWeight: 500 }}>
            {opt.name}
          </option>
        ))}
      </select>
      <div 
        style={{ 
          position: 'absolute', 
          right: isFallback ? '2px' : '8px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          color: '#6B7280'
        }}
      >
        <ChevronDown size={isFallback ? 11 : 13} />
      </div>
    </div>
  );
}
