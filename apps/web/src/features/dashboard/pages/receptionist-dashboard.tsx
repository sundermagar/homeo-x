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

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;

  const totalPages = Math.ceil(todayAppts.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentAppts = todayAppts.slice(startIndex, startIndex + pageSize);

  const handleAction = async (appt: any) => {
    if (appt.status === 'Scheduled') {
      await queueMgmt.checkIn.mutateAsync({
        appointmentId: appt.id,
        patientId: appt.patientId || appt.regid,
        doctorId: appt.doctorId,
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
        <KPIItem
          label="Today Intake"
          value={kpis?.newPatientsCount || 0}
          trend="+12% vs avg"
          color="var(--pp-success-fg)"
        />
        <KPIItem
          label="Waitlist"
          value={todayAppts.filter((a) => a.status === 'Waitlist').length}
          trend="Active queue"
          color="#d97706"
        />
        <KPIItem
          label="Collection"
          value={fmt(kpis?.todaysCollection || 0)}
          trend="Today"
          color="var(--pp-success-fg)"
        />
        <KPIItem
          label="Completed"
          value={todayAppts.filter((a) => a.status === 'Completed').length}
          trend="Visits done"
          color="var(--pp-blue)"
        />
      </div>

      <div className="dash-grid">
        {/* 2. Main Column — Schedule */}
        <div className="dash-main-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-section-title">
                <Calendar size={16} style={{ marginRight: 8, color: 'var(--pp-blue)' }} /> Today's
                Schedule
              </h3>
              <span className="dash-badge badge-primary">{todayAppts.length} TOTAL</span>
            </div>

            <div className="rd-table-wrap">
              {isMobile ? (
                <div className="pp-mobile-list">
                  {currentAppts.map((a: any, i: number) => (
                    <div
                      key={i}
                      className={`pp-mobile-card status-${(a.status || '').toLowerCase()}`}
                      onClick={() => navigate(`/patients/${a.regid || a.patientId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="pmc-header">
                        <div className="pmc-time">
                          <Clock size={12} /> {a.bookingTime || 'Walk-in'}
                          {a.tokenNo && <span className="pmc-token">T-{a.tokenNo}</span>}
                        </div>
                        <span className={`dash-badge badge-${(a.status || '').toLowerCase()}`}>
                          {a.status}
                        </span>
                      </div>
                      <div className="pmc-body">
                        <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                        <div className="pmc-info">
                          <div className="pmc-name">{a.patientName}</div>
                          <div className="pmc-regid">ID: PT-{a.regid || a.id}</div>
                        </div>
                        <ChevronRight size={16} className="pmc-chevron" />
                      </div>
                    </div>
                  ))}
                  {todayAppts.length === 0 && (
                    <div
                      className="dash-empty-state"
                      style={{ padding: '40px', textAlign: 'center' }}
                    >
                      <p className="text-small">No appointments scheduled today.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pp-table-container">
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th>TOKEN / TIME</th>
                        <th>PATIENT</th>
                        <th>STATUS</th>
                        <th style={{ textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAppts.map((a: any, i: number) => {
                        const canCheckIn = a.status === 'Scheduled';
                        const isWaitlist = a.status === 'Waitlist';

                        return (
                          <tr key={i} className="hover-row">
                            <td
                              style={{
                                fontFamily: 'var(--pp-font-mono)',
                                fontWeight: 600,
                                color: '#64748b',
                              }}
                            >
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
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {a.patientName}
                                  </div>
                                  <div className="text-label" style={{ fontSize: 10 }}>
                                    ID: PT-{a.regid || a.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Waitlist' ? 'warning' : 'primary'}`}
                              >
                                {a.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                {canCheckIn && (
                                  <button
                                    className="dash-action-btn btn-checkin"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction(a);
                                    }}
                                    disabled={queueMgmt.isLoading}
                                  >
                                    {queueMgmt.checkIn.isPending ? '...' : 'Check In'}
                                  </button>
                                )}
                                {isWaitlist && (
                                  <button
                                    className="dash-action-btn btn-call"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction(a);
                                    }}
                                    disabled={queueMgmt.isLoading}
                                  >
                                    Call
                                  </button>
                                )}
                                <button
                                  className="dash-view-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/patients/${a.regid || a.patientId}`);
                                  }}
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {todayAppts.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}
                          >
                            <p className="text-small">No appointments scheduled today.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
        </div>

        {/* 3. Sidebar — Operations */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">Quick Operations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <OpLink icon={<Search size={15} />} label="Registry Lookup" path="/patients" />
              <OpLink
                icon={<Phone size={15} />}
                label="Confirm Appointments"
                path="/appointments"
              />
              <OpLink icon={<CreditCard size={15} />} label="Process Payments" path="/billing" />
              <button
                onClick={() => setIsPatientDrawerOpen(true)}
                className="hover-op"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#475569',
                  transition: 'all 0.15s',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--pp-blue)' }}>
                  <UserPlus size={15} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>Add New Patient</span>
                <Plus size={13} style={{ color: '#94a3b8' }} />
              </button>
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

          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">
              <Activity size={15} style={{ color: 'var(--pp-success-fg)' }} /> Live Activity
            </h3>
            <div className="dash-list">
              {todayAppts.slice(0, 6).map((a: any, i: number) => (
                <div key={i} className="dash-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      {a.patientName}
                    </div>
                    <div className="text-label" style={{ fontSize: 10 }}>
                      {a.status} · {a.bookingTime || `Token ${a.tokenNo}`}
                    </div>
                  </div>
                  <div
                    className="dash-status-dot"
                    style={{
                      background: a.status === 'Consultation' ? 'var(--pp-success-fg)' : '#e2e8f0',
                    }}
                  />
                </div>
              ))}
              {todayAppts.length === 0 && (
                <div
                  style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}
                >
                  Queue clear.
                </div>
              )}
            </div>
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
    <Link
      to={path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: '#f8fafc',
        border: '1px solid #f1f5f9',
        borderRadius: '8px',
        textDecoration: 'none',
        color: '#475569',
        transition: 'all 0.15s',
      }}
      className="hover-op"
    >
      <span style={{ color: 'var(--pp-blue)' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{label}</span>
      <ArrowUpRight size={13} style={{ color: 'var(--text-muted)' }} />
    </Link>
  );
}
