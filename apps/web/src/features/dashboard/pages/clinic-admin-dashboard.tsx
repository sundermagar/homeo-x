import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useDashboard } from '../hooks/use-dashboard';
import { useAuthStore } from '@/shared/stores/auth-store';
import './role-dashboards.css';

export function ClinicAdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: dashData, isLoading } = useDashboard('month');
  
  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;
  const revenueSeries = dashData?.revenueSeries || [];

  if (isLoading) {
    return (
      <div className="dash-root" style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
        <Activity className="animate-pulse" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p className="text-small">Loading Clinic Analytics...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Monthly Revenue" value={`₹${((Number(kpis?.todaysCollection || 0) * 30) / 1000).toFixed(0)}k`} trend={`${kpis?.revenueTrend || 0}% vs last month`} color={Number(kpis?.revenueTrend) > 0 ? '#16a34a' : '#dc2626'} />
        <KPIItem label="Patient Growth" value={(Number(kpis?.newPatientsCount || 0) * 30).toLocaleString()} trend={`${kpis?.patientTrend || 0}% vs last month`} color={Number(kpis?.patientTrend) > 0 ? '#16a34a' : '#dc2626'} />
        <KPIItem label="Collection Rate" value={`${kpis?.collectionRate || 0}%`} trend="Target 95%" color="#16a34a" />
        <KPIItem label="Wait Time" value={`${kpis?.avgWaitTime || 0}m`} trend="Clinic Avg" color="#2563eb" />
      </div>

      <div className="dash-grid">
        {/* 2. Main Content — Analytics */}
        <div className="dash-main-col">
          {/* Revenue Perfomance Chart */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-section-title">
                <BarChart3 size={15} style={{ marginRight: 8, color: '#2563eb' }} /> Revenue Performance
              </div>
              <span className="dash-badge badge-primary">30 DAY TREND</span>
            </div>
            <div className="dash-card-body">
              <div style={{ marginBottom: 16 }}>
                 <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>₹{(kpis?.todaysCollection || 0).toLocaleString()}</div>
                 <div className="text-label" style={{ fontSize: 11 }}>Cumulative revenue for current period</div>
              </div>
              
              <div className="dash-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="clinicRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#clinicRevGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
             <div className="dash-card">
                <div className="dash-card-header"><h3 className="dash-section-title">Operational Targets</h3></div>
                <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <TargetItem label="Revenue Goal" current={kpis?.todaysCollection ? Number(kpis.todaysCollection) * 30 : 0} target={1000000} color="#2563eb" suffix="₹" />
                   <TargetItem label="Patient Intake" current={kpis?.newPatientsCount ? Number(kpis.newPatientsCount) * 30 : 0} target={500} color="#16a34a" />
                   <TargetItem label="Wait Time Goal" current={kpis?.avgWaitTime || 0} target={15} color="#d97706" inverse />
                </div>
             </div>
             
             <div className="dash-card">
                <div className="dash-card-header"><h3 className="dash-section-title">Staff On Duty</h3></div>
                <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <StaffRow name={user?.name || 'Dr. Sunder Magar'} role="Consultant" count={12} />
                   <StaffRow name="Dr. Nanda" role="General" count={8} />
                   <StaffRow name="Anjali K." role="Receptionist" />
                </div>
             </div>
          </div>
        </div>

        {/* 3. Right Column — Queue Intelligence */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-card">
            <div className="dash-section-title">Live Queue Status</div>
            <div className="dash-list">
              {todayAppts.slice(0, 10).map((a: any, i: number) => (
                <div key={i} className="dash-list-item">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
                      <div className="text-label" style={{ fontSize: 10 }}>Token {a.tokenNo} · {a.bookingTime || 'N/A'}</div>
                    </div>
                  </div>
                  <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : 'primary'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
              {todayAppts.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={20} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p className="text-small">No patients in queue.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
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

function TargetItem({ label, current, target, color, suffix = '', inverse }: any) {
  const pct = inverse 
    ? Math.min(100, Math.round(((target - Math.max(0, current - target)) / target) * 100))
    : Math.min(100, Math.round((current / target) * 100));
    
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--pp-font-mono)' }}>{current.toLocaleString()}{suffix} / {target.toLocaleString()}{suffix}</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function StaffRow({ name, role, count }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
      <div style={{ width: 32, height: 32, borderRadius: 16, background: '#f1f7ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: 11, fontWeight: 800 }}>
        {name.split(' ').map((n: any) => n[0]).join('')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{name}</div>
        <div className="text-label" style={{ fontSize: 10 }}>{role}</div>
      </div>
      {count && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>{count}</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Visits</div>
        </div>
      )}
    </div>
  );
}
