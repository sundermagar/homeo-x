import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';
import {
  Search, Plus, Hash, MessageCircle,
  Printer, Download, Sticker, Filter, RefreshCw, Users, MoreHorizontal
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { type PatientSummary } from '@mmc/types';
import '../styles/patients.css';

const PAGE_SIZE = 10;

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
  const [sortBy, setSortBy] = useState('newest');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const user = useAuthStore(s => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || '').toLowerCase();
  const isDoctor = rawRole === 'doctor';

  const { data, isLoading, refetch } = usePatients({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    doctorId: isDoctor ? (user as any)?.id : undefined,
    clinicId: (user as any)?.contextId
  });
  const deleteMutation = useDeletePatient();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const patients = useMemo(() => {
    const list = data?.data || [];
    if (sortBy === 'name') return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sortBy === 'oldest') return [...list].sort((a, b) => a.regid - b.regid);
    return [...list].sort((a, b) => b.regid - a.regid);
  }, [data?.data, sortBy]);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromEntry = ((page - 1) * PAGE_SIZE) + 1;
  const toEntry = Math.min(page * PAGE_SIZE, total);

  const handleDelete = async (regid: number, name: string) => {
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    setDeletingId(regid);
    try {
      await deleteMutation.mutateAsync(regid);
      refetch();
    } catch { alert('Failed to delete patient.'); }
    finally { setDeletingId(null); }
  };

  const handleAddToken = (regid: number, name: string) => {
    navigate(`/appointments?addToken=${regid}&name=${encodeURIComponent(name)}`);
  };

  const handlePrintPrescription = (regid: number) => {
    window.open(`/api/medical-cases/remedy-chart/pdf/${regid}`, '_blank');
  };

  const handleDownload = (regid: number) => {
    window.open(`/api/medical-cases/pdf/summary/${regid}`, '_blank');
  };

  return (
    <div className="pp-page-container mmc-pl-container animate-fade-in">
      {/* ─── Page Header ─── */}
      <div className="mmc-pl-header">
        <div className="mmc-pl-header-left">
          <div className="mmc-pl-header-icon"><Users size={22} /></div>
          <div>
            <h1 className="mmc-pl-title">Patient Registry</h1>
            <p className="mmc-pl-subtitle">Manage and access all patient clinical records</p>
          </div>
        </div>
        <button className="mmc-pl-add-btn" onClick={() => navigate('/patients/add')}>
          <Plus size={16} /> New Patient
        </button>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="mmc-pl-filterbar">
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
            <option value="name">Alphabetical</option>
          </select>
          <button className="mmc-pl-refresh-btn" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="mmc-pl-card">
        {isLoading ? (
          <div className="mmc-pl-skeleton">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="mmc-pl-skeleton-row">
                <div className="mmc-pl-skeleton-cell" style={{ width: '60px' }} />
                <div className="mmc-pl-skeleton-cell" style={{ width: '160px' }} />
                <div className="mmc-pl-skeleton-cell" style={{ width: '120px' }} />
                <div className="mmc-pl-skeleton-cell" style={{ width: '100px' }} />
                <div className="mmc-pl-skeleton-cell" style={{ width: '100px' }} />
                <div className="mmc-pl-skeleton-cell" style={{ width: '200px' }} />
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="mmc-pl-empty">
            <Users size={48} opacity={0.2} />
            <p className="mmc-pl-empty-title">No patients found</p>
            <p className="mmc-pl-empty-sub">Try adjusting your search or add a new patient.</p>
            <button className="mmc-pl-add-btn" onClick={() => navigate('/patients/add')}>
              <Plus size={14} /> Add Patient
            </button>
          </div>
        ) : (
          <div className="mmc-pl-table-wrap">
            <table className="mmc-pl-table">
              <thead>
                <tr>
                  <th>Case Id ↕</th>
                  <th>Patient Name ↕</th>
                  <th>Mobile ↕</th>
                  <th>Doctor Name ↕</th>
                  <th>Last Followup ↕</th>
                  <th style={{ textAlign: 'center' }}>Actions ↕</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: PatientSummary, idx: number) => {
                  const isNearBottom = idx > patients.length - 4; // Simple logic to open dropdown upwards
                  return (
                    <tr key={p.regid} className={idx % 2 === 0 ? 'mmc-pl-row-even' : 'mmc-pl-row-odd'}>
                      {/* Case Id */}
                      <td className="mmc-pl-caseid">{p.regid}</td>

                      {/* Patient Name */}
                      <td>
                        <Link to={`/medical-cases/${p.regid}`} className="mmc-pl-patient-link">
                          {p.fullName || 'Unknown'}
                        </Link>
                      </td>

                      {/* Mobile */}
                      <td className="mmc-pl-mobile">{p.phone || '—'}</td>

                      {/* Doctor Name */}
                      <td className="mmc-pl-doctor">
                        {p.doctorName ? `Dr. ${p.doctorName}` : 'Dr. XYZ'}
                      </td>

                      {/* Last Followup */}
                      <td className="mmc-pl-followup">
                        {formatDate(p.lastVisit || p.createdAt)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="mmc-pl-actions-dropdown">
                          <button
                            className="mmc-pl-action-trigger"
                            onClick={() => setOpenDropdownId(openDropdownId === p.regid ? null : p.regid)}
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {openDropdownId === p.regid && (
                            <div className={`mmc-pl-dropdown-menu ${isNearBottom ? 'up' : ''}`}>
                              <button
                                className="mmc-pl-dropdown-item"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(`/patients/${p.regid}/edit`);
                                }}
                              >
                                Edit Patient
                              </button>
                              <button
                                className="mmc-pl-dropdown-item"
                                disabled={deletingId === p.regid}
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDelete(p.regid, p.fullName);
                                }}
                              >
                                Delete Patient
                              </button>
                              <button
                                className="mmc-pl-dropdown-item"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleAddToken(p.regid, p.fullName);
                                }}
                              >
                                Token
                              </button>
                              <button
                                className="mmc-pl-dropdown-item"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  openWhatsApp(p.phone || p.mobile1, p.fullName);
                                }}
                              >
                                WhatsApp
                              </button>
                              <button
                                className="mmc-pl-dropdown-item"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handlePrintPrescription(p.regid);
                                }}
                              >
                                Print Prescription
                              </button>
                              <Link
                                to={`/medical-cases/${p.regid}`}
                                className="mmc-pl-dropdown-item"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                View History
                              </Link>
                              <button
                                className="mmc-pl-dropdown-item"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDownload(p.regid);
                                }}
                              >
                                Download Report
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}


        {/* ─── Pagination Footer ─── */}
        {!isLoading && patients.length > 0 && (
          <div className="mmc-pl-pagination">
            <span className="mmc-pl-showing">
              Showing {fromEntry} to {toEntry} of {total} entries
            </span>
            <div className="mmc-pl-page-btns">
              <button
                className="mmc-pl-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`mmc-pl-page-num${page === pageNum ? ' active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="mmc-pl-page-ellipsis">...</span>}
              {totalPages > 7 && (
                <button
                  className={`mmc-pl-page-num${page === totalPages ? ' active' : ''}`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}
              <button
                className="mmc-pl-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
