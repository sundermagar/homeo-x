import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchIcd, useSearchLoinc, useSearchProcedures } from '@/shared/hooks/use-terminology';
import type { IcdCodeResult, LoincCodeResult, ProcedureCodeResult } from '@/shared/hooks/use-terminology';
import './code-autocomplete.css';

type CodeType = 'icd' | 'loinc' | 'procedure';

type SelectedCode = IcdCodeResult | LoincCodeResult | ProcedureCodeResult;

interface CodeAutocompleteProps {
  type: CodeType;
  label?: string;
  placeholder?: string;
  value?: SelectedCode | null;
  onSelect: (code: SelectedCode | null) => void;
  className?: string;
}

function getDisplayLabel(type: CodeType, item: SelectedCode): string {
  if (type === 'icd') {
    const icd = item as IcdCodeResult;
    return `${icd.code} — ${icd.description}`;
  }
  if (type === 'loinc') {
    const loinc = item as LoincCodeResult;
    return `${loinc.loincNum} — ${loinc.component}`;
  }
  const proc = item as ProcedureCodeResult;
  return `${proc.code} — ${proc.name}`;
}

function getCodeBadge(type: CodeType, item: SelectedCode): string {
  if (type === 'icd') return (item as IcdCodeResult).code;
  if (type === 'loinc') return (item as LoincCodeResult).loincNum;
  return (item as ProcedureCodeResult).code;
}

function getCategory(type: CodeType, item: SelectedCode): string | null | undefined {
  if (type === 'icd') return (item as IcdCodeResult).category;
  if (type === 'loinc') return (item as LoincCodeResult).system;
  return (item as ProcedureCodeResult).category;
}

export function CodeAutocomplete({
  type,
  label,
  placeholder,
  value,
  onSelect,
  className = '',
}: CodeAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Use the appropriate hook
  const icdResults = useSearchIcd(type === 'icd' ? debouncedQuery : '', 15);
  const loincResults = useSearchLoinc(type === 'loinc' ? debouncedQuery : '', 15);
  const procResults = useSearchProcedures(type === 'procedure' ? debouncedQuery : '', 15);

  const getResults = useCallback((): SelectedCode[] => {
    if (type === 'icd') return icdResults.data || [];
    if (type === 'loinc') return loincResults.data || [];
    return procResults.data || [];
  }, [type, icdResults.data, loincResults.data, procResults.data]);

  const isLoading = type === 'icd' ? icdResults.isLoading :
                    type === 'loinc' ? loincResults.isLoading :
                    procResults.isLoading;

  const results = getResults();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: SelectedCode) => {
    onSelect(item);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && results[highlightIndex]) {
      e.preventDefault();
      handleSelect(results[highlightIndex]!);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const typeLabels: Record<CodeType, string> = {
    icd: 'ICD',
    loinc: 'LOINC',
    procedure: 'Procedure',
  };

  const typeColors: Record<CodeType, string> = {
    icd: 'var(--code-icd)',
    loinc: 'var(--code-loinc)',
    procedure: 'var(--code-proc)',
  };

  return (
    <div className={`code-autocomplete ${className}`} ref={containerRef}>
      {label && <label className="code-autocomplete__label">{label}</label>}

      {/* Selected value display */}
      {value ? (
        <div className="code-autocomplete__selected" style={{ borderColor: typeColors[type] }}>
          <span className="code-autocomplete__badge" style={{ background: typeColors[type] }}>
            {typeLabels[type]}
          </span>
          <span className="code-autocomplete__badge-code">{getCodeBadge(type, value)}</span>
          <span className="code-autocomplete__selected-text">{getDisplayLabel(type, value)}</span>
          <button className="code-autocomplete__clear" onClick={handleClear} title="Clear">
            ✕
          </button>
        </div>
      ) : (
        <div className="code-autocomplete__input-wrap">
          <span className="code-autocomplete__icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="code-autocomplete__input"
            placeholder={placeholder || `Search ${typeLabels[type]} codes...`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {isLoading && <span className="code-autocomplete__spinner" />}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="code-autocomplete__dropdown">
          {results.map((item, idx) => (
            <li
              key={item.id}
              className={`code-autocomplete__option ${idx === highlightIndex ? 'code-autocomplete__option--active' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              <span className="code-autocomplete__opt-code" style={{ color: typeColors[type] }}>
                {getCodeBadge(type, item)}
              </span>
              <span className="code-autocomplete__opt-label">{getDisplayLabel(type, item)}</span>
              {getCategory(type, item) && (
                <span className="code-autocomplete__opt-cat">{getCategory(type, item)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && debouncedQuery.length >= 2 && results.length === 0 && !isLoading && (
        <div className="code-autocomplete__empty">
          No {typeLabels[type]} codes found for "{debouncedQuery}"
        </div>
      )}
    </div>
  );
}
