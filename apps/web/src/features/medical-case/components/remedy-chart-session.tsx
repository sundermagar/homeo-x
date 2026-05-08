import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, BookOpen, ChevronRight, Activity,
  FlaskConical, Save, Trash2, Calendar, FileText, Printer, Plus, X,
  History, Edit, MoreHorizontal, Truck, Home, Package, AlertTriangle, CheckCircle2,
  Upload, Loader2
} from 'lucide-react';
import { useManageClinicalRecords } from '../hooks/use-medical-cases';
import {
  useAlphabetIndex,
  useRemedyLookups,
  useRemedyAlternatives,
  usePatientPrescriptions,
  useSavePrescription,
  useDeletePrescription,
  useTreeByLetter,
  RemedyTreeNode,
  PrescriptionRow
} from '../hooks/use-remedy-chart';
import { useDayCharges } from '../../billing/hooks/use-accounts';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import '../styles/premium-buttons.css';

function SearchableSelect({
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
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '250px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-main)',
          borderRadius: '4px',
          marginTop: '4px',
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

export function RemedyChartSession({ 
  regid, 
  onDayChargeChange, 
  onSelectDate,
  onStartRx
}: { 
  regid?: number, 
  onDayChargeChange?: (amount: number) => void,
  onSelectDate?: (date: string) => void,
  onStartRx?: () => void
}) {
  const { data: lookups } = useRemedyLookups();
  const { data: history, isLoading } = usePatientPrescriptions(regid || 0);
  const { data: dayCharges = [] } = useDayCharges();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [delivery, setDelivery] = useState('clinic');
  const [manualInstruction, setManualInstruction] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRepeatWarning, setShowRepeatWarning] = useState(false);

  const [form, setForm] = useState({
    remedyName: '',
    potencyName: '',
    frequencyName: '',
    days: 0,
    instructions: '',
    notes: ''
  });

  const saveMutation = useSavePrescription();
  const deleteMutation = useDeletePrescription(regid ?? 0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isRxToday = useMemo(() => {
    return (history || []).some(rx => {
      const dateVal = rx.created_at || rx.dateval;
      if (!dateVal) return false;
      const d1 = new Date(dateVal).toDateString();
      const d2 = new Date().toDateString();
      return d1 === d2;
    });
  }, [history]);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  const totalPages = Math.ceil((history?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentHistory = history?.slice(startIndex, startIndex + pageSize) || [];

  const groupedHistory = useMemo(() => {
    const groups: { date: string; items: any[] }[] = [];
    currentHistory.forEach(rx => {
      const date = new Date(rx.created_at || rx.dateval).toDateString();
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.items.push(rx);
      } else {
        groups.push({ date, items: [rx] });
      }
    });
    return groups;
  }, [currentHistory]);

  // Build day options from day-charges module
  const dayOptions = useMemo(() => {
    return dayCharges.map((dc: any) => String(dc.days)).filter(Boolean);
  }, [dayCharges]);

  // Get the amount for the selected days
  const selectedDayCharge = useMemo(() => {
    if (!form.days) return null;
    return dayCharges.find((dc: any) => String(dc.days) === String(form.days));
  }, [form.days, dayCharges]);

  // Auto-build instructions when form fields change
  useEffect(() => {
    if (manualInstruction || editingId) return;
    const parts: string[] = [];
    if (form.remedyName) parts.push(`Remedy: ${form.remedyName}`);
    if (form.potencyName) parts.push(`Potency: ${form.potencyName}`);
    if (form.frequencyName) parts.push(`Frequency: ${form.frequencyName}`);
    if (form.days) parts.push(`Days: ${form.days}`);
    if (parts.length > 0) {
      setForm(prev => ({ ...prev, instructions: parts.join(' · ') }));
    } else {
      setForm(prev => ({ ...prev, instructions: '' }));
    }
  }, [form.remedyName, form.potencyName, form.frequencyName, form.days, manualInstruction, editingId]);

  // Sync pending charge with parent
  useEffect(() => {
    if (onDayChargeChange && selectedDayCharge) {
      onDayChargeChange(selectedDayCharge.regularCharges || 0);
    }
  }, [selectedDayCharge, onDayChargeChange]);

  useEffect(() => {
    if (history && history.length > 0) {
      const mode = history[0]?.deliveryMode;
      if (mode && ['clinic', 'courier', 'pickup'].includes(mode)) {
        setDelivery(mode);
      }
    }
  }, [history]);

  const handleSave = async () => {
    if (!regid) return alert('Cannot save: No active patient session.');
    if (!form.remedyName) return alert('Please select a remedy.');

    await saveMutation.mutateAsync({
      regid,
      id: editingId ?? undefined,
      deliveryMode: delivery,
      ...form
    });

    setForm({ remedyName: '', potencyName: '', frequencyName: '', days: 0, instructions: '', notes: '' });
    setEditingId(null);
    setManualInstruction(false);
  };

  const handleEdit = (rx: PrescriptionRow) => {
    setEditingId(rx.id);
    setManualInstruction(true);
    setForm({
      remedyName: rx.remedy_name,
      potencyName: rx.potency_name,
      frequencyName: rx.frequency_name,
      days: Number(rx.days) || 0,
      instructions: rx.prescription || rx.notes || '',
      notes: rx.notes || ''
    });
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRepeat = () => {
    if (!history || history.length === 0) return alert('No previous prescription to repeat.');
    if (isRxToday) {
      setShowRepeatWarning(true);
      return;
    }
    const lastRx = history[0];
    if (!lastRx) return;
    setManualInstruction(true);
    setEditingId(null);
    setForm({
      remedyName: lastRx.remedy_name,
      potencyName: lastRx.potency_name,
      frequencyName: lastRx.frequency_name,
      days: Number(lastRx.days) || 0,
      instructions: lastRx.prescription || lastRx.notes || '',
      notes: lastRx.notes || ''
    });
    setActiveTab('rx');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRepeatRow = (rx: PrescriptionRow) => {
    if (isRxToday) {
      setShowRepeatWarning(true);
      return;
    }
    setManualInstruction(true);
    setEditingId(null);
    setForm({
      remedyName: rx.remedy_name,
      potencyName: rx.potency_name,
      frequencyName: rx.frequency_name,
      days: Number(rx.days) || 0,
      instructions: rx.prescription || rx.notes || '',
      notes: rx.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number, name?: string) => {
    if (!regid) return;
    if (!window.confirm(`Remove prescription for "${name || 'this remedy'}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      console.error('Delete prescription failed:', err);
      alert(`Failed to remove prescription: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    }
  };

  const handlePrintRow = (rx: PrescriptionRow) => {
    const token = useAuthStore.getState().token;
    window.open(`/api/medical-cases/remedy-chart/pdf/${regid}?token=${token}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Top Header Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 16px 0 16px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
          {/* Action Tabs */}
          <div style={{ display: 'flex', gap: '8px', flex: '1 1 300px', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setShowConfirm(true)}
              className={`mc-tab-btn-premium ${activeTab === 'rx' && !isRxToday ? 'active' : ''}`}
            >
              Rx
            </button>
            {isRxToday && (
              <button
                onClick={() => setActiveTab('rx')}
                className={`mc-tab-btn-premium ${activeTab === 'rx' ? 'active' : ''}`}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                Add Extra
              </button>
            )}
            <button
              onClick={() => handleRepeat()}
              className="mc-tab-btn-premium"
            >
              Repeat
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`mc-tab-btn-premium ${activeTab === 'image' ? 'active' : ''}`}
            >
              Add Image
            </button>
          </div>

          {/* Delivery Mode Dropdown */}
          <div style={{ flex: '0 0 220px', position: 'relative' }}>
            <select
              value={delivery}
              onChange={async (e) => {
                const val = e.target.value;
                setDelivery(val);
                if (isRxToday && history) {
                  const todayItems = history.filter(rx => {
                    const dateVal = rx.created_at || rx.dateval;
                    return dateVal && new Date(dateVal).toDateString() === new Date().toDateString();
                  });
                  for (const item of todayItems) {
                    await saveMutation.mutateAsync({
                      ...item,
                      deliveryMode: val,
                      regid: regid || 0
                    });
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                appearance: 'none',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-main)',
                color: 'var(--pp-text-main)',
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--pp-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--pp-warm-4)'}
            >
              <option value="clinic">Clinic</option>
              <option value="courier">Courier</option>
              <option value="pickup">Pickup</option>
            </select>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-blue)', pointerEvents: 'none', display: 'flex' }}>
              {delivery === 'clinic' && <Home size={18} />}
              {delivery === 'courier' && <Truck size={18} />}
              {delivery === 'pickup' && <Package size={18} />}
            </div>
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)', pointerEvents: 'none', display: 'flex' }}>
              <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
        </div>
      </div>

      {(activeTab === 'rx' || activeTab === null) && (
        <div style={{ padding: '16px 24px' }}>
          {/* Inline Form - Only visible when Rx tab is active */}
          {activeTab === 'rx' && (
            <>
              {editingId && (
                <div style={{ padding: '6px 12px', marginBottom: '12px', background: 'var(--pp-blue-faded)', borderLeft: '3px solid var(--pp-blue)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--pp-blue)' }}>
                  ✏️ Editing prescription — make changes and click <strong>✓ Update</strong>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Remedy:</label>
                  <SearchableSelect
                    value={form.remedyName}
                    onChange={val => {
                      setManualInstruction(false);
                      setForm({ ...form, remedyName: val });
                    }}
                    options={lookups?.medicines?.map(m => m.name) || []}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Potency:</label>
                  <SearchableSelect
                    value={form.potencyName}
                    onChange={val => {
                      setManualInstruction(false);
                      setForm({ ...form, potencyName: val });
                    }}
                    options={lookups?.potencies?.map(p => p.name) || []}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Frequency:</label>
                  <SearchableSelect
                    value={form.frequencyName}
                    onChange={val => {
                      setManualInstruction(false);
                      setForm({ ...form, frequencyName: val });
                    }}
                    options={lookups?.frequencies?.map(f => f.name) || []}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Days:</label>
                  {dayOptions.length > 0 ? (
                    <SearchableSelect
                      value={form.days ? String(form.days) : ''}
                      onChange={val => {
                        setManualInstruction(false);
                        setForm({ ...form, days: parseInt(val) || 0 });
                      }}
                      options={dayOptions}
                      placeholder="Select"
                    />
                  ) : (
                    <input
                      type="number"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-main)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-card)', color: 'var(--pp-ink)' }}
                      value={form.days}
                      onChange={e => {
                        setManualInstruction(false);
                        setForm({ ...form, days: parseInt(e.target.value) || 0 });
                      }}
                    />
                  )}
                  {selectedDayCharge && selectedDayCharge.regularCharges != null && (
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      ₹{selectedDayCharge.regularCharges}
                    </span>
                  )}
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Instructions</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <textarea
                      placeholder="Auto-generated from selections"
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-main)', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-card)', color: 'var(--pp-ink)' }}
                      value={form.instructions}
                      onChange={e => {
                        setManualInstruction(true);
                        setForm({ ...form, instructions: e.target.value });
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {saveMutation.isPending ? '...' : editingId ? '✓' : <Plus size={20} />}
                      </button>
                      {editingId && (
                        <button
                          onClick={() => { setEditingId(null); setManualInstruction(false); setForm({ remedyName: '', potencyName: '', frequencyName: '', days: 0, instructions: '', notes: '' }); }}
                          style={{ background: 'var(--pp-warm-2)', color: 'var(--pp-text-3)', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ padding: '12px 16px', background: 'var(--pp-blue-faded)', borderBottom: '1px solid var(--pp-blue-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} style={{ color: 'var(--pp-blue)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--pp-blue)' }}>Prescription History</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', fontWeight: 600, marginLeft: '4px' }}>({history?.length || 0})</span>
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : (
              <table className="pp-table" style={{ marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--pp-warm-2)' }}>
                  <tr>
                    <th>DATE</th>
                    <th>REMEDY</th>
                    <th>POTENCY</th>
                    <th>FREQUENCY</th>
                    <th>DAYS</th>
                    <th>INSTRUCTIONS</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const isFormActive = form.remedyName || form.potencyName || form.frequencyName;
                    if (activeTab === 'rx' && !editingId && !isFormActive && !isRxToday) {
                      return (
                        <tr className="mc-ghost-row" style={{ background: 'linear-gradient(to right, #f8fafc, #ffffff)', borderLeft: '3px solid #cbd5e1', borderBottom: '1px dashed #e2e8f0' }}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.6 }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>{new Date().getDate()}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
                                {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
                              </span>
                            </div>
                          </td>
                          <td colSpan={5}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--pp-text-3)', fontWeight: 500, fontSize: '0.85rem', fontStyle: 'italic' }}>
                              <div className="animate-pulse" style={{ display: 'flex', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%' }} />
                                <div style={{ width: '6px', height: '6px', background: '#cbd5e1', borderRadius: '50%' }} />
                                <div style={{ width: '6px', height: '6px', background: '#e2e8f0', borderRadius: '50%' }} />
                              </div>
                              Start typing remedy details above...
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => setActiveTab(null)} 
                              style={{ 
                                padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                  {groupedHistory.map((group) => (
                    <React.Fragment key={group.date}>
                      {group.items.map((rx, idx) => {
                        const isExpanded = expandedDates.has(group.date);
                        if (idx > 0 && !isExpanded) return null;

                        return (
                          <tr 
                            key={rx.id} 
                            className={`hover-row ${editingId === rx.id ? 'editing' : ''}`}
                            style={{ 
                              cursor: onSelectDate ? 'pointer' : 'default',
                              background: idx > 0 ? '#f8fafc' : 'white',
                              borderLeft: idx > 0 ? '3px solid #e2e8f0' : 'none'
                            }}
                            onClick={() => onSelectDate?.(rx.created_at || rx.createdAt || rx.dateval)}
                          >
                            <td>
                              {idx === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
                                    {new Date(rx.created_at || rx.createdAt || rx.dateval).getDate()}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
                                    {new Date(rx.created_at || rx.createdAt || rx.dateval).toLocaleString('default', { month: 'short' })} {new Date(rx.created_at || rx.createdAt || rx.dateval).getFullYear()}
                                  </span>
                                  {group.items.length > 1 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleDate(group.date); }}
                                      style={{ 
                                        marginTop: '6px', padding: '3px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', 
                                        background: isExpanded ? 'var(--pp-blue)' : '#f1f5f9', 
                                        color: isExpanded ? 'white' : '#64748b', 
                                        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      {isExpanded ? <X size={10} /> : <Plus size={10} />}
                                      {isExpanded ? 'Hide' : `+${group.items.length - 1} more`}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ marginLeft: '12px', borderLeft: '2px dashed #cbd5e1', height: '20px' }} />
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--pp-ink)', letterSpacing: '-0.01em' }}>
                                {rx.remedy_name}
                              </div>
                            </td>
                            <td>
                              <span style={{ padding: '4px 12px', background: 'var(--pp-warm-1)', border: '1px solid var(--border-main)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
                                {rx.potency_name}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: 'var(--pp-blue)', fontWeight: 700, fontSize: '0.9rem' }}>{rx.frequency_name}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-ink)' }}>{rx.days}</span>
                            </td>
                            <td>
                              <div style={{ 
                                maxHeight: '60px', 
                                overflowY: 'auto', 
                                fontSize: '0.82rem', 
                                color: 'var(--pp-text-3)', 
                                lineHeight: 1.4,
                                width: '220px',
                                paddingRight: '8px',
                                background: (rx.prescription || rx.notes) ? '#f8fafc' : 'transparent',
                                borderRadius: '6px',
                                padding: (rx.prescription || rx.notes) ? '4px 8px' : '0'
                              }} className="custom-scrollbar">
                                {rx.prescription || rx.notes || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>No instructions</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="mc-table-actions">
                                <div className="mc-desktop-actions">
                                  <button onClick={(e) => { e.stopPropagation(); handleRepeatRow(rx); }} className="mc-action-btn" title="Repeat"><History size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(rx); }} className="mc-action-btn" title="Edit"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(rx.id, rx.remedy_name); }} className="mc-action-btn danger" title="Remove"><Trash2 size={14} /></button>
                                </div>
                                <div className="mc-mobile-actions">
                                  <button className="mc-dots-btn"><MoreHorizontal size={18} /></button>
                                  <div className="mc-dots-dropdown">
                                    <button onClick={(e) => { e.stopPropagation(); handleRepeatRow(rx); }}><History size={14} /> Repeat</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(rx); }}><Edit size={14} /> Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(rx.id, rx.remedy_name); }} style={{ color: '#dc2626' }}><Trash2 size={14} /> Remove</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {history?.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', color: 'var(--pp-text-3)', textAlign: 'center' }}>
                        No previous prescriptions found for this patient. Add a new prescription above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={history?.length || 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {activeTab === 'image' && (
        <ImageUploadTab regid={Number(regid)} />
      )}

      {/* Premium Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="premium-alert-content" style={{ maxWidth: '440px', borderRadius: '24px', padding: '32px' }}>
          <DialogHeader className="premium-alert-header" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              background: isRxToday ? 'rgba(245, 158, 11, 0.1)' : 'rgba(37, 99, 235, 0.1)', 
              color: isRxToday ? '#f59e0b' : '#2563eb', 
              width: '64px', height: '64px', borderRadius: '20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' 
            }}>
              {isRxToday ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <DialogTitle className="premium-alert-title" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--pp-ink)' }}>
              {isRxToday ? 'Already Added' : 'Confirm Prescription'}
            </DialogTitle>
            <DialogDescription className="premium-alert-description" style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--pp-text-3)' }}>
              {isRxToday ? (
                <>
                  A follow-up for <strong style={{ color: '#f59e0b' }}>today</strong> has already been recorded. 
                  <br />
                  To add additional remedies to this session, please use the <strong style={{ color: 'var(--pp-blue)' }}>Add Extra</strong> button.
                </>
              ) : (
                <>
                  Are you sure you want to create an Rx for 
                  <span className="delivery-highlight" style={{ marginLeft: '4px', fontWeight: 700, color: '#2563eb' }}>
                    {delivery === 'clinic' && <Home size={14} style={{ marginRight: '4px' }} />}
                    {delivery === 'courier' && <Truck size={14} style={{ marginRight: '4px' }} />}
                    {delivery === 'pickup' && <Package size={14} style={{ marginRight: '4px' }} />}
                    {delivery}
                  </span>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="premium-alert-footer" style={{ marginTop: '32px', gap: '12px', justifyContent: 'center' }}>
            {isRxToday ? (
              <button 
                className="btn-premium-confirm" 
                onClick={() => setShowConfirm(false)}
                style={{ padding: '12px 32px', borderRadius: '14px', fontWeight: 700, border: 'none', background: 'var(--pp-ink)', color: 'white' }}
              >
                Got it, Thanks
              </button>
            ) : (
              <>
                <button 
                  className="btn-premium-cancel" 
                  onClick={() => setShowConfirm(false)}
                  style={{ padding: '12px 24px', borderRadius: '14px', fontWeight: 700, border: '1px solid var(--border-main)', background: 'transparent' }}
                >
                  No, Go Back
                </button>
                <button 
                  className="btn-premium-confirm" 
                  onClick={() => { onStartRx?.(); setActiveTab('rx'); setShowConfirm(false); }}
                  style={{ 
                    padding: '12px 32px', borderRadius: '14px', fontWeight: 700, border: 'none', 
                    background: '#2563eb', color: 'white',
                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  Yes, Proceed
                </button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Repeat Warning Dialog */}
      <Dialog open={showRepeatWarning} onOpenChange={setShowRepeatWarning}>
        <DialogContent className="premium-alert-content" style={{ maxWidth: '440px', borderRadius: '24px', padding: '32px' }}>
          <DialogHeader className="premium-alert-header" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              color: '#f59e0b', 
              width: '64px', height: '64px', borderRadius: '20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' 
            }}>
              <AlertTriangle size={32} />
            </div>
            <DialogTitle className="premium-alert-title" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--pp-ink)' }}>
              Cannot Repeat
            </DialogTitle>
            <DialogDescription className="premium-alert-description" style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--pp-text-3)' }}>
              A prescription for <strong style={{ color: '#f59e0b' }}>today</strong> already exists. 
              <br /><br />
              Starting a "Repeat" session creates a fresh follow-up. Since today's follow-up is already recorded, please use the <strong style={{ color: 'var(--pp-blue)' }}>Add Extra</strong> button to add more remedies to the current session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="premium-alert-footer" style={{ marginTop: '32px', justifyContent: 'center' }}>
            <button 
              className="btn-premium-confirm" 
              onClick={() => setShowRepeatWarning(false)}
              style={{ 
                padding: '12px 48px', borderRadius: '14px', fontWeight: 700, border: 'none', 
                background: 'var(--pp-ink)', color: 'white',
                boxShadow: '0 8px 16px rgba(15, 23, 42, 0.15)'
              }}
            >
              Understood
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function ImageUploadTab({ regid }: { regid: number }) {
  const { saveImage } = useManageClinicalRecords();
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('regid', String(regid));
    formData.append('description', description || 'Clinical Evidence');
    formData.append('files', file);

    try {
      await saveImage.mutateAsync(formData);
      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div 
        style={{ 
          background: 'var(--pp-warm-1)', 
          border: '1.5px dashed var(--border-main)', 
          borderRadius: '16px', 
          padding: '48px 24px', 
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s'
        }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--pp-blue)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
      >
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileChange}
          accept="image/*,.pdf"
          disabled={uploading}
        />
        
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pp-blue)' }} />
            <div style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>Processing...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'var(--pp-blue)' }}>
              <Plus size={28} />
            </div>
            <div>
              <div style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                {file ? file.name : 'Click to upload clinical image'}
              </div>
              <div style={{ color: 'var(--pp-text-3)', fontSize: '0.85rem', fontWeight: 500 }}>
                PNG, JPG or PDF (Max 10MB)
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          className="pp-input"
          placeholder="Enter image description (e.g. Scan 1, Notes...)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ flex: 1, padding: '12px 16px' }}
        />
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ padding: '0 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', opacity: !file ? 0.6 : 1 }}
        >
          {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
          Upload Image
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--pp-warm-2)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span>
        <span>These images will also appear in the <strong>Media</strong> tab of the patient record.</span>
      </div>
    </div>
  );
}
