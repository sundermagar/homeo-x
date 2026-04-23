import { useState } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
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
  const kpis = dashData?.kpis;
  const revenueSeries = clinicData?.revenueSeries || clinicData?.revenueSeries || dashData?.revenueSeries || [];
  
  const platformStats = dashData?.platformStats;
  const clinicCount = platformStats?.totalClinics ?? 0;
  const activeStaff = platformStats?.totalStaff ?? 0;

  if (isLoading) {
    return (
      <div className="sa-root sa-loading">
        <Activity size={28} style={{ color: 'var(--pp-blue)', animation: 'pulse 1.5s infinite' }} />
        <p>Loading Executive Dashboard…</p>
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

      {/* ── Primary KPI Strip ─────────────────────────────────────────── */}
      <div className="sa-kpi-primary">
        <PrimaryKPICard
          label="TOTAL REVENUE"
          value={fmt(Number(clinicData?.totalRevenue ?? kpis?.todaysCollection ?? 0))}
          trend={Number(clinicData?.revenueTrend ?? kpis?.revenueTrend ?? 0)}
          icon={<CreditCard size={18} />}
          color="#2563eb"
        />
        <PrimaryKPICard
          label="TOTAL PATIENTS"
          value={String(Number(clinicData?.patientsApril ?? kpis?.newPatientsCount ?? 0))}
          trend={Number(clinicData?.patientsTrend ?? kpis?.patientTrend ?? 0)}
          icon={<Users size={18} />}
          color="#7c3aed"
        />
        <PrimaryKPICard
          label="COLLECTION RATE"
          value={`${clinicData?.collectionRate ?? kpis?.collectionRate ?? 0}%`}
          trend={Number(clinicData?.collectionRateTrend ?? 0)}
          icon={<CheckCircle2 size={18} />}
          color="#16a34a"
          invertTrend
        />
        <PrimaryKPICard
          label="AVG WAIT TIME"
          value={`${clinicData?.avgWaitTime ?? kpis?.avgWaitTime ?? 0}m`}
          trend={Number(clinicData?.avgWaitTimeTrend ?? 0)}
          icon={<Clock size={18} />}
          color="#d97706"
          invertTrend
        />
      </div>

      {/* ── Secondary Stats Row ────────────────────────────────────────── */}
      <div className="sa-stats-row">
        <StatCard label="Active Clinics" value={String(clinicCount)} icon={<Building2 size={16} />} color="#2563eb" onClick={() => navigate('/platform/clinics')} />
        <StatCard label="Active Staff" value={String(activeStaff)} icon={<Users size={16} />} color="#7c3aed" onClick={() => navigate('/staff')} />
        <StatCard label="Revenue / Patient" value={fmt(clinicData?.revenueBreakdown?.perPatient || 0)} icon={<BarChart3 size={16} />} color="#16a34a" />
        <StatCard label="Pending Dues" value={fmt(clinicData?.revenueBreakdown?.pending || 0)} icon={<AlertCircle size={16} />} color="#dc2626" onClick={() => navigate('/billing')} />
      </div>

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
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  hide={true}
                />
                <Tooltip 
                  cursor={{ stroke: 'rgba(37, 99, 235, 0.2)', strokeWidth: 2 }}
                  contentStyle={{ 
                    borderRadius: 12, 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    backdropFilter: 'blur(8px)',
                    fontSize: 12, 
                    fontWeight: 700,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }} 
                  formatter={(v: any) => [fmt(Number(v)), 'Revenue']} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fill="url(#saRevGrad)" 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 3 }}
                  isAnimationActive={true} 
                  animationDuration={1500}
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

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="sa-actions-grid">
        <QuickAction icon={<Building2 size={18} />} label="Manage Clinics" sub="Add, edit or view clinics" onClick={() => navigate('/platform/clinics')} />
        <QuickAction icon={<Users size={18} />} label="Staff Management" sub="Doctors, receptionists & roles" onClick={() => navigate('/staff')} />
        <QuickAction icon={<CreditCard size={18} />} label="Billing & Payments" sub="Invoices, receipts & dues" onClick={() => navigate('/billing')} />
        <QuickAction icon={<BarChart3 size={18} />} label="Analytics" sub="Reports & revenue insights" onClick={() => navigate('/analytics')} />
      </div>

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n && n !== 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function fmtNum(n: number): string {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PrimaryKPICard({
  label, value, trend, icon, color, invertTrend
}: {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
  invertTrend?: boolean;
}) {
  const positive = invertTrend ? trend <= 0 : trend >= 0;
  return (
    <div className="sa-kpi-card">
      <div className="sa-kpi-icon" style={{ background: `${color}15`, color }}>{icon}</div>
      <div className="sa-kpi-body">
        <div className="sa-kpi-label">{label}</div>
        <div className="sa-kpi-value">{value}</div>
        <div className={`sa-kpi-trend ${positive ? 'sa-trend-up' : 'sa-trend-down'}`}>
          {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {positive ? '+' : ''}{trend}% vs prev.
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
