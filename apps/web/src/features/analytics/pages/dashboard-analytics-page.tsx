import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, Currency, Calendar } from 'lucide-react';
import { useAnalyticsSummary, usePatientTrends } from '../hooks/use-analytics';
import '../styles/analytics.css';

export function DashboardAnalyticsPage() {
  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary();
  const { data: trends, isLoading: isLoadingTrends } = usePatientTrends();

  if (isLoadingSummary || isLoadingTrends) {
    return <div className="analytics-page"><div className="analytics-loading">Loading dashboard...</div></div>;
  }

  const kpis = [
    { title: 'Total Patients', value: summary?.totalPatients ?? 0, icon: <Users size={20} />, color: 'var(--primary)' },
    { title: 'Appointments', value: summary?.totalAppointments ?? 0, icon: <Calendar size={20} />, color: 'var(--secondary)' },
    { title: 'Revenue', value: `₹${(summary?.totalRevenue ?? 0).toLocaleString()}`, icon: <Currency size={20} />, color: 'var(--success)' },
  ];

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-page-header">
        <h1 className="analytics-page-title">Analytics Dashboard</h1>
        <p className="analytics-page-subtitle">High-level overview of clinical performance</p>
      </div>

      {/* KPI Grid */}
      <div className="analytics-kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="analytics-kpi-card">
            <div className="analytics-kpi-header">
              <div className="analytics-kpi-icon" style={{ color: kpi.color }}>{kpi.icon}</div>
              <span className="analytics-kpi-label">{kpi.title}</span>
            </div>
            <p className="analytics-kpi-value">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Revenue Trend */}
        <div className="analytics-card analytics-chart-card">
          <h3 className="analytics-chart-title"><Activity size={16} /> Revenue Trends (Last 6 Months)</h3>
          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.revenueByMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-main)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                  }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Patients */}
        <div className="analytics-card analytics-chart-card">
          <h3 className="analytics-chart-title"><Users size={16} /> New Patients (Last 6 Months)</h3>
          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends?.newPatients ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-main)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                  }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Diagnoses */}
        <div className="analytics-card analytics-diagnoses-card analytics-charts-grid-full" style={{ gridColumn: '1 / -1' }}>
          <h3 className="analytics-diagnoses-title">Top Diagnoses</h3>
          <div className="analytics-diagnoses-grid">
            {(trends?.topDiagnoses ?? []).map((d: any, i: number) => (
              <div key={i} className="analytics-diagnosis-item">
                <span className="analytics-diagnosis-name" title={d.diagnosis}>{d.diagnosis}</span>
                <span className="analytics-diagnosis-count">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
