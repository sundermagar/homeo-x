import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient, usePatientFormMeta } from '../hooks/use-patients';
import {
  Search, Plus, List as ListIcon, Grid, Edit2, MapPin, Calendar,
  MessageCircle, Printer, Download, MoreVertical, Trash2, Phone, User
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { type PatientSummary } from '@mmc/types';
import { PatientFormDrawer } from '../components/patient-form-drawer';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import '../../appointments/styles/appointments.css';
import '../../dashboard/pages/role-dashboards.css';
import '../styles/patients.css';
import { Pagination } from '@/components/shared/pagination';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
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

function getInitials(name: string) {
  return (name || '?')[0].toUpperCase();
}

/* ─── Portal Kebab Menu ────────────────────────────────────────────────────── */
interface KebabMenuPortalProps {
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  children: React.ReactNode;
}

function KebabMenuPortal({ anchorEl, onClose, children }: KebabMenuPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed', opacity: 0, pointerEvents: 'none',
  });

  useEffect(() => {
    if (!anchorEl) return;

    const position = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 240;
      const menuW = menuRef.current?.offsetWidth ?? 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spaceBelow = vh - rect.bottom;
      const openUp = spaceBelow < menuH + 8 && rect.top > menuH + 8;
      const alignRight = rect.right + 4 >= vw - menuW;
      setStyle({
        position: 'fixed',
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? vh - rect.top + 4 : undefined,
        left: alignRight ? undefined : rect.left,
        right: alignRight ? vw - rect.right : undefined,
        zIndex: 9999,
        opacity: 1,
        pointerEvents: 'auto',
      });
    };

    const t = setTimeout(position, 10);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', onClose, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [anchorEl, onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorEl, onClose]);

  return createPortal(
    <div ref={menuRef} className="appt-kebab-menu" style={style}>{children}</div>,
    document.body
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function PatientListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('newest');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ regid: number; el: HTMLButtonElement } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRegid, setDrawerRegid] = useState<number | null>(null);

  const user = useAuthStore(s => s.user);

  const { data, isLoading, refetch } = usePatients({
    page, limit: pageSize, search: debouncedSearch,
    clinicId: (user as any)?.contextId,
    sortBy, sortOrder: sortBy === 'oldest' ? 'asc' : 'desc',
  });
  const { data: meta } = usePatientFormMeta((user as any)?.contextId);
  const deleteMutation = useDeletePatient();

  const handleSearchChange = (val: string) => {
    setSearch(val); setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const patients = data?.data || [];
  const totalEntries = data?.total || 0;
  const totalPages = Math.ceil(totalEntries / pageSize);

  const closeMenu = useCallback(() => setMenuAnchor(null), []);
  const toggleMenu = (regid: number, el: HTMLButtonElement) =>
    setMenuAnchor(prev => (prev?.regid === regid ? null : { regid, el }));

  const handleDelete = async (regid: number, name: string) => {
    closeMenu();
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    setDeletingId(regid);
    try { await deleteMutation.mutateAsync(regid); refetch(); }
    catch { alert('Failed to delete patient.'); }
    finally { setDeletingId(null); }
  };

  const doctorName = (p: PatientSummary) =>
    meta?.doctors?.find(d => String(d.id) === String(p.doctorName))?.name || p.doctorName || '—';

  const renderMenuItems = (p: PatientSummary) => (
    <>
      <button className="appt-kebab-item" onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); closeMenu(); }}>
        <Edit2 size={14} /> Edit Patient
      </button>
      <button className="appt-kebab-item" onClick={() => { openWhatsApp(p.phone, p.fullName); closeMenu(); }}>
        <MessageCircle size={14} /> WhatsApp
      </button>
      <button className="appt-kebab-item" onClick={() => { window.open(`/api/medical-cases/remedy-chart/pdf/${p.regid}`, '_blank'); closeMenu(); }}>
        <Printer size={14} /> Print Prescription
      </button>
      <button className="appt-kebab-item" onClick={() => { window.open(`/api/medical-cases/pdf/summary/${p.regid}`, '_blank'); closeMenu(); }}>
        <Download size={14} /> Download Report
      </button>
      <div className="appt-kebab-divider" />
      <button className="appt-kebab-item is-danger" onClick={() => handleDelete(p.regid, p.fullName)}>
        <Trash2 size={14} /> Delete
      </button>
    </>
  );

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header */}
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>Patient Registry</h1>
          <p className="text-subtitle">Access and manage comprehensive patient health records.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="appt-segmented-toggle">
            <button type="button" className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              <ListIcon size={16} /> List
            </button>
            <button type="button" className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid size={16} /> Grid
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mmc-pl-filterbar" style={{ marginBottom: '20px' }}>
        <div className="mmc-pl-search-wrap">
          <Search size={15} className="mmc-pl-search-icon" />
          <input
            className="mmc-pl-search-input" type="text"
            placeholder="Search by name, phone or Case ID..."
            value={search} onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="mmc-pl-filter-right">
          <label className="mmc-pl-filter-label">Sort:</label>
          <select className="mmc-pl-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="pat-stats-row">
        <span className="text-label">Registry Entries</span>
        <span className="text-small">Showing {patients.length} of {totalEntries}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : patients.length === 0 ? (
        <div className="pp-card pat-empty-state">
          <p className="pat-empty-state-title">No patients found</p>
          <p className="text-small">Try adjusting your search filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          <div className="pat-desktop-table pp-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--pp-radius-card)', border: '1px solid var(--pp-warm-4)' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="pp-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>RegID</th>
                    <th>Contact</th>
                    <th>Doctor Name</th>
                    <th>Last Followup</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p: PatientSummary) => (
                    <tr key={p.regid} className="hover-row">
                      <td>
                        <div className="pat-member-row">
                          <div className="pat-avatar">{getInitials(p.fullName)}</div>
                          <div>
                            <Link to={`/medical-cases/${p.regid}`} className="pat-member-name clickable-link">
                              {p.fullName || 'Unknown'}
                            </Link>
                            <div className="text-small">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Link to={`/medical-cases/${p.regid}`} className="pp-mono pat-regid-pill clickable-link">
                          {p.regid}
                        </Link>
                      </td>
                      <td>{p.phone || '—'}</td>
                      <td>{doctorName(p)}</td>
                      <td className="text-small">{formatDate(p.lastVisit || p.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="appt-kebab-btn"
                          onClick={e => toggleMenu(p.regid, e.currentTarget)}
                          aria-label="Patient actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS (hidden on desktop) ── */}
          <div className="pat-mobile-cards">
            {patients.map((p: PatientSummary) => (
              <div key={p.regid} className="pat-mobile-card">
                {/* Card header: avatar + name + actions */}
                <div className="pat-mobile-card-header">
                  <div className="pat-avatar pat-avatar--md">{getInitials(p.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/medical-cases/${p.regid}`} className="pat-mobile-card-name clickable-link">
                      {p.fullName || 'Unknown'}
                    </Link>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className="pat-reg-badge">#{p.regid}</span>
                      {(p.gender === 'M' || p.gender === 'F') && (
                        <span className="text-small" style={{ color: 'var(--pp-text-3)' }}>
                          {p.gender === 'M' ? 'Male' : 'Female'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="appt-kebab-btn"
                    onClick={e => toggleMenu(p.regid, e.currentTarget)}
                    aria-label="Patient actions"
                    style={{ flexShrink: 0 }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Card body: details */}
                <div className="pat-mobile-card-body">
                  {p.phone && (
                    <div className="pat-mobile-card-row">
                      <Phone size={13} style={{ color: 'var(--pp-text-3)', flexShrink: 0 }} />
                      <span>{p.phone}</span>
                    </div>
                  )}
                  <div className="pat-mobile-card-row">
                    <User size={13} style={{ color: 'var(--pp-text-3)', flexShrink: 0 }} />
                    <span>{doctorName(p)}</span>
                  </div>
                  <div className="pat-mobile-card-row">
                    <Calendar size={13} style={{ color: 'var(--pp-text-3)', flexShrink: 0 }} />
                    <span>Last visit: {formatDate(p.lastVisit || p.createdAt)}</span>
                  </div>
                </div>

                {/* Card footer: quick actions */}
                <div className="pat-mobile-card-actions">
                  <Link to={`/medical-cases/${p.regid}`} className="pat-mobile-action-btn pat-mobile-action-primary">
                    View Records
                  </Link>
                  <button className="pat-mobile-action-btn pat-mobile-action-wa" onClick={() => openWhatsApp(p.phone, p.fullName)}>
                    <MessageCircle size={14} />
                  </button>
                  <button className="pat-mobile-action-btn pat-mobile-action-edit" onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); }}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── GRID VIEW ── */
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
                <button
                  className="appt-kebab-btn"
                  onClick={e => toggleMenu(p.regid, e.currentTarget)}
                  aria-label="Patient actions"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
              <div className="appt-grid-card-detail">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={14} /> {doctorName(p)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} /> Followup: {formatDate(p.lastVisit || p.createdAt)}
                </div>
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

      {/* Portal dropdown — renders at body level, no clipping ever */}
      {menuAnchor && (
        <KebabMenuPortal anchorEl={menuAnchor.el} onClose={closeMenu}>
          {renderMenuItems(patients.find((p: PatientSummary) => p.regid === menuAnchor.regid)!)}
        </KebabMenuPortal>
      )}

      {totalEntries > 0 && (
        <Pagination
          currentPage={page} totalPages={totalPages}
          pageSize={pageSize} totalItems={totalEntries}
          onPageChange={setPage} onPageSizeChange={setPageSize}
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
