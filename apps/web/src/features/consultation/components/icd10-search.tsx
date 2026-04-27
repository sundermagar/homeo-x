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

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = useIcd10Search(debouncedQuery);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {isOpen && results && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                onSelect(item.code, item.shortDesc);
                setQuery('');
                setIsOpen(false);
              }}
            >
              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono text-blue-800">
                {item.code}
              </span>
              <span className="text-sm text-gray-700">{item.shortDesc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
