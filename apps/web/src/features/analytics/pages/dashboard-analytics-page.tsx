import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, IndianRupee, Calendar, TrendingUp } from 'lucide-react';
import { useAnalyticsSummary, usePatientTrends } from '../hooks/use-analytics';
import '../../platform/styles/platform.css';

export function DashboardAnalyticsPage() {
  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary();
  const { data: trends, isLoading: isLoadingTrends } = usePatientTrends();

  if (isLoadingSummary || isLoadingTrends) {
    return (
      <div className="plat-page animate-fade-in">
        <div className="plat-empty">
          <div className="plat-empty-text">Loading dashboard analytics...</div>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total Patients', value: summary?.totalPatients ?? 0, variant: 'primary' },
    { title: 'Appointments', value: summary?.totalAppointments ?? 0, variant: 'success' },
    { title: 'Monthly Revenue', value: `₹${(summary?.totalRevenue ?? 0).toLocaleString()}`, variant: 'info' },
  ];

  return (
    <div className="plat-page animate-fade-in">
      {/* Header */}
      <div className="plat-header">
        <div className="plat-header-left">
          <h1 className="plat-header-title">
            <TrendingUp size={24} style={{ color: 'var(--pp-blue)' }} />
            Analytics Dashboard
          </h1>
          <p className="plat-header-sub">Real-time overview of clinical case distributions and financial performance.</p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="plat-stats-bar">
        {kpis.map((kpi, i) => (
          <div key={i} className="plat-stat-card">
            <div className="plat-stat-label">{kpi.title}</div>
            <div className={`plat-stat-value plat-stat-value-${kpi.variant}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Responsive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Revenue Trend */}
        <div className="plat-card">
          <div className="plat-card-header">
            <h3><IndianRupee size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Revenue Trends (Last 6 Months)</h3>
          </div>
          <div style={{ padding: '24px 16px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.revenueByMonth ?? []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--pp-blue)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--pp-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--pp-warm-4)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--pp-text-3)', fontSize: 11, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--pp-text-3)', fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid var(--pp-warm-4)',
                    borderRadius: '8px',
                    boxShadow: 'var(--pp-shadow-sm)',
                    fontSize: '0.75rem',
                  }}
                  itemStyle={{ color: 'var(--pp-blue)', fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--pp-blue)"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Patients Bar Chart */}
        <div className="plat-card">
          <div className="plat-card-header">
            <h3><Users size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> New Patients (Last 6 Months)</h3>
          </div>
          <div style={{ padding: '24px 16px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends?.newPatients ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--pp-warm-4)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--pp-text-3)', fontSize: 11, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--pp-text-3)', fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--pp-warm-1)' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid var(--pp-warm-4)',
                    borderRadius: '8px',
                    boxShadow: 'var(--pp-shadow-sm)',
                    fontSize: '0.75rem',
                  }}
                  itemStyle={{ color: 'var(--pp-blue)', fontWeight: 700 }}
                />
                <Bar dataKey="count" fill="var(--pp-blue)" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Diagnoses Section */}
      <div className="plat-card">
        <div className="plat-card-header">
          <h3>Common Diagnoses</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: '12px' 
          }}>
            {(trends?.topDiagnoses ?? []).map((d: any, i: number) => (
              <div key={i} style={{ 
                padding: '16px', 
                background: 'var(--pp-warm-1)', 
                border: '1px solid var(--pp-warm-4)',
                borderRadius: '12px',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ 
                  fontSize: '0.65rem', 
                  color: 'var(--pp-text-3)', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  {d.diagnosis}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--pp-blue)', lineHeight: 1 }}>
                  {d.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
