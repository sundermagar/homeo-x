import { useState } from 'react';
import {
  Users,
  CreditCard,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/use-dashboard';
import { ConfirmModal } from '@/shared/components/confirm-modal';
import './role-dashboards.css';



export function AdminDashboard() {
  const navigate = useNavigate();
  const { data: dashData, isLoading } = useDashboard('month');
  const [purgeOpen, setPurgeOpen] = useState(false);

  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;
  const revenueSeries = dashData?.revenueSeries || [];
  const urgentAppts = todayAppts.filter((a: any) => a.isUrgent); // Real flag if exists, otherwise empty

  if (isLoading) {
    return (
      <div className="dash-root" style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
        <Activity className="animate-pulse" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p className="text-small">Connecting to Executive Analytics...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <ExecKPI label="Patient Growth" value={(kpis?.newPatientsCount || 0).toLocaleString()} trend={`${kpis?.patientTrend || 0}%`} up={Number(kpis?.patientTrend) > 0} color="#2563eb" />
        <KPIItem label="Executive Revenue" value={`₹${(kpis?.todaysCollection || 0).toLocaleString()}`} trend={`${kpis?.revenueTrend || 0}% vs prev`} color={Number(kpis?.revenueTrend) > 0 ? '#16a34a' : '#dc2626'} />
        <KPIItem label="Collection Rate" value={`${kpis?.collectionRate || 0}%`} trend="Target 95%" color="#16a34a" />
        <ExecKPI label="System Status" value="Healthy" up={true} color="#16a34a" />
      </div>

      <div className="dash-grid">
        {/* 2. Main Column — Large Charts */}
        <div className="dash-main-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-section-title">Revenue Velocity Trend</div>
              <span className="dash-badge badge-primary">FISCAL YEAR</span>
            </div>
            <div className="dash-card-body">
              <div className="dash-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div className="dash-card">
              <div className="dash-card-header"><h3 className="dash-section-title">Specialty Distribution</h3></div>
              <div className="dash-card-body">
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueSeries.length > 0 ? revenueSeries.map((r: any, i: number) => ({ name: r.month || `M${i+1}`, value: r.revenue, fill: ['#2563eb','#0ea5e9','#16a34a','#d97706','#64748b'][i % 5] })) : []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={5}>
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 20 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header"><h3 className="dash-section-title">Lead Intelligence</h3></div>
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <LeadItem label="Online Portals" value={42} color="#2563eb" />
                <LeadItem label="Direct Referrals" value={28} color="#0ea5e9" />
                <LeadItem label="Social Channels" value={18} color="#64748b" />
                <LeadItem label="Walk-ins" value={12} color="#cbd5e1" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sidebar — Terminal & Critical Stream */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">Global Terminal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TerminalBtn icon={<Users size={14} />} label="Users" onClick={() => navigate('/platform/accounts')} />
              <TerminalBtn icon={<Activity size={14} />} label="Logs" onClick={() => navigate('/analytics/reports')} />
              <TerminalBtn icon={<Zap size={14} />} label="Clinics" onClick={() => navigate('/platform/clinics')} />
              <TerminalBtn icon={<CreditCard size={14} />} label="Purge" onClick={() => setPurgeOpen(true)} />
            </div>
          </div>

          <div className="dash-sidebar-card">
            <div className="dash-card-header" style={{ padding: 0, border: 'none' }}>
              <h3 className="dash-section-title">Critical Stream</h3>
              <span className="dash-badge badge-danger">SYSTEM ALERT</span>
            </div>
            <div className="dash-list">
              {urgentAppts.map((a: any, i: number) => (
                <div key={i} className="dash-list-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="dash-status-dot" style={{ background: '#dc2626', marginTop: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
                      <p className="text-label" style={{ fontSize: 10, marginTop: 2 }}>Unassigned critical follow-up required.</p>
                    </div>
                  </div>
                </div>
              ))}
              {urgentAppts.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  <Activity size={20} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p className="text-small">Stream operational. No criticals.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmModal
        isOpen={purgeOpen}
        title="Purge Data"
        message="This will permanently delete archived records and old data. This action cannot be undone. Are you sure?"
        confirmLabel="Purge Now"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          // TODO: wire to API endpoint
          setPurgeOpen(false);
        }}
        onCancel={() => setPurgeOpen(false)}
      />
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

function ExecKPI({ label, value, trend, up, color }: any) {
  return (
    <div className="dash-kpi-item">
       <span className="dash-kpi-label">{label}</span>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="dash-kpi-value">{value}</div>
          {trend && (
             <div className={`dash-kpi-trend ${up ? 'trend-up' : 'trend-down'}`} style={{ color }}>
                {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
             </div>
          )}
          {!trend && <div className="dash-pulse-dot" />}
       </div>
    </div>
  );
}

function LeadItem({ label, value, color }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: '#64748b' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function TerminalBtn({ icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px',
        background: '#f8fafc',
        border: '1px solid #f1f5f9',
        borderRadius: '8px',
        color: '#475569',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }}
    >
      <span style={{ color: '#2563eb' }}>{icon}</span>
      {label}
    </button>
  );
}
