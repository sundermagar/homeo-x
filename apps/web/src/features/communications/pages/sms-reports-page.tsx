import { useState } from 'react';
import { BarChart2, RefreshCw, Search } from 'lucide-react';
import { useSmsReports } from '../hooks/use-communications';
import type { SmsReport } from '@mmc/types';
import '../styles/communications.css';

const SMS_TYPES_FILTER = ['', 'Appointment', 'Group', 'Birthday', 'Package Expiry', 'Reminder', 'General', 'OTP'];
const STATUS_FILTER = ['', 'sent', 'delivered', 'failed', 'pending'];

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    delivered: 'delivered',
    sent: 'sent',
    failed: 'failed',
    pending: 'pending',
  };
  return `comm-status-badge ${map[status] ?? ''}`;
}

export default function SmsReportsPage() {
  const [filters, setFilters] = useState({
    sms_type: '',
    status: '',
    from_date: '',
    to_date: '',
    phone: '',
    page: 1,
    limit: 40,
  });

  const { data, isLoading, refetch } = useSmsReports(filters);
  const reports = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 40;
  const totalPages = Math.ceil(total / limit);

  const set = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const totalPages5 = total > 0 ? totalPages : 1;

  return (
    <div className="comm-page">
      {/* Header */}
      <header className="comm-header">
        <div>
          <h1 className="comm-title">
            <BarChart2 size={20} strokeWidth={1.6} className="comm-title-icon-blue" />
            SMS Reports
          </h1>
          <p className="comm-subtitle">Delivery tracking and transmission ledger</p>
        </div>
        <div className="comm-header-actions">
          <button className="comm-btn comm-btn-sm" onClick={() => refetch()}>
            <RefreshCw size={13} className="comm-spin" /> Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="comm-stats">
        {[
          { label: 'Total Sent', value: reports.length, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Delivered', value: reports.filter(r => r.status === 'delivered').length, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Pending', value: reports.filter(r => r.status === 'pending').length, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Failed', value: reports.filter(r => r.status === 'failed').length, color: '#DC2626', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} className="comm-stat-card">
            <div className="comm-stat-icon" style={{ background: s.bg, color: s.color }}>{s.label[0]}</div>
            <div>
              <div className="comm-stat-label">{s.label}</div>
              <div className="comm-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="comm-filters">
        <div className="comm-search-wrap">
          <Search size={13} className="comm-search-icon" />
          <input className="comm-filter-input comm-filter-input-search"
            style={{ width: 160 }}
            placeholder="Phone…" value={filters.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <select className="comm-filter-input" value={filters.sms_type} onChange={e => set('sms_type', e.target.value)}>
          <option value="">All Types</option>
          {SMS_TYPES_FILTER.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="comm-filter-input" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">All Status</option>
          {STATUS_FILTER.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input className="comm-filter-input" type="date" value={filters.from_date} onChange={e => set('from_date', e.target.value)} title="From" />
        <input className="comm-filter-input" type="date" value={filters.to_date} onChange={e => set('to_date', e.target.value)} title="To" />
        {(filters.sms_type || filters.status || filters.from_date || filters.phone) && (
          <button className="comm-btn comm-btn-sm"
            onClick={() => setFilters({ sms_type: '', status: '', from_date: '', to_date: '', phone: '', page: 1, limit: 40 })}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="comm-card">
        {isLoading ? (
          <div className="comm-loading"><RefreshCw size={22} className="comm-spin" /></div>
        ) : reports.length === 0 ? (
          <div className="comm-empty">
            <BarChart2 size={36} className="comm-empty-icon" />
            <p className="comm-empty-text">No SMS records found. Send some messages first.</p>
          </div>
        ) : (
          <>
            <div className="comm-table-wrap">
              <table className="comm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date &amp; Time</th>
                    <th>Phone</th>
                    <th>Message</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Gateway Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: SmsReport) => (
                    <tr key={r.id}>
                      <td className="comm-table-mono">#{r.id}</td>
                      <td className="comm-table-date">
                        {new Date(r.sendDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="comm-table-phone">{r.phone ?? '—'}</td>
                      <td className="comm-table-message" title={r.message}>{r.message}</td>
                      <td><span className="comm-type-tag">{r.smsType}</span></td>
                      <td>
                        <span className={getStatusClass(r.status)}>
                          {r.status?.charAt(0).toUpperCase()}{r.status?.slice(1)}
                        </span>
                      </td>
                      <td className="comm-table-ref">{r.gatewayRef ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages5 > 1 && (
              <div className="comm-page-bar">
                <span>Showing {reports.length} of {total} records</span>
                <div className="comm-pagination-controls">
                  <button className="comm-btn comm-btn-sm" disabled={page <= 1}
                    onClick={() => set('page', String(page - 1))}>‹ Prev</button>
                  <span>Page {page} of {totalPages5}</span>
                  <button className="comm-btn comm-btn-sm" disabled={page >= totalPages5}
                    onClick={() => set('page', String(page + 1))}>Next ›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
