import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { useIcd10Search } from '../../../hooks/use-icd10';

interface Icd10SearchProps {
  onSelect: (code: string, description: string) => void;
  placeholder?: string;
}

export function Icd10Search({ onSelect, placeholder = 'Search ICD-10 codes...' }: Icd10SearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = useIcd10Search(debouncedQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 10, top: 10, width: 16, height: 16, color: 'var(--text-tertiary)' }} />
        <Input value={query} onChange={e => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} placeholder={placeholder} style={{ paddingLeft: '2.25rem' }} />
      </div>
      {isOpen && results && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 50, marginTop: '0.25rem', maxHeight: '15rem', width: '100%', overflowY: 'auto', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
          {results.map((item) => (
            <button key={item.id} type="button" style={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.75rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { onSelect(item.code, item.shortDesc); setQuery(''); setIsOpen(false); }}>
              <span style={{ flexShrink: 0, borderRadius: 4, background: 'var(--color-primary-100)', padding: '0.125rem 0.375rem', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--color-primary-800)' }}>{item.code}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{item.shortDesc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
