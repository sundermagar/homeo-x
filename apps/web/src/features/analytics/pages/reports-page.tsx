import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { Download, Gift, Users, Activity, CreditCard, PieChart, MessageCircle, Send, CheckSquare, Square, X, Search, Filter, Info } from 'lucide-react';
import {
  useCaseMonthWise,
  useMonthWiseDues,
  useDueDetails,
  useBirthdayList,
  useReferenceListing,
  useReferenceDetails,
  useProductDetails
} from '../hooks/use-analytics';
import { useReferrals, useCallStatuses } from '../../settings/hooks/use-settings';
import { useSmsTemplates, useSendWhatsApp } from '@/features/communications/hooks/use-communications';
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
    if (currentPath.includes('/monthly-report')) return { title: 'Monthly Report', icon: <Activity size={24} style={{ color: 'var(--pp-blue)' }} />, component: <CaseMonthWiseTab onExport={exportToCSV} /> };
    if (currentPath.includes('/monthly-dues')) return { title: 'Monthly Dues', icon: <CreditCard size={24} style={{ color: 'var(--pp-blue)' }} />, component: <MonthWiseDueTab onExport={exportToCSV} /> };
    if (currentPath.includes('/birthdays')) return { title: 'Birthday List', icon: <Gift size={24} style={{ color: 'var(--pp-blue)' }} />, component: <BirthdaysTab onExport={exportToCSV} /> };
    if (currentPath.includes('/references')) return { title: 'Referral Sources', icon: <Users size={24} style={{ color: 'var(--pp-blue)' }} />, component: <ReferencesTab onExport={exportToCSV} /> };
    return { title: 'Reports & Analytics', icon: <PieChart size={24} style={{ color: 'var(--pp-blue)' }} />, component: <CaseMonthWiseTab onExport={exportToCSV} /> };
  };

  const { title, icon, component } = getPageInfo();

  return (
    <div className="pp-page-container plat-page animate-fade-in">
      {/* Header */}
      <div className="pp-page-hero">
        <div className="plat-header-left">
          <h1 className="pp-page-hero-title">
            {icon}
            {title}
          </h1>
          <p className="pp-page-hero-sub">Exportable records for clinical performance, financial tracking, and patient demographics.</p>
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
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12`);
  const [submittedRange, setSubmittedRange] = useState({ from: `${currentYear}-01`, to: `${currentYear}-12` });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const { data, isLoading } = useCaseMonthWise(submittedRange.from, submittedRange.to);

  const handleSubmit = () => {
    setSubmittedRange({ from: fromDate, to: toDate });
    setPage(1);
  };

  const [selectedProductMonth, setSelectedProductMonth] = useState<string | null>(null);

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
          onClick={() => onExport('Monthly_Report', fields, data ?? [])}
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
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {String(r['new_cases'] ?? 0)}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {String(r['followups'] ?? 0)}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--pp-success-fg)' }}>
                    {(Number(r['collection'] ?? 0) - productCharges).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['cash'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['cheque'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['online'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {productCharges.toLocaleString('en-IN')}
                      {productCharges > 0 && (
                        <button
                          className="plat-btn-ghost plat-btn-icon"
                          style={{ width: '20px', height: '20px', color: 'var(--pp-blue)' }}
                          onClick={() => setSelectedProductMonth(monthKey)}
                          title="View Product Details"
                        >
                          <Info size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['card'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['coupon'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--pp-danger-fg)' }}>
                    {Number(r['expenses'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['cash_deposit'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {Number(r['bank_deposit'] ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="plat-mono-data" style={{ textAlign: 'center', fontWeight: 700, color: cashInHand < 0 ? 'var(--pp-danger-fg)' : 'var(--pp-ink)' }}>
                    {cashInHand.toLocaleString('en-IN')}
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
        onPageSizeChange={(sz) => { setItemsPerPage(sz); setPage(1); }}
      />
    </div>
  );
}

function MonthWiseDueTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const year = new Date().getFullYear();
  const { data: summary, isLoading } = useMonthWiseDues(year);
  const { data: callStatuses = [] } = useCallStatuses();
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (isLoading) return <TableSkeleton rows={10} columns={10} />;

  const paginatedData = (summary ?? []).slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const customStatusNames = callStatuses.map((s: any) => s.name);
  const columns = [
    'Month', 'Total Dues', ...customStatusNames, 'Unassigned'
  ];
  const fields = [
    'month_name', 'total_due', ...customStatusNames, 'Unassigned'
  ];

  const exportData = (summary ?? []).map((s: any) => {
    const exportedRow: Record<string, any> = {
      month_name: `${monthNames[Number(s.month) - 1]}-${year}`,
      total_due: s.total_due,
    };
    for (const st of customStatusNames) {
      exportedRow[st] = s.statuses?.[st] ?? 0;
    }
    exportedRow['Unassigned'] = s.statuses?.['Unassigned'] ?? 0;
    return exportedRow;
  });

  return (
    <div className="plat-card animate-fade-in">
      <div className="plat-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CreditCard size={20} style={{ color: 'var(--pp-blue)' }} />
          <h3 className="plat-card-title" style={{ margin: 0 }}>Monthly Dues ({year})</h3>
        </div>
        <button
          className="plat-btn plat-btn-sm"
          onClick={() => onExport('Monthly_Dues', fields, exportData)}
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
              const r = row as any;
              const monthLabel = `${monthNames[Number(r.month) - 1]}-${year}`;
              return (
                <tr key={i} className="plat-table-row">
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--pp-blue)' }}>{monthLabel}</td>
                  <td className="plat-mono-data" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--pp-danger-fg)' }}>
                    {Number(r.total_due ?? 0).toLocaleString('en-IN')}
                  </td>
                  {customStatusNames.map((st: string, idx: number) => (
                    <td key={idx} className="plat-mono-data" style={{ textAlign: 'center' }}>
                      {r.statuses?.[st] ?? 0}
                    </td>
                  ))}
                  <td className="plat-mono-data" style={{ textAlign: 'center' }}>
                    {r.statuses?.['Unassigned'] ?? 0}
                  </td>
                </tr>
              );
            })}
            {(!summary || summary.length === 0) && (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={CreditCard}
                    title="No dues found"
                    description={`The clinic accounts are clean for ${year}.`}
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
        totalPages={Math.ceil((summary ?? []).length / itemsPerPage)}
        pageSize={itemsPerPage}
        totalItems={(summary ?? []).length}
        onPageChange={setPage}
        onPageSizeChange={(sz) => { setItemsPerPage(sz); setPage(1); }}
      />
    </div>
  );
}

function BirthdaysTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
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
      message: textMessage
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
            message: textMessage
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
          <h3 className="plat-card-title" style={{ margin: 0 }}>Today&apos;s Birthdays</h3>
        </div>
        <div className="plat-card-header-actions">
          {selectedIds.size > 0 && (
            <button className="plat-btn plat-btn-sm" style={{ background: '#25D366', color: 'white', border: 'none' }}
              onClick={() => setShowBulkModal(true)}>
              <MessageCircle size={12} /> <span className="hide-mobile">Send</span> ({selectedIds.size})
            </button>
          )}
          <button className="plat-btn plat-btn-sm" onClick={() => setSelectedIds(new Set())} title="Clear Selection">
            <X size={14} className="show-mobile" />
            <span className="hide-mobile">Clear</span>
          </button>
          <button className="plat-btn plat-btn-sm" onClick={toggleAll} title="Toggle Select All">
            {selectedIds.size === patients.length && patients.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
            <span className="hide-mobile" style={{ marginLeft: 6 }}>Select All</span>
          </button>
          <button className="plat-btn plat-btn-sm"
            onClick={() => onExport('Birthday_List', ['regid', 'first_name', 'surname', 'mobile1', 'date_birth'], patients)}
            title="Export to CSV"
          >
            <Download size={14} /> <span className="hide-mobile">Export CSV</span>
          </button>
        </div>
      </div>
      <>
        {patients.length === 0 ? (
          <div style={{ padding: '20px' }}>
            <EmptyState
              icon={Gift}
              title="No birthdays today"
              description="There are no patient birthdays recorded for today. Check back tomorrow to send clinical greetings."
              variant="card"
              className="my-8"
            />
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr style={{ background: 'var(--pp-warm-1)', borderBottom: '1px solid var(--pp-warm-4)' }}>
                  <th style={{ width: 40, textAlign: 'center', padding: '14px 12px' }}>
                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {selectedIds.size === patients.length && patients.length > 0 ? <CheckSquare size={16} style={{ color: 'var(--pp-blue)' }} /> : <Square size={16} style={{ color: 'var(--pp-text-3)' }} />}
                    </button>
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--pp-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient</th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--pp-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reg ID</th>
                  <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--pp-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mobile</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--pp-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--pp-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedPatients as any[]).map((p) => {
                  const smsSent = smsSentIds.includes(Number(p.regid));
                  const isSelected = selectedIds.has(Number(p.id));
                  return (
                    <tr key={String(p.id)} className="plat-table-row" style={{ background: isSelected ? 'var(--pp-blue-tint)' : 'var(--bg-card)', borderBottom: '1px solid var(--pp-warm-4)', transition: 'all 0.2s ease-in-out' }}>
                      <td style={{ textAlign: 'center', padding: '16px 12px' }}>
                        <button onClick={() => toggleSelect(Number(p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected ? <CheckSquare size={16} style={{ color: 'var(--pp-blue)' }} /> : <Square size={16} style={{ color: 'var(--pp-text-3)' }} />}
                        </button>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--pp-blue) 0%, #4F46E5 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            {String(p.first_name ?? '').charAt(0)}{String(p.surname ?? '').charAt(0)}
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--pp-ink)', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                            {String(p.first_name ?? '')} {String(p.surname ?? '')}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--pp-text-2)', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={14} style={{ color: 'var(--pp-blue)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>#{String(p.regid ?? '')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: 700, color: 'var(--pp-ink)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {p.mobile1 ? String(p.mobile1) : '—'}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px',
                          background: smsSent ? 'var(--pp-success-bg)' : '#FFF3E0',
                          color: smsSent ? 'var(--pp-success-fg)' : '#E65100', textTransform: 'uppercase',
                          border: '1px solid ' + (smsSent ? 'var(--pp-success-border)' : '#FFE0B2')
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: smsSent ? 'var(--pp-success-fg)' : '#FF9800' }} />
                          {smsSent ? 'Wish Sent' : 'Queued'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <button onClick={() => openSingleModal(p)}
                          style={{ 
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
                            border: 'none', borderRadius: '8px', padding: '8px 14px', 
                            display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', 
                            color: 'white', fontSize: '0.75rem', fontWeight: 700, 
                            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)', transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.35)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.25)'; }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((patients ?? []).length / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={(patients ?? []).length}
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setItemsPerPage(sz); setPage(1); }}
        />
      </>

      {/* Single WhatsApp Modal */}
      <Drawer
        isOpen={showSingleModal && singlePatient !== null}
        onClose={() => setShowSingleModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={20} style={{ color: '#25D366' }} />
            <span>Send Birthday Wish</span>
          </div>
        }
      >
        {singlePatient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Details</label>
              <input type="text" value={`#${singlePatient.regid} - ${singlePatient.first_name} ${singlePatient.surname || ''}`} readOnly
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.9rem', background: 'var(--pp-warm-1)', fontWeight: 600, color: 'var(--pp-ink)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>WhatsApp Mobile</label>
              <input type="text" value={singlePatient.mobile1 || ''} readOnly
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.9rem', background: 'var(--pp-warm-1)', color: 'var(--pp-ink)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template Preview</label>
              <div style={{ padding: '16px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 12, fontSize: '0.9rem', background: 'var(--pp-bg-subtle)', lineHeight: 1.5, color: 'var(--pp-text-1)' }}>
                Dear {singlePatient.first_name || 'Patient'},<br /><br />
                Wishing you health, love, wealth, happiness, and just everything your heart desires.<br />
                Happy Birthday !!<br /><br />
                Regards,<br />
                MMC HomeoTech
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="plat-btn" onClick={() => setShowSingleModal(false)}>Cancel</button>
              <button 
                style={{ 
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', 
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', 
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' 
                }} 
                onClick={sendSingle} 
                disabled={sendText.isPending}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.25)'; }}
              >
                <Send size={16} /> {sendText.isPending ? 'Sending...' : 'Send WhatsApp Message'}
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Bulk WhatsApp Modal */}
      <Drawer
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={20} style={{ color: '#25D366' }} />
            <span>Bulk Birthday Wishes ({selectedIds.size})</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '16px', background: '#E3F2FD', borderRadius: 12, border: '1px solid #90CAF9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Activity size={16} style={{ color: '#1976D2' }} />
              <span style={{ fontWeight: 700, color: '#1565C0', fontSize: '0.9rem' }}>Sending to {selectedIds.size} patients</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#1976D2', lineHeight: 1.5 }}>
              The system will automatically use each patient's registered mobile number and insert their first name into the template.
            </p>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template Preview</label>
            <div style={{ padding: '16px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 12, fontSize: '0.9rem', background: 'var(--pp-bg-subtle)', lineHeight: 1.5, color: 'var(--pp-text-1)' }}>
              Dear [Patient Name],<br /><br />
              Wishing you health, love, wealth, happiness, and just everything your heart desires.<br />
              Happy Birthday !!<br /><br />
              Regards,<br />
              MMC HomeoTech
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="plat-btn" onClick={() => { setShowBulkModal(false); setBulkMessage(''); }}>Cancel</button>
            <button 
              style={{ 
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', 
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', 
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' 
              }} 
              onClick={sendBulk} 
              disabled={sendText.isPending}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.25)'; }}
            >
              <Send size={16} /> {sendText.isPending ? 'Sending...' : `Send to ${selectedIds.size} Patients`}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function ReferencesTab({ onExport }: { onExport: (filename: string, headers: string[], data: unknown[]) => void }) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    <>
      <div className="pp-filter-card" style={{ marginBottom: 24, marginTop: 24 }}>
        <div className="pp-filter-search-wrap">
          <Search size={14} strokeWidth={1.6} />
          <input
            className="pp-filter-search-input"
            placeholder="Search referral..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="pp-filter-controls">
          <input
            type="date"
            className="pp-input"
            style={{ width: 'auto' }}
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            title="From Date"
          />
          <input
            type="date"
            className="pp-input"
            style={{ width: 'auto' }}
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            title="To Date"
          />
          <button
            className="btn-primary"
            onClick={handleSubmit}
          >
            Submit
          </button>
          <button
            className="btn-secondary"
            onClick={handleClear}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Filter size={13} strokeWidth={1.6} /> Clear
          </button>
          <button
            className="btn-secondary"
            onClick={() => onExport('Referrals', ['reference', 'count', 'totalcollection'], data ?? [])}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} strokeWidth={1.6} /> Export CSV
          </button>
        </div>
      </div>

      <div className="plat-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pp-table-scroll" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
          <table className="pp-table">
            <thead>
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
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(mergedData.length / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={mergedData.length}
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setItemsPerPage(sz); setPage(1); }}
        />

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
    </>
  );
}

function ProductPaymentModal({ monthKey, onClose }: { monthKey: string, onClose: () => void }) {
  const { data, isLoading } = useProductDetails(monthKey);

  if (!monthKey) return null;

  return (
    <Drawer
      isOpen={!!monthKey}
      onClose={onClose}
      title="Product Payment"
      maxWidth="800px"
    >
      <div style={{ padding: '0 0 24px 0' }}>
        {isLoading ? (
          <div style={{ padding: '20px' }}>Loading product details...</div>
        ) : (
          <div className="plat-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th>RegID</th>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Charges Type</th>
                  <th style={{ textAlign: 'center' }}>Price</th>
                  <th style={{ textAlign: 'center' }}>Quantity</th>
                  <th style={{ textAlign: 'center' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row, i) => (
                  <tr key={i} className="plat-table-row">
                    <td className="plat-mono-data">{row.regid}</td>
                    <td className="plat-mono-data">{row.date}</td>
                    <td>{row.first_name} {row.surname}</td>
                    <td>{row.charges_type}</td>
                    <td className="plat-mono-data" style={{ textAlign: 'center' }}>{Number(row.price).toLocaleString('en-IN')}</td>
                    <td className="plat-mono-data" style={{ textAlign: 'center' }}>{row.quantity}</td>
                    <td className="plat-mono-data" style={{ textAlign: 'center', fontWeight: 600 }}>{Number(row.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {(!data || data.length === 0) && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={Activity}
                        title="No product payments found"
                        description={`There are no product charges recorded for ${monthKey}.`}
                        variant="default"
                        className="my-8"
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
  );
}

