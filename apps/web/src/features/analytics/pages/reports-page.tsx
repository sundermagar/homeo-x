import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useCaseMonthWise,
  useMonthWiseDues,
  useDueDetails,
  useBirthdayList,
  useReferenceListing
} from '../hooks/use-analytics';
import { Download, Gift, Users, Activity, CreditCard, PieChart } from 'lucide-react';
import '../../platform/styles/platform.css';

export function ReportsPage() {
  const location = useLocation();
  const currentPath = location.pathname;

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

  const getPageInfo = () => {
    if (currentPath.includes('/financial')) return { title: 'Financial Outline', icon: <Activity size={24} style={{ color: 'var(--pp-blue)' }} />, component: <CaseMonthWiseTab onExport={exportToCSV} /> };
    if (currentPath.includes('/dues')) return { title: 'Outstanding Dues', icon: <CreditCard size={24} style={{ color: 'var(--pp-blue)' }} />, component: <MonthWiseDueTab onExport={exportToCSV} /> };
    if (currentPath.includes('/birthdays')) return { title: 'Birthday List', icon: <Gift size={24} style={{ color: 'var(--pp-blue)' }} />, component: <BirthdaysTab onExport={exportToCSV} /> };
    if (currentPath.includes('/references')) return { title: 'Referral Sources', icon: <Users size={24} style={{ color: 'var(--pp-blue)' }} />, component: <ReferencesTab onExport={exportToCSV} /> };
    return { title: 'Reports & Analytics', icon: <PieChart size={24} style={{ color: 'var(--pp-blue)' }} />, component: <CaseMonthWiseTab onExport={exportToCSV} /> };
  };

  const { title, icon, component } = getPageInfo();

  return (
    <div className="plat-page animate-fade-in">
      {/* Header */}
      <div className="plat-header">
        <div className="plat-header-left">
          <h1 className="plat-header-title">
            {icon}
            {title}
          </h1>
          <p className="plat-header-sub">Exportable records for clinical performance, financial tracking, and patient demographics.</p>
        </div>
      </div>

      {/* Report Content */}
      <div className="animate-fade-in">
        {component}
      </div>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────────────

function CaseMonthWiseTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const year = new Date().getFullYear();
  const { data, isLoading } = useCaseMonthWise(`${year}-01`, `${year}-12`);

  if (isLoading) return (
    <div className="plat-empty">
      <div className="plat-empty-text">Loading financial grid...</div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats Summary Overlay */}
      <div className="plat-stats-bar" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16 
      }}>
        <div className="plat-stat-card" style={{ background: 'var(--pp-blue)', color: 'white' }}>
          <div className="plat-stat-label" style={{ opacity: 0.8, color: 'white' }}>Total Annual Revenue</div>
          <div className="plat-stat-value">₹{(data ?? []).reduce((acc, r: any) => acc + (Number(r.collection) || 0), 0).toLocaleString()}</div>
          <div className="plat-stat-footer" style={{ color: 'rgba(255,255,255,0.6)' }}>Current Fiscal Year</div>
        </div>
        <div className="plat-stat-card">
          <div className="plat-stat-label">Total Expenses</div>
          <div className="plat-stat-value" style={{ color: 'var(--pp-danger-fg)' }}>₹{(data ?? []).reduce((acc, r: any) => acc + (Number(r.expenses) || 0), 0).toLocaleString()}</div>
          <div className="plat-stat-footer">Operational Costs</div>
        </div>
        <div className="plat-stat-card">
          <div className="plat-stat-label">Net Operating Profit</div>
          <div className="plat-stat-value" style={{ color: 'var(--pp-success-fg)' }}>
            ₹{(data ?? []).reduce((acc, r: any) => acc + ((Number(r.collection) || 0) - (Number(r.expenses) || 0)), 0).toLocaleString()}
          </div>
          <div className="plat-stat-footer">Growth Indicator</div>
        </div>
      </div>

      <div className="plat-card">
        <div className="plat-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pp-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} style={{ color: 'var(--pp-blue)' }} />
            </div>
            <h3 style={{ margin: 0 }}>Monthly Financial Outline ({year})</h3>
          </div>
          <button
            className="plat-btn plat-btn-sm"
            style={{ borderRadius: 8, fontWeight: 700 }}
            onClick={() => onExport('MonthWise_Financial',
              ['displaydate', 'new_cases', 'followups', 'collection', 'cash', 'card', 'online', 'expenses'],
              data ?? []
            )}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="plat-table-container">
          <table className="plat-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Case Load</th>
                <th style={{ textAlign: 'right' }}>Gross Collection</th>
                <th style={{ textAlign: 'right' }}>Cash / Digital</th>
                <th style={{ textAlign: 'right' }}>Operational Exp.</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row, i) => {
                const r = row as unknown as Record<string, unknown>;
                const collection = Number(r['collection'] ?? 0);
                const expenses = Number(r['expenses'] ?? 0);
                return (
                <tr key={i} className="plat-table-row">
                  <td data-label="Month" style={{ fontWeight: 800, color: 'var(--pp-blue)' }}>{String(r['displaydate'] ?? '')}</td>
                  <td data-label="Case Load" style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{String(r['new_cases'] ?? 0)} New</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)' }}>{String(r['followups'] ?? 0)} Followups</div>
                  </td>
                  <td data-label="Gross Collection" style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: 'var(--pp-success-fg)', fontSize: '1rem' }}>₹{collection.toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Cleared</div>
                  </td>
                  <td data-label="Cash / Digital" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>₹{Number(r['cash'] ?? 0).toLocaleString()} (C)</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--pp-blue)', fontWeight: 600 }}>
                      ₹{((Number(r['online']) || 0) + (Number(r['card']) || 0)).toLocaleString()} (D)
                    </div>
                  </td>
                  <td data-label="Operational Exp." style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--pp-danger-fg)' }}>₹{expenses.toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--pp-text-4)' }}>Margin: {collection > 0 ? (((collection - expenses) / collection) * 100).toFixed(1) : 0}%</div>
                  </td>
                </tr>
                );
              })}
              {(!data || data.length === 0) && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: 'var(--pp-text-3)' }}>No financial records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MonthWiseDueTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const year = new Date().getFullYear();
  const { data: summary, isLoading } = useMonthWiseDues(year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const { data: details, isLoading: isDetailsLoading } = useDueDetails(year, selectedMonth ?? 0);

  if (isLoading) return (
    <div className="plat-empty">
      <div className="plat-empty-text">Loading outstanding dues...</div>
    </div>
  );

  return (
    <div className="plat-dues-grid">
      <style>{`
        .plat-dues-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 1024px) {
          .plat-dues-grid { grid-template-columns: 320px 1fr; }
        }
      `}</style>

      {/* Month List */}
      <div className="plat-card" style={{ alignSelf: 'start' }}>
        <div className="plat-card-header">
          <h3>Months ({year})</h3>
        </div>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {(summary ?? []).map((s: any) => (
            <button
              key={String(s.month)}
              onClick={() => setSelectedMonth(Number(s.month))}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '16px 20px',
                background: selectedMonth === s.month ? 'var(--pp-blue-tint)' : 'var(--bg-card)',
                border: 'none',
                borderBottom: '1px solid var(--pp-warm-4)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                borderLeft: selectedMonth === s.month ? '4px solid var(--pp-blue)' : '4px solid transparent',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 850, color: selectedMonth === s.month ? 'var(--pp-blue)' : 'var(--pp-ink)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {new Date(year, Number(s.month) - 1).toLocaleString('default', { month: 'long' })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 4 }}>
                  <Users size={10} style={{ display: 'inline', marginRight: 4 }} /> {String(s.count)} Active Cases
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 950, color: 'var(--pp-danger-fg)', fontSize: '1rem' }}>₹{Number(s.total_due ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--pp-text-4)', textTransform: 'uppercase' }}>Unpaid</div>
              </div>
            </button>
          ))}
          {(!summary || summary.length === 0) && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--pp-text-3)' }}>No dues found for {year}</div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="plat-card">
        <div className="plat-card-header">
          <h3>Patient Dues Breakdown</h3>
          {details && details.length > 0 && (
            <button className="plat-btn plat-btn-sm"
              onClick={() => onExport(`Dues_${year}_${selectedMonth}`, ['regid', 'first_name', 'surname', 'mobile1', 'total_charges', 'total_due'], details)}
            >
              <Download size={14} /> Export
            </button>
          )}
        </div>
        <div style={{ minHeight: '400px', padding: '16px' }}>
          {isDetailsLoading && (
            <div className="plat-empty">
              <div className="plat-empty-text">Loading patient details...</div>
            </div>
          )}
          {!selectedMonth && !isDetailsLoading && (
            <div className="plat-empty">
              <CreditCard size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div className="plat-empty-text">Select a month from the list to view outstanding patient dues.</div>
            </div>
          )}
          {details && details.length === 0 && !isDetailsLoading && selectedMonth && (
            <div className="plat-empty">
              <Activity size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div className="plat-empty-text">No outstanding dues for this month.</div>
            </div>
          )}
          <div className="plat-dues-list">
            <style>{`
              .plat-dues-list { display: grid; gap: 12px; }
              .plat-due-item { 
                padding: 16px; 
                border: 1px solid var(--pp-warm-4); 
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                background: var(--bg-card);
              }
              @media (min-width: 640px) {
                .plat-due-item { flex-direction: row; justify-content: space-between; align-items: center; }
              }
            `}</style>
            {(details ?? []).map((d: any) => (
              <div key={String(d.regid)} className="plat-due-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--pp-ink)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {String(d.first_name ?? '')} {String(d.surname ?? '')}
                    <span className="plat-badge plat-badge-default">#{String(d.regid ?? '')}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', marginTop: '4px' }}>
                    {d.mobile1 ? String(d.mobile1) : '—'}{d.city ? ` · ${String(d.city)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>Charges</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{Number(d.total_charges ?? 0).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--pp-danger-bg)', borderRadius: '8px', textAlign: 'right', border: '1px solid var(--pp-warm-4)', minWidth: '100px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-danger-fg)', textTransform: 'uppercase' }}>Balance Due</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-danger-fg)' }}>
                      ₹{Number(d.total_due ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BirthdaysTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const { data, isLoading } = useBirthdayList();

  if (isLoading) return (
    <div className="plat-empty">
      <div className="plat-empty-text">Loading birthdays...</div>
    </div>
  );

  const { patients = [], smsSentIds = [] } = data ?? {};

  return (
    <div className="plat-card">
      <div className="plat-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gift size={20} style={{ color: 'var(--pp-blue)' }} />
          <h3>Today&apos;s Birthdays</h3>
        </div>
        <button className="plat-btn plat-btn-sm"
          onClick={() => onExport('Birthday_List', ['regid', 'first_name', 'surname', 'mobile1', 'date_birth'], patients)}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div style={{ padding: '20px' }}>
        {patients.length === 0 ? (
          <div className="plat-empty">
            <Gift size={40} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p>No birthdays found for today.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {(patients as any[]).map((p) => {
              const smsSent = smsSentIds.includes(Number(p.regid));
              return (
                <div key={String(p.id)} style={{ 
                   padding: '20px', 
                   border: '1px solid var(--pp-warm-4)', 
                   borderRadius: '16px',
                   background: 'var(--bg-card)',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   boxShadow: 'var(--pp-shadow-sm)',
                   transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                   cursor: 'default'
                }} className="plat-hover-lift">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, var(--pp-blue) 0%, #4F46E5 100%)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                    }}>
                      {String(p.first_name ?? '').charAt(0)}{String(p.surname ?? '').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--pp-ink)', letterSpacing: '-0.01em' }}>{String(p.first_name ?? '')} {String(p.surname ?? '')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Activity size={12} style={{ color: 'var(--pp-blue)' }} /> ID #{String(p.regid ?? '')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      background: smsSent ? 'var(--pp-success-bg)' : 'var(--pp-warm-2)',
                      color: smsSent ? 'var(--pp-success-fg)' : 'var(--pp-text-3)',
                      textTransform: 'uppercase',
                      border: '1px solid ' + (smsSent ? 'var(--pp-success-border)' : 'var(--pp-warm-4)'),
                      marginBottom: 8
                    }}>
                      {smsSent ? 'Wish Sent' : 'Queued'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pp-blue)', fontWeight: 800 }}>
                      {p.mobile1 ? String(p.mobile1) : '—'}
                    </div>
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

  if (isLoading) return (
    <div className="plat-empty">
      <div className="plat-empty-text">Loading statistics...</div>
    </div>
  );

  return (
    <div className="plat-card">
      <div className="plat-card-header">
        <h3>Referral Sources & Acquisitions</h3>
        <button className="plat-btn plat-btn-sm"
          onClick={() => onExport('Referrals', ['reference', 'count', 'totalcollection'], data ?? [])}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="plat-table-container">
        <table className="plat-table">
          <thead>
            <tr>
              <th>Source / Referral</th>
              <th style={{ textAlign: 'center' }}>Patients Brought</th>
              <th style={{ textAlign: 'right' }}>Revenue Generated</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row: any, i: number) => (
              <tr key={i}>
                <td data-label="Source / Referral" style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{String(row.reference ?? '—')}</td>
                <td data-label="Patients Brought" style={{ textAlign: 'center' }}>
                  <span style={{ 
                    background: 'var(--pp-warm-1)', 
                    padding: '4px 12px', 
                    borderRadius: '100px', 
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {String(row.count ?? 0)}
                  </span>
                </td>
                <td data-label="Revenue Generated" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--pp-success-fg)' }}>
                  ₹{Number(row.totalcollection ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--pp-text-3)' }}>No direct references found this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

