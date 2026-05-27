import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  Calendar,
  Activity,
  Clock,
  Phone,
  ArrowUpRight,
  UserPlus,
  Search,
  Plus,
  Bell,
  Cake,
  Stethoscope,
  Upload,
  Eye,
  MessageCircle,
  UserCheck,
  MoreVertical,
  Ticket,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import { useUpdateStatus, useIssueToken, useAddToWaitlist } from '../../appointments/hooks/use-appointments';
import { Pagination } from '@/components/shared/pagination';
import { DashboardSkeleton } from '@/components/shared/dashboard-skeleton';
import { PatientFormDrawer } from '../../patients/components/patient-form-drawer';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import { ReportUploadModal } from '../components/ReportUploadModal';
import { apiClient } from '@/infrastructure/api-client';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import { toast } from '@/hooks/use-toast';
import type { BirthdayPatient } from '@mmc/types';
import './role-dashboards.css';

function fmt(n: number): string {
  if (!n && n !== 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function formatDob(dob: any): string {
  if (!dob) return '';
  try {
    const d = new Date(dob);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}


function callPhone(phone: string) {
  if (!phone) return;
  window.open(`tel:${phone}`, '_self');
}

export function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { data: dashData, isLoading } = useDashboard('day', { refetchInterval: 10000 });
  const queueMgmt = useQueueMgmt();
  const updateStatus = useUpdateStatus();
  const issueToken = useIssueToken();
  const addToWaitlist = useAddToWaitlist();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPatientDrawerOpen, setIsPatientDrawerOpen] = useState(false);

  // Vitals modal state
  const [vitalsTarget, setVitalsTarget] = useState<{ regid: number; visitId: number } | null>(null);
  // Report upload modal state
  const [uploadTarget, setUploadTarget] = useState<{ regid: number; name: string } | null>(null);

  const { useSendText } = useWhatsApp();
  const sendText = useSendText();

  const handleApptWhatsApp = (appt: any) => {
    const phone = appt.phone;
    if (!phone) {
      toast({ description: "Mobile number not found", variant: "error" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const dateStr = new Date(appt.bookingDate || new Date()).toLocaleDateString('en-IN');
    const timeStr = appt.bookingTime || 'N/A';
    const textMessage = `Dear ${appt.patientName || 'Patient'},\n\nYour appointment has been scheduled for *${timeStr}* on *${dateStr}*.\n\nPlease arrive 10 minutes early.\n\nRegards,\nMMC HomeoTech`;

    sendText.mutate(
      { phone: finalPhone, message: textMessage },
      {
        onSuccess: () => toast({ description: '✅ Appointment WhatsApp sent successfully!', variant: 'success' }),
        onError: (err: any) => toast({ description: '❌ Failed to send WhatsApp: ' + (err.response?.data?.message || err.message), variant: 'error' })
      }
    );
  };

  const handleBirthdayWhatsApp = (phone: string, name: string) => {
    if (!phone) {
      toast({ description: "Mobile number not found", variant: "error" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const message = `Happy Birthday ${name}! 🎂🎉 Wishing you a healthy and wonderful year ahead. — MMC HomeoTech`;

    sendText.mutate(
      { phone: finalPhone, message },
      {
        onSuccess: () => toast({ description: '✅ Birthday greeting sent!', variant: 'success' }),
        onError: (err: any) => toast({ description: '❌ Failed to send WhatsApp: ' + (err.response?.data?.message || err.message), variant: 'error' })
      }
    );
  };

  // Kebab menu state
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);

  const toggleMenu = useCallback((id: number | string, btn: HTMLButtonElement) => {
    if (openMenuId === id) { setOpenMenuId(null); setMenuPos(null); triggerBtnRef.current = null; return; }
    triggerBtnRef.current = btn;
    const r = btn.getBoundingClientRect();
    let left = r.right - 150;
    if (left < 8) left = 8;
    if (left + 150 > window.innerWidth - 8) left = window.innerWidth - 150 - 8;
    setMenuPos({ top: r.bottom + 4, left });
    setOpenMenuId(id);
  }, [openMenuId]);

  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    const onMouse = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (t.closest('.appt-kebab-btn')) return;
      close();
    };
    const onScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onMouse);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  // Fetch today's new patients
  const { data: todayPatients } = useQuery({
    queryKey: ['patients-today'],
    queryFn: async () => {
      const { data } = await apiClient.get('/patients/today');
      return data.data as any[];
    },
    staleTime: 2 * 60_000,
    refetchInterval: 10000,
  });

  const todayAppts = dashData?.queue || [];
  const birthdays = dashData?.birthdays || [];
  const kpis = dashData?.kpis;

  const totalPages = Math.ceil(todayAppts.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentAppts = todayAppts.slice(startIndex, startIndex + pageSize);

  const handleAction = async (appt: any) => {
    if (appt.status === 'Scheduled') {
      await queueMgmt.checkIn.mutateAsync({
        appointmentId: appt.id,
        patientId: appt.patientId || appt.regid,
        doctorId: appt.doctorId
      });
    } else if (appt.status === 'Waitlist') {
      const waitlistId = appt.wlId || appt.id;
      await queueMgmt.callNext.mutateAsync(waitlistId);
    }
  };

  const handleConfirm = async (appt: any) => {
    try {
      if (!appt.doctorId) {
        toast({ description: 'Please assign a doctor to this appointment first.', variant: 'error' });
        return;
      }
      await updateStatus.mutateAsync({ id: appt.visitId || appt.id, status: 'Confirmed' });
      toast({ description: 'Appointment confirmed', variant: 'success' });
    } catch (err: any) {
      console.error(err);
      toast({ description: err?.response?.data?.message || 'Failed to confirm', variant: 'error' });
    }
  };

  const handleIssueToken = async (appt: any) => {
    try {
      if (!appt.doctorId) {
        toast({ description: 'Please assign a doctor to this appointment first.', variant: 'error' });
        return;
      }
      
      const visitId = appt.visitId || appt.id;
      await issueToken.mutateAsync(visitId);
      if (appt.patientId || appt.regid) {
        await addToWaitlist.mutateAsync({ 
          patientId: appt.patientId || appt.regid, 
          appointmentId: visitId, 
          doctorId: appt.doctorId || undefined 
        });
      } else if (appt.unregisteredId) {
        await addToWaitlist.mutateAsync({ 
          unregisteredPatientId: appt.unregisteredId, 
          appointmentId: visitId, 
          doctorId: appt.doctorId || undefined 
        });
      } else {
        await addToWaitlist.mutateAsync({ 
          appointmentId: visitId, 
          doctorId: appt.doctorId || undefined 
        });
      }
      toast({ description: 'Token issued successfully', variant: 'success' });
    } catch (err: any) {
      console.error(err);
      toast({ description: err?.response?.data?.message || 'Failed to issue token', variant: 'error' });
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dash-root">
      {/* ── 1. KPI Strip ─────────────────────────────────────────────── */}
      <div className="dash-kpi-strip">
        <KPIItem label="Today Intake" value={kpis?.newPatientsCount || 0} trend={`${todayPatients?.length || 0} registered`} color="var(--pp-success-fg)" />
        <KPIItem label="Waitlist" value={todayAppts.filter(a => a.status === 'Waitlist').length} trend="Active queue" color="#d97706" />
        <KPIItem label="Collection" value={fmt(kpis?.todaysCollection || 0)} trend="Today" color="var(--pp-success-fg)" />
        <KPIItem label="Completed" value={todayAppts.filter(a => a.status === 'Completed').length} trend="Visits done" color="var(--pp-blue)" />
      </div>

      {/* ── 2. Birthday + New Patients Cards ──────────────────────────── */}
      <div className="rd-dual-grid">
        {/* Birthday List */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <Cake size={14} style={{ color: '#ec4899' }} /> Today's Birthdays
            </div>
            <span className="dash-badge badge-primary">{birthdays.length}</span>
          </div>
          <div className="rd-compact-card-body">
            {birthdays.length === 0 ? (
              <div className="rd-empty">🎂 No birthdays today</div>
            ) : (
              birthdays.map((b: BirthdayPatient) => {
                const name = `${b.first_name || ''} ${b.surname || ''}`.trim() || 'Unknown';
                const phone = b.mobile1 || b.phone || '';
                return (
                  <div key={b.regid} className="rd-list-item">
                    <div className="rd-list-avatar" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                      {name.charAt(0)}
                    </div>
                    <div className="rd-list-info">
                      <div className="rd-list-name">{name}</div>
                      <div className="rd-list-sub">
                        #{b.regid} · {formatDob(b.dob || b.date_birth)}
                      </div>
                    </div>
                    <div className="rd-list-actions">
                      {phone && (
                        <button 
                          className="rd-action-pill green" 
                          title="WhatsApp Greeting" 
                          onClick={() => handleBirthdayWhatsApp(phone, name)}
                          disabled={sendText.isPending}
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's New Patients */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <UserCheck size={14} style={{ color: 'var(--pp-success-fg)' }} /> Today's New Patients
            </div>
            <span className="dash-badge badge-success">{todayPatients?.length || 0}</span>
          </div>
          <div className="rd-compact-card-body">
            {!todayPatients?.length ? (
              <div className="rd-empty">No new registrations today</div>
            ) : (
              todayPatients.map((p: any) => (
                <div key={p.regid} className="rd-list-item">
                  <div className="rd-list-avatar" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    {(p.fullName || 'U').charAt(0)}
                  </div>
                  <div className="rd-list-info">
                    <div className="rd-list-name">{p.fullName}</div>
                    <div className="rd-list-sub">#{p.regid} · {p.doctorName || 'No doctor'}</div>
                  </div>
                  <div className="rd-list-actions">
                    <button className="rd-action-pill" title="Add Vitals" onClick={() => setVitalsTarget({ regid: p.regid, visitId: 0 })}>
                      <Stethoscope size={13} />
                    </button>
                    <button className="rd-action-pill" title="Upload Report" onClick={() => setUploadTarget({ regid: p.regid, name: p.fullName })}>
                      <Upload size={13} />
                    </button>
                    <button className="rd-action-pill" title="View Case" onClick={() => navigate(`/medical-cases/${p.regid}`)}>
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Token Queue (Enhanced) ─────────────────────────────────── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <h3 className="dash-section-title">
            <Calendar size={16} style={{ marginRight: 8, color: 'var(--pp-blue)' }} /> Today's Schedule
          </h3>
          <span className="dash-badge badge-primary">{todayAppts.length} TOTAL</span>
        </div>

        <div className="rd-table-wrap">
          <div className="pp-table-container">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>TOKEN / TIME</th>
                  <th>PATIENT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {currentAppts.map((a: any, i: number) => {
                  const canCheckIn = a.status === 'Scheduled';
                  const isWaitlist = a.status === 'Waitlist';
                  const patientRegid = a.regid || a.patientId;

                  return (
                    <tr key={i} className="hover-row">
                      <td style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.tokenNo ? (
                            <div className="token-badge">{a.tokenNo}</div>
                          ) : (
                            <Clock size={14} />
                          )}
                          {a.bookingTime || 'Walk-in'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.patientName}</div>
                            <div className="text-label" style={{ fontSize: 10 }}>ID: PT-{patientRegid}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Waitlist' ? 'warning' : 'primary'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {canCheckIn && (
                            <button
                              className="dash-action-btn btn-checkin"
                              onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                              disabled={queueMgmt.isLoading}
                            >
                              {queueMgmt.checkIn.isPending ? '...' : 'Check In'}
                            </button>
                          )}
                          {isWaitlist && (
                            <button
                              className="dash-action-btn btn-call"
                              onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                              disabled={queueMgmt.isLoading}
                            >
                              Call
                            </button>
                          )}
                          <button
                            className="rd-queue-btn vitals"
                            onClick={(e) => { e.stopPropagation(); setVitalsTarget({ regid: patientRegid, visitId: a.id || 0 }); }}
                            title="Record Vitals"
                          >
                            <Stethoscope size={11} style={{ marginRight: 3 }} /> Vitals
                          </button>
                          <button
                            className="rd-queue-btn upload"
                            onClick={(e) => { e.stopPropagation(); setUploadTarget({ regid: patientRegid, name: a.patientName }); }}
                            title="Upload Report"
                          >
                            <Upload size={11} style={{ marginRight: 3 }} /> Upload
                          </button>
                          <button className="dash-view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/medical-cases/${patientRegid}`); }}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {todayAppts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p className="text-small">No appointments scheduled today.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {todayAppts.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={todayAppts.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* ── 4. Quick Operations + Live Activity ───────────────────────── */}
      <div className="rd-bottom-grid">
        <div className="dash-sidebar-card">
          <h3 className="dash-section-title">Quick Operations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OpLink icon={<Search size={15} />} label="Registry Lookup" path="/patients" />
            <OpLink icon={<Phone size={15} />} label="Confirm Appointments" path="/appointments" />
            <OpLink icon={<CreditCard size={15} />} label="Process Payments" path="/billing" />
            <OpLink icon={<Bell size={15} />} label="Follow-up Dues" path="/medical-cases/followups" />
            <button
              onClick={() => setIsPatientDrawerOpen(true)}
              className="hover-op"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-main)', borderRadius: '8px',
                textDecoration: 'none', color: 'var(--text-main)',
                transition: 'all 0.15s', width: '100%', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <span style={{ color: 'var(--pp-blue)' }}><UserPlus size={15} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>Add New Patient</span>
              <Plus size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="dash-sidebar-card">
          <h3 className="dash-section-title">
            <Calendar size={15} style={{ color: 'var(--pp-blue)' }} /> Today's Appointments
          </h3>
          <div className="dash-list">
            {todayAppts.map((a: any, i: number) => (
              <div key={i} className="dash-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{a.patientName}</div>
                    <div className="text-label" style={{ fontSize: 10 }}>{a.status} · {a.bookingTime || `Token ${a.tokenNo || 'N/A'}`}</div>
                  </div>
                  <div className="dash-status-dot" style={{ background: a.status === 'Consultation' ? 'var(--pp-success-fg)' : '#e2e8f0' }} />
                  <div className="appt-kebab-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      className="appt-kebab-btn"
                      onClick={(e) => { e.stopPropagation(); toggleMenu(`today-appt-${a.id}`, e.currentTarget); }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === `today-appt-${a.id}` && menuPos && createPortal(
                      <div
                        ref={menuRef}
                        className="appt-kebab-menu"
                        style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, width: 150 }}
                      >
                        {(a.status === 'Pending' || a.status === 'Scheduled') && (
                          <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleConfirm(a); setOpenMenuId(null); setMenuPos(null); }} disabled={updateStatus.isPending}>
                            <CheckCircle2 size={14} /> Confirm
                          </button>
                        )}
                        {!a.tokenNo && a.status !== 'Completed' && (
                          <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleIssueToken(a); setOpenMenuId(null); setMenuPos(null); }} disabled={issueToken.isPending}>
                            <Ticket size={14} /> Token
                          </button>
                        )}

                        <div className="appt-kebab-divider" />
                        <button className="appt-kebab-item" style={{ color: 'var(--pp-purple)' }} onClick={() => { setVitalsTarget({ visitId: a.visitId || a.id, regid: a.patientId || a.regid }); setOpenMenuId(null); setMenuPos(null); }}>
                          <Activity size={14} /> Vitals
                        </button>
                        <button className="appt-kebab-item" style={{ color: '#25D366' }} onClick={() => { handleApptWhatsApp(a); setOpenMenuId(null); setMenuPos(null); }}>
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>
            ))}
            {todayAppts.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No appointments today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Drawers & Modals ───────────────────────────────────────────── */}
      <PatientFormDrawer
        isOpen={isPatientDrawerOpen}
        onClose={() => setIsPatientDrawerOpen(false)}
        onSuccess={() => setIsPatientDrawerOpen(false)}
      />

      {vitalsTarget && (
        <VitalsFormModal
          initialData={null}
          visitId={vitalsTarget.visitId}
          regid={vitalsTarget.regid}
          onClose={() => setVitalsTarget(null)}
        />
      )}

      {uploadTarget && (
        <ReportUploadModal
          regid={uploadTarget.regid}
          patientName={uploadTarget.name}
          onClose={() => setUploadTarget(null)}
        />
      )}
    </div>
  );
}

function KPIItem({ label, value, trend, color }: any) {
  return (
    <div className="dash-kpi-item">
      <span className="dash-kpi-label">{label}</span>
      <div className="dash-kpi-value-row">
        <span className="dash-kpi-value">{value}</span>
      </div>
      <div className="dash-kpi-trend" style={{ color }}>
        {trend}
      </div>
    </div>
  );
}

function OpLink({ icon, label, path }: any) {
  return (
    <Link to={path} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      background: 'var(--bg-surface-2)',
      border: '1px solid var(--border-main)',
      borderRadius: '8px',
      textDecoration: 'none',
      color: 'var(--text-main)',
      transition: 'all 0.15s'
    }} className="hover-op">
      <span style={{ color: 'var(--pp-blue)' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{label}</span>
      <ArrowUpRight size={13} style={{ color: 'var(--text-muted)' }} />
    </Link>
  );
}
