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
  Send,
  MessageSquare
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
import { PatientBillingDrawer } from '../../billing/components/PatientBillingDrawer';
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
  const [billingDrawerTarget, setBillingDrawerTarget] = useState<{ regid: number; name: string } | null>(null);

  const { data: followups = [], isLoading: followupsLoading } = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: async () => {
      const res = await apiClient.get('/appointments/followups', { params: { limit: 10, _t: Date.now() } });
      return res.data?.data?.data || [];
    }
  });

  // Vitals modal state
  const [vitalsTarget, setVitalsTarget] = useState<{ regid: number; visitId: number } | null>(null);
  // Report upload modal state
  const [uploadTarget, setUploadTarget] = useState<{ regid: number; name: string } | null>(null);

  const { useSendText } = useWhatsApp();
  const sendText = useSendText();

  // Birthday select-all state
  const [selectedBirthdays, setSelectedBirthdays] = useState<Set<number>>(new Set());
  const [sendingBulk, setSendingBulk] = useState(false);

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

  const handleBulkBirthdayWhatsApp = async () => {
    if (selectedBirthdays.size === 0) {
      toast({ description: 'No birthdays selected', variant: 'error' });
      return;
    }
    setSendingBulk(true);
    let sent = 0;
    let failed = 0;
    for (const regid of selectedBirthdays) {
      const b = birthdays.find((bd: BirthdayPatient) => bd.regid === regid);
      if (!b) continue;
      const name = `${b.first_name || ''} ${b.surname || ''}`.trim() || 'Unknown';
      const phone = b.mobile1 || b.phone || '';
      if (!phone) { failed++; continue; }
      const cleanPhone = phone.replace(/\D/g, '');
      const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const message = `Happy Birthday ${name}! 🎂🎉 Wishing you a healthy and wonderful year ahead. — MMC HomeoTech`;
      try {
        await sendText.mutateAsync({ phone: finalPhone, message });
        sent++;
      } catch {
        failed++;
      }
    }
    setSendingBulk(false);
    setSelectedBirthdays(new Set());
    toast({
      description: `✅ Sent ${sent} greeting${sent !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
      variant: failed > 0 ? 'error' : 'success',
    });
  };

  const toggleBirthdaySelect = (regid: number) => {
    setSelectedBirthdays(prev => {
      const next = new Set(prev);
      if (next.has(regid)) next.delete(regid);
      else next.add(regid);
      return next;
    });
  };

  const toggleSelectAllBirthdays = () => {
    const validBirthdays = birthdays.filter((b: BirthdayPatient) => b.mobile1 || b.phone);
    if (selectedBirthdays.size === validBirthdays.length && validBirthdays.length > 0) {
      setSelectedBirthdays(new Set());
    } else {
      setSelectedBirthdays(new Set(validBirthdays.map((b: BirthdayPatient) => b.regid)));
    }
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

  const todayAppts = dashData?.queue ? [...dashData.queue].sort((a: any, b: any) => (b.id || 0) - (a.id || 0)) : [];
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

  const validBirthdays = birthdays.filter((b: BirthdayPatient) => b.mobile1 || b.phone);
  const allBirthdaysSelected = validBirthdays.length > 0 && selectedBirthdays.size === validBirthdays.length;

  return (
    <div className="dash-root">
      {/* ── 1. KPI Strip ─────────────────────────────────────────────── */}
      <div className="dash-kpi-strip">
        <KPIItem label="Today Intake" value={kpis?.newPatientsCount || 0} trend={`${todayPatients?.length || 0} registered`} color="var(--pp-success-fg)" />
        <KPIItem label="Waitlist" value={todayAppts.filter(a => a.status === 'Waitlist').length} trend="Active queue" color="#d97706" />
        <KPIItem label="Collection" value={fmt(kpis?.todaysCollection || 0)} trend="Today" color="var(--pp-success-fg)" />
        <KPIItem label="Completed" value={todayAppts.filter(a => a.status === 'Completed').length} trend="Visits done" color="var(--pp-blue)" />
      </div>

      {/* ── 2. TOP ROW: Quick Operations + New Patients + Today's Appointments ── */}
      <div className="rd-triple-grid">
        {/* Quick Operations */}
        <div className="dash-sidebar-card">
          <h3 className="dash-section-title">Quick Operations</h3>
          <div className="db-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', paddingRight: 4 }}>
            <OpLink icon={<Search size={15} />} label="Registry Lookup" path="/patients" />
            <OpLink icon={<Phone size={15} />} label="Confirm Appointments" path="/appointments" />
            <OpLink icon={<CreditCard size={15} />} label="Process Payments" path="/billing" />
            <OpLink icon={<Bell size={15} />} label="Follow-up Dues" path="/medical-cases/followups" />
          </div>
        </div>

        {/* Today's New Patients */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <UserCheck size={14} style={{ color: 'var(--pp-success-fg)' }} /> Today's New Patients
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="rd-action-pill"
                title="Add New Patient"
                onClick={() => setIsPatientDrawerOpen(true)}
              >
                <Plus size={13} />
              </button>
              <span className="dash-badge badge-success">{todayPatients?.length || 0}</span>
            </div>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '280px', paddingRight: 4 }}>
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
                    <button className="rd-action-pill" title="View Billing" onClick={() => setBillingDrawerTarget({ regid: p.regid, name: p.fullName })}>
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <Calendar size={14} style={{ color: 'var(--pp-blue)' }} /> Today's Appointments
            </div>
            <span className="dash-badge badge-primary">{todayAppts.length}</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '280px', paddingRight: 4, paddingBottom: 12 }}>
            {todayAppts.length === 0 ? (
              <div className="rd-empty">No appointments today</div>
            ) : (
              todayAppts.map((a: any, i: number) => {
                const statusColor =
                  a.status === 'Completed' ? 'var(--pp-blue)' :
                    a.status === 'Consultation' ? 'var(--pp-success-fg)' :
                      a.status === 'Waitlist' ? '#d97706' :
                        'var(--text-muted)';

                const statusBg =
                  a.status === 'Completed' ? 'rgba(59, 130, 246, 0.1)' :
                    a.status === 'Consultation' ? 'rgba(16, 185, 129, 0.1)' :
                      a.status === 'Waitlist' ? 'rgba(217, 119, 6, 0.1)' :
                        'var(--pp-warm-2)';

                return (
                  <div key={i} className="rd-list-item" style={{ position: 'relative', overflow: 'visible', alignItems: 'center' }}>
                    <div className="rd-list-avatar" style={{ background: statusBg, color: statusColor, fontSize: 11, fontWeight: 800 }}>
                      {a.tokenNo ? `T${a.tokenNo}` : (a.patientName?.charAt(0) || 'U')}
                    </div>
                    <div className="rd-list-info" style={{ flex: 1 }}>
                      <div className="rd-list-name">
                        {a.patientName || 'Unknown Patient'}
                      </div>
                      <div className="rd-list-sub" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: statusBg,
                          color: statusColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {a.status}
                        </span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 10 }}>{a.bookingTime || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="appt-kebab-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        className="appt-kebab-btn"
                        onClick={(e) => { e.stopPropagation(); toggleMenu(`today-appt-${a.id}`, e.currentTarget); }}
                        style={{ padding: 6, background: 'var(--bg-surface-1)', border: '1px solid var(--pp-warm-1)', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MoreVertical size={16} style={{ color: 'var(--text-muted)' }} />
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
                          <button
                            className="appt-kebab-item"
                            style={{ color: (a.patientId || a.regid) ? 'var(--pp-purple)' : 'var(--text-muted)', cursor: (a.patientId || a.regid) ? 'pointer' : 'not-allowed' }}
                            onClick={() => {
                              if (a.patientId || a.regid) {
                                setVitalsTarget({ visitId: a.visitId || a.id, regid: a.patientId || a.regid });
                              } else {
                                toast({ description: 'Vitals not supported for unregistered patients', variant: 'error' });
                              }
                              setOpenMenuId(null);
                              setMenuPos(null);
                            }}
                            disabled={!(a.patientId || a.regid)}
                          >
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
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: Today's Followup + Birthday List ────────────── */}
      <div className="rd-dual-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Today's Followup (Table) */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-section-title">
              <Calendar size={16} style={{ marginRight: 8, color: 'var(--pp-blue)' }} /> Today's Followup
            </h3>
            <span className="dash-badge badge-primary">{followups.length} TOTAL</span>
          </div>

          <div className="rd-table-wrap">
            <div className="pp-table-container db-scroll" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>REG ID</th>
                    <th>PATIENT</th>
                    <th>NEXT DATE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {followups.map((f: any, i: number) => {
                    const isMissed = f.visitType === 'Missed';
                    return (
                      <tr key={i} className="hover-row">
                        <td style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                          #{f.patientId || f.unregisteredPatientId || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="dash-avatar">{f.patientName?.charAt(0) || 'U'}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{f.patientName || 'Unknown Patient'}</div>
                              <div className="text-label" style={{ fontSize: 10 }}>{f.phone || 'No Contact'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-main)' }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {f.bookingDate ? new Date(f.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`dash-badge badge-${isMissed ? 'danger' : 'success'}`}>
                            {f.visitType}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              className="dash-action-btn"
                              style={{ background: '#f0fdf4', color: 'var(--pp-success-fg)', borderColor: '#bbf7d0' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const phone = f.phone?.replace(/\D/g, '');
                                if (!phone) { toast({ description: "No mobile number", variant: "error" }); return; }
                                const finalPhone = phone.length === 10 ? `91${phone}` : phone;
                                sendText.mutate({ phone: finalPhone, message: `Dear ${f.patientName},\n\nThis is a friendly reminder for your upcoming follow-up appointment.\n\nPlease let us know if you need to reschedule.\n\nRegards,\nMMC HomeoTech` },
                                  {
                                    onSuccess: () => {
                                      toast({ description: '✅ Reminder sent!', variant: 'success' });
                                      apiClient.post('/appointments/followups/status', {
                                        id: f.id,
                                        visitType: f.visitType,
                                        callStatus: 'WhatsApp Sent',
                                        actionDate: new Date().toISOString().split('T')[0]
                                      });
                                    }
                                  });
                              }}
                              title="Send WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </button>
                            <button
                              className="dash-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (f.patientId) navigate(`/medical-cases/${f.patientId}`);
                                else toast({ description: 'Cannot view unregistered patient', variant: 'error' });
                              }}
                              disabled={!f.patientId}
                              style={{ opacity: !f.patientId ? 0.5 : 1, cursor: !f.patientId ? 'not-allowed' : 'pointer' }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {followups.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p className="text-small">{followupsLoading ? 'Loading...' : 'No followups found today.'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Birthday List */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <Cake size={14} style={{ color: '#ec4899' }} /> Today's Birthdays
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {birthdays.length > 0 && selectedBirthdays.size > 0 && (
                <button
                  className="dash-action-btn"
                  style={{
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: sendingBulk ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    opacity: sendingBulk ? 0.6 : 1,
                  }}
                  onClick={handleBulkBirthdayWhatsApp}
                  disabled={sendingBulk}
                  title="Send birthday wishes to selected"
                >
                  <Send size={11} /> {sendingBulk ? 'Sending...' : `Send (${selectedBirthdays.size})`}
                </button>
              )}
              <span className="dash-badge badge-primary">{birthdays.length}</span>
            </div>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '360px' }}>
            {birthdays.length === 0 ? (
              <div className="rd-empty">🎂 No birthdays today</div>
            ) : (
              <>
                {/* Select All Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 20px',
                    borderBottom: '1px solid var(--pp-warm-2)',
                    background: 'var(--pp-warm-1)',
                    cursor: 'pointer',
                  }}
                  onClick={toggleSelectAllBirthdays}
                >
                  <input
                    type="checkbox"
                    checked={allBirthdaysSelected}
                    onChange={toggleSelectAllBirthdays}
                    style={{ width: 16, height: 16, accentColor: '#ec4899', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select All ({validBirthdays.length})
                  </span>
                </div>

                {birthdays.map((b: BirthdayPatient) => {
                  const name = `${b.first_name || ''} ${b.surname || ''}`.trim() || 'Unknown';
                  const phone = b.mobile1 || b.phone || '';
                  const isSelected = selectedBirthdays.has(b.regid);
                  return (
                    <div key={b.regid} className="rd-list-item" style={{ background: isSelected ? 'rgba(236, 72, 153, 0.04)' : undefined }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBirthdaySelect(b.regid)}
                        disabled={!phone}
                        style={{ width: 16, height: 16, accentColor: '#ec4899', cursor: phone ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                      />
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
                })}
              </>
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

      {billingDrawerTarget && (
        <PatientBillingDrawer
          regid={billingDrawerTarget.regid}
          patientName={billingDrawerTarget.name}
          isOpen={true}
          onClose={() => setBillingDrawerTarget(null)}
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
