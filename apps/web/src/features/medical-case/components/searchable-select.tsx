import React, { useState, useEffect } from 'react';

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select"
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          border: isOpen 
            ? '1.5px solid var(--pp-blue)' 
            : (isHovered ? '1.5px solid #cbd5e1' : '1.5px solid var(--border-main)'),
          borderRadius: '10px',
          backgroundColor: isHovered ? '#f8fafc' : 'white',
          cursor: 'pointer',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: value ? 'var(--pp-ink)' : 'var(--pp-text-3)',
          boxShadow: isOpen 
            ? '0 0 0 3px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02)' 
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease-in-out'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.8,
            color: isOpen ? 'var(--pp-blue)' : 'var(--pp-text-3)',
            marginLeft: '8px',
            flexShrink: 0
          }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%', 
          left: 0,
          right: 0,
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          border: '1px solid var(--border-main)',
          borderRadius: '12px',
          marginTop: '6px',
          zIndex: 1000,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--pp-warm-1)', backgroundColor: '#fcfcfd', position: 'relative' }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--pp-text-3)',
                pointerEvents: 'none'
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 28px',
                border: '1.5px solid var(--pp-warm-3)',
                borderRadius: '8px',
                boxSizing: 'border-box',
                outline: 'none',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--pp-blue)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.08)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--pp-warm-3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--pp-text-3)', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>No matches found</div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = opt === value;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--pp-blue)' : 'var(--pp-text-2)',
                      backgroundColor: isSelected ? 'var(--pp-blue-faded)' : 'transparent',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--pp-warm-1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt}</span>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--pp-blue)', flexShrink: 0 }}>
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
