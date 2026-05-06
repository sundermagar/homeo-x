import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package, Clock, CheckCircle2, AlertCircle, Phone,
  UsersRound, BellRing, ExternalLink, LayoutGrid, List,
  ChevronLeft, ChevronRight, Search, Plus, Edit3, Trash2,
  FileText, Users
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/shared/stores/auth-store';
import './operations-dashboard.css';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GenericTab = 'logistics' | 'crm' | 'knowledge' | 'tools';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

// Shipments are now fetched from the API — no more mock data

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
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
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
  const { token } = useAuthStore();
  const [modalType, setModalType] = useState<'courier' | 'lead' | 'dictionary' | 'export' | 'referral' | 'reminder' | 'book' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // ─── CRM Tab Sub-Navigation ───
  const [crmSection, setCrmSection] = useState<'pipeline' | 'referrals' | 'reminders'>('pipeline');
  const [crmFilter, setCrmFilter] = useState<'all' | 'new' | 'pending' | 'converted' | 'overdue'>('all');
  const [crmSearch, setCrmSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Real Data State ───
  const [leads, setLeads] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
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
      if (activeTab === 'logistics') {
        try {
          const couriersRes = await apiClient.get('/logistics/couriers');
          setShipments(couriersRes.data.data || []);
        } catch {
          setShipments([]);
        }
      } else if (activeTab === 'crm') {
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
    //   tools: { title: 'Global Data Tools', desc: 'Administer database exports and system-wide backups.' },
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
            <StatCard icon={Package} value={shipments.length} label="Total Shipments" variant="default" />
            <StatCard icon={Clock} value={shipments.filter(s => (s.status || '').toLowerCase() === 'dispatched' || (s.status || '').toLowerCase() === 'in transit').length} label="In Transit" variant="warn" />
            <StatCard icon={CheckCircle2} value={shipments.filter(s => (s.status || '').toLowerCase() === 'delivered').length} label="Delivered" variant="success" />
            <StatCard icon={AlertCircle} value={shipments.filter(s => (s.status || '').toLowerCase() === 'pending').length} label="Pending" variant="danger" />
          </div>

          <div className="ops-content card">
            <div className="ops-table-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="pane-title">Active Shipments</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Real-time tracking of medicine dispatches.</p>
              </div>
              <div className="appt-segmented-toggle">
                <button
                  className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={16} /> List
                </button>
                <button
                  className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={16} /> Grid
                </button>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={shipmentCols.length} />
            ) : shipments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-surface-2)', borderRadius: 12 }}>
                <Package size={36} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: 4 }}>No shipments found</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Assign a courier to start tracking medicine deliveries.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="plat-table-container">
                <table className="plat-table">
                  <thead>
                    <tr>{shipmentCols.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {shipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => (
                      <tr key={s.id} className="plat-table-row">
                        <td><span className="reg-badge">#{s.regid || '-'}</span></td>
                        <td>
                          <div className="cell-main">{s.patient_name || s.patient || `Patient #${s.regid || '-'}`}</div>
                          <div className="cell-sub"><Phone size={11} /> {s.mobile || '-'}</div>
                        </td>
                        <td><span className="courier-tag">{s.courier_name || s.courier || '-'}</span></td>
                        <td><span className="mono">{s.tracking_no || s.tracking || '-'}</span></td>
                        <td><StatusBadge status={s.status || 'Pending'} /></td>
                        <td><span className="cell-sub">{s.dispatch_date ? new Date(s.dispatch_date).toLocaleDateString() : s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ops-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {shipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => (
                  <div key={s.id} className="ops-card" style={{ padding: 16, borderRadius: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <div className="reg-badge" style={{ marginBottom: 8, display: 'inline-block' }}>#{s.regid || '-'}</div>
                        <div className="cell-main" style={{ fontSize: '15px' }}>{s.patient_name || s.patient || `Patient #${s.regid || '-'}`}</div>
                        <div className="cell-sub"><Phone size={11} /> {s.mobile || '-'}</div>
                      </div>
                      <StatusBadge status={s.status || 'Pending'} />
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 12, display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Courier</span>
                        <span style={{ fontWeight: 600 }}>{s.courier_name || s.courier || '-'}</span>
                      </div>
                      <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tracking</span>
                        <span className="mono">{s.tracking_no || s.tracking || '-'}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cell-sub">{s.dispatch_date ? new Date(s.dispatch_date).toLocaleDateString() : '-'}</span>
                      <button className="ops-btn ops-btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: 8 }}>Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination
              totalItems={shipments.length}
              currentPage={currentPage}
              pageSize={itemsPerPage}
              totalPages={Math.ceil(shipments.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
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

          {/* Sub-navigation Switch Bar */}
          <div className="crm-switch-bar">
            <button
              className={`crm-switch-btn ${crmSection === 'pipeline' ? 'active' : ''}`}
              onClick={() => { setCrmSection('pipeline'); setCurrentPage(1); }}
            >
              <LayoutGrid size={16} /> Lead Pipeline
            </button>
            <button
              className={`crm-switch-btn ${crmSection === 'referrals' ? 'active' : ''}`}
              onClick={() => { setCrmSection('referrals'); setCurrentPage(1); }}
            >
              <Users size={16} /> Referral Summary
            </button>
            <button
              className={`crm-switch-btn ${crmSection === 'reminders' ? 'active' : ''}`}
              onClick={() => { setCrmSection('reminders'); setCurrentPage(1); }}
            >
              <FileText size={16} /> Case Reminders
            </button>
          </div>

          {crmSection === 'pipeline' && (
            <div className="ops-content card slide-up">
              <>
                <div className="ops-table-header">
                  <div>
                    <h2 className="pane-title">Lead Pipeline ({leads.length})</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Manage patient inquiries and follow-ups.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="crm-search-wrap">
                      <Search size={14} className="crm-search-icon" />
                      <input
                        type="text"
                        placeholder="Search patients by name or phone..."
                        className="crm-search-input"
                        value={crmSearch}
                        onChange={e => setCrmSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="crm-filter-pills" style={{ marginBottom: 20, borderBottom: 'none' }}>
                  {['all', 'new', 'pending', 'converted', 'overdue'].map(f => (
                    <button
                      key={f}
                      className={`crm-filter-pill ${crmFilter === f ? 'active' : ''}`}
                      onClick={() => setCrmFilter(f as any)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <TableSkeleton rows={5} columns={leadCols.length} />
                ) : leads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-surface-2)', borderRadius: 12 }}>
                    <UsersRound size={32} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>No leads found</p>
                  </div>
                ) : (
                  <div className="plat-table-container">
                    <table className="plat-table">
                      <thead>
                        <tr>{leadCols.map(col => <th key={col}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {leads.filter(l => {
                          const matchesSearch = l.name?.toLowerCase().includes(crmSearch.toLowerCase());
                          const matchesFilter = crmFilter === 'all' || l.status?.toLowerCase() === crmFilter;
                          return matchesSearch && matchesFilter;
                        }).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(l => (
                          <tr key={l.id} className="plat-table-row">
                            <td>{l.id}</td>
                            <td>
                              <div className="cell-main">{l.name}</div>
                              <div className="cell-sub"><Phone size={11} /> {l.mobile || l.phone}</div>
                            </td>
                            <td>{l.source}</td>
                            <td><StatusBadge status={l.status || 'New'} /></td>
                            <td>
                              <div className="cell-sub" style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {l.notes}
                              </div>
                            </td>
                            <td><span className="cell-sub">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '-'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {l.status?.toLowerCase() !== 'converted' && (
                                  <button
                                    className="ops-btn ops-btn-xs ops-btn-success"
                                    onClick={() => handleConvertLead(l.id)}
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                  >
                                    Convert
                                  </button>
                                )}
                                <button className="ops-icon-btn"><Edit3 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  totalItems={leads.filter(l => {
                    const matchesSearch = l.name?.toLowerCase().includes(crmSearch.toLowerCase());
                    const matchesFilter = crmFilter === 'all' || l.status?.toLowerCase() === crmFilter;
                    return matchesSearch && matchesFilter;
                  }).length}
                  currentPage={currentPage}
                  pageSize={itemsPerPage}
                  totalPages={Math.ceil(leads.filter(l => {
                    const matchesSearch = l.name?.toLowerCase().includes(crmSearch.toLowerCase());
                    const matchesFilter = crmFilter === 'all' || l.status?.toLowerCase() === crmFilter;
                    return matchesSearch && matchesFilter;
                  }).length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                />
              </>
            </div>
          )}

          {crmSection === 'referrals' && (
            <div className="ops-content card slide-up">
              <>
                <div className="ops-table-header">
                  <div>
                    <h2 className="pane-title">Referral Summary ({referrals.length})</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Track patient referral network and incentives.</p>
                  </div>
                  <button className="ops-btn ops-btn-primary" onClick={() => setModalType('referral')}>
                    <Plus size={16} /> Log Referral
                  </button>
                </div>
                {loading ? (
                  <TableSkeleton rows={5} columns={referralCols.length} />
                ) : (
                  <div className="plat-table-container">
                    <table className="plat-table">
                      <thead>
                        <tr>{referralCols.map(col => <th key={col}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {referrals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((r, idx) => (
                          <tr key={idx} className="plat-table-row">
                            <td><span className="cell-main">{r.first_name} {r.surname}</span></td>
                            <td><span className="cell-sub">ID: {r.referral_id}</span></td>
                            <td>
                              <span style={{ color: 'var(--pp-success-fg)', fontWeight: 600 }}>₹{r.total_amount}</span>
                            </td>
                            <td>₹{r.used_amount}</td>
                          </tr>
                        ))}
                        {referrals.length === 0 && !loading && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No referrals found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  totalItems={referrals.length}
                  currentPage={currentPage}
                  pageSize={itemsPerPage}
                  totalPages={Math.ceil(referrals.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                />
              </>
            </div>
          )}

          {crmSection === 'reminders' && (
            <div className="ops-content card slide-up">
              <>
                <div className="ops-table-header">
                  <div>
                    <h2 className="pane-title">Case Reminders ({reminders.length})</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Upcoming patient follow-ups and case reviews.</p>
                  </div>
                  <button className="ops-btn ops-btn-primary" onClick={() => setModalType('reminder')}>
                    <Plus size={16} /> Set Reminder
                  </button>
                </div>
                {loading ? (
                  <TableSkeleton rows={5} columns={reminderCols.length} />
                ) : (
                  <div className="plat-table-container">
                    <table className="plat-table">
                      <thead>
                        <tr>{reminderCols.map(col => <th key={col}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {reminders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(r => (
                          <tr key={r.id} className="plat-table-row">
                            <td><span className="cell-main">{r.patient_name || 'Patient #' + r.patient_id}</span></td>
                            <td>{r.heading}</td>
                            <td><span className="cell-sub">{r.start_date} {r.remind_time}</span></td>
                            <td><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                        {reminders.length === 0 && !loading && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No reminders found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  totalItems={reminders.length}
                  currentPage={currentPage}
                  pageSize={itemsPerPage}
                  totalPages={Math.ceil(reminders.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                />
              </>
            </div>
          )}
        </div>
      )}

      {/* ─── KNOWLEDGE TAB ─── */}
      {activeTab === 'knowledge' && (
        <div className="slide-up">
          <div className="ops-content card" style={{ marginBottom: 16 }}>
            <div className="ops-table-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="pane-title">Medical Dictionary</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Diagnosis terminology and clinical references.</p>
              </div>
              <div className="appt-segmented-toggle">
                <button
                  className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={16} /> List
                </button>
                <button
                  className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={16} /> Grid
                </button>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={dictCols.length} />
            ) : dictionary.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-surface-2)', borderRadius: 12 }}>
                <p style={{ color: 'var(--text-muted)' }}>No dictionary entries found.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="plat-table-container">
                <table className="plat-table">
                  <thead>
                    <tr>{dictCols.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dictionary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(d => (
                      <tr key={d.id} className="plat-table-row">
                        <td><span className="cell-main" style={{ fontWeight: 700 }}>{d.title}</span></td>
                        <td><span className="cell-sub" style={{ maxWidth: 300 }}>{d.text}</span></td>
                        <td><span className="ops-cross-ref">{d.cross_ref || d.crossRef}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ops-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {dictionary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(d => (
                  <div key={d.id} className="ops-card" style={{ padding: 16, borderRadius: 18 }}>
                    <div className="cell-main" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--pp-blue-deep)', marginBottom: 8 }}>{d.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--pp-muted)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{d.text}</div>
                    {d.cross_ref && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="ops-cross-ref">Ref: {d.cross_ref}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Pagination
              totalItems={dictionary.length}
              currentPage={currentPage}
              pageSize={itemsPerPage}
              totalPages={Math.ceil(dictionary.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </div>

          <div className="ops-content card">
            <div className="ops-table-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="pane-title">Library Resources</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)', marginTop: 4 }}>Uploaded clinical books and PDFs.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="appt-segmented-toggle">
                  <button
                    className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={16} /> List
                  </button>
                  <button
                    className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={16} /> Grid
                  </button>
                </div>
                <button className="ops-btn ops-btn-primary" onClick={() => setModalType('book')} style={{ padding: '8px 16px' }}>
                  + Upload
                </button>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={bookCols.length} />
            ) : books.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'var(--pp-warm-1)', borderRadius: 12 }}>
                <p style={{ color: 'var(--pp-muted)' }}>No library resources found.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="plat-table-container">
                <table className="plat-table">
                  <thead>
                    <tr>{bookCols.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {books.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(b => (
                      <tr key={b.id} className="plat-table-row">
                        <td><span className="cell-main">{b.title}</span></td>
                        <td>{b.author || 'Unknown'}</td>
                        <td><StatusBadge status={b.resource_type || 'Book'} /></td>
                        <td>
                          <button className="ops-icon-btn" aria-label="Open link">
                            <ExternalLink size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ops-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {books.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(b => (
                  <div key={b.id} className="ops-card" style={{ padding: 16, borderRadius: 18, border: '1px solid var(--pp-warm-4)' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 48, background: 'var(--pp-warm-1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ExternalLink size={16} style={{ color: 'var(--pp-warm-5)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-main" style={{ fontSize: '14px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                        <div className="cell-sub" style={{ fontSize: '11px' }}>{b.author || 'Unknown'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <StatusBadge status={b.resource_type || 'Book'} />
                      <button className="ops-btn ops-btn-ghost" style={{ padding: '6px 10px', fontSize: '11px', borderRadius: 8 }}>Open</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              totalItems={books.length}
              currentPage={currentPage}
              pageSize={itemsPerPage}
              totalPages={Math.ceil(books.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
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
                      const baseURL = apiClient.defaults.baseURL || '/api';
                      const response = await fetch(`${baseURL}/export/${selectedExport}`, {
                        headers: { Authorization: `Bearer ${token}` }
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
                              const baseURL = apiClient.defaults.baseURL || '/api';
                              const response = await fetch(`${baseURL}/export/${e.id}`, {
                                headers: { Authorization: `Bearer ${token}` }
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

      {/* ─── SIDE DRAWERS (MODALS REPLACED WITH RIGHT SIDED DRAWER) ─── */}
      <div className={`ops-drawer-overlay ${modalType ? 'active' : ''}`} onClick={closeModal}>
        <div className={`ops-drawer ${modalType ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="ops-drawer-header">
            <h2 className="ops-drawer-title">
              {modalType === 'lead' && 'Capture New Lead'}
              {modalType === 'courier' && 'Update Courier Info'}
              {modalType === 'referral' && 'Log Referral'}
              {modalType === 'reminder' && 'Create Case Reminder'}
              {modalType === 'dictionary' && 'Add Dictionary Entry'}
              {modalType === 'book' && 'Upload Resource'}
              {modalType === 'export' && 'Data Export'}
            </h2>
            <button className="ops-drawer-close" onClick={closeModal}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
          </div>

          <div className="ops-drawer-body">
            {modalType === 'lead' && (
              <>
                <div className="ops-form-group">
                  <label>Full Name</label>
                  <input type="text" className="ops-input" placeholder="e.g. Suman Magar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="ops-form-group">
                  <label>Mobile Number</label>
                  <input type="tel" className="ops-input" placeholder="e.g. 98XXXXXXXX" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                </div>
                <div className="ops-form-group">
                  <label>Lead Source</label>
                  <select className="ops-input" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                    <option>Instagram Ads</option><option>Facebook</option><option>Google Search</option><option>Website Form</option><option>Direct / Walk-in</option><option>Referral</option>
                  </select>
                </div>
                <div className="ops-form-group">
                  <label>Notes / Requirements</label>
                  <textarea className="ops-input" placeholder="Additional details..." style={{ minHeight: 100 }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </>
            )}

            {modalType === 'courier' && (
              <>
                <div className="ops-form-group"><label>Courier Partner</label><input type="text" className="ops-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="ops-form-group"><label>Tracking ID</label><input type="text" className="ops-input" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} /></div>
              </>
            )}

            {modalType === 'referral' && (
              <>
                <div className="ops-form-group"><label>Reg ID</label><input type="text" className="ops-input" value={formData.regid} onChange={e => setFormData({ ...formData, regid: e.target.value })} /></div>
                <div className="ops-form-group"><label>Referral ID</label><input type="text" className="ops-input" value={formData.referral_id} onChange={e => setFormData({ ...formData, referral_id: e.target.value })} /></div>
                <div className="ops-form-group"><label>Total Amount</label><input type="number" className="ops-input" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} /></div>
              </>
            )}

            {modalType === 'reminder' && (
              <>
                <div className="ops-form-group"><label>Reminder Heading</label><input type="text" className="ops-input" value={formData.heading} onChange={e => setFormData({ ...formData, heading: e.target.value })} /></div>
                <div className="ops-form-group"><label>Date</label><input type="date" className="ops-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                <div className="ops-form-group"><label>Time</label><input type="time" className="ops-input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} /></div>
                <div className="ops-form-group"><label>Notes</label><textarea className="ops-input" style={{ minHeight: 80 }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
              </>
            )}

            {modalType === 'dictionary' && (
              <>
                <div className="ops-form-group"><label>Title / Remedy Name</label><input type="text" className="ops-input" value={dictForm.title} onChange={e => setDictForm({ ...dictForm, title: e.target.value })} /></div>
                <div className="ops-form-group"><label>Description</label><textarea className="ops-input" style={{ minHeight: 120 }} value={dictForm.text} onChange={e => setDictForm({ ...dictForm, text: e.target.value })} /></div>
                <div className="ops-form-group"><label>Cross Reference</label><input type="text" className="ops-input" value={dictForm.cross_ref} onChange={e => setDictForm({ ...dictForm, cross_ref: e.target.value })} /></div>
              </>
            )}

            {modalType === 'book' && (
              <>
                <div className="ops-form-group"><label>Resource Title</label><input type="text" className="ops-input" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} /></div>
                <div className="ops-form-group"><label>Author</label><input type="text" className="ops-input" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} /></div>
                <div className="ops-form-group">
                  <label>Type</label>
                  <select className="ops-input" value={bookForm.resource_type} onChange={e => setBookForm({ ...bookForm, resource_type: e.target.value })}>
                    <option value="Book">Book</option><option value="PDF">PDF</option><option value="Link">Link</option>
                  </select>
                </div>
                <div className="ops-form-group"><label>URL</label><input type="url" className="ops-input" value={bookForm.url} onChange={e => setBookForm({ ...bookForm, url: e.target.value })} /></div>
                <div className="ops-form-group"><label>Description</label><textarea className="ops-input" style={{ minHeight: 80 }} value={bookForm.description} onChange={e => setBookForm({ ...bookForm, description: e.target.value })} /></div>
              </>
            )}

            {modalType === 'export' && (
              <div className="ops-form-group">
                <label>Select Dataset</label>
                <select className="ops-input"><option>All Patients via CSV</option><option>Medicines & Inventory (Excel)</option><option>Full Backup Dump (.sql)</option></select>
              </div>
            )}
          </div>

          <div className="ops-drawer-footer">
            <button className="ops-btn ops-btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="ops-btn ops-btn-primary" onClick={handleAction}>
              {modalType === 'export' ? 'Queue Download' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}