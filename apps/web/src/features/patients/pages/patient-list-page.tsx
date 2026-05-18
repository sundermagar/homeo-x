import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient, usePatientFormMeta, useUnregisteredPatients } from '../hooks/use-patients';
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
import { EmptyState } from '@/components/shared/empty-state';
import { useSendWhatsApp } from '@/features/communications/hooks/use-communications';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const [selectedUnregistered, setSelectedUnregistered] = useState<any | null>(null);

  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const sendWhatsApp = useSendWhatsApp();

  const openWhatsApp = (phone: string | null, name: string) => {
    if (!phone) return alert('No phone number available.');
    const cleaned = phone.replace(/\D/g, '');
    const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const msg = `Hello ${name}, this is a message from your clinic.`;
    sendWhatsApp.mutate({ phone: finalPhone, message: msg }, {
      onSuccess: () => alert('WhatsApp message sent directly via Meta Cloud API!'),
      onError: (err: any) => alert('Failed to send WhatsApp message: ' + (err.response?.data?.message || err.message))
    });
  };

  const { data, isLoading, refetch } = usePatients({
    page, limit: pageSize, search: debouncedSearch,
    clinicId: (user as any)?.contextId,
    sortBy, sortOrder: sortBy === 'oldest' ? 'asc' : 'desc',
  });
  const { data: meta } = usePatientFormMeta((user as any)?.contextId);
  const { data: unregisteredPatients = [], isLoading: isLoadingUnreg, refetch: refetchUnreg } = useUnregisteredPatients({
    search: debouncedSearch,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    clinicId: (user as any)?.contextId,
  });
  const deleteMutation = useDeletePatient();

  const combinedPatients = useMemo(() => [
    ...unregisteredPatients.map((up: any) => ({
      regid: 0,
      fullName: up.name,
      phone: up.phone,
      gender: up.gender,
      doctorName: up.latestAppointment?.doctorName || '—',
      lastVisit: null,
      isUnregistered: true,
      original: up
    })),
    ...(data?.data || []).map((p: PatientSummary) => ({ ...p, isUnregistered: false }))
  ], [unregisteredPatients, data?.data]);

  const totalEntries = (data?.total || 0) + unregisteredPatients.length;

  const handleSearchChange = (val: string) => {
    setSearch(val); setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

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

  const doctorName = (p: any) => {
     return meta?.doctors?.find(d => String(d.id) === String(p.doctorName))?.name || p.doctorName || '—';
  }

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
          <button className="btn-primary" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={18} />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      {/* ── Registry Controls ── */}
      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={16} />
          <input
            type="text"
            className="pp-filter-search-input"
            placeholder="Search patients by name, phone or registration ID..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        
        <div className="pp-filter-controls">
          <div className="appt-segmented-toggle">
             <button className={`appt-segmented-btn ${viewMode === 'list' ? 'is-active' : ''}`} onClick={() => setViewMode('list')} title="List View">
               <ListIcon size={16} /> List
             </button>
             <button className={`appt-segmented-btn ${viewMode === 'grid' ? 'is-active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
               <Grid size={16} /> Grid
             </button>
          </div>

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
        <div className="pp-table-meta-stats">Showing {combinedPatients.length} entries</div>
      </div>

      {/* Table Content */}
      {isLoading || isLoadingUnreg ? (
        <TableSkeleton rows={10} cols={6} />
      ) : combinedPatients.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title={debouncedSearch ? "No matches found" : "No patients registered"}
          description={debouncedSearch ? `We couldn't find any patient matching "${debouncedSearch}".` : "Your clinic's patient registry is empty."}
          actionLabel={debouncedSearch ? "Clear Search" : "Register Patient"}
          onAction={debouncedSearch ? () => handleSearchChange('') : () => { setDrawerRegid(null); setIsDrawerOpen(true); }}
          variant="card"
          className="my-8"
        />
      ) : viewMode === 'list' ? (
        <div className="pp-table-container-enhanced">
          <div className="pp-table-scroll">
            <table className="pp-table pat-main-table">
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
                {combinedPatients.map((p: any, idx: number) => (
                  <tr key={p.isUnregistered ? `unreg-${p.original.id}` : p.regid} className="pp-hover-row">
                    <td data-label="#">
                      <div className="font-mono text-[11px] font-semibold color-muted opacity-60">
                        {idx + 1 + (page - 1) * pageSize}
                      </div>
                    </td>
                    <td data-label="Patient">
                      <div className="pat-member-row">
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          {p.isUnregistered ? (
                            <span className="appt-cell-name">{p.fullName}</span>
                          ) : (
                            <Link to={`/medical-cases/${p.regid}`} className="appt-cell-name pp-clickable-name">
                              {p.fullName || 'Unknown'}
                            </Link>
                          )}
                          <div className="appt-cell-phone">
                            {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender || '—'}
                            {p.isUnregistered && <span className="pp-badge-status status-pending" style={{ marginLeft: '8px', fontSize: '10px' }}>Unregistered</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="RegID">
                      {p.isUnregistered ? (
                        <span className="pp-regid-pill" style={{ opacity: 0.5, background: 'var(--pp-bg-subtle)' }}>PENDING</span>
                      ) : (
                        <Link to={`/medical-cases/${p.regid}`} className="pp-regid-pill">
                          #{p.regid}
                        </Link>
                      )}
                    </td>
                    <td data-label="Contact">
                      <span className="appt-cell-name">{p.phone || '—'}</span>
                    </td>
                    <td data-label="Doctor Name">
                      <span className="appt-cell-muted">{doctorName(p)}</span>
                    </td>
                    <td data-label="Last Followup">
                      {p.isUnregistered ? (
                        <span className="appt-cell-muted">Shadow Record</span>
                      ) : (
                        <>
                          <div className="appt-cell-name">{p.lastVisit ? formatDate(p.lastVisit) : "No Followup"}</div>
                          <div className="appt-cell-phone">Visit History</div>
                        </>
                      )}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      {p.isUnregistered ? (
                        <button 
                          className="btn-primary btn-sm" 
                          onClick={() => {
                            setSelectedUnregistered(p.original);
                            setDrawerRegid(null);
                            setIsDrawerOpen(true);
                          }}
                        >
                          Add Patient
                        </button>
                      ) : (
                        <button
                          className="appt-kebab-btn"
                          onClick={e => toggleMenu(p.regid, e.currentTarget)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="appt-card-grid">
          {combinedPatients.map((p: any) => (
            <div key={p.isUnregistered ? `unreg-${p.original.id}` : p.regid} className="appt-card appt-grid-card">
              <div className="appt-grid-card-header">
                <div>
                  {p.isUnregistered ? (
                    <span className="appt-grid-card-patient">{p.fullName}</span>
                  ) : (
                    <Link to={`/medical-cases/${p.regid}`} className="appt-grid-card-patient clickable-link">
                      {p.fullName}
                    </Link>
                  )}
                  <div className="appt-grid-card-phone">
                    {p.isUnregistered ? (
                      <span style={{ fontSize: '11px', color: 'var(--pp-text-muted)' }}>UNREGISTERED</span>
                    ) : (
                      <span>ID: {p.regid}</span>
                    )} • {p.phone || 'No phone'}
                  </div>
                </div>
                {!p.isUnregistered && (
                  <button className="appt-kebab-btn" onClick={e => toggleMenu(p.regid, e.currentTarget)}>
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
              <div className="appt-grid-card-detail">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={14} /> {doctorName(p)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} /> {p.isUnregistered ? 'Shadow Record' : `Followup: ${p.lastVisit ? formatDate(p.lastVisit) : "No Followup"}`}
                </div>
              </div>
              <div className="appt-grid-card-actions-minimal">
                {p.isUnregistered ? (
                  <button className="btn-primary" style={{ flex: 1, height: '32px', fontSize: '12px' }} onClick={() => { setSelectedUnregistered(p.original); setIsDrawerOpen(true); }}>
                    Add Patient
                  </button>
                ) : (
                  <button className="appt-btn-minimal white-pill" style={{ flex: 1 }} onClick={() => openWhatsApp(p.phone, p.fullName)}>
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {menuAnchor && (
        <KebabMenuPortal anchorEl={menuAnchor.el} onClose={closeMenu}>
          {renderMenuItems((data?.data || []).find((p: PatientSummary) => p.regid === menuAnchor.regid)!)}
        </KebabMenuPortal>
      )}

      {totalEntries > 0 && (
        <Pagination
          currentPage={page} totalPages={Math.ceil(totalEntries / pageSize)}
          pageSize={pageSize} totalItems={totalEntries}
          onPageChange={setPage} onPageSizeChange={setPageSize}
        />
      )}

      <PatientFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedUnregistered(null);
          setDrawerRegid(null);
        }}
        regid={drawerRegid}
        unregisteredPatient={selectedUnregistered}
        onSuccess={() => {
          refetch();
          refetchUnreg();
        }}
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
