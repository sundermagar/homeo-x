import React, { useState, useRef, useEffect } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  const displayLabel = selectedOption ? selectedOption.name : value;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFallback = variant === 'fallback';

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: isFallback ? 'auto' : '160px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: isFallback ? '0' : '6px 10px',
          background: isFallback ? 'transparent' : 'white',
          border: isFallback ? 'none' : '1px solid #D1D5DB',
          borderRadius: '4px',
          fontSize: isFallback ? '12px' : '13px',
          fontWeight: 600,
          color: '#111827',
          gap: '8px',
          userSelect: 'none'
        }}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={14} style={{ color: '#6B7280', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '6px',
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 50,
          minWidth: '160px',
          width: 'max-content',
          maxHeight: '250px',
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {options.map(opt => (
            <div 
              key={opt.id}
              onClick={() => { onChange(opt.id); setIsOpen(false); }}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                background: value === opt.id ? '#2563EB' : 'transparent',
                color: value === opt.id ? 'white' : '#374151',
                fontWeight: value === opt.id ? 600 : 400,
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.id) {
                  e.currentTarget.style.background = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
