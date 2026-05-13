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
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '6px 8px',
          border: '1px solid var(--border-main)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)',
          cursor: 'pointer',
          minHeight: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: value ? 'var(--pp-ink)' : 'var(--pp-text-3)'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%', // Open upwards by default if in sidebar
          left: 0,
          right: 0,
          maxHeight: '250px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-main)',
          borderRadius: '4px',
          marginBottom: '4px',
          zIndex: 1000,
          boxShadow: 'var(--pp-shadow-md)'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--pp-warm-1)' }}>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid var(--pp-blue)',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
                fontSize: '0.8rem'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px 12px', color: 'var(--pp-text-3)', fontSize: '0.8rem' }}>No matches</div>
            ) : (
              filteredOptions.map((opt, i) => (
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
                    color: 'var(--pp-text-2)',
                    borderBottom: i < filteredOptions.length - 1 ? '1px solid var(--pp-warm-1)' : 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--pp-warm-1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
