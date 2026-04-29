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
  const { data: history } = usePatientPrescriptions(regid || 0);
  
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

  useEffect(() => {
    if (history && history.length > 0) {
      const mode = history[0].deliveryMode;
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
      
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px' }}>
        <div className="mc-legacy-rx-tabs">
          <button className={`mc-legacy-rx-tab ${activeTab === 'rx' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('rx')}>Rx</button>
          <button className={`mc-legacy-rx-tab ${activeTab === 'repeat' ? 'active' : 'inactive'}`} onClick={() => { handleRepeat(); }}>Repeat</button>
          <button className={`mc-legacy-rx-tab ${activeTab === 'image' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('image')}>Add Image</button>
        </div>
        
        <div className="mc-legacy-delivery-opts">
          <label className={`mc-delivery-option ${delivery === 'clinic' ? 'selected' : ''}`}>
            <input type="radio" name="delivery" checked={delivery === 'clinic'} onChange={() => setDelivery('clinic')} /> Clinic
          </label>
          <label className={`mc-delivery-option ${delivery === 'courier' ? 'selected' : ''}`}>
            <input type="radio" name="delivery" checked={delivery === 'courier'} onChange={() => setDelivery('courier')} /> Courier
          </label>
          <label className={`mc-delivery-option ${delivery === 'pickup' ? 'selected' : ''}`}>
            <input type="radio" name="delivery" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> Pickup
          </label>
        </div>

        <button
          className="mc-print-rx-btn"
          onClick={() => {
            const authStorage = localStorage.getItem('auth-storage');
            const token = authStorage ? JSON.parse(authStorage).state.token : '';
            window.open(`/api/medical-cases/remedy-chart/pdf/${regid}?token=${token}`, '_blank');
          }}
        >
          <Printer size={14} /> Print Prescription
        </button>
      </div>

      {activeTab === 'rx' && (
        <div style={{ padding: '0 16px' }}>
          {/* Inline Form */}
          {editingId && (
            <div style={{ padding: '6px 12px', marginBottom: '8px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
              ✏️ Editing prescription — make changes and click <strong>✓ Update</strong>
            </div>
          )}
          <div className="mc-legacy-form-row" style={editingId ? { border: '1px solid #3b82f6', borderRadius: '6px', padding: '8px' } : {}}>
            <div className="mc-legacy-input-group">
              <label>Remedy:</label>
              <SearchableSelect 
                value={form.remedyName}
                onChange={val => setForm({...form, remedyName: val})}
                options={lookups?.medicines?.map(m => m.name) || []}
              />
            </div>
            <div className="mc-legacy-input-group">
              <label>Potency:</label>
              <SearchableSelect 
                value={form.potencyName}
                onChange={val => setForm({...form, potencyName: val})}
                options={lookups?.potencies?.map(p => p.name) || []}
              />
            </div>
            <div className="mc-legacy-input-group">
              <label>Frequency:</label>
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
            <div className="mc-legacy-input-group">
              <label>Days:</label>
              <input 
                type="number" 
                placeholder="Select" 
                value={form.days} 
                onChange={e => setForm({...form, days: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="mc-legacy-input-group">
              <label>Instructions</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  placeholder="Prescription"
                  value={form.instructions}
                  onChange={e => setForm({...form, instructions: e.target.value})}
                />
                <button 
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="mc-legacy-btn-primary"
                  style={{ padding: '0 12px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                >
                  {saveMutation.isPending ? '...' : editingId ? '✓ Update' : '+'}
                </button>
                {editingId && (
                  <button 
                    onClick={() => { setEditingId(null); setForm({ remedyName: '', potencyName: '', frequencyName: '', days: 0, instructions: '', notes: '' }); }}
                    className="mc-btn-link"
                    style={{ padding: '0 8px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table className="mc-legacy-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Remedy</th>
                  <th>Potency</th>
                  <th>Frequency</th>
                  <th>Days</th>
                  <th>Instructions</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history?.map((rx) => (
                  <tr key={rx.id}>
                    <td>{new Date(rx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}</td>
                    <td>{rx.remedy_name}</td>
                    <td>{rx.potency_name}</td>
                    <td>{rx.frequency_name}</td>
                    <td>{rx.days}</td>
                    <td>{rx.prescription || rx.notes || ''}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEdit(rx)} 
                          className="mc-btn-link" 
                          style={{ color: 'var(--color-primary, #1e40af)', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rx.id, rx.remedy_name)}
                          className="mc-btn-link"
                          disabled={deleteMutation.isPending}
                          style={{ color: 'var(--pp-danger-fg, #dc2626)', fontSize: '0.75rem' }}
                        >
                          {deleteMutation.isPending ? '...' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {history?.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>No prescriptions added.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
