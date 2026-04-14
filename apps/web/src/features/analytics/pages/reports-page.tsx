import { useState } from 'react';
import {
  useCaseMonthWise,
  useMonthWiseDues,
  useDueDetails,
  useBirthdayList,
  useReferenceListing
} from '../hooks/use-analytics';
import { Download, Gift, Users, Activity, CreditCard } from 'lucide-react';
import '../styles/analytics.css';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'monthwise' | 'dues' | 'birthdays' | 'references'>('monthwise');

  const exportToCSV = (filename: string, headers: string[], data: unknown[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => `"${((row as Record<string, unknown>)[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'monthwise' as const, label: 'Financial Grid', icon: <Activity size={14} /> },
    { id: 'dues' as const, label: 'Outstanding Dues', icon: <CreditCard size={14} /> },
    { id: 'birthdays' as const, label: 'Birthday List', icon: <Gift size={14} /> },
    { id: 'references' as const, label: 'Referrals & Sources', icon: <Users size={14} /> },
  ];

  return (
    <div className="analytics-reports-layout">
      {/* Header */}
      <div className="analytics-reports-header">
        <h1 className="analytics-reports-header-title">Reports & Analytics</h1>
        <p className="analytics-reports-header-sub">Exportable clinical and financial records.</p>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`analytics-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="analytics-tab-content" role="tabpanel">
        {activeTab === 'monthwise' && <CaseMonthWiseTab onExport={exportToCSV} />}
        {activeTab === 'dues' && <MonthWiseDueTab onExport={exportToCSV} />}
        {activeTab === 'birthdays' && <BirthdaysTab onExport={exportToCSV} />}
        {activeTab === 'references' && <ReferencesTab onExport={exportToCSV} />}
      </div>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────────────

function CaseMonthWiseTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const year = new Date().getFullYear();
  const { data, isLoading } = useCaseMonthWise(`${year}-01`, `${year}-12`);

  if (isLoading) return <div className="analytics-loading">Loading grid...</div>;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Monthly Financial Outline ({year})</h3>
        <button
          className="analytics-btn"
          onClick={() => onExport('MonthWise_Financial',
            ['displaydate', 'new_cases', 'followups', 'collection', 'cash', 'card', 'online', 'expenses'],
            data ?? []
          )}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="cell-right">New Cases</th>
              <th className="cell-right">Followups</th>
              <th className="cell-right">Collection</th>
              <th className="cell-right">Cash</th>
              <th className="cell-right">Online/Card</th>
              <th className="cell-right">Expenses</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row, i) => {
              const r = row as unknown as Record<string, unknown>;
              return (
              <tr key={i}>
                <td data-label="Month" className="cell-muted">{String(r['displaydate'] ?? '')}</td>
                <td data-label="New Cases" className="cell-right">{String(r['new_cases'] ?? 0)}</td>
                <td data-label="Followups" className="cell-right">{String(r['followups'] ?? 0)}</td>
                <td data-label="Collection" className="cell-right cell-success">₹{Number(r['collection'] ?? 0).toLocaleString()}</td>
                <td data-label="Cash" className="cell-right">₹{Number(r['cash'] ?? 0).toLocaleString()}</td>
                <td data-label="Online/Card" className="cell-right">₹{((Number(r['online']) || 0) + (Number(r['card']) || 0)).toLocaleString()}</td>
                <td data-label="Expenses" className="cell-right cell-danger">₹{Number(r['expenses'] ?? 0).toLocaleString()}</td>
              </tr>
              );
            })}
            {(!data || data.length === 0) && (
              <tr><td colSpan={7} className="cell-center cell-muted">No data found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthWiseDueTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const year = new Date().getFullYear();
  const { data: summary, isLoading } = useMonthWiseDues(year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const { data: details, isLoading: isDetailsLoading } = useDueDetails(year, selectedMonth ?? 0);

  if (isLoading) return <div className="analytics-loading">Loading dues...</div>;

  return (
    <div className="analytics-dues-layout">
      {/* Month List */}
      <div className="analytics-card analytics-dues-list">
        <div className="analytics-card-header">
          <span className="analytics-card-title">Months ({year})</span>
        </div>
        {(summary ?? []).map((s: any) => (
          <button
            key={String(s.month)}
            className={`analytics-due-month-btn${selectedMonth === s.month ? ' active' : ''}`}
            onClick={() => setSelectedMonth(Number(s.month))}
          >
            <div>
              <span className="analytics-due-patient-name">
                {new Date(year, Number(s.month) - 1).toLocaleString('default', { month: 'long' })}
              </span>
              <span className="analytics-due-patient-meta">{String(s.count)} patients</span>
            </div>
            <span className="analytics-due-amount-value cell-danger">₹{Number(s.total_due ?? 0).toLocaleString()}</span>
          </button>
        ))}
        {(!summary || summary.length === 0) && (
          <div className="analytics-loading">No dues found for {year}</div>
        )}
      </div>

      {/* Detail Panel */}
      <div className="analytics-card analytics-dues-detail">
        <div className="analytics-card-header">
          <span className="analytics-card-title">Patient Demographics &amp; Due Details</span>
          {details && details.length > 0 && (
            <button className="analytics-btn"
              onClick={() => onExport(`Dues_${year}_${selectedMonth}`, ['regid', 'first_name', 'surname', 'mobile1', 'total_charges', 'total_due'], details)}
            >
              <Download size={13} /> Export
            </button>
          )}
        </div>
        <div className="analytics-dues-scroll">
          {isDetailsLoading && <div className="analytics-loading">Loading details...</div>}
          {!selectedMonth && !isDetailsLoading && (
            <div className="analytics-empty-state">
              <CreditCard size={28} />
              <p>Select a month from the left panel to view patient breakdown.</p>
            </div>
          )}
          {details && details.length === 0 && !isDetailsLoading && selectedMonth && (
            <div className="analytics-empty-state">
              <CreditCard size={28} />
              <p>No outstanding dues for this month.</p>
            </div>
          )}
          {(details ?? []).map((d: any) => (
            <div key={String(d.regid)} className="analytics-due-item">
              <div className="analytics-due-patient">
                <div className="analytics-due-patient-name">
                  {String(d.first_name ?? '')} {String(d.surname ?? '')}
                  <span className="analytics-badge analytics-badge-secondary">
                    Reg: {String(d.regid ?? '')}
                  </span>
                </div>
                <div className="analytics-due-patient-meta">
                  {d.mobile1 ? String(d.mobile1) : '—'}
                  {d.city ? ` · ${String(d.city)}` : ''}
                </div>
              </div>
              <div className="analytics-due-amounts">
                <div className="analytics-due-amount-block">
                  <span className="analytics-due-amount-label">Charges</span>
                  <span className="analytics-due-amount-value">₹{Number(d.total_charges ?? 0).toLocaleString()}</span>
                </div>
                <div className="analytics-due-balance-block">
                  <div className="analytics-due-amount-label" style={{ color: 'var(--danger)' }}>Balance</div>
                  <div className="analytics-due-amount-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    ₹{Number(d.total_due ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BirthdaysTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const { data, isLoading } = useBirthdayList();

  if (isLoading) return <div className="analytics-loading">Loading birthdays...</div>;

  const { patients = [], smsSentIds = [] } = data ?? {};

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div>
          <h3 className="analytics-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={16} style={{ color: 'var(--primary)' }} />
            Today&apos;s Birthdays
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            SMS templates for birthdays are processed daily via cron.
          </p>
        </div>
        <button className="analytics-btn"
          onClick={() => onExport('Birthday_List', ['regid', 'first_name', 'surname', 'mobile1', 'date_birth'], patients)}
        >
          <Download size={13} /> Export
        </button>
      </div>
      <div style={{ padding: 'var(--space-4, 16px)' }}>
        {patients.length === 0 ? (
          <div className="analytics-empty-state">
            <Gift size={28} />
            <p>No birthdays found for today.</p>
          </div>
        ) : (
          <div className="analytics-birthday-list">
            {(patients as any[]).map((p) => {
              const smsSent = smsSentIds.includes(Number(p.regid));
              return (
                <div key={String(p.id)} className="analytics-birthday-item">
                  <div className="analytics-birthday-patient">
                    <div className="analytics-birthday-avatar">
                      {String(p.first_name ?? '').charAt(0)}{String(p.surname ?? '').charAt(0)}
                    </div>
                    <div className="analytics-birthday-info">
                      <span className="analytics-birthday-name">
                        {String(p.first_name ?? '')} {String(p.surname ?? '')}
                      </span>
                      <span className="analytics-birthday-phone">{p.mobile1 ? String(p.mobile1) : '—'}</span>
                    </div>
                  </div>
                  <div className="analytics-birthday-meta">
                    <span className="analytics-badge analytics-badge-secondary">
                      {p.date_birth ? new Date(String(p.date_birth)).toLocaleDateString() : '—'}
                    </span>
                    {smsSent
                      ? <span className="analytics-badge analytics-badge-success">SMS Sent</span>
                      : <span className="analytics-badge analytics-badge-warning">SMS Pending</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferencesTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const { data, isLoading } = useReferenceListing();

  if (isLoading) return <div className="analytics-loading">Loading statistics...</div>;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Referral Sources (This Month)</h3>
        <button className="analytics-btn"
          onClick={() => onExport('Referrals', ['reference', 'count', 'totalcollection'], data ?? [])}
        >
          <Download size={13} /> Export
        </button>
      </div>
      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Source / Referral</th>
              <th className="cell-center">Patients Brought</th>
              <th className="cell-right">Revenue Generated</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row: any, i: number) => (
              <tr key={i}>
                <td data-label="Source / Referral" style={{ fontWeight: 500, color: 'var(--text-main)' }}>{String(row.reference ?? '—')}</td>
                <td data-label="Patients Brought" className="cell-center">
                  <span className="analytics-ref-count">{String(row.count ?? 0)}</span>
                </td>
                <td data-label="Revenue Generated" className="cell-right cell-success">
                  ₹{Number(row.totalcollection ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={3} className="cell-center cell-muted">No direct references found this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
