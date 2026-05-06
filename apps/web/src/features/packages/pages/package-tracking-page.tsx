import React, { useState } from 'react';
import { Calendar, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Phone, User, MessageCircle, Send, CheckSquare, Square } from 'lucide-react';
import { usePackageExpiryReport } from '../hooks/use-packages';
import { useSendWhatsApp } from '@/features/communications/hooks/use-communications';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { usePagination } from '@/shared/hooks/use-pagination';
import { AssignPackageModal } from '../components/assign-package-modal';
import { EmptyState } from '@/components/shared/empty-state';
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
  const [showAssignModal, setShowAssignModal] = useState(false);

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
  const sendWa = useSendWhatsApp();
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
    if (!smsMessage.trim()) return;
    const ids = Array.from(selectedIds);
    for (const regid of ids) {
      const rec = records.find((r: any) => r.regid === regid);
      if (rec?.phone) {
        await sendWa.mutateAsync({ phone: String(rec.phone), message: smsMessage.replace(/\{#name#\}/gi, `${rec.firstName} ${rec.surname || ''}`) });
      }
    }
    setShowSmsModal(false);
    setSmsMessage('');
    setSelectedIds(new Set());
    alert('WhatsApp messages sent!');
  };

  const sendSingleWhatsApp = (rec: any) => {
    if (!rec.phone) { alert('No phone number available'); return; }
    const msg = `Dear ${rec.firstName} ${rec.surname || ''}, your ${rec.packageName} subscription expires on ${rec.expiryDate}. Please visit us to renew. - Kreed.health`;
    sendWa.mutate({ phone: String(rec.phone), message: msg });
    alert('WhatsApp message sent!');
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
      <div className="pkg-filters">
        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Date Range:</label>
        <input type="date" className="pkg-date-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>to</span>
        <input type="date" className="pkg-date-input" value={toDate} onChange={e => setToDate(e.target.value)} />
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
                      <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                        {selectedIds.size === records.length && records.length > 0 ? <CheckSquare size={16} style={{ color: 'var(--pp-blue)' }} /> : <Square size={16} style={{ color: 'var(--pp-text-3)' }} />}
                      </button>
                    </th>
                    <th>Patient</th>
                    <th>Package Plan</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r: any, i: number) => (
                    <tr key={i} className="hover-row" style={{ cursor: 'pointer', background: selectedIds.has(Number(r.regid)) ? 'var(--pp-blue-tint)' : undefined }} onClick={() => setSelectedRecord(r)}>
                      <td data-label="SELECT" onClick={(e) => { e.stopPropagation(); toggleSelect(Number(r.regid)); }}>
                        <div className="flex justify-end md:justify-start">
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {selectedIds.has(Number(r.regid)) ? <CheckSquare size={16} style={{ color: 'var(--pp-blue)' }} /> : <Square size={16} style={{ color: 'var(--pp-text-3)' }} />}
                          </button>
                        </div>
                      </td>
                      <td data-label="PATIENT" className="pkg-patient-cell">
                        <div className="pkg-avatar-sm" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                          {(r.firstName?.[0] ?? '?')}{r.surname?.[0] ?? ''}
                        </div>
                        <div className="flex flex-col items-end md:items-start text-right md:text-left">
                          <div className="pkg-patient-name" style={{ fontWeight: 700 }}>{r.firstName} {r.surname}</div>
                          {r.phone && (
                            <div className="pkg-patient-phone" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={10} strokeWidth={1.6} /> {r.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="PACKAGE" className="pkg-plan-cell">
                        <div className="flex flex-col items-end md:items-start text-right md:text-left">
                          <div className="pkg-plan-val" style={{ fontWeight: 600 }}>{r.packageName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹{r.packagePrice?.toLocaleString()}</div>
                        </div>
                      </td>
                      <td data-label="START" style={{ fontSize: '0.82rem' }}>{r.startDate}</td>
                      <td data-label="EXPIRY" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pp-ink)' }}>{r.expiryDate}</td>
                      <td data-label="DAYS" className="pkg-days-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: r.daysRemaining < 0 ? 'var(--danger)' : r.daysRemaining <= 7 ? '#D97706' : 'var(--success)' }}>
                          <Clock size={12} strokeWidth={1.6} />
                          {getDaysLabel(r.daysRemaining)}
                        </div>
                      </td>
                      <td data-label="STATUS" className="pkg-status-cell">
                        <span className={`pkg-expiry-badge ${getStatusBadgeClass(r.status)}`}>
                          {getStatusIcon(r.status)} {r.status}
                        </span>
                      </td>
                      <td data-label="ACTION" className="pkg-actions-cell">
                        <div className="flex gap-2 w-full justify-end">
                           <button
                             className="pkg-action-btn wa"
                             title="Send WhatsApp"
                             onClick={(e) => { e.stopPropagation(); sendSingleWhatsApp(r); }}
                             style={{ background: '#25D366', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                             <MessageCircle size={14} color="white" />
                           </button>
                           <button
                             className="pkg-action-btn"
                             title="Renew Package"
                             onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); setShowAssignModal(true); }}
                             style={{ background: 'var(--primary)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                             <RefreshCw size={14} color="white" />
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

              <div className="drawer-grid-2">
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
                    {getStatusIcon(selectedRecord.status)} {selectedRecord.status}
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
            </div>

            <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '32px', borderTop: '1px solid var(--pp-warm-4)', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button className="pp-btn pp-btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
              <button 
                className="pp-btn pp-btn-primary" 
                style={{ background: 'var(--pp-blue)', position: 'relative', minWidth: 120 }} 
                onClick={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : 'Update Status'}
              </button>
              <button className="pp-btn pp-btn-primary" onClick={() => window.location.href=`/patients/${selectedRecord.patientId}`}>
                <User size={14} /> Profile
              </button>
              <button className="pp-btn pp-btn-primary" style={{ background: '#059669' }} onClick={() => setShowAssignModal(true)}>
                <RefreshCw size={14} /> Renew Package
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Renew Modal */}
      {showAssignModal && selectedRecord && (
        <AssignPackageModal
          regid={Number(selectedRecord.regid)}
          patientId={Number(selectedRecord.patientId)}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
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
              <textarea
                className="comm-form-textarea"
                placeholder="Dear {#name#}, your package is expiring..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--pp-warm-4)', borderRadius: 10, fontSize: '0.85rem', resize: 'vertical' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', marginTop: 4 }}>{'Use {#name#} for patient name'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="pp-btn pp-btn-secondary" onClick={() => { setShowSmsModal(false); setSmsMessage(''); }}>Cancel</button>
              <button className="pp-btn" style={{ background: '#25D366', color: 'white' }} onClick={sendBulkWhatsApp} disabled={sendWa.isPending}>
                <Send size={14} /> {sendWa.isPending ? 'Sending...' : 'Send All'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
