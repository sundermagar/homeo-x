import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  BarChart3,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useClinicAdminDashboard } from '../hooks/use-clinic-admin-dashboard';
import { useAuthStore } from '@/shared/stores/auth-store';
import './role-dashboards.css';
import './clinic-admin-dashboard.css';

type Period = 'day' | 'week' | 'month' | 'year';
type RevenueTab = 'Cash' | 'UPI/Card';

function fmt(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function fmtNum(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function TrendBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`cad-trend-badge ${positive ? 'cad-trend-up' : 'cad-trend-down'}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? '+' : ''}{value}% vs prev.
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="cad-progress-track">
      <div className="cad-progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Paid' ? 'cad-badge-success' : status === 'Pending' ? 'cad-badge-danger' : 'cad-badge-warning';
  return <span className={`cad-badge ${cls}`}>{status}</span>;
}

export function ClinicAdminDashboard() {
  const [period, setPeriod] = useState<Period>('year');
  const [revTab, setRevTab] = useState<RevenueTab>('Cash');
  const [sidebarTab, setSidebarTab] = useState<'Queue' | 'Analytics' | 'Billing'>('Queue');

  const { data, isLoading } = useClinicAdminDashboard(period);
  useAuthStore((s) => s.user); // ensures auth store is initialised

  if (isLoading || !data) {
    return (
      <div className="cad-root cad-loading">
        <Activity size={28} style={{ color: 'var(--pp-blue)', animation: 'pulse 1.5s infinite' }} />
        <p>Loading Clinic Analytics…</p>
      </div>
    );
  }

  const {
    totalRevenue,
    revenueTrend,
    patientsApril: patients,
    patientsTrend,
    collectionRate,
    collectionRateTrend,
    avgWaitTime,
    avgWaitTimeTrend,
    revenueBreakdown,
    revenueSeries,
    cashSeries,
    upiSeries,
    targets,
    topBilling,
    recentActivity,
    queue,
    staffOnDuty,
    weekLabel,
  } = data;
 
  // Select the chart series based on the active tab
  const chartSeries = revTab === 'Cash' ? cashSeries : revTab === 'UPI/Card' ? upiSeries : revenueSeries;
 
  // Total for the active tab
  const tabTotal = revTab === 'Cash'
    ? revenueBreakdown.physicalCurrency
    : revTab === 'UPI/Card'
    ? revenueBreakdown.upiCard
    : totalRevenue;
 
  const periodLabel = period.toUpperCase();
  const sublabel = period === 'day' ? 'TODAY' : period === 'week' ? 'WTD' : period === 'month' ? 'MTD' : 'YTD';
 
  return (
    <div className="cad-root">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="cad-header">
        <div>
          <h1 className="cad-title">Overview</h1>
          <p className="cad-subtitle">{weekLabel}</p>
        </div>
        <div className="cad-period-tabs">
          {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
            <button
              key={p}
              className={`cad-period-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
 
      {/* ── KPI Strip ───────────────────────────────────────────────────── */}
      <div className="cad-kpi-strip">
        <KPICard
          label="REVENUE"
          sublabel={sublabel}
          value={fmt(totalRevenue)}
          trend={revenueTrend}
        />
        <KPICard
          label="PATIENTS"
          sublabel={sublabel}
          value={patients > 0 ? String(patients) : '--'}
          trend={patientsTrend}
        />
        <KPICard
          label="COLLECTION RATE"
          sublabel=""
          value={`${collectionRate}%`}
          trend={collectionRateTrend}
          invertTrend
        />
        <KPICard
          label="AVG WAIT TIME"
          sublabel=""
          value={`${avgWaitTime}m`}
          trend={avgWaitTimeTrend}
          invertTrend
        />
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="cad-grid">
        <div className="cad-main-col">

          {/* Revenue Breakdown Card */}
          <div className="cad-card">
            <div className="cad-card-header">
              <div>
                <div className="cad-card-title">
                  <BarChart3 size={14} />
                  REVENUE BREAKDOWN · TREND
                </div>
              </div>
              <div className="cad-rev-tabs">
                <button
                  className={`cad-rev-tab ${revTab === 'Cash' ? 'active' : ''}`}
                  onClick={() => setRevTab('Cash')}
                >Cash</button>
                <button
                  className={`cad-rev-tab ${revTab === 'UPI/Card' ? 'active' : ''}`}
                  onClick={() => setRevTab('UPI/Card')}
                >UPI/Card</button>
              </div>
            </div>
            <div className="cad-card-body">
              <div className="cad-rev-main-stat">
                <span className="cad-rev-main-value">{fmt(tabTotal)}</span>
                <TrendBadge value={revenueTrend} />
                <span className="cad-rev-mode-note">
                  {revTab}
                </span>
              </div>
              <div className="cad-chart-area">
                {chartSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSeries} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={fmtNum} />
                      <Tooltip 
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600 }} 
                        formatter={(v) => [fmt(Number(v)), 'Revenue']} 
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        radius={[4, 4, 0, 0]} 
                        barSize={32}
                        isAnimationActive={false}
                      >
                        {chartSeries.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === chartSeries.length - 1 ? 'var(--pp-blue)' : '#cbd5e1'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="cad-chart-empty">
                    <Activity size={24} style={{ opacity: 0.3 }} />
                    <span>No revenue data yet</span>
                  </div>
                )}
              </div>
              <div className="cad-rev-footer">
                <div className="cad-rev-footer-item">
                  <span className="cad-rev-footer-label">PHYSICAL CURRENCY</span>
                  <span className="cad-rev-footer-value">{fmt(revenueBreakdown.physicalCurrency)} <em>({revenueBreakdown.physicalCurrencyPct}%)</em></span>
                </div>
                <div className="cad-rev-footer-sep" />
                <div className="cad-rev-footer-item">
                  <span className="cad-rev-footer-label">UPI / CARD</span>
                  <span className="cad-rev-footer-value">{fmt(revenueBreakdown.upiCard)} <em>({revenueBreakdown.upiCardPct}%)</em></span>
                </div>
                <div className="cad-rev-footer-sep" />
                <div className="cad-rev-footer-item">
                  <span className="cad-rev-footer-label">PENDING</span>
                  <span className="cad-rev-footer-value cad-rev-pending">{fmt(revenueBreakdown.pending)} <em>({revenueBreakdown.pendingCount} inv)</em></span>
                </div>
                <div className="cad-rev-footer-sep" />
                <div className="cad-rev-footer-item">
                  <span className="cad-rev-footer-label">PER PATIENT (AVG)</span>
                  <span className="cad-rev-footer-value">{fmt(revenueBreakdown.perPatient)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="cad-bottom-row">

            {/* Top Billing */}
            <div className="cad-card cad-card-sm">
              <div className="cad-card-header">
                <div>
                  <div className="cad-card-title">TOP BILLING — {periodLabel}</div>
                  <div className="cad-card-subtitle">By invoice value</div>
                </div>
                <a className="cad-report-link" href="/billing" onClick={e => { e.preventDefault(); window.location.href = '/billing'; }}>
                  Report <ChevronRight size={11} />
                </a>
              </div>
              <div className="cad-card-body cad-table-body">
                {topBilling.length > 0 ? (
                  <table className="cad-table">
                    <thead>
                      <tr>
                        <th>PATIENT</th>
                        <th>TOTAL</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBilling.map((b: { id: number; patientName: string; total: number; status: string }) => (
                        <tr key={b.id}>
                          <td className="cad-patient-cell">
                            <div className="cad-patient-avatar">{b.patientName.charAt(0)}</div>
                            <span>{b.patientName}</span>
                          </td>
                          <td className="cad-total-cell">{fmt(b.total)}</td>
                          <td><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="cad-empty-state">
                    <Inbox size={28} style={{ opacity: 0.25 }} />
                    <p>No billing data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Targets */}
            <div className="cad-card cad-card-sm">
              <div className="cad-card-header">
                <div>
                  <div className="cad-card-title">{periodLabel} TARGETS</div>
                  <div className="cad-card-subtitle">{weekLabel}</div>
                </div>
              </div>
              <div className="cad-card-body cad-targets-body">
                {targets.map((t: { label: string; current: number; target: number; unit: string; status: 'success' | 'warning' | 'danger' }) => (
                  <div key={t.label} className="cad-target-row">
                    <div className="cad-target-label-row">
                      <span className="cad-target-name">{t.label}</span>
                      <span className="cad-target-value">
                        {t.unit === '₹' ? fmt(t.current) : `${t.current}${t.unit}`}
                        {' / '}
                        {t.unit === '₹' ? fmt(t.target) : `${t.target}${t.unit}`}
                      </span>
                    </div>
                    <ProgressBar
                      value={t.current}
                      max={t.target}
                      color={t.status === 'success' ? '#16a34a' : t.status === 'warning' ? '#d97706' : '#dc2626'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="cad-card cad-card-sm">
              <div className="cad-card-header">
                <div>
                  <div className="cad-card-title">RECENT ACTIVITY</div>
                  <div className="cad-card-subtitle">Last 24h events</div>
                </div>
              </div>
              <div className="cad-card-body cad-activity-body">
                {recentActivity.length > 0 ? (
                  <div className="cad-activity-list">
                    {recentActivity.map((a: { type: string; title: string; subtitle: string; createdAt: string | Date }, i: number) => (
                      <div key={i} className="cad-activity-item">
                        <div className={`cad-activity-dot ${a.type === 'payment' ? 'dot-green' : 'dot-blue'}`} />
                        <div className="cad-activity-content">
                          <div className="cad-activity-title">{a.title}</div>
                          <div className="cad-activity-sub">{a.subtitle}</div>
                        </div>
                        <div className="cad-activity-time">
                          {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cad-empty-state">
                    <Inbox size={28} style={{ opacity: 0.25 }} />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Sidebar ────────────────────────────────────────────── */}
        <aside className="cad-sidebar">
          <div className="cad-sidebar-tabs">
            {(['Queue', 'Analytics', 'Billing'] as const).map(tab => (
              <button
                key={tab}
                className={`cad-sidebar-tab ${sidebarTab === tab ? 'active' : ''}`}
                onClick={() => setSidebarTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {sidebarTab === 'Queue' && (
            <div className="cad-sidebar-section">
              <div className="cad-sidebar-section-title">TODAY'S QUEUE</div>
              {queue.length > 0 ? (
                <div className="cad-queue-list">
                  {queue.slice(0, 10).map((q: { id: number; patientName: string; tokenNo: string | number | null; bookingTime: string | null; status: string }) => (
                    <div key={q.id} className="cad-queue-item">
                      <div className="cad-queue-avatar">{q.patientName.charAt(0)}</div>
                      <div className="cad-queue-info">
                        <div className="cad-queue-name">{q.patientName}</div>
                        <div className="cad-queue-meta">
                          {q.tokenNo ? `Token ${q.tokenNo} · ` : ''}{q.bookingTime || 'N/A'}
                        </div>
                      </div>
                      <span className={`cad-badge ${q.status === 'Consultation' || q.status === 'COMPLETED' ? 'cad-badge-success' : 'cad-badge-primary'}`}>
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cad-sidebar-empty">
                  <Users size={20} style={{ opacity: 0.3 }} />
                  <p>No patients today</p>
                </div>
              )}
            </div>
          )}

          {sidebarTab === 'Analytics' && (
            <div className="cad-sidebar-section">
              <div className="cad-sidebar-section-title">ANALYTICS</div>
              <div className="cad-sidebar-analytics">
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">New Patients</span>
                  <span className="cad-analytics-value">{patients}</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Revenue {sublabel}</span>
                  <span className="cad-analytics-value">{fmt(totalRevenue)}</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Collection</span>
                  <span className="cad-analytics-value">{collectionRate}%</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Avg Wait</span>
                  <span className="cad-analytics-value">{avgWaitTime}m</span>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'Billing' && (
            <div className="cad-sidebar-section">
              <div className="cad-sidebar-section-title">QUICK BILLING</div>
              <div className="cad-sidebar-analytics">
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Collected</span>
                  <span className="cad-analytics-value">{fmt(tabTotal)}</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Pending</span>
                  <span className="cad-analytics-value cad-rev-pending">{fmt(revenueBreakdown.pending)}</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Invoices</span>
                  <span className="cad-analytics-value">{revenueBreakdown.pendingCount}</span>
                </div>
                <div className="cad-analytics-item">
                  <span className="cad-analytics-label">Avg/Patient</span>
                  <span className="cad-analytics-value">{fmt(revenueBreakdown.perPatient)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Staff on Duty */}
          <div className="cad-staff-section">
            <div className="cad-sidebar-section-title">STAFF ON DUTY</div>
            {staffOnDuty.length > 0 ? (
              <div className="cad-staff-list">
                {staffOnDuty.map((s: { name: string; role: string; count?: number }, i: number) => (
                  <div key={i} className="cad-staff-row">
                    <div className="cad-staff-avatar">{s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div>
                    <div className="cad-staff-info">
                      <div className="cad-staff-name">{s.name}</div>
                      <div className="cad-staff-role">{s.role}</div>
                    </div>
                    {s.count !== undefined && (
                      <div className="cad-staff-count">
                        <div className="cad-staff-count-num">{s.count}</div>
                        <div className="cad-staff-count-label">Visits</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="cad-sidebar-empty">
                <Users size={20} style={{ opacity: 0.3 }} />
                <p>No doctors found</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KPICard({ label, sublabel, value, trend, invertTrend }: {
  label: string;
  sublabel: string;
  value: string;
  trend: number;
  invertTrend?: boolean;
}) {
  const positive = invertTrend ? trend <= 0 : trend >= 0;
  return (
    <div className="cad-kpi-card">
      <div className="cad-kpi-label">{sublabel ? `${label} — ${sublabel}` : label}</div>
      <div className="cad-kpi-value">{value}</div>
      <div className={`cad-trend-badge ${positive ? 'cad-trend-up' : 'cad-trend-down'}`}>
        {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {positive ? '+' : ''}{trend}% vs prev.
      </div>
    </div>
  );
}
