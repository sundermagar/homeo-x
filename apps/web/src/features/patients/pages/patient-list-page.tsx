import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient, usePatientFormMeta } from '../hooks/use-patients';
import {
  Search, Plus, List as ListIcon, Grid, Edit2, MapPin, Calendar,
  MessageCircle, Printer, Download, MoreVertical, Trash2, Phone, User, Users, ClipboardList, Zap
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { type PatientSummary } from '@mmc/types';
import { PatientFormDrawer } from '../components/patient-form-drawer';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { AssignPackageModal } from '../../packages/components/assign-package-modal';
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
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
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
  const [assignPkgPatient, setAssignPkgPatient] = useState<{ regid: number; name: string } | null>(null);

  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);

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
      <button className="appt-kebab-item" onClick={() => { window.open(`/api/medical-cases/remedy-chart/pdf/${p.regid}?token=${token}`, '_blank'); closeMenu(); }}>
        <Printer size={14} /> Print Prescription
      </button>
      <button className="appt-kebab-item" onClick={() => { window.open(`/api/medical-cases/pdf/summary/${p.regid}?token=${token}`, '_blank'); closeMenu(); }}>
        <Download size={14} /> Download Report
      </button>
      <div className="appt-kebab-divider" />
      <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { setAssignPkgPatient({ regid: p.regid, name: p.fullName }); closeMenu(); }}>
        <Zap size={14} /> Assign Package
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

      {/* Table Content */}
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
        <div className="pp-table-container-enhanced">
          <div className="pp-table-scroll">
            <table className="pp-table pat-main-table">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Patient</th>
                  <th>RegID</th>
                  <th>Contact</th>
                  <th>Doctor Name</th>
                  <th>Last Followup</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: PatientSummary, idx: number) => (
                  <tr key={p.regid} className="pp-hover-row">
                    <td data-label="#">
                      <div className="font-mono text-[11px] font-semibold color-muted opacity-60">
                        {idx + 1 + (page - 1) * pageSize}
                      </div>
                    </td>
                    <td data-label="Patient">
                      <div className="pat-member-row">
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
                    <td data-label="Contact">
                      <span className="appt-cell-name">{p.phone || '—'}</span>
                    </td>
                    <td data-label="Doctor Name">
                      <span className="appt-cell-muted">{doctorName(p)}</span>
                    </td>
                    <td data-label="Last Followup">
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

      {assignPkgPatient && (
        <AssignPackageModal
          isOpen={!!assignPkgPatient}
          onClose={() => setAssignPkgPatient(null)}
          patientId={assignPkgPatient.regid}
          patientName={assignPkgPatient.name}
        />
      )}
    </div>
  );
}
