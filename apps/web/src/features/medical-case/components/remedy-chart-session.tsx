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
import { SearchableSelect } from './searchable-select';
import { usePrescriptionWorkflow } from '../hooks/use-prescription-workflow';
import '../styles/premium-buttons.css';

// Removed local SearchableSelect in favor of shared component

export function RemedyChartSession({ 
  regid, 
  visitId,
  onDayChargeChange, 
  onSelectDate,
  onStartRx,
  workflow,
  lookups,
  dayCharges = [],
  selectedDate
}: { 
  regid?: number, 
  visitId?: number,
  onDayChargeChange?: (amount: number) => void,
  onSelectDate?: (date: string) => void,
  onStartRx?: () => void,
  workflow: ReturnType<typeof usePrescriptionWorkflow>,
  lookups: any,
  dayCharges: any[],
  selectedDate?: string | null
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const {
    history, isLoading, isRxToday, firstRxOfToday,
    form, setForm, editingId, setEditingId,
    delivery, setDelivery, manualInstruction, setManualInstruction,
    startNewRx, repeatRx, saveMutation, deleteMutation,
    activeTab, setActiveTab
  } = workflow;

  const [showConfirm, setShowConfirm] = useState(false);
  const [showRepeatWarning, setShowRepeatWarning] = useState(false);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  // 1. Group all history items by date FIRST for accurate daily pagination
  const allGroupedHistory = useMemo(() => {
    if (!history) return [];
    const groups: { date: string; items: any[] }[] = [];
    
    // History is assumed to be sorted by date DESC from the API
    history.forEach(rx => {
      const dateVal = rx.created_at || rx.dateval;
      if (!dateVal) return;
      const date = new Date(dateVal).toDateString();
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.items.push(rx);
      } else {
        groups.push({ date, items: [rx] });
      }
    });

    // Sort items within each group by id ASC so the oldest (first) is idx 0
    groups.forEach(g => {
      g.items.sort((a, b) => a.id - b.id);
    });

    return groups;
  }, [history]);

  // 2. Paginate the date groups
  const totalItems = allGroupedHistory.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const groupedHistory = allGroupedHistory.slice(startIndex, startIndex + pageSize);

  const dayOptions = useMemo(() => {
    return dayCharges.map((dc: any) => String(dc.days)).filter(Boolean);
  }, [dayCharges]);

  const selectedDayCharge = useMemo(() => {
    if (!form.days) return null;
    return dayCharges.find((dc: any) => String(dc.days) === String(form.days));
  }, [form.days, dayCharges]);

  // Click outside to hide Rx form
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeTab === 'rx' && formRef.current && !formRef.current.contains(event.target as Node)) {
        // Only hide if we aren't clicking an action button that would re-open it
        const target = event.target as HTMLElement;
        if (!target.closest('.mc-tab-btn-premium') && !target.closest('.mc-action-btn')) {
          setActiveTab(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (onDayChargeChange && selectedDayCharge) {
      onDayChargeChange(selectedDayCharge.regularCharges || 0);
    }
  }, [selectedDayCharge, onDayChargeChange]);

  const handleEdit = (rx: PrescriptionRow) => {
    setActiveTab('rx');
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
    const lastRx = history[0];
    if (!lastRx) return;
    repeatRx(lastRx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Removed duplicate startNewRx and auto-save useEffect as they are now provided by the workflow hook

  const handleRepeatRow = (rx: PrescriptionRow) => {
    repeatRx(rx);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px',  width: '100%', boxSizing: 'border-box' }}>
        <div className="mc-action-bar">
          {/* Action Tabs & Dispensing Indicator - Adaptive grid for better mobile fit */}
          <div className="mc-action-group" style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(0, 1fr))', 
            gap: '8px', 
            width: '100%' 
          }}>
            <button
              onClick={() => setShowConfirm(true)}
              className={`mc-tab-btn-premium ${activeTab === 'rx' && !isRxToday ? 'active' : ''}`}
              style={{ width: '100%' }}
            >
              Rx
            </button>
            <button
              onClick={() => handleRepeat()}
              className="mc-tab-btn-premium"
              style={{ width: '100%' }}
            >
              Repeat
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`mc-tab-btn-premium ${activeTab === 'image' ? 'active' : ''}`}
              style={{ width: '100%' }}
            >
              Add Image
            </button>

            {/* Dispensing Mode Indicator - Now part of the equal-width grid */}
            <div className="mc-service-indicator" style={{ width: '100%', minWidth: 0, justifyContent: 'center', padding: isMobile ? '8px' : '12px' }}>
              <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Service:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pp-blue)', fontWeight: 800, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                {delivery === 'clinic' && <><Home size={14} /> <span>clinic</span></>}
                {delivery === 'courier' && <><Truck size={14} /> <span>courier</span></>}
                {delivery === 'pickup' && <><Package size={14} /> <span>pickup</span></>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(activeTab === 'rx' || activeTab === null) && (
        <div>
          {/* Inline Form - Only visible when Rx tab is active */}
          {activeTab === 'rx' && (
            <div ref={formRef} className="animate-slide-in-top" style={{ 
              background: 'var(--pp-blue-faded)', 
              borderRadius: '16px', 
              padding: '20px', 
              marginBottom: '24px', 
              border: '1.5px solid var(--pp-blue-border)',
              position: 'relative',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.1)'
            }}>
              <button 
                onClick={() => setActiveTab(null)}
                style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', color: 'var(--pp-blue)', cursor: 'pointer', opacity: 0.6 }}
              >
                <X size={18} />
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                {(!isRxToday || (editingId && firstRxOfToday && editingId === firstRxOfToday.id)) && (
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
                )}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Instructions:</label>
                  <textarea
                    placeholder="Enter manual instructions for this remedy..."
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      border: '1px solid var(--border-main)', 
                      borderRadius: '10px', 
                      fontSize: '0.85rem', 
                      minHeight: '60px', 
                      resize: 'vertical', 
                      fontFamily: 'inherit', 
                      boxSizing: 'border-box', 
                      background: 'white', 
                      color: 'var(--pp-ink)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    value={form.instructions}
                    onChange={e => {
                      setManualInstruction(true);
                      setForm({ ...form, instructions: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ padding: '12px 16px', background: 'var(--pp-blue-faded)', borderBottom: '1px solid var(--pp-blue-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} style={{ color: 'var(--pp-blue)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--pp-blue)' }}>Prescription History</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', fontWeight: 600, marginLeft: '4px' }}>({allGroupedHistory.length || 0} Sessions)</span>
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : (
              <table className="mc-data-table" style={{ marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--pp-warm-2)' }}>
                  <tr>
                    <th>DATE</th>
                    <th>REMEDY</th>
                    <th>POTENCY</th>
                    <th>FREQUENCY</th>
                    <th className="mc-col-days">DAYS</th>
                    <th className="mc-col-instructions">INSTRUCTIONS</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => null)()}
                  {groupedHistory.map((group) => (
                    <React.Fragment key={group.date}>
                      {group.items.map((rx, idx) => {
                        const isExpanded = expandedDates.has(group.date);
                        if (idx > 0 && !isExpanded) return null;

                        const isRowSelected = selectedDate && new Date(rx.created_at || rx.createdAt || rx.dateval).toDateString() === new Date(selectedDate).toDateString();

                        return (
                          <tr 
                            key={rx.id} 
                            className={`hover-row ${editingId === rx.id ? 'editing' : ''} ${isRowSelected ? 'mc-row-selected' : ''}`}
                            style={{ 
                              cursor: onSelectDate ? 'pointer' : 'default',
                              background: isRowSelected ? 'var(--pp-blue-faded)' : (idx > 0 ? '#f8fafc' : 'white'),
                              borderLeft: isRowSelected ? '4px solid var(--pp-blue)' : (idx > 0 ? '3px solid #e2e8f0' : 'none'),
                              transition: 'all 0.2s'
                            }}
                            onClick={() => {
                              onSelectDate?.(rx.created_at || rx.createdAt || rx.dateval);
                              if (activeTab === 'rx') setActiveTab(null);
                            }}
                          >
                            <td data-label="Date">
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
                            <td data-label="Remedy">
                              <div className="remedy-name">
                                {rx.remedy_name}
                              </div>
                            </td>
                            <td data-label="Potency">
                              <span style={{ padding: '4px 12px', background: 'var(--pp-warm-1)', border: '1px solid var(--border-main)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
                                {rx.potency_name}
                              </span>
                            </td>
                            <td data-label="Frequency">
                              <span style={{ color: 'var(--pp-blue)', fontWeight: 700, fontSize: '0.9rem' }}>{rx.frequency_name}</span>
                            </td>
                            <td data-label="Days" className="mc-col-days">
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-ink)' }}>{rx.days}</span>
                            </td>
                            <td data-label="Instructions" className="mc-col-instructions">
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
                            <td data-label="Actions" style={{ textAlign: 'right' }}>
                              <div className="mc-table-actions">
                                <div className="mc-desktop-actions">
                                  <button onClick={(e) => { e.stopPropagation(); handleRepeatRow(rx); }} className="mc-action-btn" title="Repeat"><History size={14} /></button>
                                  {(() => {
                                    const rxDate = new Date(rx.created_at || rx.createdAt || rx.dateval);
                                    const isToday = rxDate.toDateString() === new Date().toDateString();
                                    if (!isToday) return null;
                                    return (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); startNewRx(); }} className="mc-action-btn" title="Add Extra"><Plus size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(rx); }} className="mc-action-btn" title="Edit"><Edit size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(rx.id, rx.remedy_name); }} className="mc-action-btn danger" title="Remove"><Trash2 size={14} /></button>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="mc-mobile-actions">
                                  <button className="mc-dots-btn"><MoreHorizontal size={18} /></button>
                                  <div className="mc-dots-dropdown">
                                    <button onClick={(e) => { e.stopPropagation(); handleRepeatRow(rx); }}><History size={14} /> Repeat</button>
                                    {(() => {
                                      const rxDate = new Date(rx.created_at || rx.createdAt || rx.dateval);
                                      const isToday = rxDate.toDateString() === new Date().toDateString();
                                      if (!isToday) return null;
                                      return (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); startNewRx(); }}><Plus size={14} /> Add Extra</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleEdit(rx); }}><Edit size={14} /> Edit</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleDelete(rx.id, rx.remedy_name); }} style={{ color: '#dc2626' }}><Trash2 size={14} /> Remove</button>
                                        </>
                                      );
                                    })()}
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
            totalItems={totalItems}
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
                  <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pp-ink)', marginBottom: '8px' }}>Dispensing Mode (Service):</div>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={delivery}
                        onChange={(e) => setDelivery(e.target.value)}
                        disabled={isRxToday}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 44px',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          cursor: isRxToday ? 'not-allowed' : 'pointer',
                          appearance: 'none',
                          background: isRxToday ? 'var(--pp-warm-1)' : 'white',
                          border: '1px solid var(--pp-blue-border)',
                          color: 'var(--pp-ink)',
                          outline: 'none',
                          opacity: isRxToday ? 0.7 : 1
                        }}
                      >
                        <option value="clinic">clinic</option>
                        <option value="courier">courier</option>
                        <option value="pickup">pickup</option>
                      </select>
                      <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-blue)', pointerEvents: 'none', display: 'flex' }}>
                        {delivery === 'clinic' && <Home size={20} />}
                        {delivery === 'courier' && <Truck size={20} />}
                        {delivery === 'pickup' && <Package size={20} />}
                      </div>
                      <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)', pointerEvents: 'none', display: 'flex' }}>
                        <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
                      </div>
                    </div>
                  </div>
                  Are you sure you want to proceed with this Rx session?
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
                  onClick={() => { setShowConfirm(false); startNewRx(); onStartRx?.(); }}
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
