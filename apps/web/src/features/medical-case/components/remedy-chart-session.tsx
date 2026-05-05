import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, BookOpen, ChevronRight, Activity,
  FlaskConical, Save, Trash2, Calendar, FileText, Printer, Plus, X,
  History, Edit, MoreHorizontal, Truck, Home, Package
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

export function RemedyChartSession({ regid, onDayChargeChange }: { regid?: number, onDayChargeChange?: (amount: number) => void }) {
  const { data: lookups } = useRemedyLookups();
  const { data: history, isLoading } = usePatientPrescriptions(regid || 0);
  const { data: dayCharges = [] } = useDayCharges();

  const [activeTab, setActiveTab] = useState('rx');
  const [delivery, setDelivery] = useState('clinic');
  const [manualInstruction, setManualInstruction] = useState(false);

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

  const totalPages = Math.ceil((history?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentHistory = history?.slice(startIndex, startIndex + pageSize) || [];

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
      setForm(prev => ({ ...prev, instructions: parts.join('\n') }));
    } else {
      setForm(prev => ({ ...prev, instructions: '' }));
    }
  }, [form.remedyName, form.potencyName, form.frequencyName, form.days, manualInstruction, editingId]);

  useEffect(() => {
    if (onDayChargeChange) {
      onDayChargeChange(selectedDayCharge?.regularCharges || 0);
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

      {/* Top Header Row Matching Image 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 16px 0 16px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
          {/* Action Tabs */}
          <div style={{ display: 'flex', gap: '8px', flex: '1 1 300px', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setActiveTab('rx')}
              style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: activeTab === 'rx' ? 'var(--pp-blue)' : 'var(--pp-warm-2)', color: activeTab === 'rx' ? 'white' : 'var(--pp-text-3)', transition: 'all 0.2s' }}
            >
              Rx
            </button>
            <button
              onClick={() => handleRepeat()}
              style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: 'var(--pp-warm-2)', color: 'var(--pp-text-3)', transition: 'all 0.2s' }}
            >
              Repeat
            </button>
            <button
              onClick={() => setActiveTab('image')}
              style={{ flex: 1, minWidth: '100px', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: activeTab === 'image' ? 'var(--pp-blue)' : 'var(--pp-warm-2)', color: activeTab === 'image' ? 'white' : 'var(--pp-text-3)', transition: 'all 0.2s' }}
            >
              Add Image
            </button>
          </div>

          {/* Delivery Mode Dropdown */}
          <div style={{ flex: '0 0 220px', position: 'relative' }}>
            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
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
        {/* Print Buttons */}

      </div>

      {activeTab === 'rx' && (
        <div style={{ padding: '16px 24px' }}>
          {/* Inline Form */}
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
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentHistory.map((rx) => (
                    <tr key={rx.id} className="hover-row">
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>{new Date(rx.created_at).getDate()}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
                            {new Date(rx.created_at).toLocaleString('default', { month: 'short' })} {new Date(rx.created_at).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--pp-ink)', letterSpacing: '-0.01em' }}>
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
                      <td style={{ textAlign: 'right' }}>
                        <div className="mc-table-actions">
                          {/* Desktop View Actions */}
                          <div className="mc-desktop-actions">
                            <button onClick={() => handleRepeatRow(rx)} className="mc-action-btn" title="Repeat"><History size={14} /></button>
                            <button onClick={() => handleEdit(rx)} className="mc-action-btn" title="Edit"><Edit size={14} /></button>
                            <button onClick={() => handleDelete(rx.id, rx.remedy_name)} className="mc-action-btn danger" title="Remove"><Trash2 size={14} /></button>
                          </div>

                          {/* Mobile 3-Dots Menu */}
                          <div className="mc-mobile-actions">
                            <button className="mc-dots-btn"><MoreHorizontal size={18} /></button>
                            <div className="mc-dots-dropdown">
                              <button onClick={() => handleRepeatRow(rx)}><History size={14} /> Repeat</button>
                              <button onClick={() => handleEdit(rx)}><Edit size={14} /> Edit</button>
                              <button onClick={() => handleDelete(rx.id, rx.remedy_name)} style={{ color: '#dc2626' }}><Trash2 size={14} /> Remove</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {history?.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', color: 'var(--pp-text-3)', textAlign: 'center' }}>
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

    </div>
  );
}

function ImageUploadTab({ regid }: { regid: number }) {
  const { saveImage } = useManageClinicalRecords();
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('regid', String(regid));
    formData.append('description', description);
    formData.append('files', file);

    try {
      await saveImage.mutateAsync(formData);
      setFile(null);
      setPreview(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Image uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--pp-warm-1)', border: '2px dashed var(--border-main)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
        {preview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={preview} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--pp-danger-fg)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            <div style={{ background: 'var(--pp-blue-faded)', color: 'var(--pp-blue)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Plus size={24} />
            </div>
            <div style={{ color: 'var(--pp-ink)', fontWeight: 600 }}>Click to upload clinical image</div>
            <div style={{ color: 'var(--pp-text-3)', fontSize: '0.85rem', marginTop: '4px' }}>PNG, JPG or PDF (Max 10MB)</div>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileChange}
          accept="image/*"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          className="mc-legacy-input"
          placeholder="Enter image description (e.g. Scan 1, Notes...)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="mc-legacy-btn-primary"
          onClick={handleUpload}
          disabled={!file || saveImage.isPending}
          style={{ padding: '0 24px' }}
        >
          {saveImage.isPending ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--border-main)', paddingTop: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)' }}>
          💡 These images will also appear in the <strong>Media</strong> tab of the patient record.
        </p>
      </div>
    </div>
  );
}
