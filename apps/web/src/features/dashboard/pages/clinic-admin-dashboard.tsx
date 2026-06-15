import { useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
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
  const doctors = staffOnDuty.filter(s => s.role === 'Doctor' || s.role?.toLowerCase().includes('doc') || s.name.toLowerCase().startsWith('dr'));
  const maxDocVisits = Math.max(...doctors.map(d => d.count || 0), 1);

  // Approvals - No backend data currently exists for this, so we show an empty real state
  const approvals: any[] = [];

  // Revenue Mix Data - Based on real breakdown
  const revenueMix = [
    { label: 'Cash', value: revenueBreakdown.physicalCurrency || 0, color: '#34d399' },
    { label: 'UPI', value: revenueBreakdown.upiCard || 0, color: '#818cf8' },
    { label: 'Card', value: revenueBreakdown.cardAmt || 0, color: '#38bdf8' },
    { label: 'Cheque', value: revenueBreakdown.chequeAmt || 0, color: '#fbbf24' },
    { label: 'Online', value: revenueBreakdown.onlineAmt || 0, color: '#c084fc' },
    { label: 'Pending', value: revenueBreakdown.pending || 0, color: '#fb7185' },
  ].filter(r => r.value > 0 || r.label === 'Cash' || r.label === 'UPI' || r.label === 'Pending'); // Always show Cash/UPI/Pending, only show others if > 0
  const maxRev = Math.max(...revenueMix.map(r => r.value), 1);
  const totalCollected = revenueMix.filter(r => r.label !== 'Pending').reduce((sum, r) => sum + r.value, 0);
  const totalPending = revenueBreakdown.pending || 0;
  const totalBilled = totalCollected + totalPending;
  const collectedPercentage = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

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
        
        {/* Revenue Mix */}
        <div className="cad-panel cad-col-rev">
          <div className="cad-panel-header">
            <div className="cad-panel-title">Revenue mix</div>
            <div className="cad-panel-subtitle">TODAY</div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>₹{totalBilled.toLocaleString()}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Total collected today</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
              <PieChart width={140} height={140}>
                <Pie
                  data={revenueMix}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {revenueMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{collectedPercentage}%</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>collected</span>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '16px' }}>
              {revenueMix.map((rev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: rev.color }} />
                    <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>{rev.label}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>₹{rev.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ display: 'flex', justifySelf: 'flex-end', flexDirection: 'column', flex: 1, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>
              <span>Received vs Pending</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{totalCollected.toLocaleString()} / ₹{totalPending.toLocaleString()}</span>
            </div>
            <div style={{ height: '6px', width: '100%', display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${collectedPercentage}%`, background: 'linear-gradient(90deg, #34d399 0%, #38bdf8 50%, #c084fc 100%)' }} />
              <div style={{ width: `${100 - collectedPercentage}%`, background: '#fb7185' }} />
            </div>
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

      {/* ── Bottom Row ── */}
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
    </div>
  );
}
