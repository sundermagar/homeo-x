import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient, usePatientFormMeta } from '../hooks/use-patients';
import {
  Search, Plus, List as ListIcon, Grid, Edit2, MapPin, Calendar,
  MessageCircle, Printer, Download, MoreVertical, Trash2, Phone, User, Users, ClipboardList
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
      <button className="appt-kebab-item" onClick={() => { navigate(`/patients/${p.regid}`); closeMenu(); }}>
        <Users size={14} /> Manage Family
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
      {/* ── Hero Header ── */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <ClipboardList size={22} strokeWidth={1.8} />
            Patient Registry
          </h1>
          <p className="pp-page-hero-sub">Access and manage comprehensive patient health records.</p>
        </div>
        <div className="pp-page-hero-actions">
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

      {/* ── Filter Card ── */}
      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={16} />
          <input
            className="pp-filter-search-input" type="text"
            placeholder="Search patients by name, phone or registration ID..."
            value={search} onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="pp-filter-controls">
          <div className="pp-filter-group">
            <span className="pp-filter-label">Sort:</span>
            <select className="pp-select" style={{ minWidth: 150 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Meta Row ── */}
      <div className="pp-table-meta-row">
        <div className="pp-table-meta-label">Registry Entries</div>
        <div className="pp-table-meta-stats">Showing {patients.length} of {totalEntries} patients</div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : patients.length === 0 ? (
        <div className="pp-empty-enhanced">
          <div className="pp-empty-icon-circle">
            <ClipboardList size={32} />
          </div>
          <p className="pp-empty-title">No patients found</p>
          <p className="pp-empty-sub">Try adjusting your search filters or register a new patient.</p>
          <button className="btn-primary" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={16} /> Register Patient
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          <div className="pat-desktop-table pp-table-container-enhanced">
            <div className="pp-table-scroll">
              <table className="pp-table pat-main-table" style={{ border: 'none', tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '28%' }} />  {/* Patient */}
                  <col style={{ width: '10%' }} />  {/* RegID */}
                  <col className="pat-col-contact" style={{ width: '16%' }} />  {/* Contact */}
                  <col className="pat-col-doctor" style={{ width: '20%' }} />   {/* Doctor */}
                  <col className="pat-col-followup" style={{ width: '18%' }} /> {/* Followup */}
                  <col style={{ width: '8%' }} />   {/* Actions — always reserved */}
                </colgroup>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>RegID</th>
                    <th className="pat-col-contact">Contact</th>
                    <th className="pat-col-doctor">Doctor Name</th>
                    <th className="pat-col-followup">Last Followup</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p: PatientSummary) => (
                    <tr key={p.regid} className="pp-hover-row">
                      <td data-label="Patient">
                        <div className="pat-member-row">
                          <div className="pat-avatar pat-avatar--md" style={{ background: p.gender === 'F' ? 'var(--pp-danger-bg)' : 'var(--pp-blue-tint)', color: p.gender === 'F' ? 'var(--pp-danger-fg)' : 'var(--pp-blue)' }}>
                            {getInitials(p.fullName)}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <Link to={`/medical-cases/${p.regid}`} className="appt-cell-name pp-clickable-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.fullName || 'Unknown'}
                            </Link>
                            <div className="appt-cell-phone">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="RegID">
                        <Link to={`/medical-cases/${p.regid}`} className="pp-regid-pill">
                          #{p.regid}
                        </Link>
                      </td>
                      <td data-label="Contact" className="pat-col-contact" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="appt-cell-name">{p.phone || '—'}</span>
                      </td>
                      <td data-label="Doctor Name" className="pat-col-doctor" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="appt-cell-muted">{doctorName(p)}</span>
                      </td>
                      <td data-label="Last Followup" className="pat-col-followup">
                        <div className="appt-cell-name">{formatDate(p.lastVisit || p.createdAt)}</div>
                        <div className="appt-cell-phone">Visit History</div>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
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
                  <div className="pat-avatar pat-avatar--md" style={{ background: p.gender === 'F' ? 'var(--pp-danger-bg)' : 'var(--pp-blue-tint)', color: p.gender === 'F' ? 'var(--pp-danger-fg)' : 'var(--pp-blue)', flexShrink: 0 }}>
                    {getInitials(p.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/medical-cases/${p.regid}`} className="pat-mobile-card-name">
                      {p.fullName || 'Unknown'}
                    </Link>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className="pp-regid-pill">#{p.regid}</span>
                      {(p.gender === 'M' || p.gender === 'F') && (
                        <span className="text-small" style={{ color: 'var(--pp-text-3)', fontWeight: 600 }}>
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
                      <span className="pat-mobile-card-row-label">
                        <Phone size={12} /> CONTACT
                      </span>
                      <span>{p.phone}</span>
                    </div>
                  )}
                  <div className="pat-mobile-card-row">
                    <span className="pat-mobile-card-row-label">
                      <User size={12} /> DOCTOR
                    </span>
                    <span>{doctorName(p)}</span>
                  </div>
                  <div className="pat-mobile-card-row">
                    <span className="pat-mobile-card-row-label">
                      <Calendar size={12} /> LAST VISIT
                    </span>
                    <span>{formatDate(p.lastVisit || p.createdAt)}</span>
                  </div>
                </div>

                {/* Card footer: quick actions */}
                <div className="pat-mobile-card-actions">
                  <Link to={`/medical-cases/${p.regid}`} className="btn-primary" style={{ flex: 1, height: 42, fontSize: '13px', justifyContent: 'center' }}>
                    View Records
                  </Link>
                  <button className="btn-secondary" style={{ width: 42, height: 42, padding: 0, justifyContent: 'center' }} onClick={() => openWhatsApp(p.phone, p.fullName)}>
                    <MessageCircle size={18} />
                  </button>
                  <button className="btn-secondary" style={{ width: 42, height: 42, padding: 0, justifyContent: 'center' }} onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); }}>
                    <Edit2 size={18} />
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
