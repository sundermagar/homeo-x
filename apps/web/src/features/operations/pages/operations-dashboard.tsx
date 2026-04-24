import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package, Clock, CheckCircle2, AlertCircle, Phone,
  UsersRound, BellRing, ExternalLink
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { OpsModal } from '../components/ops-modal';
import './operations-dashboard.css';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GenericTab = 'logistics' | 'crm' | 'knowledge' | 'tools';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockShipments = [
  { id: 1, regid: 1001, patient: 'Rahul Sharma', mobile: '9876543210', status: 'Dispatched', tracking: 'DLV-88712', courier: 'Delhivery Express', date: '2026-04-08' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase().replace(' ', '-');
  return <span className={`ops-status-badge ${cls}`}>{status}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, value, label, variant = 'default' }: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  variant?: 'default' | 'warn' | 'danger' | 'success' | 'info';
}) {
  return (
    <div className="ops-stat-card">
      <div className={`ops-stat-icon ${variant}`}>
        <Icon size={18} />
      </div>
      <div className="ops-stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE COLUMN LABELS (for mobile card view)
// ═══════════════════════════════════════════════════════════════════════════════

const shipmentCols = ['Reg ID', 'Patient', 'Courier', 'Tracking', 'Status', 'Date'];
const leadCols = ['#', 'Name', 'Source', 'Status', 'Notes', 'Date', 'Action'];
const referralCols = ['Patient', 'Referred', 'Total', 'Used'];
const reminderCols = ['Patient', 'Heading', 'Date', 'Status'];
const dictCols = ['Remedy', 'Description', 'Cross'];
const bookCols = ['Title', 'Author', 'Type', 'Link'];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE HEADER — back + title on same row, action buttons top-right
// ═══════════════════════════════════════════════════════════════════════════════

function PageHeader({ title, desc, actions }: { title: string; desc: string; actions?: React.ReactNode }) {
  return (
    <div className="ops-page-header">
      <div className="ops-page-header-text">
        <h1 className="ops-page-title">{title}</h1>
        <p className="ops-page-desc">{desc}</p>
      </div>
      {actions && <div className="ops-page-header-actions">{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function OperationsDashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as GenericTab) || 'logistics';
  const [modalType, setModalType] = useState<'courier' | 'lead' | 'dictionary' | 'export' | 'referral' | 'reminder' | 'book' | null>(null);

  // ─── Real Data State ───
  const [leads, setLeads] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Knowledge Tab State ───
  const [dictionary, setDictionary] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // ─── Form State ───
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    source: 'Instagram Ads',
    notes: '',
    regid: '',
    referral_id: '',
    total_amount: '',
    heading: '',
    date: '',
    time: '09:00'
  });

  // ─── Knowledge Form State ───
  const [dictForm, setDictForm] = useState({ title: '', text: '', cross_ref: '' });
  const [bookForm, setBookForm] = useState({ title: '', author: '', resource_type: 'Book', url: '', description: '' });

  // ─── Tools Tab State ───
  const [exports, setExports] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedExport, setSelectedExport] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'crm') {
        const [leadsRes, refsRes, remsRes] = await Promise.all([
          apiClient.get('/crm/leads'),
          apiClient.get('/crm/referrals/summary'),
          apiClient.get('/crm/reminders')
        ]);
        setLeads(leadsRes.data.data?.data || []);
        setReferrals(refsRes.data.data || []);
        setReminders(remsRes.data.data?.data || []);
      } else if (activeTab === 'knowledge') {
        const [dictRes, booksRes] = await Promise.all([
          apiClient.get('/knowledge/dictionary'),
          apiClient.get('/knowledge/books')
        ]);
        setDictionary(dictRes.data.data || []);
        setBooks(booksRes.data.data || []);
      } else if (activeTab === 'tools') {
        setExports([
          { id: 'patients', label: 'All Patients via CSV', records: '~' },
          { id: 'cases', label: 'Case History Export', records: '~' },
          { id: 'billing', label: 'Financial Ledger (Excel)', records: '~' },
          { id: 'appointments', label: 'Scheduling Log', records: '~' },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const closeModal = () => {
    setModalType(null);
    setFormData({
      name: '', mobile: '', source: 'Instagram Ads', notes: '',
      regid: '', referral_id: '', total_amount: '',
      heading: '', date: '', time: '09:00'
    });
    setDictForm({ title: '', text: '', cross_ref: '' });
    setBookForm({ title: '', author: '', resource_type: 'Book', url: '', description: '' });
  };

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      if (modalType === 'lead') {
        await apiClient.post('/crm/leads', {
          name: formData.name,
          mobile: formData.mobile,
          source: formData.source,
          notes: formData.notes
        });
      } else if (modalType === 'referral') {
        await apiClient.post('/crm/referrals', {
          regid: formData.regid,
          referral_id: formData.referral_id,
          total_amount: formData.total_amount
        });
      } else if (modalType === 'reminder') {
        await apiClient.post('/crm/reminders', {
          regid: formData.regid,
          heading: formData.heading,
          followup_date: formData.date,
          remind_time: formData.time,
          notes: formData.notes
        });
      } else if (modalType === 'dictionary') {
        await apiClient.post('/knowledge/dictionary', {
          title: dictForm.title,
          text: dictForm.text,
          cross_ref: dictForm.cross_ref
        });
      } else if (modalType === 'book') {
        await apiClient.post('/knowledge/books', {
          title: bookForm.title,
          author: bookForm.author,
          resource_type: bookForm.resource_type,
          url: bookForm.url,
          description: bookForm.description
        });
      }

      btn.textContent = '✓ Success!';
      (btn as HTMLElement).style.backgroundColor = 'var(--pp-success-fg)';
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 600);
    } catch (err) {
      console.error('Action failed', err);
      alert('Action failed. Please try again.');
      btn.textContent = originalText;
      btn.disabled = false;
    } finally {
      // Cleanup if needed
    }
  };
  
  const handleConvertLead = async (id: number) => {
    if (!window.confirm('Convert this lead to a formal patient registration?')) return;
    try {
      setLoading(true);
      await apiClient.post(`/crm/leads/${id}/convert`);
      fetchData();
      alert('Lead successfully converted to patient!');
    } catch (err) {
      console.error('Conversion failed', err);
      alert('Failed to convert lead.');
    } finally {
      setLoading(false);
    }
  };

  const headers: Record<GenericTab, { title: string; desc: string }> = {
    logistics: { title: 'Logistics & Couriers', desc: 'Manage shipping vendors and track active medicine deliveries.' },
    crm: { title: 'Lead CRM & Promos', desc: 'Capture new patient leads, track network referrals, and schedule reminders.' },
    knowledge: { title: 'Medical Knowledge Base', desc: 'Access global diagnosis terminology and uploaded reference books.' },
    tools: { title: 'Global Data Tools', desc: 'Administer database exports and system-wide backups.' },
  };

  const actionMap: Record<GenericTab, { label: string; type: 'courier' | 'lead' | 'dictionary' | 'export' | null }> = {
    logistics: { label: '+ Assign Courier', type: 'courier' },
    crm: { label: '+ Add Lead', type: 'lead' },
    knowledge: { label: '+ Add Entry', type: 'dictionary' },
    tools: { label: '+ New Export', type: 'export' },
  };

  const h = headers[activeTab];
  const activeAction = actionMap[activeTab];

  return (
    <div className="operations-dashboard fade-in">
      {/* ─── Page Header: back btn + title on same row ─── */}
      <PageHeader
        title={h.title}
        desc={h.desc}
        actions={
          activeAction.type ? (
            <button className="ops-btn ops-btn-primary" onClick={() => setModalType(activeAction.type)}>
              {activeAction.label}
            </button>
          ) : null
        }
      />

      {/* ─── LOGISTICS TAB ─── */}
      {activeTab === 'logistics' && (
        <div className="slide-up">
          <div className="ops-stats-row">
            <StatCard icon={Package} value={5} label="Total Shipments" variant="default" />
            <StatCard icon={Clock} value={2} label="In Transit" variant="warn" />
            <StatCard icon={CheckCircle2} value={1} label="Delivered" variant="success" />
            <StatCard icon={AlertCircle} value={1} label="Pending" variant="danger" />
          </div>

          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Active Shipments</h2>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{shipmentCols.map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {mockShipments.map(s => (
                    <tr key={s.id}>
                      <td data-label="Reg ID"><span className="reg-badge">#{s.regid}</span></td>
                      <td data-label="Patient">
                        <div className="cell-main">{s.patient}</div>
                        <div className="cell-sub"><Phone size={11} /> {s.mobile}</div>
                      </td>
                      <td data-label="Courier"><span className="courier-tag">{s.courier}</span></td>
                      <td data-label="Tracking"><span className="mono">{s.tracking}</span></td>
                      <td data-label="Status"><StatusBadge status={s.status} /></td>
                      <td data-label="Date"><span className="cell-sub">{s.date}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── CRM TAB ─── */}
      {activeTab === 'crm' && (
        <div className="slide-up">
          <div className="ops-stats-row">
            <StatCard icon={UsersRound} value={leads.length} label="Total Leads" variant="default" />
            <StatCard icon={AlertCircle} value={leads.filter(l => !l.status || l.status.toLowerCase() === 'new').length} label="New" variant="info" />
            <StatCard icon={CheckCircle2} value={leads.filter(l => l.status?.toLowerCase() === 'converted').length} label="Converted" variant="success" />
            <StatCard icon={BellRing} value={reminders.length} label="Reminders" variant="warn" />
          </div>

          <div className="ops-content card" style={{ marginBottom: 16 }}>
            <div className="ops-table-header">
              <h2 className="pane-title">Lead Pipeline ({leads.length})</h2>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{leadCols.map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading leads...</td></tr>
                  ) : leads.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No leads found.</td></tr>
                  ) : leads.map(l => (
                    <tr key={l.id}>
                      <td data-label="#">{l.id}</td>
                      <td data-label="Name">
                        <div className="cell-main">{l.name}</div>
                        <div className="cell-sub"><Phone size={11} /> {l.mobile || l.phone}</div>
                      </td>
                      <td data-label="Source">{l.source}</td>
                      <td data-label="Status"><StatusBadge status={l.status || 'New'} /></td>
                      <td data-label="Notes"><span className="cell-sub" style={{ maxWidth: 160 }}>{l.notes}</span></td>
                      <td data-label="Date"><span className="cell-sub">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '-'}</span></td>
                      <td data-label="Action">
                        {l.status?.toLowerCase() === 'converted' ? (
                          <span className="ops-status-badge converted">Converted</span>
                        ) : (
                          <button 
                            className="ops-btn ops-btn-xs ops-btn-success"
                            onClick={() => handleConvertLead(l.id)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Convert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ops-grid">
            <div className="ops-content card">
              <div className="ops-table-header">
                <h2 className="pane-title">Referral Summary ({referrals.length})</h2>
                <button className="ops-btn ops-btn-ghost" onClick={() => setModalType('referral')}>
                  + Log Referral
                </button>
              </div>
              <div className="ops-table-wrapper">
                <table className="ops-table">
                  <thead>
                    <tr>{referralCols.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {referrals.map((r, idx) => (
                      <tr key={idx}>
                        <td data-label="Patient"><span className="cell-main">{r.first_name} {r.surname}</span></td>
                        <td data-label="Referred"><span className="cell-sub">ID: {r.referral_id}</span></td>
                        <td data-label="Total">
                          <span style={{ color: 'var(--pp-success-fg)', fontWeight: 600 }}>₹{r.total_amount}</span>
                        </td>
                        <td data-label="Used">₹{r.used_amount}</td>
                      </tr>
                    ))}
                    {referrals.length === 0 && !loading && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No referrals found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ops-content card">
              <div className="ops-table-header">
                <h2 className="pane-title">Case Reminders ({reminders.length})</h2>
                <button className="ops-btn ops-btn-ghost" onClick={() => setModalType('reminder')}>
                  + Create
                </button>
              </div>
              <div className="ops-table-wrapper">
                <table className="ops-table">
                  <thead>
                    <tr>{reminderCols.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {reminders.map(r => (
                      <tr key={r.id}>
                        <td data-label="Patient"><span className="cell-main">{r.patient_name || 'Patient #'+r.patient_id}</span></td>
                        <td data-label="Heading">{r.heading}</td>
                        <td data-label="Date"><span className="cell-sub">{r.start_date} {r.remind_time}</span></td>
                        <td data-label="Status"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                    {reminders.length === 0 && !loading && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No reminders found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KNOWLEDGE TAB ─── */}
      {activeTab === 'knowledge' && (
        <div className="slide-up">
          <div className="ops-content card" style={{ marginBottom: 16 }}>
            <div className="ops-table-header">
              <h2 className="pane-title">Medical Dictionary</h2>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{dictCols.map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                  ) : dictionary.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40 }}>No dictionary entries found.</td></tr>
                  ) : dictionary.map(d => (
                    <tr key={d.id}>
                      <td data-label="Remedy"><span className="cell-main" style={{ fontWeight: 700 }}>{d.title}</span></td>
                      <td data-label="Description"><span className="cell-sub" style={{ maxWidth: 300 }}>{d.text}</span></td>
                      <td data-label="Cross"><span className="ops-cross-ref">{d.cross_ref || d.crossRef}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Library Resources</h2>
              <button className="ops-btn ops-btn-primary" onClick={() => setModalType('book')}>
                + Upload Book
              </button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{bookCols.map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                  ) : books.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>No library resources found.</td></tr>
                  ) : books.map(b => (
                    <tr key={b.id}>
                      <td data-label="Title"><span className="cell-main">{b.title}</span></td>
                      <td data-label="Author">{b.author || 'Unknown'}</td>
                      <td data-label="Type"><StatusBadge status={b.resource_type || 'Book'} /></td>
                      <td data-label="Link">
                        <button className="ops-icon-btn" aria-label="Open link">
                          <ExternalLink size={14} style={{ color: 'var(--primary)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOOLS TAB ─── */}
      {activeTab === 'tools' && (
        <div className="slide-up">
          <div className="ops-content card" style={{ marginBottom: 16 }}>
            <div className="ops-table-header">
              <h2 className="pane-title">Data Export</h2>
            </div>
            <div style={{ padding: 16 }}>
              <div className="ops-form-group">
                <label>Select Dataset</label>
                <select className="ops-input" value={selectedExport} onChange={e => setSelectedExport(e.target.value)}>
                  <option value="">-- Choose export type --</option>
                  <option value="patients">All Patients (CSV)</option>
                  <option value="cases">Case History (CSV)</option>
                  <option value="billing">Financial Ledger (CSV)</option>
                  <option value="appointments">Scheduling Log (CSV)</option>
                </select>
              </div>
              <div className="ops-modal-footer">
                <button
                  className="ops-btn ops-btn-primary"
                  disabled={!selectedExport || exporting}
                  onClick={async () => {
                    if (!selectedExport) return;
                    setExporting(true);
                    try {
                      const response = await fetch(`/api/export/${selectedExport}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      if (!response.ok) throw new Error('Export failed');
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'export.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                      alert('Export downloaded successfully!');
                    } catch (err) {
                      console.error('Export failed', err);
                      alert('Export failed. Please try again.');
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? 'Exporting...' : 'Download CSV'}
                </button>
              </div>
            </div>
          </div>

          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Available Exports</h2>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{['Dataset', 'Description', 'Action'].map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {exports.map(e => (
                    <tr key={e.id}>
                      <td data-label="Dataset"><span className="cell-main">{e.label}</span></td>
                      <td data-label="Description"><span className="cell-sub">Click to download CSV</span></td>
                      <td data-label="Action">
                        <button
                          className="ops-btn ops-btn-xs ops-btn-primary"
                          onClick={async () => {
                            setSelectedExport(e.id);
                            setExporting(true);
                            try {
                              const response = await fetch(`/api/export/${e.id}`, {
                                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                              });
                              if (!response.ok) throw new Error('Export failed');
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'export.csv';
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('Export failed', err);
                              alert('Export failed. Please try again.');
                            } finally {
                              setExporting(false);
                            }
                          }}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}
      <OpsModal isOpen={modalType === 'courier'} onClose={closeModal} title="Assign Medicine to Courier">
        <div className="ops-form-group"><label>Patient Reg ID</label><input type="text" className="ops-input" placeholder="e.g. 1004" /></div>
        <div className="ops-form-group"><label>Select Logistic Vendor</label>
          <select className="ops-input"><option>FedEx Partner (V12)</option><option>Delhivery Express</option><option>BlueDart</option><option>Speed Post</option></select>
        </div>
        <div className="ops-form-group"><label>Tracking Number</label><input type="text" className="ops-input" placeholder="e.g. DLV-88712" /></div>
        <div className="ops-modal-footer"><button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button><button className="ops-btn ops-btn-primary" onClick={handleAction}>Dispatch Order</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'lead'} onClose={closeModal} title="Enter External CRM Lead">
        <div className="ops-form-group">
          <label>Lead Full Name</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="Enter name" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Mobile Number</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="+91 98765 43210" 
            value={formData.mobile}
            onChange={e => setFormData({ ...formData, mobile: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Source / Campaign</label>
          <select 
            className="ops-input"
            value={formData.source}
            onChange={e => setFormData({ ...formData, source: e.target.value })}
          >
            <option>Instagram Ads</option>
            <option>Facebook Ads</option>
            <option>Google Search</option>
            <option>Walk-in Referral</option>
            <option>Website Form</option>
          </select>
        </div>
        <div className="ops-form-group">
          <label>Notes</label>
          <textarea 
            className="ops-input" 
            placeholder="Initial inquiry details..." 
            style={{ minHeight: 60 }} 
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
        <div className="ops-modal-footer">
          <button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="ops-btn ops-btn-primary" onClick={handleAction}>Save Lead</button>
        </div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'referral'} onClose={closeModal} title="Log Network Referral">
        <div className="ops-form-group">
          <label>Patient Reg ID</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="e.g. 1001" 
            value={formData.regid}
            onChange={e => setFormData({ ...formData, regid: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Referral ID (Referring Patient)</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="e.g. 1044" 
            value={formData.referral_id}
            onChange={e => setFormData({ ...formData, referral_id: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Total Amount (₹)</label>
          <input 
            type="number" 
            className="ops-input" 
            placeholder="5000" 
            value={formData.total_amount}
            onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
          />
        </div>
        <div className="ops-modal-footer">
          <button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="ops-btn ops-btn-primary" onClick={handleAction}>Submit Referral</button>
        </div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'reminder'} onClose={closeModal} title="Case Reminder">
        <div className="ops-form-group">
          <label>Patient Reg ID</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="e.g. 1202" 
            value={formData.regid}
            onChange={e => setFormData({ ...formData, regid: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Heading</label>
          <input 
            type="text" 
            className="ops-input" 
            placeholder="e.g. Follow-up Visit" 
            value={formData.heading}
            onChange={e => setFormData({ ...formData, heading: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Reminder Date</label>
          <input 
            type="date" 
            className="ops-input" 
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Time</label>
          <input 
            type="time" 
            className="ops-input" 
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
          />
        </div>
        <div className="ops-form-group">
          <label>Comments</label>
          <textarea 
            className="ops-input" 
            placeholder="Notes..." 
            style={{ minHeight: 60 }} 
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
        <div className="ops-modal-footer">
          <button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="ops-btn ops-btn-primary" onClick={handleAction}>Schedule Reminder</button>
        </div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'dictionary'} onClose={closeModal} title="Add Dictionary Entry">
        <div className="ops-form-group"><label>Title / Remedy Name</label>
          <input type="text" className="ops-input" placeholder="e.g. Belladonna" value={dictForm.title} onChange={e => setDictForm({ ...dictForm, title: e.target.value })} />
        </div>
        <div className="ops-form-group"><label>Description</label>
          <textarea className="ops-input" placeholder="Key symptoms, modalities..." style={{ minHeight: 80 }} value={dictForm.text} onChange={e => setDictForm({ ...dictForm, text: e.target.value })} />
        </div>
        <div className="ops-form-group"><label>Cross Reference</label>
          <input type="text" className="ops-input" placeholder="e.g. Aconitum" value={dictForm.cross_ref} onChange={e => setDictForm({ ...dictForm, cross_ref: e.target.value })} />
        </div>
        <div className="ops-modal-footer"><button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button><button className="ops-btn ops-btn-primary" onClick={handleAction}>Save Entry</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'book'} onClose={closeModal} title="Upload Library Resource">
        <div className="ops-form-group"><label>Resource Title</label>
          <input type="text" className="ops-input" placeholder="e.g. Materia Medica Vol 1" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} />
        </div>
        <div className="ops-form-group"><label>Author</label>
          <input type="text" className="ops-input" placeholder="e.g. Samuel Hahnemann" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} />
        </div>
        <div className="ops-form-group"><label>Type</label>
          <select className="ops-input" value={bookForm.resource_type} onChange={e => setBookForm({ ...bookForm, resource_type: e.target.value })}>
            <option value="Book">Book</option><option value="PDF">PDF</option><option value="Link">Link</option>
          </select>
        </div>
        <div className="ops-form-group"><label>URL</label>
          <input type="url" className="ops-input" placeholder="https://" value={bookForm.url} onChange={e => setBookForm({ ...bookForm, url: e.target.value })} />
        </div>
        <div className="ops-form-group"><label>Description</label>
          <textarea className="ops-input" placeholder="Description..." style={{ minHeight: 60 }} value={bookForm.description} onChange={e => setBookForm({ ...bookForm, description: e.target.value })} />
        </div>
        <div className="ops-modal-footer"><button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button><button className="ops-btn ops-btn-primary" onClick={handleAction}>Save Resource</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'export'} onClose={closeModal} title="Schedule Data Export">
        <div className="ops-form-group"><label>Select Dataset</label>
          <select className="ops-input"><option>All Patients via CSV</option><option>Medicines & Inventory (Excel)</option><option>Full Backup Dump (.sql)</option></select>
        </div>
        <div className="ops-modal-footer"><button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button><button className="ops-btn ops-btn-primary" onClick={handleAction}>Queue Download</button></div>
      </OpsModal>
    </div>
  );
}