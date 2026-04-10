import { 
  Users, 
  CalendarClock, 
  Stethoscope, 
  Ticket,
  TrendingUp,
  Activity,
  Plus,
  ArrowUpRight,
  UserPlus,
  Calendar,
  PlusCircle,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTodayAppointments, useWaitlist } from '../../appointments/hooks/use-appointments';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import { useAuthStore } from '@/shared/stores/auth-store';
import './dashboard.css';

const TODAY = new Date().toISOString().split('T')[0]!;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const api = useApi();
  const { data: todayAppts = [] } = useTodayAppointments();
  const { data: waitlist = [] } = useWaitlist(TODAY);

  const { data: casesData } = useQuery({
    queryKey: ['medical-cases', 'count'],
    queryFn: async () => {
      const res = await api.get('/medical-cases');
      return res.data;
    }
  });

  const stats = [
    { label: 'Today\'s Bookings', value: todayAppts.length, change: '+12%', icon: CalendarClock, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'In Waiting Room', value: waitlist.filter(w => w.status === 0).length, change: 'Live', icon: Ticket, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Clinical Records', value: casesData?.total || 0, change: '+5%', icon: Stethoscope, color: '#10B981', bg: '#F0FDF4' },
    { label: 'Growth Rate', value: '24%', change: '+2.1%', icon: TrendingUp, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  const quickActions = [
    { label: 'Register Patient', icon: <UserPlus size={20} />, path: '/patients/add', color: '#6366f1' },
    { label: 'New Appointment', icon: <Calendar size={20} />, path: '/appointments', color: '#8b5cf6' },
    { label: 'Create Record', icon: <PlusCircle size={20} />, path: '/patients', color: '#10b981' },
    { label: 'Global Search', icon: <Search size={20} />, path: '/patients', color: '#64748b' },
  ];

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {user?.name?.split(' ')[0] || 'Doctor'}</h1>
          <p className="dashboard-subtitle">Monitor your practice's real-time performance and patient flow.</p>
        </div>
        <div className="dashboard-actions">
          <Link to="/appointments" className="dash-btn dash-btn-primary">
            <Plus size={18} /> New Appointment
          </Link>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-box" style={{ background: s.bg, color: s.color }}>
                <s.icon size={22} strokeWidth={1.5} />
              </div>
              <div className="stat-trend">
                {s.change} <ArrowUpRight size={14} />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginTop: 32, marginBottom: 20 }}>Quick Operations</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {quickActions.map((a) => (
          <Link key={a.label} to={a.path} className="card" style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f8fafc',
              border: `1px solid ${a.color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: a.color
            }}>
              {a.icon}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>{a.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
