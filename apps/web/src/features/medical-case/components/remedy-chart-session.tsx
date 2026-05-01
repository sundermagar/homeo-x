import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, BookOpen, ChevronRight, Activity,
  FlaskConical, Save, Trash2, Calendar, FileText, Printer, Plus, X
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
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          backgroundColor: 'white',
          cursor: 'pointer',
          minHeight: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: value ? '#0f172a' : '#94a3b8'
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
          backgroundColor: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          marginTop: '4px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
                fontSize: '0.8rem'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '0.8rem' }}>No matches</div>
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
                    color: '#334155',
                    borderBottom: i < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
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

export function RemedyChartSession({ regid }: { regid?: number }) {
  const { data: lookups } = useRemedyLookups();
  const { data: history, isLoading } = usePatientPrescriptions(regid || 0);

  const [activeTab, setActiveTab] = useState('rx');
  const [delivery, setDelivery] = useState('clinic');

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
  };

  const handleEdit = (rx: PrescriptionRow) => {
    setEditingId(rx.id);
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
    const lastRx = history[0];
    if (!lastRx) return;
    try {
      await saveMutation.mutateAsync({
        regid: regid!,
        remedyName: lastRx.remedy_name,
        potencyName: lastRx.potency_name,
        frequencyName: lastRx.frequency_name,
        days: lastRx.days,
        instructions: lastRx.prescription || lastRx.notes || '',
        notes: lastRx.notes || '',
        deliveryMode: delivery
      });
      setActiveTab('rx');
    } catch (err) {
      console.error('Failed to repeat:', err);
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Top Header Row Matching Image 2 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Action Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('rx')}
              style={{ padding: '8px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'rx' ? '#1e3a8a' : '#f8fafc', color: activeTab === 'rx' ? 'white' : '#64748b' }}
            >
              Rx
            </button>
            <button
              onClick={() => handleRepeat()}
              style={{ padding: '8px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'repeat' ? '#1e3a8a' : '#f8fafc', color: activeTab === 'repeat' ? 'white' : '#64748b' }}
            >
              Repeat
            </button>
            <button
              onClick={() => setActiveTab('image')}
              style={{ padding: '8px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'image' ? '#1e3a8a' : '#f8fafc', color: activeTab === 'image' ? 'white' : '#64748b' }}
            >
              Add Image
            </button>
          </div>

          {/* Delivery Modes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['clinic', 'courier', 'pickup'].map(mode => (
              <button
                key={mode}
                onClick={() => setDelivery(mode)}
                style={{
                  padding: '8px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  background: 'white',
                  border: delivery === mode ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  color: delivery === mode ? '#2563eb' : '#64748b'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={() => {
            const authStorage = localStorage.getItem('auth-storage');
            const token = authStorage ? JSON.parse(authStorage).state.token : '';
            window.open(`/api/medical-cases/remedy-chart/pdf/${regid}?token=${token}`, '_blank');
          }}
          style={{ background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px rgba(30,58,138,0.2)' }}
        >
          <Printer size={16} /> Print Prescription
        </button>
      </div>

      {activeTab === 'rx' && (
        <div style={{ padding: '16px 24px' }}>
          {/* Inline Form */}
          {editingId && (
            <div style={{ padding: '6px 12px', marginBottom: '12px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
              ✏️ Editing prescription — make changes and click <strong>✓ Update</strong>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 2fr', gap: '16px', alignItems: 'end', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Remedy:</label>
              <SearchableSelect
                value={form.remedyName}
                onChange={val => setForm({ ...form, remedyName: val })}
                options={lookups?.medicines?.map(m => m.name) || []}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Potency:</label>
              <SearchableSelect
                value={form.potencyName}
                onChange={val => setForm({ ...form, potencyName: val })}
                options={lookups?.potencies?.map(p => p.name) || []}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Frequency:</label>
              <SearchableSelect
                value={form.frequencyName}
                onChange={val => {
                  const freq = lookups?.frequencies?.find(f => f.name === val);
                  setForm({
                    ...form,
                    frequencyName: val,
                    instructions: freq?.instruction || form.instructions
                  });
                }}
                options={lookups?.frequencies?.map(f => f.name) || []}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Days:</label>
              <input
                type="number"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                value={form.days}
                onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Instructions</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Prescription"
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                  value={form.instructions}
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                />
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  {saveMutation.isPending ? '...' : editingId ? '✓' : <Plus size={20} />}
                </button>
                {editingId && (
                  <button
                    onClick={() => { setEditingId(null); setForm({ remedyName: '', potencyName: '', frequencyName: '', days: 0, instructions: '', notes: '' }); }}
                    style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
            {isLoading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : (
              <table className="pp-table">
                <thead>
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
                  {currentHistory.map((rx) => (
                    <tr key={rx.id} className="hover-row">
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b' }}>{new Date(rx.created_at).getDate()}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                            {new Date(rx.created_at).toLocaleString('default', { month: 'short' })} {new Date(rx.created_at).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em' }}>
                          {rx.remedy_name}
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '4px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                          {rx.potency_name}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.9rem' }}>{rx.frequency_name}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{rx.days}</span>
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <div className="text-small" style={{ color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                          {rx.prescription || rx.notes || '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEdit(rx)}
                            className="dash-action-btn"
                            style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rx.id, rx.remedy_name)}
                            disabled={deleteMutation.isPending}
                            className="dash-action-btn"
                            style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {deleteMutation.isPending ? '...' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {history?.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', color: 'var(--pp-text-3)', textAlign: 'center' }}>No prescriptions added.</td>
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
      <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
        {preview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={preview} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            <div style={{ background: '#eff6ff', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Plus size={24} />
            </div>
            <div style={{ color: '#0f172a', fontWeight: 600 }}>Click to upload clinical image</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>PNG, JPG or PDF (Max 10MB)</div>
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

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          💡 These images will also appear in the <strong>Media</strong> tab of the patient record.
        </p>
      </div>
    </div>
  );
}
