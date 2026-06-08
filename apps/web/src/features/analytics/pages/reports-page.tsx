import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import {
  Download,
  Gift,
  Users,
  Activity,
  CreditCard,
  PieChart,
  MessageCircle,
  Send,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import {
  useCaseMonthWise,
  useMonthWiseDues,
  useDueDetails,
  useBirthdayList,
  useReferenceListing,
} from '../hooks/use-analytics';
import {
  useSmsTemplates,
  useSendWhatsApp,
} from '@/features/communications/hooks/use-communications';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';

export function ReportsPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  const exportToCSV = (filename: string, headers: string[], data: unknown[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map(
            (h) =>
              `"${((row as Record<string, unknown>)[h] ?? '').toString().replace(/"/g, '""')}"`,
          )
          .join(','),
      ),
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
    if (currentPath.includes('/financial'))
      return {
        title: 'Financial Outline',
        icon: <Activity size={24} style={{ color: 'var(--pp-blue)' }} />,
        component: <CaseMonthWiseTab onExport={exportToCSV} />,
      };
    if (currentPath.includes('/dues'))
      return {
        title: 'Outstanding Dues',
        icon: <CreditCard size={24} style={{ color: 'var(--pp-blue)' }} />,
        component: <MonthWiseDueTab onExport={exportToCSV} />,
      };
    if (currentPath.includes('/birthdays'))
      return {
        title: 'Birthday List',
        icon: <Gift size={24} style={{ color: 'var(--pp-blue)' }} />,
        component: <BirthdaysTab onExport={exportToCSV} />,
      };
    if (currentPath.includes('/references'))
      return {
        title: 'Referral Sources',
        icon: <Users size={24} style={{ color: 'var(--pp-blue)' }} />,
        component: <ReferencesTab onExport={exportToCSV} />,
      };
    return {
      title: 'Reports & Analytics',
      icon: <PieChart size={24} style={{ color: 'var(--pp-blue)' }} />,
      component: <CaseMonthWiseTab onExport={exportToCSV} />,
    };
  };

  const { title, icon, component } = getPageInfo();

  return (
    <div className="pp-page-container plat-page animate-fade-in">
      {/* Header */}
      <div className="plat-header">
        <div className="plat-header-left">
          <h1 className="plat-header-title">
            {icon}
            {title}
          </h1>
          <p className="plat-header-sub">
            Exportable records for clinical performance, financial tracking, and patient
            demographics.
          </p>
        </div>
      </div>

      {/* Report Content */}
      <div className="animate-fade-in">{component}</div>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────────────

function CaseMonthWiseTab({
  onExport,
}: {
  onExport: (filename: string, headers: string[], data: unknown[]) => void;
}) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  if (isLoading)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-box" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
        <TableSkeleton rows={10} columns={5} />
      </div>
    );

  const paginatedData = (data ?? []).slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableSkeleton rows={10} columns={13} />
    </div>
  );

  const columns = [
    'Date', 'No. of Cases', 'No. of Followup', 'Total Collection',
    'Cash', 'Cheque', 'Online', 'Product Charges', 'Card', 'Referral/Coupon',
    'Total Expenses', 'Total Cash Deposit', 'Total Bank Deposit', 'Cash in Hand'
  ];
  const fields = [
    'displaydate', 'new_cases', 'followups', 'collection',
    'cash', 'cheque', 'online', 'product_charges', 'card', 'coupon',
    'expenses', 'cash_deposit', 'bank_deposit', 'cash_in_hand'
  ];

  return (
    <div className="plat-card">
      {selectedProductMonth && (
        <ProductPaymentModal
          monthKey={selectedProductMonth}
          onClose={() => setSelectedProductMonth(null)}
        />
      )}
      <div className="plat-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="plat-filters" style={{ marginBottom: 0 }}>
          <div className="plat-form-group" style={{ minHeight: 'auto' }}>
            <label className="plat-form-label">From Date</label>
            <input
              type="month"
              className="plat-filter-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>
          <div className="plat-form-group" style={{ minHeight: 'auto' }}>
            <label className="plat-form-label">To Date</label>
            <input
              type="month"
              className="plat-filter-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>
          <button className="plat-btn plat-btn-primary" onClick={handleSubmit} style={{ alignSelf: 'flex-end' }}>
            Submit
          </button>
        </div>
        <button
          className="plat-btn plat-btn-sm"
          onClick={() =>
            onExport(
              'MonthWise_Financial',
              [
                'displaydate',
                'new_cases',
                'followups',
                'collection',
                'cash',
                'card',
                'online',
                'expenses',
              ],
              data ?? [],
            )
          }
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="plat-table-container">
        <table className="plat-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={{ textAlign: 'center' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => {
              const r = row as unknown as Record<string, unknown>;
              const cashInHand = Number(r['cash_in_hand'] ?? 0);
              const productCharges = Number(r['product_charges'] ?? 0);

              // We need the raw year/month key, which is usually displaydate if formatted as "Mon YYYY"
              // However, since it might be "Jan 2026", we convert it back to "2026-01" for the API
              // Assuming displaydate comes as "Jan 2026" or similar, we can map it to YYYY-MM
              let monthKey = '';
              const dateStr = String(r['displaydate'] ?? '');
              const parts = dateStr.split('-'); // legacy format was "Jan-2025" or similar
              if (parts.length === 2) {
                const monthMap: Record<string, string> = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
                const m = (parts[0] ? monthMap[parts[0]] : undefined) || '01';
                monthKey = `${parts[1]}-${m}`;
              } else {
                monthKey = dateStr; // fallback
              }

              return (
                <tr key={i} className="plat-table-row">
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--pp-blue)' }}>
                    {dateStr}
                  </td>
                  <td data-label="CASE LOAD" style={{ textAlign: 'right' }}>
                    <div className="plat-cell-val">
                      <div style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>
                        {String(r['new_cases'] ?? 0)} New
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)' }}>
                        {String(r['followups'] ?? 0)} Followups
                      </div>
                    </div>
                  </td>
                  <td data-label="COLLECTION" style={{ textAlign: 'right' }}>
                    <div className="plat-cell-val">
                      <div
                        style={{ fontWeight: 900, color: 'var(--pp-success-fg)', fontSize: '1rem' }}
                      >
                        ₹{collection.toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          opacity: 0.6,
                        }}
                      >
                        Cleared
                      </div>
                    </div>
                  </td>
                  <td data-label="CASH/DIGITAL" style={{ textAlign: 'right' }}>
                    <div className="plat-cell-val">
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        ₹{Number(r['cash'] ?? 0).toLocaleString()} (C)
                      </div>
                      <div
                        style={{ fontSize: '0.85rem', color: 'var(--pp-blue)', fontWeight: 600 }}
                      >
                        ₹{((Number(r['online']) || 0) + (Number(r['card']) || 0)).toLocaleString()}{' '}
                        (D)
                      </div>
                    </div>
                  </td>
                  <td data-label="OPERATIONAL" style={{ textAlign: 'right' }}>
                    <div className="plat-cell-val">
                      <div style={{ fontWeight: 800, color: 'var(--pp-danger-fg)' }}>
                        ₹{expenses.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--pp-text-4)' }}>
                        Margin:{' '}
                        {collection > 0
                          ? (((collection - expenses) / collection) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={14}>
                  <EmptyState
                    icon={Activity}
                    title="No financial records found"
                    description={`There are no case or collection records recorded for the year ${currentYear}.`}
                    variant="card"
                    className="my-8"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={page}
        totalPages={Math.ceil((data ?? []).length / itemsPerPage)}
        pageSize={itemsPerPage}
        totalItems={(data ?? []).length}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
      />
    </div>
  );
}

function MonthWiseDueTab({
  onExport,
}: {
  onExport: (filename: string, headers: string[], data: unknown[]) => void;
}) {
  const year = new Date().getFullYear();
  const { data: summary, isLoading } = useMonthWiseDues(year);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) return <TableSkeleton rows={10} columns={10} />;

  const paginatedData = (summary ?? []).slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const openDueWhatsApp = (patient: any) => {
    setDuePatient(patient);
    setDueMessage(
      `Dear ${patient.first_name || ''} ${patient.surname || ''}, you have an outstanding balance of ₹${Number(patient.total_due || 0).toLocaleString()} against your treatment. Please visit us to clear the dues. - MMC`,
    );
    setShowDuesModal(true);
  };

  const columns = [
    'Month', 'Total Dues', 'Informed', 'Cured', 'Left Uncured',
    'Reg only', 'Discontinued', 'Pickup', 'Courier', 'Reserve Medicine'
  ];
  const fields = [
    'month_name', 'total_due', 'informed', 'cured', 'left_uncured',
    'reg_only', 'discontinued', 'pickup', 'courier', 'reserve_medicine'
  ];

  const exportData = (summary ?? []).map(s => ({
    ...s,
    month_name: `${monthNames[Number(s.month) - 1]}-${year}`
  }));

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}
      className="plat-dues-mobile-grid"
    >
      <style>{`
        @media (min-width: 1024px) {
          .plat-dues-mobile-grid { grid-template-columns: 320px 1fr !important; }
        }
      `}</style>

      {/* Month List */}
      <div className="plat-card" style={{ alignSelf: 'start' }}>
        <div className="plat-card-header">
          <h3>Months ({year})</h3>
        </div>
        <div>
          {(summary ?? []).map((s: any) => (
            <button
              key={String(s.month)}
              onClick={() => {
                setSelectedMonth(Number(s.month));
                setPage(1);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '14px 16px',
                background: selectedMonth === s.month ? 'var(--pp-blue-tint)' : 'white',
                border: 'none',
                borderBottom: '1px solid var(--pp-warm-4)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderLeft:
                  selectedMonth === s.month ? '4px solid var(--pp-blue)' : '4px solid transparent',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: selectedMonth === s.month ? 'var(--pp-blue)' : 'var(--pp-ink)',
                  }}
                >
                  {new Date(year, Number(s.month) - 1).toLocaleString('default', { month: 'long' })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>
                  {String(s.count)} patients
                </div>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--pp-danger-fg)', fontSize: '0.9rem' }}>
                ₹{Number(s.total_due ?? 0).toLocaleString()}
              </div>
            </button>
          ))}
          {(!summary || summary.length === 0) && (
            <EmptyState
              icon={CreditCard}
              title="No dues found"
              description={`The clinic accounts are clean for ${year}. No outstanding patient dues were found.`}
              variant="card"
              className="my-4"
            />
          )}
        </div>
        <button
          className="plat-btn plat-btn-sm"
          onClick={() => onExport('Monthly_Dues', fields, exportData)}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Detail Panel */}
      <div className="plat-card">
        <div className="plat-card-header">
          <h3>Patient Dues Breakdown</h3>
          {details && details.length > 0 && (
            <button
              className="plat-btn plat-btn-sm"
              onClick={() =>
                onExport(
                  `Dues_${year}_${selectedMonth}`,
                  ['regid', 'first_name', 'surname', 'mobile1', 'total_charges', 'total_due'],
                  details,
                )
              }
            >
              <Download size={14} /> Export
            </button>
          )}
        </div>
        <div style={{ minHeight: '400px', padding: '16px' }}>
          {isDetailsLoading && <TableSkeleton rows={10} columns={3} />}
          {!selectedMonth && !isDetailsLoading && (
            <EmptyState
              icon={CreditCard}
              title="Select a month"
              description="Choose a month from the left panel to view detailed patient-wise outstanding dues."
              variant="card"
              className="my-8"
            />
          )}
          {details && details.length === 0 && !isDetailsLoading && selectedMonth && (
            <EmptyState
              icon={Activity}
              title="No dues for this month"
              description={`All patient accounts are cleared for ${new Date(year, selectedMonth - 1).toLocaleString('default', { month: 'long' })}.`}
              variant="card"
              className="my-8"
            />
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
            {paginatedDetails.map((d: any) => (
              <div key={String(d.regid)} className="plat-due-item">
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--pp-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {String(d.first_name ?? '')} {String(d.surname ?? '')}
                    <span className="plat-badge plat-badge-default">#{String(d.regid ?? '')}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', marginTop: '4px' }}>
                    {d.mobile1 ? String(d.mobile1) : '—'}
                    {d.city ? ` · ${String(d.city)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: 'var(--pp-text-3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Charges
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      ₹{Number(d.total_charges ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'var(--pp-danger-bg)',
                      borderRadius: '8px',
                      textAlign: 'right',
                      border: '1px solid var(--pp-warm-4)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: 'var(--pp-danger-fg)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Balance Due
                    </div>
                    <div
                      style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-danger-fg)' }}
                    >
                      ₹{Number(d.total_due ?? 0).toLocaleString()}
                    </div>
                  </div>
                  {d.mobile1 && (
                    <button
                      onClick={() => openDueWhatsApp(d)}
                      style={{
                        background: '#25D366',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {details && details.length > itemsPerPage && (
            <div style={{ marginTop: 24 }}>
              <Pagination
                currentPage={page}
                totalPages={Math.ceil((details ?? []).length / itemsPerPage)}
                pageSize={itemsPerPage}
                totalItems={(details ?? []).length}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Due Reminder WhatsApp Modal */}
      {showDuesModal && duePatient && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} style={{ color: '#25D366' }} /> Send Due Reminder
            </h3>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={`#${duePatient.regid} - ${duePatient.first_name || ''} ${duePatient.surname || ''}`}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-warm-1)',
                  fontWeight: 600,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={duePatient.mobile1 || ''}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-warm-1)',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Outstanding Balance
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--pp-danger-bg)',
                  border: '1px solid var(--pp-danger-fg)',
                  borderRadius: 10,
                  fontWeight: 800,
                  color: 'var(--pp-danger-fg)',
                  fontSize: '1.1rem',
                }}
              >
                ₹{Number(duePatient.total_due || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Message
              </label>
              <textarea
                className="comm-form-textarea"
                value={dueMessage}
                onChange={(e) => setDueMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="plat-btn plat-btn-sm" onClick={() => setShowDuesModal(false)}>
                Cancel
              </button>
              <button
                style={{
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
                onClick={sendDueMessage}
                disabled={sendWa.isPending}
              >
                <Send size={12} /> {sendWa.isPending ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((summary ?? []).length / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={(summary ?? []).length}
          onPageChange={setPage}
          onPageSizeChange={() => { }}
        />
      </div>
    </div>
  );
}

function BirthdaysTab({
  onExport,
}: {
  onExport: (filename: string, headers: string[], data: unknown[]) => void;
}) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const { data, isLoading } = useBirthdayList();
  const { data: templates = [] } = useSmsTemplates();
  const { useSendText } = useWhatsApp();
  const sendText = useSendText();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singlePatient, setSinglePatient] = useState<any>(null);
  const [singleMessage, setSingleMessage] = useState('');

  if (isLoading) return <TableSkeleton rows={10} columns={4} />;

  const { patients = [], smsSentIds = [] } = data ?? {};
  const paginatedPatients = patients.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === patients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(patients.map((p: any) => Number(p.id))));
  };

  const openSingleModal = (patient: any) => {
    setSinglePatient(patient);

    setShowSingleModal(true);
  };

  const sendSingle = async () => {
    if (!singlePatient?.mobile1) return;
    const cleaned = String(singlePatient.mobile1).replace(/\D/g, '');
    const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;

    const textMessage = `Dear ${singlePatient.first_name || 'Patient'},\n\nWishing you health, love, wealth, happiness, and just everything your heart desires.\nHappy Birthday!!\n\nRegards,\nMMC HomeoTech`;

    await sendText.mutateAsync({
      phone: finalPhone,
      message: textMessage,
    });
    setShowSingleModal(false);
    alert('WhatsApp message sent!');
  };

  const sendBulk = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const p = patients.find((x: any) => x.id === id);
      if (p?.mobile1) {
        const cleaned = String(p.mobile1).replace(/\D/g, '');
        const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
        try {
          const textMessage = `Dear ${p.first_name || 'Patient'},\n\nWishing you health, love, wealth, happiness, and just everything your heart desires.\nHappy Birthday!!\n\nRegards,\nMMC HomeoTech`;

          await sendText.mutateAsync({
            phone: finalPhone,
            message: textMessage,
          });
        } catch (e) {
          console.error('Failed to send birthday wish', e);
        }
      }
    }
    setShowBulkModal(false);
    setSelectedIds(new Set());
    alert('WhatsApp messages sent!');
  };

  return (
    <div className="plat-card">
      <div className="plat-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gift size={20} style={{ color: 'var(--pp-blue)' }} />
          <h3 className="plat-card-title" style={{ margin: 0 }}>
            Today&apos;s Birthdays
          </h3>
        </div>
        <div className="plat-card-header-actions">
          {selectedIds.size > 0 && (
            <button
              className="plat-btn plat-btn-sm"
              style={{ background: '#25D366', color: 'white', border: 'none' }}
              onClick={() => setShowBulkModal(true)}
            >
              <MessageCircle size={12} /> <span className="hide-mobile">Send</span> (
              {selectedIds.size})
            </button>
          )}
          <button
            className="plat-btn plat-btn-sm"
            onClick={() => setSelectedIds(new Set())}
            title="Clear Selection"
          >
            <X size={14} className="show-mobile" />
            <span className="hide-mobile">Clear</span>
          </button>
          <button className="plat-btn plat-btn-sm" onClick={toggleAll} title="Toggle Select All">
            {selectedIds.size === patients.length && patients.length > 0 ? (
              <CheckSquare size={14} />
            ) : (
              <Square size={14} />
            )}
            <span className="hide-mobile" style={{ marginLeft: 6 }}>
              Select All
            </span>
          </button>
          <button
            className="plat-btn plat-btn-sm"
            onClick={() =>
              onExport(
                'Birthday_List',
                ['regid', 'first_name', 'surname', 'mobile1', 'date_birth'],
                patients,
              )
            }
            title="Export to CSV"
          >
            <Download size={14} /> <span className="hide-mobile">Export CSV</span>
          </button>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {patients.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No birthdays today"
            description="There are no patient birthdays recorded for today. Check back tomorrow to send clinical greetings."
            variant="card"
            className="my-8"
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {(paginatedPatients as any[]).map((p) => {
              const smsSent = smsSentIds.includes(Number(p.regid));
              const isSelected = selectedIds.has(Number(p.id));
              return (
                <div
                  key={String(p.id)}
                  style={{
                    padding: '20px',
                    border: isSelected ? '2px solid var(--pp-blue)' : '1px solid var(--pp-warm-4)',
                    borderRadius: '16px',
                    background: isSelected ? 'var(--pp-blue-tint)' : 'var(--bg-card)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--pp-shadow-sm)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}
                  >
                    <button
                      onClick={() => toggleSelect(Number(p.id))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} style={{ color: 'var(--pp-blue)' }} />
                      ) : (
                        <Square size={16} style={{ color: 'var(--pp-text-3)' }} />
                      )}
                    </button>
                    <div
                      style={{
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
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {String(p.first_name ?? '').charAt(0)}
                      {String(p.surname ?? '').charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: 'var(--pp-ink)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {String(p.first_name ?? '')} {String(p.surname ?? '')}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--pp-text-3)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Activity size={12} style={{ color: 'var(--pp-blue)' }} /> ID #
                        {String(p.regid ?? '')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: smsSent ? 'var(--pp-success-bg)' : 'var(--pp-warm-2)',
                          color: smsSent ? 'var(--pp-success-fg)' : 'var(--pp-text-3)',
                          textTransform: 'uppercase',
                          border:
                            '1px solid ' +
                            (smsSent ? 'var(--pp-success-border)' : 'var(--pp-warm-4)'),
                          marginBottom: 8,
                        }}
                      >
                        {smsSent ? 'Wish Sent' : 'Queued'}
                      </div>
                      <div
                        style={{ fontSize: '0.75rem', color: 'var(--pp-blue)', fontWeight: 800 }}
                      >
                        {p.mobile1 ? String(p.mobile1) : '—'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      width: '100%',
                      justifyContent: 'flex-end',
                      paddingLeft: 28,
                    }}
                  >
                    <button
                      onClick={() => openSingleModal(p)}
                      style={{
                        background: '#25D366',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {patients.length > itemsPerPage && (
          <div style={{ marginTop: 24 }}>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil((patients ?? []).length / itemsPerPage)}
              pageSize={itemsPerPage}
              totalItems={(patients ?? []).length}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* Single WhatsApp Modal */}
      {showSingleModal && singlePatient && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} style={{ color: '#25D366' }} /> Send Birthday Wish
            </h3>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={`#${singlePatient.regid} - ${singlePatient.first_name} ${singlePatient.surname || ''}`}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-warm-1)',
                  fontWeight: 600,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={singlePatient.mobile1 || ''}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-warm-1)',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Template Preview
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-bg-subtle)',
                }}
              >
                Wishing you health, love, wealth, happiness, and just everything your heart desires.
                Happy Birthday !! Regards, MMC HomeoTech
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="plat-btn plat-btn-sm" onClick={() => setShowSingleModal(false)}>
                Cancel
              </button>
              <button
                style={{
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
                onClick={sendSingle}
                disabled={sendText.isPending}
              >
                <Send size={12} /> {sendText.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Modal */}
      {showBulkModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} style={{ color: '#25D366' }} /> Bulk Birthday Wishes (
              {selectedIds.size})
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }}
              >
                Template Preview
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  border: '1.5px solid var(--pp-warm-4)',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  background: 'var(--pp-bg-subtle)',
                }}
              >
                Wishing you health, love, wealth, happiness, and just everything your heart desires.
                Happy Birthday !! Regards, MMC HomeoTech
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="plat-btn plat-btn-sm"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkMessage('');
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
                onClick={sendBulk}
                disabled={sendText.isPending}
              >
                <Send size={12} />{' '}
                {sendText.isPending ? 'Sending...' : `Send to ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferencesTab({
  onExport,
}: {
  onExport: (filename: string, headers: string[], data: unknown[]) => void;
}) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<Date | undefined>(undefined);
  const [appliedTo, setAppliedTo] = useState<Date | undefined>(undefined);

  const handleSubmit = () => {
    setAppliedFrom(fromDate ? new Date(fromDate) : undefined);
    setAppliedTo(toDate ? new Date(toDate) : undefined);
    setPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setPage(1);
  };

  const { data, isLoading } = useReferenceListing(appliedFrom, appliedTo);
  const { data: allReferrals } = useReferrals();
  const [search, setSearch] = useState('');
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const { data: detailsData, isLoading: isDetailsLoading } = useReferenceDetails(selectedRef ?? undefined, appliedFrom, appliedTo);

  const mergedData = useMemo(() => {
    const apiData = data || [];
    const settingsRefs = allReferrals || [];

    const dataMap = new Map();

    // 1. Add API data (which has patient counts and revenue)
    apiData.forEach((row: any) => {
      dataMap.set(String(row.reference ?? 'Direct').toLowerCase(), {
        reference: String(row.reference ?? 'Direct'),
        count: row.count || 0,
        totalcollection: row.totalcollection || 0
      });
    });

    // 2. Add active settings referrals that aren't in the API data yet (0 patients)
    settingsRefs.forEach((r: any) => {
      if (r.isActive && r.name) {
        const key = String(r.name).toLowerCase();
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            reference: r.name,
            count: 0,
            totalcollection: 0
          });
        }
      }
    });

    // 3. Ensure 'Direct' always exists as it's a default
    if (!dataMap.has('direct')) {
      dataMap.set('direct', { reference: 'Direct', count: 0, totalcollection: 0 });
    }

    // 4. Convert back to array and sort (count DESC, then revenue DESC)
    return Array.from(dataMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalcollection - a.totalcollection;
    });
  }, [data, allReferrals]);

  if (isLoading) return <TableSkeleton rows={10} columns={3} />;

  const filteredData = mergedData.filter((row: any) =>
    String(row.reference ?? 'Direct').toLowerCase().includes(search.toLowerCase())
  );
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="plat-card">
      <div className="plat-card-header">
        <h3>Referral Sources & Acquisitions</h3>
        <button
          className="plat-btn plat-btn-sm"
          onClick={() =>
            onExport('Referrals', ['reference', 'count', 'totalcollection'], data ?? [])
          }
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
            {paginatedData.map((row: any, i: number) => (
              <tr key={i} className="plat-table-row">
                <td data-label="SOURCE" style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>
                  <div>{String(row.reference ?? '—')}</div>
                </td>
                <td data-label="PATIENTS" style={{ textAlign: 'center' }}>
                  <div className="plat-cell-val">
                    <span
                      style={{
                        background: 'var(--pp-warm-1)',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {String(row.count ?? 0)}
                    </span>
                  </div>
                </td>
                <td
                  data-label="REVENUE"
                  style={{ textAlign: 'right', fontWeight: 800, color: 'var(--pp-success-fg)' }}
                >
                  <div className="plat-cell-val">
                    ₹{Number(row.totalcollection ?? 0).toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <th style={{ paddingLeft: 24 }}>Source / Referral</th>
                <th style={{ textAlign: 'center' }}>Patients Brought</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Revenue Generated</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row: any, i: number) => (
                <tr key={i} onClick={() => setSelectedRef(String(row.reference ?? 'Direct'))} style={{ cursor: 'pointer' }}>
                  <td data-label="SOURCE" style={{ fontWeight: 700, color: 'var(--pp-ink)', paddingLeft: 24 }}>
                    <div>{String(row.reference ?? '—')}</div>
                  </td>
                  <td data-label="PATIENTS" style={{ textAlign: 'center' }}>
                    <div className="plat-cell-val" style={{ justifyContent: 'center' }}>
                      <span style={{
                        background: 'var(--pp-warm-1)',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {String(row.count ?? 0)}
                      </span>
                    </div>
                  </td>
                  <td data-label="REVENUE" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--pp-success-fg)', paddingRight: 24 }}>
                    <div className="plat-cell-val" style={{ justifyContent: 'flex-end' }}>
                      ₹{Number(row.totalcollection ?? 0).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
              {(!mergedData || mergedData.length === 0) && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      icon={Users}
                      title="No references found"
                      description="No patient acquisitions or referral sources have been recorded in the current dataset."
                      variant="card"
                      className="my-8"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {mergedData.length > itemsPerPage && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(mergedData.length / itemsPerPage)}
            pageSize={itemsPerPage}
            totalItems={mergedData.length}
            onPageChange={setPage}
            onPageSizeChange={() => { }}
          />
        )}

        <Drawer
          isOpen={!!selectedRef}
          onClose={() => setSelectedRef(null)}
          maxWidth="750px"
          title={
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Payment Details</span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                Referral Source: <strong style={{ color: '#3b82f6' }}>{selectedRef}</strong>
              </span>
            </div>
          }
        >
          <div style={{ overflowY: 'auto', flex: 1, padding: '24px', background: 'white' }}>
            {isDetailsLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : (
              <div className="plat-table-container" style={{ margin: 0, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <table className="plat-table">
                  <thead>
                    <tr>
                      <th style={{ background: '#f8fafc' }}>RegID</th>
                      <th style={{ background: '#f8fafc' }}>Date</th>
                      <th style={{ background: '#f8fafc' }}>Patient Name</th>
                      <th style={{ background: '#f8fafc' }}>Payment Method</th>
                      <th style={{ background: '#f8fafc', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsData && detailsData.length > 0 ? detailsData.map((d: any, idx: number) => (
                      <tr key={idx} className="plat-table-row">
                        <td data-label="RegID" style={{ fontWeight: 700, color: '#475569' }}>#{d.regid}</td>
                        <td data-label="Date" style={{ color: '#64748b', fontWeight: 600 }}>
                          {d.date ? format(new Date(d.date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td data-label="Name" style={{ fontWeight: 600, color: '#1e293b' }}>
                          {d.first_name} {d.surname}
                        </td>
                        <td data-label="Payment Method">
                          {d.payment_method ? (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: d.payment_method.toLowerCase() === 'cash' ? '#dcfce7' : '#e0e7ff',
                              color: d.payment_method.toLowerCase() === 'cash' ? '#166534' : '#3730a3',
                              border: `1px solid ${d.payment_method.toLowerCase() === 'cash' ? '#bbf7d0' : '#c7d2fe'}`
                            }}>
                              {d.payment_method}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--pp-success-fg)' }}>
                          ₹{Number(d.amount ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 20px' }}>
                          <EmptyState
                            icon={Users}
                            title="No payments recorded"
                            description={`No payment history found for patients referred via ${selectedRef}.`}
                            variant="default"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Drawer>
      </div>
      {(data ?? []).length > itemsPerPage && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((data ?? []).length / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={(data ?? []).length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      )}
    </div>
  );
}
