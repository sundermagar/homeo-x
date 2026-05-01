import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Ticket,
  Building2,
  Users,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/use-dashboard';
import { useClinicAdminDashboard } from '../hooks/use-clinic-admin-dashboard';
import './role-dashboards.css';
import './admin-dashboard.css';

export function AdminDashboard() {
  const navigate = useNavigate();
  const period = 'month';

  const { data: dashData, isLoading: dashLoading } = useDashboard(period);
  const { data: clinicData, isLoading: clinicLoading } = useClinicAdminDashboard(period);

  const isLoading = dashLoading && clinicLoading;
  const revenueSeries = clinicData?.revenueSeries || dashData?.revenueSeries || [];

  const platformStats = dashData?.platformStats;
  const clinicCount = platformStats?.totalClinics ?? 0;

  if (isLoading) {
    return (
      <div className="sa-root sa-loading-skeleton">
        {/* Header Skeleton */}
        <div className="sa-header">
          <div>
            <div className="skeleton-box skeleton-text title" style={{ width: '240px', marginBottom: '8px' }} />
            <div className="skeleton-box skeleton-text" style={{ width: '180px' }} />
          </div>
        </div>

        {/* Primary KPI Skeleton */}
        <div className="sa-kpi-primary">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sa-kpi-card" style={{ height: '110px' }}>
              <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box skeleton-text" style={{ width: '40%', marginBottom: '8px' }} />
                <div className="skeleton-box skeleton-text title" style={{ width: '70%', marginBottom: '8px', height: '24px' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="sa-main-grid">
          <div className="sa-chart-card" style={{ height: '320px' }}>
            <div className="sa-chart-header">
              <div className="skeleton-box skeleton-text" style={{ width: '150px', marginBottom: 0 }} />
            </div>
            <div className="sa-chart-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '24px' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '80%', borderRadius: '8px 8px 0 0', opacity: 0.1 }} />
            </div>
          </div>
          <div className="sa-intel-card" style={{ height: '320px' }}>
            <div className="sa-intel-header">
              <div className="skeleton-box skeleton-text" style={{ width: '120px', marginBottom: 0 }} />
            </div>
            <div className="sa-intel-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="sa-intel-item">
                  <div className="skeleton-box skeleton-circle" style={{ width: '8px', height: '8px' }} />
                  <div className="skeleton-box skeleton-text" style={{ width: '100%' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-root">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sa-header">
        <div>
          <h1 className="sa-title">Executive Overview</h1>
          <p className="sa-subtitle">Platform Performance · Monthly view</p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <div className="sa-kpi-primary">
        <KPIItem
          label="Total Revenue"
          value={`₹${(dashData?.totalRevenue || 0).toLocaleString()}`}
          trend={`${dashData?.revenueTrend || 0}% vs prev.`}
          positive={Number(dashData?.revenueTrend || 0) >= 0}
          icon={<CreditCard size={20} />}
          iconBg="rgba(37, 99, 235, 0.1)"
          iconColor="#2563eb"
        />
        <KPIItem
          label="Total Patients"
          value={String(dashData?.patientsCount || 0)}
          trend={`${dashData?.patientsTrend || 0}% vs prev.`}
          positive={Number(dashData?.patientsTrend || 0) >= 0}
          icon={<Users size={20} />}
          iconBg="rgba(139, 92, 246, 0.1)"
          iconColor="#8b5cf6"
        />
        <PrimaryKPICard
          label="REVENUE / PATIENT"
          value={fmt(clinicData?.revenueBreakdown?.perPatient || 0)}
          trend={0}
          icon={<BarChart3 size={18} />}
          color="var(--pp-blue)"
        />
        <PrimaryKPICard
          label="PENDING DUES"
          value={fmt(clinicData?.revenueBreakdown?.pending || 0)}
          trend={0}
          icon={<AlertCircle size={18} />}
          color="var(--pp-blue)"
        />
      </div>

      {/* ── Platform Stats Row ────────────────────────────────────────── */}
      <div className="sa-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard label="Active Clinics" value={String(clinicCount)} icon={<Building2 size={16} />} color="var(--pp-blue)" onClick={() => navigate('/platform/clinics')} />
        <StatCard label="Clinic Admins" value={String(platformStats?.totalClinicAdmins ?? 0)} icon={<Users size={16} />} color="var(--pp-blue)" onClick={() => navigate('/platform/clinicadmins')} />
      </div>

      <div className="sa-main-grid">
        {/* ── Revenue Trend Chart ───────────────────────────────────────── */}
        <div className="sa-chart-card">
          <div className="sa-chart-header">
            <div className="sa-chart-title">
              <BarChart3 size={14} />
              REVENUE TREND · 6 MONTHS
            </div>
            <span className="sa-badge sa-badge-primary">CURRENT YEAR</span>
          </div>
          <div className="sa-chart-body">
            {revenueSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="saRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide={true} />
                  <Tooltip
                    cursor={{ stroke: 'rgba(37, 99, 235, 0.1)', strokeWidth: 2 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                    }}
                    formatter={(v: any) => [fmt(Number(v)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#saRevGrad)"
                    dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#2563eb' }}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }}
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="sa-chart-empty">
                <Activity size={24} style={{ opacity: 0.3 }} />
                <span>No revenue data</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Intelligence Hub ──────────────────────────────────────────── */}
        <div className="sa-intel-card">
          <div className="sa-intel-header">
            <div className="sa-intel-title">
              <Zap size={14} fill="#f59e0b" color="#f59e0b" />
              INTELLIGENCE HUB
            </div>
            <span className="sa-badge sa-badge-warning" style={{ background: '#fffbeb', color: '#d97706' }}>LIVE INSIGHTS</span>
          </div>
          <div className="sa-intel-list">
            {dashData?.intelligenceInsights?.length ? (
              dashData.intelligenceInsights.map((insight: any, idx: number) => (
                <div key={idx} className="sa-intel-item">
                  <div className="sa-intel-dot" style={{ background: insight.color || '#2563eb' }} />
                  <div className="sa-intel-content">{insight.text}</div>
                </div>
              ))
            ) : (
              <>
                <IntelItem color="#10b981" text="Revenue is up 12% this month. Keep it up!" />
                <IntelItem color="#3b82f6" text="Collection rate has stabilized at 98.5%." />
                <IntelItem color="#f59e0b" text="Wait times are slightly higher in the evening shift." />
                <IntelItem color="#ef4444" text="2 clinics are reporting pending invoice dues > 15 days." />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="sa-actions-grid">
        <QuickAction icon={<CalendarClock size={18} />} label="Appointments" sub="Today's schedule & bookings" onClick={() => navigate('/appointments')} />
        <QuickAction icon={<Ticket size={18} />} label="Patient Queue" sub="Live token & waitlist status" onClick={() => navigate('/patients/queue')} />
        <QuickAction icon={<CreditCard size={18} />} label="Billing & Payments" sub="Invoices, receipts & dues" onClick={() => navigate('/billing')} />
        <QuickAction icon={<BarChart3 size={18} />} label="Analytics" sub="Reports & revenue insights" onClick={() => navigate('/analytics')} />
      </div>

    </div>
  );
}

function IntelItem({ color, text }: { color: string; text: string }) {
  return (
    <div className="sa-intel-item">
      <div className="sa-intel-dot" style={{ background: color }} />
      <div className="sa-intel-content">{text}</div>
    </div>
  );
}

function fmt(n: number): string {
  if (!n && n !== 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function KPIItem({ label, value, trend, positive, icon, iconBg, iconColor }: any) {
  return (
    <div className="sa-kpi-card">
      <div className="sa-kpi-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="sa-kpi-body">
        <div className="sa-kpi-label">{label}</div>
        <div className="sa-kpi-value">{value}</div>
        <div className={`sa-kpi-trend ${positive ? 'sa-trend-up' : 'sa-trend-down'}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color, onClick
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div className={`sa-stat-card ${onClick ? 'sa-stat-clickable' : ''}`} onClick={onClick}>
      <div className="sa-stat-icon" style={{ color }}>{icon}</div>
      <div className="sa-stat-body">
        <div className="sa-stat-value">{value}</div>
        <div className="sa-stat-label">{label}</div>
      </div>
      {onClick && <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
    </div>
  );
}

function QuickAction({
  icon, label, sub, onClick
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <button className="sa-action-card" onClick={onClick}>
      <div className="sa-action-icon">{icon}</div>
      <div className="sa-action-body">
        <div className="sa-action-label">{label}</div>
        <div className="sa-action-sub">{sub}</div>
      </div>
      <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
    </button>
  );
}
