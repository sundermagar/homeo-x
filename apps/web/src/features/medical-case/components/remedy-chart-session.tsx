import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, BookOpen, ChevronRight, Activity,
  FlaskConical, Save, Trash2, Calendar, FileText, Printer, Plus, X,
  History, Edit, MoreHorizontal, Truck, Home, Package, AlertTriangle, CheckCircle2,
  Upload, Loader2
} from 'lucide-react';

/** A custom, premium Circle-A icon indicating "Additional Charge" or "Add" */
function AdditionalChargeIcon({ size = 14, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8l-3.5 8" />
      <path d="M12 8l3.5 8" />
      <path d="M9.5 13.5h5" />
    </svg>
  );
}
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

/** Safely extract delivery mode from a prescription row (handles all property name variants). */
function getRowDeliveryMode(rx: any): string {
  const mode = rx?.deliveryMode || rx?.deliverymode || rx?.delivery_mode;
  if (mode && ['clinic', 'courier', 'pickup'].includes(mode)) return mode;
  return 'clinic';
}

export function RemedyChartSession({ 
  regid, 
  visitId,
  onDayChargeChange, 
  onSelectDate,
  onStartRx,
  workflow,
  lookups,
  dayCharges = [],
  selectedDate,
  onAddAdditionalCharge
}: { 
  regid?: number, 
  visitId?: number,
  onDayChargeChange?: (amount: number) => void,
  onSelectDate?: (date: string) => void,
  onStartRx?: () => void,
  workflow: ReturnType<typeof usePrescriptionWorkflow>,
  lookups: any,
  dayCharges: any[],
  selectedDate?: string | null,
  onAddAdditionalCharge?: () => void
}) {
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

  const canViewBilling = useAuthStore(s => s.user?.permissions?.canViewBilling ?? true);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return true;
    return new Date(selectedDate).toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  }, [currentHistory]);

  const dayOptions = useMemo(() => {
    return dayCharges.map((dc: any) => String(dc.days)).filter(Boolean);
  }, [dayCharges]);

  const selectedDayCharge = useMemo(() => {
    if (!form.days) return null;
    return dayCharges.find((dc: any) => String(dc.days) === String(form.days));
  }, [form.days, dayCharges]);

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

  const handleRepeat = async () => {
    if (!history || history.length === 0) return alert('No previous prescription to repeat.');
    
    // Find the last valid prescription that actually has a remedy
    let lastValidRx = history.find(rx => {
      const remedy = rx.remedy_name || (rx as any).remedyName;
      return remedy && remedy.trim().length > 0;
    });

    if (!lastValidRx) {
       // Fallback to the first one that is from a previous date
       lastValidRx = history.find(rx => {
         const dateVal = rx.created_at || (rx as any).createdAt || rx.dateval;
         return dateVal && new Date(dateVal).toDateString() !== new Date().toDateString();
       });
    }

    if (!lastValidRx) lastValidRx = history[0];

    await repeatRx(lastValidRx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Removed duplicate startNewRx and auto-save useEffect as they are now provided by the workflow hook

  const handleRepeatRow = async (rx: PrescriptionRow) => {
    await repeatRx(rx);
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
    const dateParam = rx.created_at || (rx as any).createdAt || rx.dateval;
    const queryStr = dateParam ? `&date=${encodeURIComponent(new Date(dateParam).toISOString())}` : '';
    
    const envUrl = import.meta.env['VITE_API_URL'];
    const apiBase = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : '/api';
    const url = `${apiBase}/medical-cases/remedy-chart/pdf/${regid}?token=${token}${queryStr}`;
    
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

          <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ padding: '12px 16px', background: 'var(--pp-blue-faded)', borderBottom: '1px solid var(--pp-blue-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} style={{ color: 'var(--pp-blue)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--pp-blue)' }}>Prescription History</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', fontWeight: 600, marginLeft: '4px' }}>({history?.length || 0})</span>
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : (
              <table className="mc-data-table" style={{ marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f5f3ff', borderBottom: '1px solid #ede9fe' }}>
                  <tr>
                    <th style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>DATE</th>
                    <th style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>REMEDY</th>
                    <th style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>POTENCY</th>
                    <th style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>FREQUENCY</th>
                    <th className="mc-col-days" style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>DAYS</th>
                    <th className="mc-col-instructions" style={{ color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', padding: '10px 6px' }}>INSTRUCTIONS</th>
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
                              background: isRowSelected ? '#f5f3ff' : (idx > 0 ? '#faf5ff' : 'white'),
                              borderLeft: isRowSelected ? '4px solid #7c3aed' : (idx > 0 ? '3px solid #e9d5ff' : 'none'),
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => onSelectDate?.(rx.created_at || rx.createdAt || rx.dateval)}
                          >
                            <td data-label="Date" style={{ padding: '8px 6px' }}>
                              {idx === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div className="remedy-date-val" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
                                    {new Date(rx.created_at || rx.createdAt || rx.dateval).getDate()}
                                  </div>
                                  <div className="remedy-date-mo" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
                                    {new Date(rx.created_at || rx.createdAt || rx.dateval).toLocaleString('default', { month: 'short' })} {new Date(rx.created_at || rx.createdAt || rx.dateval).getFullYear()}
                                  </div>
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
                            <td data-label="Remedy" style={{ padding: '8px 6px' }}>
                              <div className="remedy-name">
                                {rx.remedy_name}
                              </div>
                            </td>
                            <td data-label="Potency" style={{ padding: '8px 6px' }}>
                              <span style={{ padding: '4px 10px', background: 'var(--pp-warm-1)', border: '1px solid var(--border-main)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>
                                {rx.potency_name}
                              </span>
                            </td>
                            <td data-label="Frequency" style={{ padding: '8px 6px' }}>
                              <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.9rem' }}>{rx.frequency_name}</span>
                            </td>
                            <td data-label="Days" className="mc-col-days" style={{ padding: '8px 6px' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-ink)' }}>{rx.days}</span>
                            </td>
                            <td data-label="Instructions" className="mc-col-instructions" style={{ padding: '8px 6px' }}>
                              <div style={{ 
                                maxHeight: '60px', 
                                overflowY: 'auto', 
                                fontSize: '0.82rem', 
                                color: 'var(--pp-text-3)', 
                                lineHeight: 1.4,
                                width: '130px',
                                paddingRight: '8px',
                                background: (rx.prescription || rx.notes) ? '#f8fafc' : 'transparent',
                                borderRadius: '6px',
                                padding: (rx.prescription || rx.notes) ? '4px 8px' : '0'
                              }} className="custom-scrollbar">
                                {rx.prescription || rx.notes || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>No instructions</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {history?.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', color: 'var(--pp-text-3)', textAlign: 'center' }}>
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
  );
}
function ImageUploadTab({ regid }: { regid: number }) {
  const { saveImage } = useManageClinicalRecords();
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (selected.type.startsWith('image/') || selected.type.startsWith('video/') || selected.type.startsWith('audio/')) {
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
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
          padding: file ? '24px' : '48px 24px', 
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
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
          accept="image/*,video/*,audio/*,application/pdf"
          disabled={uploading}
        />
        
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pp-blue)' }} />
            <div style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>Processing...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                {file.type.startsWith('image/') && previewUrl && (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{ 
                      maxHeight: '180px', 
                      maxWidth: '100%', 
                      borderRadius: '12px', 
                      objectFit: 'contain', 
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)' 
                    }} 
                  />
                )}
                {file.type.startsWith('video/') && previewUrl && (
                  <video 
                    src={previewUrl} 
                    controls 
                    style={{ 
                      maxHeight: '180px', 
                      maxWidth: '100%', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)' 
                    }} 
                  />
                )}
                {file.type.startsWith('audio/') && previewUrl && (
                  <div style={{ width: '100%', maxWidth: '320px', padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>🎵 Audio Recording</div>
                    <audio src={previewUrl} controls style={{ width: '100%' }} />
                  </div>
                )}
                {(!previewUrl || (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/'))) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                    <span style={{ fontSize: '2.5rem' }}>📄</span>
                    <div style={{ color: 'var(--pp-ink)', fontWeight: 700 }}>{file.name}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                    {file.name}
                  </div>
                  <div style={{ color: 'var(--pp-blue)', fontSize: '0.8rem', fontWeight: 700 }}>
                    Click to select a different file
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'var(--pp-blue)' }}>
                  <Plus size={28} />
                </div>
                <div>
                  <div style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                    click to select media
                  </div>
                  <div style={{ color: 'var(--pp-text-3)', fontSize: '0.85rem', fontWeight: 500 }}>
                    Images, Audio, Video or PDF (Max 10MB)
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          className="pp-input"
          placeholder="add notes"
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
          upload
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--pp-warm-2)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span>
        <span>These files will also appear in the <strong>Media</strong> tab of the patient record.</span>
      </div>
    </div>
  );
}
