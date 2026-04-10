import React, { useState } from 'react';
import { Calendar, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Phone, User } from 'lucide-react';
import { usePackageExpiryReport } from '../hooks/use-packages';
import '../styles/packages.css';

function getDaysLabel(days: number) {
  if (days < 0)  return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today!';
  return `${days}d remaining`;
}

function getStatusBadgeClass(status: string) {
  if (status === 'Expired')       return 'expired';
  if (status === 'ExpiringSoon')  return 'expiring-soon';
  return 'active';
}

function getStatusIcon(status: string) {
  if (status === 'Expired')      return <XCircle size={13} strokeWidth={1.6} />;
  if (status === 'ExpiringSoon') return <AlertTriangle size={13} strokeWidth={1.6} />;
  return <CheckCircle2 size={13} strokeWidth={1.6} />;
}

export default function PackageTrackingPage() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]!;
  const defaultTo   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]!;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate,   setToDate]   = useState(defaultTo);

  const { data, isLoading, refetch } = usePackageExpiryReport(fromDate, toDate);
  const records = data?.records ?? [];

  const expiring = records.filter((r: any) => r.status === 'ExpiringSoon').length;
  const expired  = records.filter((r: any) => r.status === 'Expired').length;
  const active   = records.filter((r: any) => r.status === 'Active').length;

  return (
    <div className="pkg-page">
      {/* Header */}
      <header className="pkg-header">
        <div>
          <h1 className="pkg-title">
            <Calendar size={20} strokeWidth={1.6} style={{ color: '#D97706' }} />
            Package Expiry Tracker
          </h1>
          <p className="pkg-subtitle">Monitor subscription validity · Follow up with patients</p>
        </div>
        <button className="pkg-btn" onClick={() => refetch()}>
          <RefreshCw size={14} strokeWidth={1.6} /> Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="pkg-filters">
        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Date Range:</label>
        <input type="date" className="pkg-date-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>to</span>
        <input type="date" className="pkg-date-input" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>

      {/* Stats */}
      <div className="pkg-stats">
        {[
          { label: 'Expiring Soon (≤7 days)', value: expiring, color: '#D97706', bg: '#FFFBEB', icon: <AlertTriangle size={20} strokeWidth={1.6} /> },
          { label: 'Active in Range',          value: active,   color: '#059669', bg: '#F0FDF4', icon: <CheckCircle2 size={20} strokeWidth={1.6} /> },
          { label: 'Already Expired',          value: expired,  color: '#E11D48', bg: '#FFF1F2', icon: <XCircle size={20} strokeWidth={1.6} /> },
        ].map(s => (
          <div key={s.label} className="pkg-stat-card">
            <div className="pkg-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="pkg-stat-label">{s.label}</div>
              <div className="pkg-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="pkg-table-wrap">
        <div className="pkg-table-scroll">
          <table className="pkg-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Package Plan</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', opacity: 0.4, margin: '0 auto', display: 'block' }} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="pkg-empty">
                      <Calendar size={28} className="pkg-empty-icon" />
                      <p className="pkg-empty-text">No packages expiring in this date range.</p>
                    </div>
                  </td>
                </tr>
              ) : records.map((r: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {(r.firstName?.[0] ?? '?')}{r.surname?.[0] ?? ''}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{r.firstName} {r.surname}</div>
                        {r.phone && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={10} strokeWidth={1.6} /> {r.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.packageName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹{r.packagePrice?.toLocaleString()}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{r.startDate}</td>
                  <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.expiryDate}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: r.daysRemaining < 0 ? 'var(--danger)' : r.daysRemaining <= 7 ? '#D97706' : 'var(--success)' }}>
                      <Clock size={12} strokeWidth={1.6} />
                      {getDaysLabel(r.daysRemaining)}
                    </div>
                  </td>
                  <td>
                    <span className={`pkg-expiry-badge ${getStatusBadgeClass(r.status)}`}>
                      {getStatusIcon(r.status)} {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
