import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api-client';
import { useClinicAdminDashboard } from '../hooks/use-clinic-admin-dashboard';
import { DashboardSkeleton } from '@/components/shared/dashboard-skeleton';
import './role-dashboards.css';
import './clinic-admin-dashboard.css';

// Type definitions to help mapping the queue to the UI
type QueueItem = {
  paymentStatus?: string;
  status: string;
  rxStatus?: string;
};

type StaffItem = {
  id: number;
  name: string;
  role: string;
  category: string;
  isActive: boolean;
  count?: number;
};

function StaffRow({ staff, getInitials }: { staff: StaffItem, getInitials: (name: string) => string }) {
  const [isActive, setIsActive] = useState(staff.isActive);
  const bgClass = staff.role === 'Doctor' ? 'green' : staff.role === 'Receptionist' ? 'blue' : 'purple';
  
  const handleToggle = async () => {
    const newStatus = !isActive;
    setIsActive(newStatus); // Optimistic UI update
    try {
      await apiClient.patch(`/staff/${staff.id}/toggle-status?category=${staff.category}`, {
        isActive: newStatus
      });
    } catch (err) {
      console.error('Failed to toggle staff status', err);
      setIsActive(!newStatus); // Revert on failure
    }
  };

  return (
    <div className="cad-staff-item">
      <div className={`cad-staff-avatar ${bgClass}`} style={{ opacity: isActive ? 1 : 0.4 }}>
        {getInitials(staff.name)}
      </div>
      <div className="cad-staff-info">
        <div className="cad-staff-title" style={{ opacity: isActive ? 1 : 0.5, textDecoration: isActive ? 'none' : 'line-through' }}>
          {staff.name}
        </div>
        <div className="cad-staff-sub" style={{ opacity: isActive ? 1 : 0.5, color: isActive ? '' : '#ef4444' }}>
          {isActive ? staff.role : 'Inactive'}
        </div>
      </div>
      <label className="cad-toggle" title="Toggle active status">
        <input 
          type="checkbox" 
          checked={isActive} 
          onChange={handleToggle} 
        />
        <span className="cad-slider"></span>
      </label>
    </div>
  );
}

export function ClinicAdminDashboard() {
  const navigate = useNavigate();
  const { data: dayData, isLoading: isDayLoading } = useClinicAdminDashboard('day');
  const { data: monthData, isLoading: isMonthLoading } = useClinicAdminDashboard('month');

  if (isDayLoading || isMonthLoading || !dayData || !monthData) {
    return <DashboardSkeleton role="clinic-admin" />;
  }

  const {
    totalRevenue,
    patientsCount,
    revenueBreakdown,
    todaysExpenses,
    staffOnDuty: rawStaff,
    queue,
    topBilling,
  } = dayData;
  const staffOnDuty = rawStaff as StaffItem[];

  // Formatting helpers
  const fmt = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${(n || 0).toLocaleString()}`;
  };

  const expenses = todaysExpenses || 0;

  // Clinic Now calculations from real Queue data
  const clinicNow = {
    awaitingConsultFee: queue.filter((q: QueueItem) => q.paymentStatus !== 'Paid' && q.status !== 'Completed').length,
    withDoctors: queue.filter((q: QueueItem) => q.status === 'Consultation').length,
    atPharmacy: queue.filter((q: QueueItem) => q.rxStatus === 'Pending' || q.rxStatus === 'Dispensing').length,
    rxBillsToSettle: queue.filter((q: QueueItem) => q.rxStatus === 'Completed' && q.paymentStatus !== 'Paid').length,
  };

  // Doctor load calculations
  const doctors = staffOnDuty.filter(s => s.role === 'Doctor' || s.role?.toLowerCase().includes('doc'));
  const maxDocVisits = Math.max(...doctors.map(d => d.count || 0), 1);

  // Approvals - No backend data currently exists for this, so we show an empty real state
  const approvals: any[] = [];

  // Revenue Mix Data - Based on real breakdown
  const revenueMix = [
    { label: 'Cash', value: revenueBreakdown.physicalCurrency || 0, color: '#16a34a' },
    { label: 'UPI / Card', value: revenueBreakdown.upiCard || 0, color: '#4f46e5' },
    { label: 'Pending', value: revenueBreakdown.pending || 0, color: '#dc2626' },
  ];
  const maxRev = Math.max(...revenueMix.map(r => r.value), 1);

  // Staff and Access
  const manageStaff = staffOnDuty;

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="cad-container animate-fade-in">
      {/* ── KPI Row ── */}
      <div className="cad-kpi-row">
        <div className="cad-kpi-card">
          <div className="cad-kpi-value green">{fmt(totalRevenue)}</div>
          <div className="cad-kpi-label">Revenue today</div>
        </div>
        <div className="cad-kpi-card">
          <div className="cad-kpi-value">{fmt(monthData.totalRevenue)}</div>
          <div className="cad-kpi-label">This month</div>
        </div>
        <div className="cad-kpi-card">
          <div className="cad-kpi-value">{patientsCount || 0}</div>
          <div className="cad-kpi-label">Patients today</div>
        </div>
        <div className="cad-kpi-card highlight-red">
          <div className="cad-kpi-value red">{revenueBreakdown.pendingCount || 0}</div>
          <div className="cad-kpi-label">Collections pending</div>
        </div>
        <div className="cad-kpi-card">
          <div className="cad-kpi-value">{fmt(expenses)}</div>
          <div className="cad-kpi-label">Expense today</div>
        </div>
      </div>

      {/* ── Middle Row ── */}
      <div className="cad-grid-row">
        
        {/* Doctor Load */}
        <div className="cad-panel cad-col-load">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Doctor load</div>
            <div className="cad-panel-subtitle">TODAY</div>
          </div>
          <div className="cad-bar-list">
            {doctors.length > 0 ? doctors.map((doc, i) => (
              <div key={i} className="cad-bar-item">
                <div className="cad-bar-label">{doc.name}</div>
                <div className="cad-bar-track">
                  <div className="cad-bar-fill" style={{ width: `${((doc.count || 0) / maxDocVisits) * 100}%` }} />
                </div>
                <div className="cad-bar-value">{doc.count || 0}</div>
              </div>
            )) : (
              <div className="cad-empty-state" style={{ padding: '20px 0' }}>No doctors on duty today</div>
            )}
          </div>
        </div>

        {/* Top Billing */}
        <div className="cad-panel cad-col-approvals">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Top Billing</div>
            <div className="cad-panel-subtitle">TODAY</div>
          </div>
          <div className="cad-approval-list">
            {topBilling && topBilling.length > 0 ? topBilling.map((bill: any, i: number) => (
              <div key={i} className="cad-approval-item">
                <div className={`cad-approval-icon ${bill.status === 'Paid' ? 'green' : bill.status === 'Partial' ? 'yellow' : 'red'}`}>₹</div>
                <div className="cad-approval-info">
                  <div className="cad-approval-title">{bill.patientName || 'Unknown Patient'}</div>
                  <div className="cad-approval-sub">₹{Number(bill.total).toLocaleString()}</div>
                </div>
                <span className={`cad-status-badge ${bill.status === 'Paid' ? 'paid' : bill.status === 'Partial' ? 'partial' : 'pending'}`}>{bill.status}</span>
              </div>
            )) : (
              <div className="cad-empty-state" style={{ padding: '20px 0' }}>No bills today</div>
            )}
          </div>
        </div>

        {/* Clinic Now */}
        <div className="cad-panel cad-col-clinic">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Clinic now</div>
            <div className="cad-panel-subtitle">ALL ROLES LIVE</div>
          </div>
          <div className="cad-clinic-list">
            <div className="cad-clinic-item">
              <div className="cad-clinic-icon blue">R</div>
              <div className="cad-clinic-info">
                <div className="cad-clinic-title">{clinicNow.awaitingConsultFee} awaiting consult fee</div>
                <div className="cad-clinic-sub">reception</div>
              </div>
            </div>
            <div className="cad-clinic-item">
              <div className="cad-clinic-icon green">D</div>
              <div className="cad-clinic-info">
                <div className="cad-clinic-title">{clinicNow.withDoctors} with doctors</div>
                <div className="cad-clinic-sub">consulting</div>
              </div>
            </div>
            <div className="cad-clinic-item">
              <div className="cad-clinic-icon purple">P</div>
              <div className="cad-clinic-info">
                <div className="cad-clinic-title">{clinicNow.atPharmacy} at pharmacy</div>
                <div className="cad-clinic-sub">dispensing</div>
              </div>
            </div>
            <div className="cad-clinic-item">
              <div className="cad-clinic-icon orange">₹</div>
              <div className="cad-clinic-info">
                <div className="cad-clinic-title">{clinicNow.rxBillsToSettle} Rx bills to settle</div>
                <div className="cad-clinic-sub">reception</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="cad-grid-row">
        
        {/* Revenue Mix */}
        <div className="cad-panel cad-col-rev">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Revenue mix</div>
            <div className="cad-panel-subtitle">TODAY</div>
          </div>
          <div className="cad-bar-list">
            {revenueMix.map((rev, i) => (
              <div key={i} className="cad-bar-item">
                <div className="cad-bar-label">{rev.label}</div>
                <div className="cad-bar-track">
                  <div className="cad-bar-fill" style={{ width: `${(rev.value / maxRev) * 100}%`, background: rev.color }} />
                </div>
                <div className="cad-bar-value">₹{rev.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff and Access */}
        <div className="cad-panel cad-col-staff">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Staff & access</div>
            <div className="cad-panel-subtitle">MANAGE</div>
          </div>
          <div className="cad-staff-list">
            {manageStaff.length > 0 ? manageStaff.map((staff, i) => (
              <StaffRow key={i} staff={staff} getInitials={getInitials} />
            )) : (
              <div className="cad-empty-state" style={{ padding: '20px 0' }}>No staff data</div>
            )}
            <div className="cad-staff-item" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="cad-staff-avatar add">+</div>
              <div className="cad-staff-info">
                <div className="cad-staff-title">Add staff</div>
                <div className="cad-staff-sub">nurse · receptionist · admin</div>
              </div>
              <button className="cad-btn-edit add" onClick={() => navigate('/settings/staff')}>Add</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
