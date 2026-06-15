import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Phone, User, MessageCircle, Send, CheckSquare, Square, MessageSquare, ChevronRight, Download, Printer, Eye, Zap } from 'lucide-react';
import { usePackageExpiryReport } from '../hooks/use-packages';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import { toast } from '@/hooks/use-toast';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { usePagination } from '@/shared/hooks/use-pagination';
import { AssignPackageModal } from '../components/assign-package-modal';
import { EmptyState } from '@/components/shared/empty-state';
import { usePackageHistory } from '@/features/medical-case/hooks/use-medical-cases';
import '../styles/packages.css';
import '@/features/medical-case/styles/medical-case.css';

function getDaysLabel(days: number) {
  if (days < 0)  return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today!';
  return `${days}d remaining`;
}

function formatStatus(status: string) {
  if (status === 'ExpiringSoon') return 'Expiring Soon';
  return status;
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
  const navigate = useNavigate();
  const today = new Date();
  const defaultFrom = today.toISOString().split('T')[0]!;
  const futureDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const defaultTo = futureDate.toISOString().split('T')[0]!;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate,   setToDate]   = useState(defaultTo);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [statusValue, setStatusValue] = useState('informed');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]!);
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignPkgRecord, setAssignPkgRecord] = useState<any>(null);

  const { data: packageHistory = [], isLoading: isLoadingHistory } = usePackageHistory(Number(selectedRecord?.regid ?? selectedRecord?.patientId ?? 0));

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsUpdating(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedRecord(null);
    }, 2000);
  };

  const { data, isLoading, refetch } = usePackageExpiryReport(fromDate, toDate);
  const { useSendText } = useWhatsApp();
  const sendText = useSendText();
  const records = data?.records ?? [];

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(records);

  const expiring = records.filter((r: any) => r.status === 'ExpiringSoon').length;
  const expired  = records.filter((r: any) => r.status === 'Expired').length;
  const active   = records.filter((r: any) => r.status === 'Active').length;

  const toggleSelect = (regid: number) => {
    const next = new Set(selectedIds);
    if (next.has(regid)) next.delete(regid);
    else next.add(regid);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === records.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(records.map((r: any) => Number(r.regid))));
  };

  const sendBulkWhatsApp = async () => {
    const ids = Array.from(selectedIds);
    let sent = 0, failed = 0;
    for (const regid of ids) {
      const rec = records.find((r: any) => r.regid === regid);
      if (rec?.phone) {
        try {
          const cleaned = String(rec.phone).replace(/\D/g, '');
          const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
          const textMessage = `Dear ${`${rec.firstName} ${rec.surname || ''}`.trim() || 'Patient'},\n\nYour package expires on *${rec.expiryDate || 'soon'}*.\nKindly call on 8727001444 to renew it.\nIgnore if already renewed.\n\nRegards,\nMMC HomeoTech`;
          
          await sendText.mutateAsync({
            phone: finalPhone,
            message: textMessage
          });
          sent++;
        } catch {
          failed++;
        }
      }
    }
    setShowSmsModal(false);
    setSelectedIds(new Set());
    toast({ title: 'WhatsApp Broadcast', description: `Sent: ${sent}, Failed: ${failed}` });
  };

  const sendSingleWhatsApp = (rec: any) => {
    if (!rec.phone) {
      toast({ title: 'No Phone Number', description: 'This patient has no phone number on record.', variant: 'error' });
      return;
    }
    const cleaned = String(rec.phone).replace(/\D/g, '');
    const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    
    const textMessage = `Dear ${`${rec.firstName} ${rec.surname || ''}`.trim() || 'Patient'},\n\nYour package expires on *${rec.expiryDate || 'soon'}*.\nKindly call on 8727001444 to renew it.\nIgnore if already renewed.\n\nRegards,\nMMC HomeoTech`;

    sendText.mutate({
      phone: finalPhone,
      message: textMessage
    }, {
      onSuccess: () => toast({ title: '✅ WhatsApp Sent', description: `Expiry reminder sent to ${rec.firstName}.` }),
      onError: (err: any) => toast({ title: '❌ Send Failed', description: err?.response?.data?.message || err.message, variant: 'error' }),
    });
  };

  const exportToCSV = () => {
    if (!records || records.length === 0) return;
    const headers = ['Reg ID', 'Patient Name', 'Phone', 'Package Plan', 'Price', 'Start Date', 'Expiry Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...records.map((r: any) => [
        r.patientId || r.regid,
        `"${r.firstName || ''} ${r.surname || ''}".trim()`,
        r.phone || '',
        `"${r.packageName || ''}"`,
        r.packagePrice || 0,
        r.startDate ? new Date(r.startDate).toLocaleDateString('en-GB') : '',
        r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-GB') : '',
        r.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Package_Expiry_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    if (!records || records.length === 0) return;
    
    const html = `
      <html>
        <head>
          <title>Package Expiry Tracker Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Package Expiry Tracker (As of ${new Date().toLocaleDateString('en-GB')})</h2>
          <table>
            <thead>
              <tr>
                <th>Reg ID</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Package Plan</th>
                <th>Price</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((r: any) => `
                <tr>
                  <td>#${r.patientId || r.regid}</td>
                  <td>${r.firstName || ''} ${r.surname || ''}</td>
                  <td>${r.phone || 'No Contact'}</td>
                  <td>${r.packageName || '—'}</td>
                  <td>₹${(r.packagePrice || 0).toLocaleString()}</td>
                  <td>${r.startDate ? new Date(r.startDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td>${r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td>${formatStatus(r.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="pp-page-container pkg-page animate-fade-in">
      {/* Header */}
      <header className="pkg-header">
        <div>
          <h1 className="pkg-title">
            <Calendar size={20} strokeWidth={1.6} style={{ color: '#D97706' }} />
            Package Expiry Tracker
          </h1>
          <p className="pkg-subtitle">Monitor subscription validity · Follow up with patients</p>
        </div>
      </header>

      {/* Filters */}
      <div className="pkg-filters" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Date Range:</label>
          <input type="date" className="pkg-date-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>to</span>
          <input type="date" className="pkg-date-input" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="pkg-btn pp-btn-secondary" onClick={exportToCSV} disabled={isLoading || records.length === 0}>
            <Download size={14} /> Export CSV
          </button>
          <button className="pkg-btn pp-btn-secondary" onClick={handlePrint} disabled={isLoading || records.length === 0}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="pkg-filters" style={{ background: 'var(--pp-blue-tint)', border: '1px solid var(--pp-blue)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--pp-blue)' }}>{selectedIds.size} selected</span>
          <button className="pkg-btn" style={{ background: '#25D366', color: 'white', border: 'none' }} onClick={() => setShowSmsModal(true)}>
            <MessageCircle size={14} /> Send WhatsApp
          </button>
          <button className="pkg-btn pp-btn-secondary" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

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
      <div className="pp-card pkg-table-card">
        {isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : records.length === 0 ? (
          <EmptyState 
            icon={Calendar}
            title="No expirations found"
            description={`No subscriptions are set to expire between ${new Date(fromDate).toLocaleDateString()} and ${new Date(toDate).toLocaleDateString()}.`}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
            <div className="pp-table-scroll">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input 
                        type="checkbox" 
                        checked={records.length > 0 && selectedIds.size === records.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Reg ID</th>
                    <th>Patient Details</th>
                    <th>Package Plan</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th className="hide-on-print" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r: any, i: number) => (
                    <tr key={i} className="hover-row" style={{ cursor: 'pointer', background: selectedIds.has(Number(r.regid)) ? 'var(--pp-blue-tint)' : undefined }} onClick={() => setSelectedRecord(r)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(Number(r.regid))}
                          onChange={() => toggleSelect(Number(r.regid))}
                        />
                      </td>
                      <td data-label="Reg ID">
                        <span className="fu-meta-cell">#{r.patientId || r.regid}</span>
                      </td>
                      <td data-label="Patient">
                        <div className="fu-patient-info">
                          <div className="fu-avatar-sm">{(r.firstName?.[0] ?? '?')}</div>
                          <div>
                            <span className="fu-name">{r.firstName} {r.surname}</span>
                            <span className="fu-phone">{r.phone || 'No Contact'}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Package Plan">
                        <div className="flex flex-col items-end md:items-start text-right md:text-left">
                          <div className="pkg-plan-val" style={{ fontWeight: 600 }}>{r.packageName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹{r.packagePrice?.toLocaleString()}</div>
                        </div>
                      </td>
                      <td data-label="Start Date">
                        <div className="flex items-center gap-1.5 fu-meta-cell">
                          {r.startDate ? (
                            <>
                              <Calendar size={14} className="color-muted" />
                              {new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </>
                          ) : '—'}
                        </div>
                      </td>
                      <td data-label="Expiry Date">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 fu-meta-cell">
                            {r.expiryDate ? (
                              <>
                                <Calendar size={14} className="color-muted" />
                                {new Date(r.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </>
                            ) : '—'}
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: r.daysRemaining < 0 ? 'var(--danger)' : r.daysRemaining <= 7 ? '#D97706' : 'var(--success)' }}>
                            {getDaysLabel(r.daysRemaining)}
                          </div>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span className={`pkg-expiry-badge ${getStatusBadgeClass(r.status)}`}>
                          {getStatusIcon(r.status)} {formatStatus(r.status)}
                        </span>
                      </td>
                      <td className="hide-on-print" data-label="Actions" style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-2 fu-action-wrap">
                           <button
                             className="fu-action-btn"
                             title="Send WhatsApp"
                             onClick={(e) => { e.stopPropagation(); sendSingleWhatsApp(r); }}
                             style={{ color: '#25D366', borderColor: '#bbf7d0', background: '#F0FDF4' }}
                           >
                             <MessageCircle size={14} />
                           </button>
                           <button
                             className="fu-action-btn"
                             title="Renew Package"
                             onClick={(e) => { e.stopPropagation(); setAssignPkgRecord(r); }}
                             style={{ background: 'var(--pp-blue)', borderColor: 'var(--pp-blue)', color: 'white' }}
                           >
                             <Zap size={14} />
                           </button>
                           <button
                             className="fu-action-btn"
                             title="View Details"
                             onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); }}
                           >
                             <Eye size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              pageSize={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </>
        )}
      </div>

      <Drawer
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Subscription Details"
        maxWidth="480px"
      >
        {selectedRecord && (
          <div className="pkg-drawer-details">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 20, background: 'var(--pp-warm-1)', borderRadius: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--pp-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                {selectedRecord.firstName?.[0]}{selectedRecord.surname?.[0]}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{selectedRecord.firstName} {selectedRecord.surname}</h3>
                <p style={{ margin: 0, color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>Patient ID: #{selectedRecord.patientId}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section>
                <label className="drawer-label">Active Package</label>
                <div style={{ padding: 16, border: '1.5px solid var(--pp-warm-4)', borderRadius: 12 }}>
                   <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--pp-blue)' }}>{selectedRecord.packageName}</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginTop: 4 }}>Price: ₹{selectedRecord.packagePrice?.toLocaleString()}</div>
                </div>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <section>
                  <label className="drawer-label">Start Date</label>
                  <div style={{ fontWeight: 600 }}>{selectedRecord.startDate}</div>
                </section>
                <section>
                  <label className="drawer-label">Expiry Date</label>
                  <div style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{selectedRecord.expiryDate}</div>
                </section>
              </div>

              <section>
                <label className="drawer-label">Current Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`pkg-expiry-badge ${getStatusBadgeClass(selectedRecord.status)}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    {getStatusIcon(selectedRecord.status)} {formatStatus(selectedRecord.status)}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--pp-text-3)' }}>
                    ({getDaysLabel(selectedRecord.daysRemaining)})
                  </span>
                </div>
              </section>
              <section style={{ marginTop: 12 }}>
                <label className="drawer-label">Contact Information</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--pp-warm-1)', borderRadius: 10 }}>
                  <Phone size={16} color="var(--pp-blue)" />
                  <span style={{ fontWeight: 600 }}>{selectedRecord.phone || 'No phone provided'}</span>
                </div>
              </section>

              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed var(--pp-warm-4)' }} />

              <section>
                <label className="drawer-label">Update Status</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <select value={statusValue} onChange={e => setStatusValue(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.85rem' }}>
                    <option value="">Select Status</option>
                    <option value="informed">Informed</option>
                    <option value="Courier">Courier</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Reserve Medicine">Reserve Medicine</option>
                    <option value="Discontinued">Discontinued</option>
                    <option value="Cured">Cured</option>
                    <option value="Left Uncured">Left Uncured</option>
                    <option value="Reg Only">Reg Only</option>
                  </select>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.85rem' }} />
                  </div>
                  <textarea 
                    placeholder="Add remarks or follow-up notes..." 
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.85rem', minHeight: 80, resize: 'vertical' }}
                  />
                </div>
              </section>

              {showSuccess && (
                <div className="animate-in fade-in slide-in-from-bottom-2" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  Status updated successfully!
                </div>
              )}

              <section style={{ marginTop: 16 }}>
                <label className="drawer-label">Package History</label>
                <div style={{ marginTop: 12, border: '1.5px solid var(--pp-warm-4)', borderRadius: 12, overflow: 'hidden' }}>
                  {isLoadingHistory ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>Loading history...</div>
                  ) : packageHistory.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>No package history found.</div>
                  ) : (
                    <div className="pp-table-scroll" style={{ margin: 0, border: 'none' }}>
                      <table className="pp-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Package Name</th>
                            <th>Start Date</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {packageHistory.map((pkg: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600, color: 'var(--pp-blue)' }}>{pkg.packageName}</td>
                              <td>{pkg.startDate}</td>
                              <td>{pkg.expiryDate}</td>
                              <td>
                                <span className={`pkg-expiry-badge ${getStatusBadgeClass(pkg.status)}`} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6 }}>
                                  {pkg.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '32px', borderTop: '1px solid var(--pp-warm-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <button 
                className="pp-btn pp-btn-primary" 
                style={{ background: 'var(--pp-blue)', position: 'relative' }} 
                onClick={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : 'Update Status'}
              </button>
              <button className="pp-btn pp-btn-primary" onClick={() => navigate(`/medical-cases/${selectedRecord.patientId}`)}>
                <User size={14} /> Profile
              </button>
              <button className="pp-btn pp-btn-primary" style={{ background: '#059669' }} onClick={() => setAssignPkgRecord(selectedRecord)}>
                <Zap size={14} /> Renew Package
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Renew Modal */}
      {assignPkgRecord && (
        <AssignPackageModal
          isOpen={!!assignPkgRecord}
          patientId={Number(assignPkgRecord.regid ?? assignPkgRecord.patientId)}
          onClose={() => setAssignPkgRecord(null)}
          onSuccess={() => {
            setAssignPkgRecord(null);
            refetch();
          }}
        />
      )}

      {/* Bulk SMS Modal */}
      {showSmsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} style={{ color: '#25D366' }} /> Send WhatsApp ({selectedIds.size} patients)
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>Message</label>
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--pp-bg-subtle)', border: '1px solid var(--pp-border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>Template Preview:</strong> Dear <strong>{'{name}'}</strong> Your package expires on <strong>{'{date}'}</strong>. Kindly call on 8727001444 to renew it. Ignore if already renewed. Regards MMC HomeoTech
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="pp-btn pp-btn-secondary" onClick={() => setShowSmsModal(false)}>Cancel</button>
              <button className="pp-btn" style={{ background: '#25D366', color: 'white' }} onClick={sendBulkWhatsApp} disabled={sendText.isPending}>
                <Send size={14} /> {sendText.isPending ? 'Sending...' : 'Send via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
