import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';
import { 
  Search, Plus, List as ListIcon, Grid, Eye, Edit2, Phone, MapPin, Calendar, 
  ChevronLeft, ChevronRight, MessageCircle, Printer, Download, MoreVertical, Trash2
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Role, type PatientSummary } from '@mmc/types';
import { PatientFormDrawer } from '../components/patient-form-drawer';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import '../../appointments/styles/appointments.css';
import '../../dashboard/pages/role-dashboards.css';
import '../styles/patients.css';
import { Pagination } from '@/components/shared/pagination';

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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRegid, setDrawerRegid] = useState<number | null>(null);

  const user = useAuthStore(s => s.user);
  
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

  const handleDelete = async (regid: number, name: string) => {
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(regid);
      refetch();
    } catch { alert('Failed to delete patient.'); }
  };

  const handleDownloadReport = (regid: number) => {
    window.open(`/api/medical-cases/pdf/summary/${regid}`, '_blank');
  };

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header pat-list-header">
        <div className="pat-header-title-wrap">
          <h1 className="text-title">Patient Registry</h1>
          <p className="text-subtitle">Access and manage comprehensive patient health records.</p>
        </div>
        <div className="pat-header-actions-wrap">
          <div className="appt-segmented-toggle pat-view-toggle">
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
          <button className="btn-primary pat-add-btn" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={16} /> <span className="btn-text">New Patient</span>
          </button>
        </div>
      </div>

      <div className="mmc-pl-filterbar pat-list-filterbar">
        <div className="mmc-pl-search-wrap pat-search-container">
          <Search size={15} className="mmc-pl-search-icon" />
          <input
            className="mmc-pl-search-input pat-filter-input"
            type="text"
            placeholder="Search by name, phone or Case ID..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="mmc-pl-filter-right pat-sort-container">
          <label className="mmc-pl-filter-label">Sort:</label>
          <select className="mmc-pl-sort-select pat-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="pat-stats-row">
        <span className="text-label">Registry Entries</span>
        <span className="text-small">Showing {patients.length} of {totalEntries}</span>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : patients.length === 0 ? (
        <div className="pp-card pat-empty-state">
          <p className="pat-empty-state-title">No patients found</p>
          <p className="text-small">Try adjusting your search filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="pp-card pp-table-scroll pat-list-table-wrap" style={{ padding: 0 }}>
          <table className="pp-table pat-main-table">
            <thead>
              <tr>
                <th>RegID</th>
                <th>Patient</th>
                <th>Contact</th>
                <th>City</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p: PatientSummary) => (
                <tr key={p.regid} className="hover-row">
                  <td data-label="REGID">
                    <span className="pat-cell-value">
                      <Link to={`/medical-cases/${p.regid}`} className="pp-mono pat-regid-pill clickable-link">
                        {p.regid}
                      </Link>
                    </span>
                  </td>
                  <td data-label="PATIENT">
                    <div className="pat-member-row">
                      <div className="pat-avatar">
                        {(p.fullName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="pat-member-info">
                        <Link to={`/medical-cases/${p.regid}`} className="pat-member-name clickable-link">
                          {p.fullName || 'Unknown'}
                        </Link>
                        <div className="pat-member-meta">
                          {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="CONTACT"><span className="pat-cell-value">{p.phone || '—'}</span></td>
                  <td data-label="CITY"><span className="pat-cell-value">{p.city || '—'}</span></td>
                  <td data-label="REGISTERED" className="text-small"><span className="pat-cell-value">{formatDate(p.createdAt)}</span></td>
                  <td data-label="ACTION" style={{ textAlign: 'right' }}>
                    <span className="pat-cell-value" style={{ justifyContent: 'flex-end' }}>
                      <div className="appt-kebab-wrap" style={{ width: '100%' }}>
                        <button 
                          className="appt-kebab-btn pat-action-btn-mobile"
                          onClick={() => setOpenMenuId(openMenuId === p.regid ? null : p.regid)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === p.regid && (
                          <div className="appt-kebab-menu pat-menu-mobile-fix">
                            <Link to={`/medical-cases/${p.regid}`} className="appt-kebab-item" onClick={() => setOpenMenuId(null)}>
                              <Eye size={14} /> Case History
                            </Link>
                            <button className="appt-kebab-item" onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); setOpenMenuId(null); }}>
                              <Edit2 size={14} /> Edit Patient
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
                    </span>
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
                  <Link to={`/medical-cases/${p.regid}`} className="appt-grid-card-patient clickable-link">
                    {p.fullName}
                  </Link>
                  <div className="appt-grid-card-phone">
                    <Link to={`/medical-cases/${p.regid}`} className="clickable-link" style={{ color: 'inherit' }}>
                      ID: {p.regid}
                    </Link> • {p.phone || 'No phone'}
                  </div>
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
                <button className="appt-btn-minimal white-pill" style={{ flex: 1 }} onClick={() => openWhatsApp(p.phone, p.fullName)}>
                  <MessageCircle size={14} /> Send WhatsApp Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalEntries > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalEntries}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
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
