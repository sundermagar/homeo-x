import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, IndianRupee, Calendar, TrendingUp } from 'lucide-react';
import { useAnalyticsSummary, usePatientTrends } from '../hooks/use-analytics';
import '../../platform/styles/platform.css';

export function DashboardAnalyticsPage() {
  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary();
  const { data: trends, isLoading: isLoadingTrends } = usePatientTrends();

  if (isLoadingSummary || isLoadingTrends) {
    return (
      <div className="pp-page-container plat-page animate-fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton-box" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="skeleton-box" style={{ height: 400, borderRadius: 24 }} />
          <div className="skeleton-box" style={{ height: 400, borderRadius: 24 }} />
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
    <div className="pp-page-container plat-page animate-fade-in">
      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <TrendingUp size={22} style={{ color: 'var(--pp-blue)' }} />
            Analytics Dashboard
          </h1>
          <p className="pp-page-hero-sub">Real-time overview of clinical case distributions and financial performance.</p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="pp-stat-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="pp-stat-card-enhanced">
            <div className="pp-stat-label">{kpi.title}</div>
            <div className={`pp-stat-value is-${kpi.variant}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Responsive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Revenue Trend */}
        <div className="pp-table-container-enhanced" style={{ overflow: 'visible' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)' }}>
            <h3><IndianRupee size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Revenue Trends (Last 6 Months)</h3>
          </div>
          <div style={{ padding: '24px 12px', height: '300px' }}>
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
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Patients Bar Chart */}
        <div className="pp-table-container-enhanced" style={{ overflow: 'visible' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)' }}>
            <h3><Users size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> New Patients (Last 6 Months)</h3>
          </div>
          <div style={{ padding: '24px 12px', height: '300px' }}>
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
                <Bar dataKey="count" fill="var(--pp-blue)" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Diagnoses Section */}
      <div className="pp-table-container-enhanced" style={{ overflow: 'visible' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)' }}>
          <h3>Common Diagnoses</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
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
