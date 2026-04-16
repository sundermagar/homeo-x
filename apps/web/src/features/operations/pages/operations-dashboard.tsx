import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle2, AlertCircle, Phone,
  UsersRound, BellRing, ExternalLink, ArrowLeft
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

// (Mock data kept for Logistics/Knowledge/Tools for now as they are not the primary CRM focus)
const mockShipments = [
  { id: 1, regid: 1001, patient: 'Rahul Sharma', mobile: '9876543210', status: 'Dispatched', tracking: 'DLV-88712', courier: 'Delhivery Express', date: '2026-04-08' },
];

const mockDictionary = [
  { id: 1, title: 'Bryonia Alba', text: 'A remedy for dry, stitching pains worse by motion. Key for pleurisy, headaches with bursting sensation.', crossRef: 'Rhus Tox' },
  { id: 2, title: 'Nux Vomica', text: 'Primary remedy for irritability, over-stimulation, digestive complaints. Chilly, sensitive to noise.', crossRef: 'Sulphur' },
  { id: 3, title: 'Pulsatilla', text: 'Changeable symptoms, weepy disposition, thirstless. Worse in warm rooms, better open air.', crossRef: 'Silicea' },
  { id: 4, title: 'Arsenicum Album', text: 'Restlessness, anxiety, burning pains relieved by warmth. Fastidious personality, fear of death.', crossRef: 'Phosphorus' },
  { id: 5, title: 'Lycopodium', text: 'Right-sided complaints, bloating at 4pm, anticipatory anxiety. Craves sweets, warm drinks.', crossRef: 'Calcarea Carb' },
];

const mockBooks = [
  { id: 1, title: 'Materia Medica Pura', author: 'Samuel Hahnemann', type: 'Book', url: '#' },
  { id: 2, title: 'Organon of Medicine (6th Ed.)', author: 'Samuel Hahnemann', type: 'PDF', url: '#' },
  { id: 3, title: 'Kent Repertory Reference', author: 'James Tyler Kent', type: 'Link', url: '#' },
];

const mockExports = [
  { id: 1, dataset: 'All Patients CSV', records: 1247, date: '2026-04-08 14:30', status: 'Completed', size: '2.4 MB' },
  { id: 2, dataset: 'Medicines Inventory', records: 856, date: '2026-04-05 09:15', status: 'Completed', size: '1.1 MB' },
  { id: 3, dataset: 'Full Backup (.sql)', records: 15420, date: '2026-04-01 22:00', status: 'Completed', size: '48.7 MB' },
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
const exportCols = ['Dataset', 'Records', 'Date', 'Size', 'Status'];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE HEADER — back + title on same row, action buttons top-right
// ═══════════════════════════════════════════════════════════════════════════════

function PageHeader({ title, desc, actions }: { title: string; desc: string; actions?: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="ops-page-header">
      {/* <button className="ops-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft size={18} />
      </button> */}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as GenericTab) || 'logistics';
  const [modalType, setModalType] = useState<'courier' | 'lead' | 'dictionary' | 'export' | 'referral' | 'reminder' | 'book' | null>(null);

  // ─── Real Data State ───
  const [leads, setLeads] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchData = async () => {
    if (activeTab !== 'crm') return;
    setLoading(true);
    try {
      const [leadsRes, refsRes, remsRes] = await Promise.all([
        apiClient.get('/crm/leads'),
        apiClient.get('/crm/referrals/summary'),
        apiClient.get('/crm/reminders')
      ]);
      setLeads(leadsRes.data);
      setReferrals(refsRes.data);
      setReminders(remsRes.data);
    } catch (err) {
      console.error('Failed to fetch CRM data', err);
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
      }

      btn.textContent = '✓ Success!';
      (btn as HTMLElement).style.backgroundColor = 'var(--pp-success-fg)';
      setTimeout(() => { 
        closeModal(); 
        fetchData();
      }, 600);
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
            <StatCard icon={UsersRound} value={5} label="Total Leads" variant="default" />
            <StatCard icon={AlertCircle} value={2} label="New" variant="info" />
            <StatCard icon={CheckCircle2} value={1} label="Converted" variant="success" />
            <StatCard icon={BellRing} value={4} label="Reminders" variant="warn" />
          </div>

          <div className="ops-content card" style={{ marginBottom: 16 }}>
            <div className="ops-table-header">
              <h2 className="pane-title">Lead Pipeline</h2>
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
                      <td data-label="Date"><span className="cell-sub">{new Date(l.created_at).toLocaleDateString()}</span></td>
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
                <h2 className="pane-title">Referral Summary</h2>
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
                <h2 className="pane-title">Case Reminders</h2>
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
                  {mockDictionary.map(d => (
                    <tr key={d.id}>
                      <td data-label="Remedy"><span className="cell-main" style={{ fontWeight: 700 }}>{d.title}</span></td>
                      <td data-label="Description"><span className="cell-sub" style={{ maxWidth: 300 }}>{d.text}</span></td>
                      <td data-label="Cross"><span className="ops-cross-ref">{d.crossRef}</span></td>
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
                  {mockBooks.map(b => (
                    <tr key={b.id}>
                      <td data-label="Title"><span className="cell-main">{b.title}</span></td>
                      <td data-label="Author">{b.author}</td>
                      <td data-label="Type"><StatusBadge status={b.type} /></td>
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
          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Export History</h2>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr>{exportCols.map(col => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {mockExports.map(e => (
                    <tr key={e.id}>
                      <td data-label="Dataset"><span className="cell-main">{e.dataset}</span></td>
                      <td data-label="Records">{e.records.toLocaleString()}</td>
                      <td data-label="Date"><span className="cell-sub">{e.date}</span></td>
                      <td data-label="Size">{e.size}</td>
                      <td data-label="Status"><StatusBadge status={e.status} /></td>
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
        <div className="ops-form-group"><label>Title / Remedy Name</label><input type="text" className="ops-input" placeholder="e.g. Belladonna" /></div>
        <div className="ops-form-group"><label>Description</label><textarea className="ops-input" placeholder="Key symptoms, modalities..." style={{ minHeight: 80 }} /></div>
        <div className="ops-form-group"><label>Cross Reference</label><input type="text" className="ops-input" placeholder="e.g. Aconitum" /></div>
        <div className="ops-modal-footer"><button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button><button className="ops-btn ops-btn-primary" onClick={handleAction}>Save Entry</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'book'} onClose={closeModal} title="Upload Library Resource">
        <div className="ops-form-group"><label>Resource Title</label><input type="text" className="ops-input" placeholder="e.g. Materia Medica Vol 1" /></div>
        <div className="ops-form-group"><label>Author</label><input type="text" className="ops-input" placeholder="e.g. Samuel Hahnemann" /></div>
        <div className="ops-form-group"><label>Type</label><select className="ops-input"><option>Book</option><option>PDF</option><option>Link</option></select></div>
        <div className="ops-form-group"><label>URL</label><input type="url" className="ops-input" placeholder="https://" /></div>
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