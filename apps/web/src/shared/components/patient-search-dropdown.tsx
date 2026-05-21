import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Tag, Loader2, X } from 'lucide-react';
import { usePatientLookup } from '../../features/patients/hooks/use-patients';
import type { PatientSummary } from '@mmc/types';

interface PatientSearchDropdownProps {
  onSelect: (patient: PatientSummary) => void;
  placeholder?: string;
  className?: string;
}

export function PatientSearchDropdown({ onSelect, placeholder = "Search RegID, Name or Mobile...", className = "" }: PatientSearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: results = [], isLoading } = usePatientLookup(query);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (patient: PatientSummary) => {
    onSelect(patient);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div style={{ position: 'relative', width: '100%', height: '32px' }}>
        <Search 
          size={14} 
          style={{ 
            position: 'absolute', 
            left: '10px', 
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8', 
            pointerEvents: 'none',
            zIndex: 20
          }} 
        />
        <input
          type="text"
          style={{
            width: '100%',
            height: '100%',
            paddingLeft: '32px',
            paddingRight: '32px',
            fontSize: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          placeholder="Search patient (RegID, Name, Mobile)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              zIndex: 20
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-[400px] overflow-y-auto animate-in fade-in zoom-in duration-150">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="animate-spin" size={16} /> Searching patients...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No patients found for "{query}"
            </div>
          ) : (
            <div className="py-1">
              {results.map((patient) => (
                <button
                  key={patient.regid}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-4 transition-colors border-b border-slate-50 last:border-0"
                  onClick={() => handleSelect(patient)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {patient.fullName}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        <Tag size={10} /> {patient.regid}
                      </span>
                      {patient.mobile1 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Phone size={10} /> {patient.mobile1}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Select
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
