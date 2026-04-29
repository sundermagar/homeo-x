import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';
import { 
  Search, Plus, List as ListIcon, Grid, Eye, Edit2, Phone, MapPin, Calendar, 
  ChevronLeft, ChevronRight, MessageCircle, Printer, Download, RefreshCw, MoreVertical, Trash2
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Role, type PatientSummary } from '@mmc/types';
import { PatientFormDrawer } from '../components/patient-form-drawer';
import '../../appointments/styles/appointments.css';
import '../../dashboard/pages/role-dashboards.css';
import '../styles/patients.css';

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function openWhatsApp(phone: string | null, name: string) {
  if (!phone) return alert('No phone number available.');
  const cleaned = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Hello ${name}, this is a message from your clinic.`);
  window.open(`https://wa.me/91${cleaned}?text=${msg}`, '_blank');
}

export default function PatientListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('newest');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRegid, setDrawerRegid] = useState<number | null>(null);

  const user = useAuthStore(s => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || '').toLowerCase();
  const isDoctor = rawRole === 'doctor';

  const { data, isLoading, refetch } = usePatients({
    page,
    limit: pageSize,
    search: debouncedSearch,
    clinicId: (user as any)?.contextId,
    sortBy: sortBy,
    sortOrder: sortBy === 'oldest' ? 'asc' : 'desc'
  });
  const deleteMutation = useDeletePatient();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const patients = data?.data || [];
  const totalEntries = data?.total || 0;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const fromEntry = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const toEntry = Math.min(page * pageSize, totalEntries);

  const handleDelete = async (regid: number, name: string) => {
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    setDeletingId(regid);
    try {
      await deleteMutation.mutateAsync(regid);
      refetch();
    } catch { alert('Failed to delete patient.'); }
    finally { setDeletingId(null); }
  };

  const handlePrintPrescription = (regid: number) => {
    window.open(`/api/medical-cases/remedy-chart/pdf/${regid}`, '_blank');
  };

  const handleDownloadReport = (regid: number) => {
    window.open(`/api/medical-cases/pdf/summary/${regid}`, '_blank');
  };

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>Patient Registry</h1>
          <p className="text-subtitle">Access and manage comprehensive patient health records.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="appt-segmented-toggle">
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={16} /> List
            </button>
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} /> Grid
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      <div className="mmc-pl-filterbar" style={{ marginBottom: '20px' }}>
        <div className="mmc-pl-search-wrap">
          <Search size={15} className="mmc-pl-search-icon" />
          <input
            className="mmc-pl-search-input"
            type="text"
            placeholder="Search by name, phone or Case ID..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="mmc-pl-filter-right">
          <label className="mmc-pl-filter-label">Sort:</label>
          <select className="mmc-pl-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button className="mmc-pl-refresh-btn" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="pat-stats-row">
        <span className="text-label">Registry Entries</span>
        <span className="text-small">Showing {patients.length} of {totalEntries}</span>
      </div>

      {isLoading ? (
        <div className="pp-card pp-table-scroll" style={{ padding: 0, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <table className="pp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="skeleton-box" style={{ height: '12px', width: '40px', borderRadius: '4px', opacity: 0.7 }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 6 }).map((_, colIndex) => (
                    <td key={colIndex} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <div className="skeleton-box" style={{ height: '24px', width: colIndex === 0 ? '120px' : '80px', borderRadius: '6px' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : patients.length === 0 ? (
        <div className="pp-card pat-empty-state">
          <p className="pat-empty-state-title">No patients found</p>
          <p className="text-small">Try adjusting your search filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
          <table className="pp-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>RegID</th>
                <th>Contact</th>
                <th>City</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p: PatientSummary) => (
                <tr key={p.regid} className="hover-row">
                  <td>
                    <div className="pat-member-row">
                      <div className="pat-avatar">
                        {(p.fullName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="pat-member-name">{p.fullName || 'Unknown'}</div>
                        <div className="text-small">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pp-mono" style={{ background: 'var(--pp-warm-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {p.regid}
                    </span>
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.city || '—'}</td>
                  <td className="text-small">{formatDate(p.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link to={`/medical-cases/${p.regid}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={14} /> History
                      </Link>
                      
                      <div className="appt-kebab-wrap">
                        <button 
                          className="appt-kebab-btn"
                          onClick={() => setOpenMenuId(openMenuId === p.regid ? null : p.regid)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === p.regid && (
                          <div className="appt-kebab-menu" style={{ right: 0, top: '100%', position: 'absolute', zIndex: 100 }}>
                            <button className="appt-kebab-item" onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); setOpenMenuId(null); }}>
                              <Edit2 size={14} /> Edit Patient
                            </button>
                            <button className="appt-kebab-item" onClick={() => { openWhatsApp(p.phone, p.fullName); setOpenMenuId(null); }}>
                              <MessageCircle size={14} /> WhatsApp
                            </button>
                            <button className="appt-kebab-item" onClick={() => { handlePrintPrescription(p.regid); setOpenMenuId(null); }}>
                              <Printer size={14} /> Print Prescription
                            </button>
                            <button className="appt-kebab-item" onClick={() => { handleDownloadReport(p.regid); setOpenMenuId(null); }}>
                              <Download size={14} /> Download Report
                            </button>
                            <div className="appt-kebab-divider" />
                            <button className="appt-kebab-item text-danger" onClick={() => { handleDelete(p.regid, p.fullName); setOpenMenuId(null); }}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="appt-card-grid">
          {patients.map((p: PatientSummary) => (
            <div key={p.regid} className="appt-card appt-grid-card">
              <div className="appt-grid-card-header">
                <div>
                  <div className="appt-grid-card-patient">{p.fullName}</div>
                  <div className="appt-grid-card-phone">ID: {p.regid} • {p.phone || 'No phone'}</div>
                </div>
                <div className="appt-kebab-wrap">
                  <button className="appt-kebab-btn" onClick={() => setOpenMenuId(openMenuId === p.regid ? null : p.regid)}>
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === p.regid && (
                    <div className="appt-kebab-menu" style={{ right: 0, top: '100%', position: 'absolute', zIndex: 100 }}>
                      <button className="appt-kebab-item" onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); setOpenMenuId(null); }}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button className="appt-kebab-item" onClick={() => { handleDelete(p.regid, p.fullName); setOpenMenuId(null); }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="appt-grid-card-detail">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {p.city || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Registered: {formatDate(p.createdAt)}</div>
              </div>
              <div className="appt-grid-card-actions-minimal">
                <Link to={`/medical-cases/${p.regid}`} className="appt-btn-minimal white-pill" style={{ flex: 1 }}>
                  <Eye size={14} /> History
                </Link>
                <button className="appt-btn-minimal white-pill" onClick={() => openWhatsApp(p.phone, p.fullName)}>
                  <MessageCircle size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pat-pagination-bar">
          <div className="pat-pagination-info-wrap">
            <span className="pat-pagination-info">
              Showing {fromEntry}-{toEntry} of {totalEntries}
            </span>
            <select 
              className="pat-pagination-limit" 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="pat-pagination-controls">
            <button 
              className="pat-pagination-btn" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) ? (
                <button 
                  key={p} 
                  className={`pat-pagination-page ${p === page ? 'is-active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ) : (p === page - 2 || p === page + 2) ? (
                <span key={p} style={{ color: '#cbd5e1' }}>...</span>
              ) : null
            ))}

            <button 
              className="pat-pagination-btn" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <PatientFormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        regid={drawerRegid} 
        onSuccess={refetch}
      />
    </div>
  );
}
