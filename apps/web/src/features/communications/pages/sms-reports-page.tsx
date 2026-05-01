import { useState } from 'react';
import { BarChart2, RefreshCw, Search } from 'lucide-react';
import { useSmsReports } from '../hooks/use-communications';
import type { SmsReport } from '@mmc/types';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
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
    limit: 10,
  });

  const { data, isLoading, refetch, isFetching } = useSmsReports(filters);
  const reports = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const totalPages = Math.ceil(total / limit);

  const set = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const totalPages5 = total > 0 ? totalPages : 1;

  return (
    <div className="pp-page-container comm-page animate-fade-in">
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
            onClick={() => setFilters({ sms_type: '', status: '', from_date: '', to_date: '', phone: '', page: 1, limit: 10 })}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="comm-card">
        {isLoading ? (
          <TableSkeleton rows={10} columns={7} />
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
                      <td data-label="#" className="comm-table-mono">#{r.id}</td>
                      <td data-label="DATE & TIME" className="comm-table-date">
                        {new Date(r.sendDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td data-label="PHONE" className="comm-table-phone">{r.phone ?? '—'}</td>
                      <td data-label="MESSAGE" className="comm-table-message" title={r.message}>
                        <div className="comm-msg-text">{r.message}</div>
                      </td>
                      <td data-label="TYPE"><span className="comm-type-tag">{r.smsType}</span></td>
                      <td data-label="STATUS">
                        <span className={getStatusClass(r.status)}>
                          {r.status?.charAt(0).toUpperCase()}{r.status?.slice(1)}
                        </span>
                      </td>
                      <td data-label="REF" className="comm-table-ref">{r.gatewayRef ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              totalItems={total}
              itemsPerPage={limit}
              currentPage={page}
              onPageChange={(p) => setFilters(f => ({ ...f, page: p }))}
              onLimitChange={(l) => setFilters(f => ({ ...f, limit: l, page: 1 }))}
            />
          </>
        )}
      </div>
      <style>{`
        @media (max-width: 1024px) {
          .comm-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .comm-stats { grid-template-columns: 1fr !important; }
          .comm-filters { flex-direction: column !important; align-items: stretch !important; }
          .comm-filter-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; }
          .comm-search-wrap { width: 100% !important; }
          
          .comm-card { border: none !important; box-shadow: none !important; background: transparent !important; }
          .comm-table-wrap { border: none !important; overflow: visible !important; }
          .comm-table { display: block !important; width: 100% !important; min-width: 0 !important; }
          .comm-table thead { display: none !important; }
          .comm-table tbody { display: block !important; width: 100% !important; }
          .comm-table tr { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
            overflow: hidden;
          }
          .comm-table td {
            display: grid !important;
            grid-template-columns: 110px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 44px;
            text-align: right !important;
            width: 100% !important;
          }
          .comm-table td:last-child { border-bottom: none !important; }
          
          .comm-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            text-align: left !important;
            opacity: 0.8;
          }
          
          .comm-table-message { 
            white-space: normal !important; 
            text-align: right !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .comm-msg-text {
            display: -webkit-box !important;
            -webkit-line-clamp: 4 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            word-break: break-word !important;
            line-height: 1.4 !important;
            color: var(--text-main) !important;
          }
          .comm-table-date, .comm-table-phone, .comm-table-ref { 
            font-weight: 700 !important; 
            color: var(--text-main) !important; 
            min-width: 0 !important;
            word-break: break-all !important;
          }
        }
      `}</style>
    </div>
  );
}
