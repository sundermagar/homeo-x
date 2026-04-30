import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Activity, BellDot, BrainCircuit,
  Scale, TrendingUp, Users, CalendarCheck,
  ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import '../styles/clinical-hub.css';

const FEATURES = [
  {
    icon: Scale,
    iconStyle: '',
    title: 'Height & Weight Check',
    desc: 'Capture patient vitals and generate WHO-standard growth analytics with percentile mapping.',
    path: '/vitals-check',
    badge: null,
  },
  {
    icon: BrainCircuit,
    iconStyle: 'purple',
    title: 'AI Analysis',
    desc: 'Clinical decision support with multi-theory AI consultation engine.',
    path: '/ai-analysis',
    badge: 'active',
  },
  {
    icon: Activity,
    iconStyle: 'alt',
    title: 'Remedy Chart',
    desc: 'AI-powered remedy charting with visual taxonomy matrix and cross-referencing capabilities.',
    path: '/clinical/remedy-chart',
    badge: 'new',
  },
  {
    icon: BellDot,
    iconStyle: 'green',
    title: 'Follow-up Dues',
    desc: 'Track pending follow-ups, view due dates, and manage patient recall schedules.',
    path: '/medical-cases/followups',
    badge: null,
  },
];

const STATS = [
  { icon: Users, value: '—', label: 'Active Cases', style: '' },
  { icon: CalendarCheck, value: '—', label: 'Due Today', style: 'warn' },
  { icon: TrendingUp, value: '—', label: 'This Week', style: 'success' },
  { icon: AlertCircle, value: '—', label: 'Overdue', style: 'danger' },
];

const ACTIVITIES = [
  { text: 'No recent clinical activity to display.', time: 'Start by capturing a patient vitals or reviewing a case', type: 'default' },
];
export default function ClinicalHubPage() {
  const [loading, setLoading] = useState(true);

  // Simulate loading for demonstration
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pp-page-container chub-page animate-fade-in">
      {/* ─── Header ─── */}
      <header className="chub-header">
        <div className="chub-header-top">
          <div className="chub-icon-wrap">
            <Stethoscope size={22} />
          </div>
          <div className="chub-title-group">
            <h1 className="chub-title">Clinical Hub</h1>
            <p className="chub-subtitle">Your workspace for patient care and clinical operations</p>
          </div>
        </div>
      </header>

      {/* ─── Quick Actions ─── */}
      <div className="chub-quick-actions">
        <Link to="/vitals-check" className="chub-quick-btn primary">
          <Scale size={16} />
          New Vitals
        </Link>
        <Link to="/medical-cases/followups" className="chub-quick-btn">
          <BellDot size={16} />
          Follow-ups
        </Link>
        <Link to="/clinical/remedy-chart" className="chub-quick-btn">
          <Activity size={16} />
          Remedy Chart
        </Link>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="chub-stats-row">
        {loading ? (
          STATS.map((_, i) => (
            <div key={i} className="chub-stat-card">
              <div className="chub-stat-icon" style={{ background: 'var(--pp-warm-2)' }}>
                <div className="skeleton-box" style={{ width: 18, height: 18 }} />
              </div>
              <div className="chub-stat-body" style={{ flex: 1 }}>
                <div className="skeleton-box skeleton-text" style={{ width: '60%', height: 24, marginBottom: 4 }} />
                <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 10 }} />
              </div>
            </div>
          ))
        ) : (
          STATS.map((stat, i) => (
            <div key={i} className="chub-stat-card">
              <div className={`chub-stat-icon ${stat.style}`}>
                <stat.icon size={18} />
              </div>
              <div className="chub-stat-body">
                <div className="chub-stat-value">{stat.value}</div>
                <div className="chub-stat-label">{stat.label}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Feature Cards ─── */}
      <section className="chub-features-section">
        <div className="chub-section-header">
          <h2 className="chub-section-title">Clinical Modules</h2>
        </div>

        <div className="chub-grid">
          {FEATURES.map((feature, i) => (
            <Link key={i} to={feature.path} className="chub-feature-card">
              <div className="chub-feature-header">
                <div className={`chub-feature-icon ${feature.iconStyle}`}>
                  <feature.icon size={20} />
                </div>
                <div className="chub-feature-title-group">
                  <h3 className="chub-feature-title">{feature.title}</h3>
                  <p className="chub-feature-desc">{feature.desc}</p>
                </div>
              </div>
              <div className="chub-feature-meta">
                {feature.badge && (
                  <span className={`chub-feature-badge ${feature.badge}`}>
                    {feature.badge}
                  </span>
                )}
                <span className="chub-feature-link">
                  Open <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Recent Activity ─── */}
      <section className="chub-activity-section">
        <div className="chub-section-header">
          <h2 className="chub-section-title">Recent Activity</h2>
        </div>

        <div className="chub-activity-card">
          {loading ? (
            <div className="chub-activity-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="chub-activity-item">
                  <div className="chub-activity-dot" style={{ background: 'var(--pp-warm-3)' }} />
                  <div className="chub-activity-content">
                    <div className="skeleton-box skeleton-text" style={{ width: '80%', height: 14, marginBottom: 8 }} />
                    <div className="skeleton-box skeleton-text" style={{ width: '30%', height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : ACTIVITIES.length === 0 ? (
            <div className="chub-empty">
              <div className="chub-empty-icon">
                <Activity size={28} />
              </div>
              <h3 className="chub-empty-title">No recent activity</h3>
              <p className="chub-empty-text">
                Clinical actions will appear here as you work with patient cases.
              </p>
            </div>
          ) : (
            <div className="chub-activity-list">
              {ACTIVITIES.map((activity, i) => (
                <div key={i} className="chub-activity-item">
                  <div className={`chub-activity-dot ${activity.type}`} />
                  <div className="chub-activity-content">
                    <p className="chub-activity-text">{activity.text}</p>
                    <p className="chub-activity-time">
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
