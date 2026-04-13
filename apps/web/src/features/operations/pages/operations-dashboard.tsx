import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Truck, MapPin, BookOpen, Library, UsersRound, FileBox, Share2, BellRing, Download,
  Package, Clock, CheckCircle2, AlertCircle, Phone, Mail, ExternalLink
} from 'lucide-react';
import { OpsModal } from '../components/ops-modal';
import './operations-dashboard.css';

type GenericTab = 'logistics' | 'crm' | 'knowledge' | 'tools';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockShipments = [
  { id: 1, regid: 1001, patient: 'Rahul Sharma', mobile: '9876543210', status: 'Dispatched', tracking: 'DLV-88712', courier: 'Delhivery Express', date: '2026-04-08', package_color: '#10b981' },
  { id: 2, regid: 1044, patient: 'Priya Patel', mobile: '9812345678', status: 'Packed', tracking: 'FDX-44019', courier: 'FedEx Partner', date: '2026-04-09', package_color: '#f59e0b' },
  { id: 3, regid: 1122, patient: 'Amit Kumar', mobile: '9988776655', status: 'Pending', tracking: '—', courier: 'BlueDart', date: '2026-04-10', package_color: '#6366f1' },
  { id: 4, regid: 1003, patient: 'Sunita Devi', mobile: '9123456789', status: 'Delivered', tracking: 'DLV-77234', courier: 'Delhivery Express', date: '2026-04-06', package_color: '#10b981' },
  { id: 5, regid: 1089, patient: 'Vikram Singh', mobile: '9654321098', status: 'Dispatched', tracking: 'SPD-55102', courier: 'Speed Post', date: '2026-04-07', package_color: '#ef4444' },
];

const mockLeads = [
  { id: 1, name: 'Ananya Mishra', mobile: '9876501234', source: 'Instagram Ads', status: 'New', notes: 'Interested in skin treatment', date: '2026-04-10' },
  { id: 2, name: 'Rohan Gupta', mobile: '9812309876', source: 'Google Search', status: 'Contacted', notes: 'Called once, follow-up needed', date: '2026-04-09' },
  { id: 3, name: 'Meera Joshi', mobile: '9988112233', source: 'Walk-in Referral', status: 'Converted', notes: 'Registered as patient #1156', date: '2026-04-07' },
  { id: 4, name: 'Deepak Verma', mobile: '9654987321', source: 'Facebook Ads', status: 'New', notes: 'Chronic migraine inquiry', date: '2026-04-10' },
  { id: 5, name: 'Kavita Rao', mobile: '9321654987', source: 'Website Form', status: 'Lost', notes: 'Not responding to calls', date: '2026-04-05' },
];

const mockReferrals = [
  { id: 1, referralId: 1001, name: 'Rahul Sharma', totalAmount: '5000', usedAmount: '2000', count: 3 },
  { id: 2, referralId: 1044, name: 'Priya Patel', totalAmount: '3500', usedAmount: '3500', count: 2 },
  { id: 3, referralId: 1003, name: 'Sunita Devi', totalAmount: '8000', usedAmount: '1000', count: 5 },
];

const mockReminders = [
  { id: 1, regid: 1001, patient: 'Rahul Sharma', heading: 'Follow-up Visit', date: '2026-04-12', time: '10:00', status: 'pending' },
  { id: 2, regid: 1044, patient: 'Priya Patel', heading: 'Blood Test Report', date: '2026-04-11', time: '09:00', status: 'pending' },
  { id: 3, regid: 1122, patient: 'Amit Kumar', heading: 'Medicine Refill', date: '2026-04-09', time: '14:00', status: 'done' },
  { id: 4, regid: 1003, patient: 'Sunita Devi', heading: 'X-ray Scheduling', date: '2026-04-13', time: '11:30', status: 'pending' },
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
// STATUS BADGE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    'Dispatched': { bg: '#dbeafe', color: '#1d4ed8' },
    'Packed': { bg: '#fef3c7', color: '#b45309' },
    'Pending': { bg: '#fee2e2', color: '#dc2626' },
    'Delivered': { bg: '#dcfce7', color: '#16a34a' },
    'New': { bg: '#e0e7ff', color: '#4f46e5' },
    'Contacted': { bg: '#fef3c7', color: '#b45309' },
    'Converted': { bg: '#dcfce7', color: '#16a34a' },
    'Lost': { bg: '#f1f5f9', color: '#64748b' },
    'pending': { bg: '#fef3c7', color: '#b45309' },
    'done': { bg: '#dcfce7', color: '#16a34a' },
    'Completed': { bg: '#dcfce7', color: '#16a34a' },
  };
  const c = colors[status] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function OperationsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as GenericTab) || 'logistics';
  const [modalType, setModalType] = useState<'courier' | 'lead' | 'dictionary' | 'export' | 'referral' | 'reminder' | 'book' | null>(null);

  const setActiveTab = (val: string) => { setSearchParams({ tab: val }); };
  const closeModal = () => setModalType(null);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLButtonElement;
    btn.innerText = 'Processing...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerText = '✓ Success!';
      btn.style.backgroundColor = '#10b981';
      setTimeout(() => { closeModal(); }, 600);
    }, 800);
  };

  const headers: Record<GenericTab, { title: string; desc: string }> = {
    logistics: { title: 'Logistics & Couriers', desc: 'Manage shipping vendors and track active medicine deliveries.' },
    crm: { title: 'Lead CRM & Promos', desc: 'Capture new patient leads, track network referrals, and schedule reminders.' },
    knowledge: { title: 'Medical Knowledge base', desc: 'Access global diagnosis terminology and uploaded reference books.' },
    tools: { title: 'Global Data Tools', desc: 'Administer database exports and system-wide backups.' },
  };

  const h = headers[activeTab];

  return (
    <div className="operations-dashboard fade-in">
      <div className="dashboard-header">
        <h1 className="text-2xl font-bold">{h.title}</h1>
        <p className="text-muted">{h.desc}</p>
      </div>

      {/* ─── LOGISTICS TAB ─── */}
      {activeTab === 'logistics' && (
        <div className="slide-up">
          {/* Stats Row */}
          <div className="ops-stats-row">
            <div className="ops-stat-card"><Package size={20} className="icon-primary" /><div><div className="stat-value">5</div><div className="stat-label">Total Shipments</div></div></div>
            <div className="ops-stat-card"><Clock size={20} style={{color:'#f59e0b'}} /><div><div className="stat-value">2</div><div className="stat-label">In Transit</div></div></div>
            <div className="ops-stat-card"><CheckCircle2 size={20} style={{color:'#10b981'}} /><div><div className="stat-value">1</div><div className="stat-label">Delivered</div></div></div>
            <div className="ops-stat-card"><AlertCircle size={20} style={{color:'#ef4444'}} /><div><div className="stat-value">1</div><div className="stat-label">Pending</div></div></div>
          </div>

          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Active Shipments</h2>
              <button className="btn btn-primary" onClick={() => setModalType('courier')}>+ Assign Courier</button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead>
                  <tr><th>Reg ID</th><th>Patient</th><th>Courier</th><th>Tracking</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {mockShipments.map(s => (
                    <tr key={s.id}>
                      <td><span className="reg-badge">#{s.regid}</span></td>
                      <td><div className="cell-main">{s.patient}</div><div className="cell-sub"><Phone size={12}/> {s.mobile}</div></td>
                      <td><span className="courier-tag" style={{borderLeftColor: s.package_color}}>{s.courier}</span></td>
                      <td className="mono">{s.tracking}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="cell-sub">{s.date}</td>
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
            <div className="ops-stat-card"><UsersRound size={20} className="icon-primary" /><div><div className="stat-value">5</div><div className="stat-label">Total Leads</div></div></div>
            <div className="ops-stat-card"><AlertCircle size={20} style={{color:'#6366f1'}} /><div><div className="stat-value">2</div><div className="stat-label">New</div></div></div>
            <div className="ops-stat-card"><CheckCircle2 size={20} style={{color:'#10b981'}} /><div><div className="stat-value">1</div><div className="stat-label">Converted</div></div></div>
            <div className="ops-stat-card"><BellRing size={20} style={{color:'#f59e0b'}} /><div><div className="stat-value">4</div><div className="stat-label">Reminders</div></div></div>
          </div>

          {/* Leads Table */}
          <div className="ops-content card" style={{marginBottom: 20}}>
            <div className="ops-table-header">
              <h2 className="pane-title">Lead Pipeline</h2>
              <button className="btn btn-primary" onClick={() => setModalType('lead')}>+ Add Lead</button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead><tr><th>#</th><th>Name</th><th>Source</th><th>Status</th><th>Notes</th><th>Date</th></tr></thead>
                <tbody>
                  {mockLeads.map(l => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td><div className="cell-main">{l.name}</div><div className="cell-sub"><Phone size={12}/> {l.mobile}</div></td>
                      <td>{l.source}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td className="cell-sub" style={{maxWidth: 180}}>{l.notes}</td>
                      <td className="cell-sub">{l.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Referrals + Reminders Side by Side */}
          <div className="ops-grid">
            <div className="ops-content card">
              <div className="ops-table-header">
                <h2 className="pane-title">Referral Summary</h2>
                <button className="btn btn-ghost" onClick={() => setModalType('referral')}>+ Log Referral</button>
              </div>
              <div className="ops-table-wrapper">
                <table className="ops-table">
                  <thead><tr><th>Patient</th><th>Referred</th><th>Total ₹</th><th>Used ₹</th></tr></thead>
                  <tbody>
                    {mockReferrals.map(r => (
                      <tr key={r.id}>
                        <td className="cell-main">{r.name}</td>
                        <td>{r.count} patients</td>
                        <td style={{color:'#16a34a', fontWeight:600}}>₹{r.totalAmount}</td>
                        <td>₹{r.usedAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ops-content card">
              <div className="ops-table-header">
                <h2 className="pane-title">Case Reminders</h2>
                <button className="btn btn-ghost" onClick={() => setModalType('reminder')}>+ Create</button>
              </div>
              <div className="ops-table-wrapper">
                <table className="ops-table">
                  <thead><tr><th>Patient</th><th>Heading</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {mockReminders.map(r => (
                      <tr key={r.id}>
                        <td className="cell-main">{r.patient}</td>
                        <td>{r.heading}</td>
                        <td className="cell-sub">{r.date} {r.time}</td>
                        <td><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
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
          <div className="ops-content card" style={{marginBottom: 20}}>
            <div className="ops-table-header">
              <h2 className="pane-title">Medical Dictionary</h2>
              <button className="btn btn-primary" onClick={() => setModalType('dictionary')}>+ Add Entry</button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead><tr><th>Remedy</th><th>Description</th><th>Cross Reference</th></tr></thead>
                <tbody>
                  {mockDictionary.map(d => (
                    <tr key={d.id}>
                      <td><span className="cell-main" style={{fontWeight:700}}>{d.title}</span></td>
                      <td className="cell-sub" style={{maxWidth: 400}}>{d.text}</td>
                      <td><span style={{padding:'3px 8px',borderRadius:4,background:'#f1f5f9',fontSize:12,fontWeight:500}}>{d.crossRef}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ops-content card">
            <div className="ops-table-header">
              <h2 className="pane-title">Library Resources</h2>
              <button className="btn btn-primary" onClick={() => setModalType('book')}>+ Upload Book</button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead><tr><th>Title</th><th>Author</th><th>Type</th><th>Link</th></tr></thead>
                <tbody>
                  {mockBooks.map(b => (
                    <tr key={b.id}>
                      <td className="cell-main">{b.title}</td>
                      <td>{b.author}</td>
                      <td><StatusBadge status={b.type} /></td>
                      <td><ExternalLink size={14} style={{color:'#6366f1',cursor:'pointer'}} /></td>
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
              <button className="btn btn-primary" onClick={() => setModalType('export')}>+ New Export</button>
            </div>
            <div className="ops-table-wrapper">
              <table className="ops-table">
                <thead><tr><th>Dataset</th><th>Records</th><th>Date/Time</th><th>Size</th><th>Status</th></tr></thead>
                <tbody>
                  {mockExports.map(e => (
                    <tr key={e.id}>
                      <td className="cell-main">{e.dataset}</td>
                      <td>{e.records.toLocaleString()}</td>
                      <td className="cell-sub">{e.date}</td>
                      <td>{e.size}</td>
                      <td><StatusBadge status={e.status} /></td>
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
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Dispatch Order</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'lead'} onClose={closeModal} title="Enter External CRM Lead">
        <div className="ops-form-group"><label>Lead Full Name</label><input type="text" className="ops-input" placeholder="Enter name" /></div>
        <div className="ops-form-group"><label>Mobile Number</label><input type="text" className="ops-input" placeholder="+91 98765 43210" /></div>
        <div className="ops-form-group"><label>Source / Campaign</label>
          <select className="ops-input"><option>Instagram Ads</option><option>Facebook Ads</option><option>Google Search</option><option>Walk-in Referral</option><option>Website Form</option></select>
        </div>
        <div className="ops-form-group"><label>Notes</label><textarea className="ops-input" placeholder="Initial inquiry details..." style={{minHeight:60}} /></div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Save Lead</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'referral'} onClose={closeModal} title="Log Network Referral">
        <div className="ops-form-group"><label>Patient Reg ID</label><input type="text" className="ops-input" placeholder="e.g. 1001" /></div>
        <div className="ops-form-group"><label>Referral ID (Referring Patient)</label><input type="text" className="ops-input" placeholder="e.g. 1044" /></div>
        <div className="ops-form-group"><label>Total Amount (₹)</label><input type="number" className="ops-input" placeholder="5000" /></div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Submit Referral</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'reminder'} onClose={closeModal} title="Case Reminder">
        <div className="ops-form-group"><label>Patient Reg ID</label><input type="text" className="ops-input" placeholder="e.g. 1202" /></div>
        <div className="ops-form-group"><label>Heading</label><input type="text" className="ops-input" placeholder="e.g. Follow-up Visit" /></div>
        <div className="ops-form-group"><label>Reminder Date</label><input type="date" className="ops-input" /></div>
        <div className="ops-form-group"><label>Time</label><input type="time" className="ops-input" defaultValue="09:00" /></div>
        <div className="ops-form-group"><label>Comments</label><textarea className="ops-input" placeholder="Notes..." style={{minHeight:60}} /></div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Schedule Reminder</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'dictionary'} onClose={closeModal} title="Add Dictionary Entry">
        <div className="ops-form-group"><label>Title / Remedy Name</label><input type="text" className="ops-input" placeholder="e.g. Belladonna" /></div>
        <div className="ops-form-group"><label>Description</label><textarea className="ops-input" placeholder="Key symptoms, modalities..." style={{minHeight:80}} /></div>
        <div className="ops-form-group"><label>Cross Reference</label><input type="text" className="ops-input" placeholder="e.g. Aconitum" /></div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Save Entry</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'book'} onClose={closeModal} title="Upload Library Resource">
        <div className="ops-form-group"><label>Resource Title</label><input type="text" className="ops-input" placeholder="e.g. Materia Medica Vol 1" /></div>
        <div className="ops-form-group"><label>Author</label><input type="text" className="ops-input" placeholder="e.g. Samuel Hahnemann" /></div>
        <div className="ops-form-group"><label>Type</label><select className="ops-input"><option>Book</option><option>PDF</option><option>Link</option></select></div>
        <div className="ops-form-group"><label>URL</label><input type="url" className="ops-input" placeholder="https://" /></div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Save Resource</button></div>
      </OpsModal>

      <OpsModal isOpen={modalType === 'export'} onClose={closeModal} title="Schedule Data Export">
        <div className="ops-form-group"><label>Select Dataset</label>
          <select className="ops-input"><option>All Patients via CSV</option><option>Medicines & Inventory (Excel)</option><option>Full Backup Dump (.sql)</option></select>
        </div>
        <div className="ops-modal-footer"><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAction}>Queue Download</button></div>
      </OpsModal>
    </div>
  );
}
