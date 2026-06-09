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
  MessageSquare,
  User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import { useUpdateStatus, useIssueToken, useAddToWaitlist } from '../../appointments/hooks/use-appointments';
import { Pagination } from '@/components/shared/pagination';
import { DashboardSkeleton } from '@/components/shared/dashboard-skeleton';
import { PatientFormDrawer } from '../../patients/components/patient-form-drawer';
import { AppointmentFormDrawer } from '../../appointments/components/appointment-form-drawer';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import { ReportUploadModal } from '../components/ReportUploadModal';
import { PatientBillingDrawer } from '../../billing/components/PatientBillingDrawer';
import { AssignPackageModal } from '../../packages/components/assign-package-modal';
import { useBills } from '../../billing/hooks/use-billing';
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
  const [isApptDrawerOpen, setIsApptDrawerOpen] = useState(false);
  const [billingDrawerTarget, setBillingDrawerTarget] = useState<{ regid: number; name: string } | null>(null);

  const { data: followups = [], isLoading: followupsLoading } = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: async () => {
      const res = await apiClient.get('/appointments/followups', { params: { limit: 10, _t: Date.now() } });
      return res.data?.data?.data || [];
    }
  });

  const [vitalsTarget, setVitalsTarget] = useState<{ regid: number; visitId: number } | null>(null);
  // Report upload modal state
  const [uploadTarget, setUploadTarget] = useState<{ regid: number; name: string } | null>(null);
  // Assign package modal state
  const [assignPackageTarget, setAssignPackageTarget] = useState<{ regid: number; name: string } | null>(null);

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



  const todayAppts = dashData?.queue ? [...dashData.queue].sort((a: any, b: any) => (b.id || 0) - (a.id || 0)) : [];
  const birthdays = dashData?.birthdays || [];
  const kpis = dashData?.kpis;

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

  const todayStr = new Date().toISOString().split('T')[0];
  const billsQuery = useBills({ page: 1, date: todayStr, limit: 1000 });

  const getPatientBills = (regid: number) => {
    return billsQuery.data?.data?.filter((b: any) => b.regid === regid) || [];
  };

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

  const awaitingPaymentCount = billsQuery.data?.data?.filter((b: any) => (b.balance || 0) > 0).length || 0;

  return (
    <div className="dash-root">
      <div className="dash-kpi-strip" style={{ gap: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KPIItem label="Booked today" value={todayAppts.length} />
        <KPIItem label="In waiting room" value={todayAppts.filter(a => a.status === 'Waitlist').length} />
        <KPIItem label="Awaiting payment" value={awaitingPaymentCount} isHighlight={true} />
        <KPIItem label="Collected (my till)" value={fmt(kpis?.todaysCollection || 0)} />
      </div>

      {/* ── 2. QUICK OPERATIONS (Horizontal) ─────────────────────────── */}
      <div className="rd-quick-ops-grid">
        {/* Book Appointment */}
        <button 
          onClick={() => setIsApptDrawerOpen(true)}
          className="rd-quick-op-btn primary"
        >
          <div className="rd-quick-op-icon-wrapper">
            <Plus size={20} color="white" />
          </div>
          <div>
            <div className="rd-quick-op-title">Book appointment</div>
            <div className="rd-quick-op-subtitle">search mobile / ID → token</div>
          </div>
        </button>

        {/* New Patient */}
        <button 
          onClick={() => setIsPatientDrawerOpen(true)}
          className="rd-quick-op-btn secondary"
        >
          <div className="rd-quick-op-icon-wrapper">
            <UserPlus size={20} />
          </div>
          <div>
            <div className="rd-quick-op-title">New patient</div>
            <div className="rd-quick-op-subtitle">register + family</div>
          </div>
        </button>

        {/* Collect Dues */}
        <button 
          onClick={() => navigate('/billing')}
          className="rd-quick-op-btn secondary"
        >
          <div className="rd-quick-op-icon-wrapper">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="rd-quick-op-title">Collect dues</div>
            <div className="rd-quick-op-subtitle">outstanding balances</div>
          </div>
        </button>
      </div>

      {/* ── 3. MIDDLE ROW: New Patients + Finance Queue ── */}
      <div className="rd-dual-grid">

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
          <div className="rd-compact-card-body db-scroll" style={{ paddingRight: 4 }}>
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

        {/* Finance Queue */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              <CreditCard size={14} style={{ color: 'var(--pp-blue)' }} /> Finance
            </div>
            <span className="dash-badge badge-primary">{todayAppts.length}</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ paddingRight: 4, paddingBottom: 12 }}>
            {todayAppts.length === 0 ? (
              <div className="rd-empty">No appointments today</div>
            ) : (
              todayAppts.map((a: any, i: number) => {
                const patientBills = getPatientBills(a.patientId || a.regid);
                const hasBills = patientBills.length > 0;
                const totalBalance = patientBills.reduce((acc: number, b: any) => acc + (b.balance || 0), 0);
                const isPaid = hasBills && totalBalance === 0;
                const billStatusText = hasBills ? (isPaid ? 'Paid ✓' : `₹${totalBalance} due`) : 'Verify Fee';
                const billColor = hasBills ? (isPaid ? 'var(--pp-success-fg)' : '#c2410c') : 'var(--text-muted)';
                const billBg = hasBills ? (isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(194, 65, 12, 0.1)') : 'var(--bg-surface-2)';

                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div className="appt-grid-card-minimal animate-fade-in" style={{ padding: '10px 12px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                      {/* Top Row: Token & Name */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--pp-success-fg)', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                            {a.tokenNo ? `#${a.tokenNo}` : (a.patientName?.charAt(0) || 'U')}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{a.patientName || 'Unknown Patient'}</span>
                        </div>
                        <div style={{ background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--pp-font-mono)' }}>
                          MRN-{String(a.patientId || a.regid || '000').padStart(5, '0')}
                        </div>
                      </div>

                      {/* Middle Row: Doctor, Badges & Action Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.08)', color: 'var(--pp-blue)', padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                            <User size={10} /> {a.doctorName || 'No Doctor'}
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: billBg, color: billColor, padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                            {billStatusText}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {a.visitType || 'Follow-up'}
                          </div>
                        </div>

                        <button 
                          onClick={() => setBillingDrawerTarget({ regid: a.patientId || a.regid, name: a.patientName })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            background: totalBalance > 0 ? '#c2410c' : (hasBills ? 'var(--bg-surface-2)' : 'var(--pp-blue)'),
                            color: totalBalance > 0 ? 'white' : (hasBills ? 'var(--text-main)' : 'white'),
                            border: totalBalance > 0 ? 'none' : (hasBills ? '1px solid var(--border-main)' : 'none'),
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {totalBalance > 0 ? (
                            <>
                              <CreditCard size={11} /> Collect ₹{totalBalance}
                            </>
                          ) : hasBills ? (
                            <>
                              <Eye size={11} /> View Bill
                            </>
                          ) : (
                            <>
                              <Plus size={11} /> Open
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: Today's Appointments + Birthday List ────────────── */}
      <div className="rd-bottom-row-grid">
        {/* Today's Appointments (Table) */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-section-title">
              <Calendar size={16} style={{ marginRight: 8, color: 'var(--pp-blue)' }} /> Today's Appointments
            </h3>
            <span className="dash-badge badge-primary">{todayAppts.length} TOTAL</span>
          </div>

          <div className="rd-table-wrap">
            <div className="pp-table-container pp-table-scroll db-scroll" style={{ overflowY: 'auto', maxHeight: '400px' }}>
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>TOKEN</th>
                    <th>PATIENT</th>
                    <th>DOCTOR</th>
                    <th>DATE & TIME</th>
                    <th>TYPE</th>
                    <th>PACKAGE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppts.map((appt: any, i: number) => {
                    return (
                      <tr key={i} className="pp-hover-row">
                        <td data-label="TOKEN">
                          {appt.tokenNo
                            ? <span className="appt-cell-token" style={{ color: 'var(--pp-blue)', fontWeight: 600 }}>T{appt.tokenNo}</span>
                            : <span className="appt-cell-slash">—</span>}
                        </td>
                        <td data-label="PATIENT">
                          {appt.patientId || appt.regid ? (
                            <Link to={`/medical-cases/${appt.patientId || appt.regid}`} className="appt-cell-name pp-clickable-name" style={{ textDecoration: 'none', color: 'var(--pp-blue)' }}>
                              {appt.patientName || 'Unknown Patient'}
                            </Link>
                          ) : (
                            <div className="appt-cell-name">{appt.patientName || 'Unknown Patient'}</div>
                          )}
                          <div className="text-label" style={{ fontSize: 11 }}>{appt.phone || 'No Contact'}</div>
                        </td>
                        <td data-label="DOCTOR">
                          {(appt.doctorName || '').trim() ? (
                            <span className="appt-doctor-badge"><User size={11} strokeWidth={1.6} />{appt.doctorName}</span>
                          ) : (
                            <span className="appt-cell-slash">—</span>
                          )}
                        </td>
                        <td data-label="DATE & TIME">
                          <div className="appt-cell-name">{appt.bookingDate || '—'}</div>
                          {appt.bookingTime && <div className="appt-cell-phone">{appt.bookingTime}</div>}
                        </td>
                        <td data-label="TYPE" className="appt-cell-muted">{(appt.visitType || '').trim() || '—'}</td>
                        <td data-label="PACKAGE">
                          {appt.packageName ? (
                            <span className="appt-metadata-badge appt-metadata-package" title={`Expires: ${appt.packageExpiry ?? 'N/A'}`}>
                              {appt.packageName}
                            </span>
                          ) : (
                            <span className="appt-cell-slash">—</span>
                          )}
                        </td>
                        <td data-label="STATUS">
                          <span style={{ 
                            background: appt.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : appt.status === 'Consultation' ? 'rgba(139, 92, 246, 0.1)' : appt.status === 'Waitlist' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(251, 146, 60, 0.1)', 
                            color: appt.status === 'Completed' ? 'var(--pp-success-fg)' : appt.status === 'Consultation' ? 'var(--pp-purple)' : appt.status === 'Waitlist' ? 'var(--pp-blue)' : '#f97316',
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' 
                          }}>
                            {appt.status || 'Scheduled'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              className="dash-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApptWhatsApp(appt);
                              }}
                              title="Send WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </button>
                            <button
                              className="appt-kebab-btn"
                              title="Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMenu(appt.id, e.currentTarget as HTMLButtonElement);
                              }}
                            >
                              <MoreVertical size={15} strokeWidth={2} />
                            </button>
                          </div>
                          {openMenuId === appt.id && menuPos && createPortal(
                            <div
                              ref={menuRef}
                              className="appt-kebab-menu"
                              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                            >
                              <button
                                className="appt-kebab-item"
                                onClick={() => { 
                                  setOpenMenuId(null); 
                                  if (appt.patientId || appt.regid) navigate(`/medical-cases/${appt.patientId || appt.regid}`);
                                  else toast({ description: 'Cannot view patient details', variant: 'error' });
                                }}
                              >
                                <User size={13} strokeWidth={1.6} /> View Profile
                              </button>
                              <button
                                className="appt-kebab-item"
                                onClick={() => { 
                                  setOpenMenuId(null); 
                                  setBillingDrawerTarget({ regid: appt.patientId || appt.regid, name: appt.patientName }); 
                                }}
                              >
                                <CreditCard size={13} strokeWidth={1.6} /> Open Billing
                              </button>
                              <button
                                className="appt-kebab-item"
                                onClick={() => { 
                                  setOpenMenuId(null); 
                                  setAssignPackageTarget({ regid: appt.patientId || appt.regid, name: appt.patientName }); 
                                }}
                              >
                                <Ticket size={13} strokeWidth={1.6} /> Assign Package
                              </button>
                            </div>,
                            document.body
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {todayAppts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p className="text-small">{isLoading ? 'Loading...' : 'No appointments found today.'}</p>
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

      <AppointmentFormDrawer
        isOpen={isApptDrawerOpen}
        onClose={() => setIsApptDrawerOpen(false)}
        onSuccess={() => setIsApptDrawerOpen(false)}
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

      {assignPackageTarget && (
        <AssignPackageModal
          patientId={assignPackageTarget.regid}
          patientName={assignPackageTarget.name}
          isOpen={true}
          onClose={() => setAssignPackageTarget(null)}
          onSuccess={() => {
            setAssignPackageTarget(null);
            toast({ description: 'Package assigned successfully', variant: 'success' });
          }}
        />
      )}
    </div>
  );
}

function KPIItem({ label, value, isHighlight }: { label: string, value: string | number, isHighlight?: boolean }) {
  return (
    <div style={{
      background: isHighlight ? 'linear-gradient(135deg, var(--bg-card) 60%, rgba(234, 88, 12, 0.05) 100%)' : 'var(--bg-card)',
      border: isHighlight ? '1px solid rgba(234, 88, 12, 0.3)' : '1px solid var(--border-main)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: isHighlight ? '#c2410c' : 'var(--text-main)', marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
        {label}
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
