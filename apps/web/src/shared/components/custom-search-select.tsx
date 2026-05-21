import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: number | string;
  name: string;
}

interface CustomSearchSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string, id?: number | string) => void;
  placeholder?: string;
  maxHeight?: string;
}

export function CustomSearchSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder = 'Select option',
  maxHeight = '230px'
}: CustomSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => 
      opt.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <div className="plat-form-group" ref={containerRef}>
      <label className="plat-form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <div 
          className="plat-form-input flex items-center justify-between cursor-pointer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span style={{ fontSize: '13px', color: value ? 'var(--pp-ink)' : 'var(--pp-text-4)' }}>
            {value || placeholder}
          </span>
          <ChevronDown 
            size={14} 
            style={{ 
              transition: 'transform 0.2s', 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              color: 'var(--pp-text-4)'
            }} 
          />
        </div>
        
        {isOpen && (
          <div 
            className="plat-custom-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--bg-card)',
              border: '1px solid var(--pp-warm-4)',
              borderRadius: '8px',
              marginTop: '4px',
              boxShadow: 'var(--pp-shadow-lg)',
              maxHeight: maxHeight,
              overflowY: 'auto',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <style>{`
              .plat-dropdown-item {
                padding: 10px 14px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.15s;
                color: var(--pp-text-2);
              }
              .plat-dropdown-item:hover {
                background: var(--pp-warm-2);
                color: var(--pp-blue);
              }
              .plat-dropdown-item.active {
                background: var(--pp-blue-tint);
                color: var(--pp-blue);
                font-weight: 600;
              }
              .plat-custom-dropdown::-webkit-scrollbar {
                width: 6px;
              }
              .plat-custom-dropdown::-webkit-scrollbar-track {
                background: var(--pp-warm-1);
                border-radius: 8px;
              }
              .plat-custom-dropdown::-webkit-scrollbar-thumb {
                background: var(--pp-warm-4);
                border-radius: 8px;
              }
              .plat-custom-dropdown::-webkit-scrollbar-thumb:hover {
                background: var(--pp-text-4);
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            
            <div style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', padding: '8px', borderBottom: '1px solid var(--pp-warm-4)', zIndex: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-4)' }} />
                <input
                  ref={searchInputRef}
                  className="plat-form-input"
                  style={{ width: '100%', height: '30px', paddingLeft: '28px', fontSize: '12px' }}
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>

            <div 
              className="plat-dropdown-item" 
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
            >
              {placeholder}
            </div>
            
            {filtered.map((opt) => (
              <div 
                key={opt.id} 
                className={`plat-dropdown-item ${value === opt.name ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt.name, opt.id);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {opt.name}
              </div>
            ))}
            
            {filtered.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--pp-text-4)' }}>
                No results for "{search}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
