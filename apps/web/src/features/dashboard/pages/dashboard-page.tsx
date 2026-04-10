import { 
  Users, 
  CalendarClock, 
  Stethoscope, 
  Ticket,
  TrendingUp,
  Activity,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTodayAppointments, useWaitlist } from '../../appointments/hooks/use-appointments';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import './dashboard.css';

const TODAY = new Date().toISOString().split('T')[0]!;

export default function DashboardPage() {
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Clinical Overview</h1>
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

      <div className="dashboard-grid">
        {/* Main Content: Live Queue */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Live Waiting Room</h3>
            <Link to="/appointments/queue" className="dash-link">View All</Link>
          </div>
          <div className="dash-card-body">
            {waitlist.length === 0 ? (
              <div className="dash-empty">
                <Activity size={32} style={{ opacity: 0.1, marginBottom: 16 }} />
                <p>No patients currently waiting</p>
              </div>
            ) : (
              <div className="dash-queue-list">
                {waitlist.slice(0, 5).map(w => (
                  <div key={w.id} className="dash-queue-item">
                    <div className="dash-token-badge">W{w.waitingNumber}</div>
                    <div className="dash-queue-info">
                      <div className="dash-pt-name">{w.patientName || 'Anonymous'}</div>
                      <div className="dash-dr-name">{w.doctorName || 'General'}</div>
                    </div>
                    <div className={`dash-status-dot s-${w.status}`} title={w.status === 1 ? 'In Room' : 'Waiting'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Upcoming Appointments */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Upcoming Appointments</h3>
            <Link to="/appointments/calendar" className="dash-link">Calendar</Link>
          </div>
          <div className="dash-card-body">
            <div className="dash-appt-list">
              {todayAppts.slice(0, 4).map(a => (
                <div key={a.id} className="dash-appt-item">
                  <div className="dash-appt-time">{a.bookingTime}</div>
                  <div className="dash-appt-info">
                    <div className="dash-pt-name">{a.patientName}</div>
                    <div className="dash-pt-sub">{a.visitType}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
