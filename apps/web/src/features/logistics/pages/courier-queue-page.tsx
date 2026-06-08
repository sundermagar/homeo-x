import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Search,
  Calendar,
  CheckCircle2,
  MessageCircle,
  Clock,
  History,
  X,
  Send,
  ExternalLink,
  User,
  Hash,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import { NumericInput } from '@/shared/components/NumericInput';
import { EmptyState } from '@/components/shared/empty-state';
import { Drawer } from '@/shared/components/drawer';
import './courier-queue-page.css';

interface CourierEntry {
  id: number;
  caseId: number;
  regid: number | null;
  randId: string;
  currentdate: string;
  remedy: string | null;
  potency: string | null;
  frequency: string | null;
  days: string | null;
  pcd: string | null;
  courier: string | null;
  pickup: number;
  postType: string;
  isAssign: number;
  readType: string;
  createdAt: string | null;
  patientName?: string;
  phone?: string;
}

export function CourierQueuePage() {
  const queryClient = useQueryClient();
  const { useSendText } = useWhatsApp();
  const sendText = useSendText();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [assignModal, setAssignModal] = useState<CourierEntry | null>(null);
  const [messageModal, setMessageModal] = useState<{
    phone: string;
    patientName: string;
    courierCompany: string;
    podNumber: string;
    regid: number;
  } | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    regid: number;
    entries: CourierEntry[];
  } | null>(null);

  // Assign form state
  const [assignPcd, setAssignPcd] = useState('');
  const [assignCourier, setAssignCourier] = useState('');
  const [assignPickup, setAssignPickup] = useState(false);
  const [assignSendWhatsapp, setAssignSendWhatsapp] = useState(true);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['courier-queue', selectedDate, debouncedSearch],
    queryFn: async () => {
      const url = debouncedSearch
        ? `/courier/queue?search=${encodeURIComponent(debouncedSearch)}`
        : `/courier/queue?date=${selectedDate}`;
      const { data } = await apiClient.get(url);
      return data.data as CourierEntry[];
    },
  });

  // Mark all as read on mount
  useEffect(() => {
    apiClient.post('/courier/mark-read').then(() => {
      queryClient.invalidateQueries({ queryKey: ['courier-unread-count'] });
    });
  }, []);

  const assignMutation = useMutation({
    mutationFn: async (input: any) => {
      await apiClient.patch(`/courier/${input.id}/assign`, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courier-queue'] });

      // Auto-send WhatsApp on assign
      if (assignSendWhatsapp && assignModal?.phone && (variables.pcd || variables.pickup)) {
        const phone = assignModal.phone.replace(/\D/g, '');
        const finalPhone = phone.startsWith('91') ? phone : '91' + phone;

        let textMessage = '';
        if (variables.pickup) {
          textMessage = `Dear ${assignModal.patientName || 'Patient'},\n\nYour medicines are ready for pickup at the clinic.\n\nRegards,\nMMC HomeoTech`;
        } else {
          textMessage = `Dear ${assignModal.patientName || 'Patient'},\n\nYour medicines have been dispatched via *${variables.courier || 'DTDC'}* and the POD number is *${variables.pcd || 'N/A'}*.\n\nFor tracking, log on to the courier tracking website.\n\nRegards,\nMMC HomeoTech`;
        }

        sendText
          .mutate({
            phone: finalPhone,
            message: textMessage,
          })
          .catch((err) => console.error('Auto WhatsApp failed', err));
      }

      setAssignModal(null);
      setAssignPcd('');
      setAssignCourier('');
      setAssignPickup(false);
    },
  });

  const handleAssign = () => {
    if (!assignModal) return;
    assignMutation.mutate({
      id: assignModal.id,
      pcd: assignPcd || undefined,
      courier: assignCourier || undefined,
      pickup: assignPickup ? 1 : 0,
    });
  };

  const handleOpenMessage = (entry: CourierEntry) => {
    setMessageModal({
      phone: entry.phone || '',
      regid: entry.caseId,
      patientName: entry.patientName || '',
      courierCompany: entry.courier || '',
      podNumber: entry.pcd || '',
    });
  };

  const handleOpenHistory = async (regid: number) => {
    try {
      const { data } = await apiClient.get(`/courier/patient/${regid}`);
      setHistoryModal({ regid, entries: data.data });
    } catch {
      setHistoryModal({ regid, entries: [] });
    }
  };

  const handleSendWhatsApp = () => {
    if (!messageModal) return;
    const phone = messageModal.phone.replace(/\D/g, '');
    const finalPhone = phone.startsWith('91') ? phone : '91' + phone;

    const textMessage = `Dear ${messageModal.patientName || 'Patient'},\n\nYour medicines have been dispatched via *${messageModal.courierCompany || 'DTDC'}* and the POD number is *${messageModal.podNumber || 'N/A'}*.\n\nFor tracking, log on to the courier tracking website.\n\nRegards,\nMMC HomeoTech`;

    sendText.mutate(
      {
        phone: finalPhone,
        message: textMessage,
      },
      {
        onSuccess: () => {
          setMessageModal(null);
          alert('✅ Courier dispatch WhatsApp sent successfully!');
        },
        onError: (err: any) => {
          alert('❌ Failed to send: ' + (err.response?.data?.message || err.message));
        },
      },
    );
  };

  const filteredQueue = queue.filter((e) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(s) ||
      String(e.caseId).includes(s) ||
      e.remedy?.toLowerCase().includes(s)
    );
  });

  const pendingCount = queue.filter((e) => e.isAssign === 0).length;
  const assignedCount = queue.filter((e) => e.isAssign === 1).length;

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Truck size={22} strokeWidth={1.8} />
            Dispatch Queue
          </h1>
          <p className="pp-page-hero-sub">Manage medicine dispatch and patient pickups</p>
        </div>
        <div className="pp-page-hero-actions" style={{ display: 'flex', gap: '16px' }}>
          <div className="appt-stat-card" style={{ padding: '8px 12px', background: 'var(--pp-warning-bg)', border: 'none', minWidth: 'auto' }}>
            <div className="appt-stat-icon-wrap" style={{ width: 24, height: 24, background: 'rgba(0,0,0,0.1)', color: 'var(--pp-warning-fg)' }}>
              <Clock size={12} />
            </div>
            <div>
              <div className="appt-stat-value" style={{ fontSize: '14px', color: 'var(--pp-warning-fg)' }}>{pendingCount} Pending</div>
            </div>
          </div>
          <div className="appt-stat-card" style={{ padding: '8px 12px', background: 'var(--pp-success-bg)', border: 'none', minWidth: 'auto' }}>
            <div className="appt-stat-icon-wrap" style={{ width: 24, height: 24, background: 'rgba(0,0,0,0.1)', color: 'var(--pp-success-fg)' }}>
              <CheckCircle2 size={12} />
            </div>
            <div>
              <div className="appt-stat-value" style={{ fontSize: '14px', color: 'var(--pp-success-fg)' }}>{assignedCount} Assigned</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Controls */}
        <div className="pp-filter-card" style={{ marginBottom: '24px' }}>
          <div className="pp-filter-search-wrap">
            <Search size={14} strokeWidth={1.6} />
            <input
              type="text"
              className="pp-filter-search-input"
              placeholder="Search by name, regid, or remedy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} strokeWidth={1.6} className="text-secondary" />
            <input
              type="date"
              className="pp-input"
              style={{ width: 'auto' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Queue Content */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : filteredQueue.length === 0 ? (
          <div className="courier-empty">
            <Package size={48} />
            <h3>No entries for this date</h3>
            <p>
              No dispatch entries found for{' '}
              {new Date(selectedDate as string).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        ) : (
          <>
            <div className="appt-card">
              <div className="pp-table-scroll">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>RegID</th>
                      <th>Patient Name</th>
                      <th>Remedy</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>POD</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((entry) => (
                        <tr key={entry.id} className={entry.isAssign === 1 ? 'assigned-row' : ''}>
                          <td>
                            <span className="regid-badge">#{entry.caseId}</span>
                          </td>
                          <td>
                            <div className="patient-cell">
                              <User size={14} />
                              <span>{entry.patientName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="remedy-cell">
                              {entry.remedy && <span className="remedy-tag">{entry.remedy}</span>}
                              {entry.potency && (
                                <span className="potency-tag">{entry.potency}</span>
                              )}
                              {entry.days && <span className="days-tag">{entry.days}d</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`type-badge type-${entry.postType.toLowerCase()}`}>
                              {entry.postType === 'Courier' ? (
                                <Truck size={12} />
                              ) : (
                                <MapPin size={12} />
                              )}
                              {entry.postType}
                            </span>
                          </td>
                          <td>
                            {entry.isAssign === 1 ? (
                              <span className="status-badge status-assigned">
                                <CheckCircle2 size={12} /> Assigned
                              </span>
                            ) : (
                              <span className="status-badge status-pending">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                          </td>
                          <td>
                            {entry.pcd ? (
                              <span className="pcd-value">{entry.pcd}</span>
                            ) : (
                              <span className="pcd-empty">—</span>
                            )}
                          </td>
                          <td>
                            <span className="date-cell">
                              {entry.createdAt
                                ? new Date(entry.createdAt as string).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : entry.currentdate}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              {entry.isAssign === 0 ? (
                                <button
                                  className="action-btn action-assign"
                                  onClick={() => {
                                    setAssignModal(entry);
                                    setAssignPcd('');
                                    setAssignCourier('');
                                    setAssignPickup(false);
                                  }}
                                >
                                  Assign
                                </button>
                              ) : (
                                <button
                                  className="action-btn action-message"
                                  onClick={() => handleOpenMessage(entry)}
                                >
                                  <MessageCircle size={12} /> Message
                                </button>
                              )}
                              <button
                                className="action-btn action-history"
                                onClick={() => handleOpenHistory(entry.caseId)}
                              >
                                <History size={12} /> Previous
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              totalItems={filteredQueue.length}
              currentPage={currentPage}
              pageSize={itemsPerPage}
              totalPages={Math.ceil(filteredQueue.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </>
        )}
      </div>

      {/* ─── Assign Drawer ─── */}
      {assignModal && (
        <div className="courier-modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="courier-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="courier-modal-header">
              <h3>
                {assignModal.postType === 'Courier' ? (
                  <>
                    <Truck size={20} /> Assign Dispatch Details
                  </>
                ) : (
                  <>
                    <MapPin size={20} /> Confirm Pickup
                  </>
                )}
              </h3>
              <button onClick={() => setAssignModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="courier-modal-body">
              <div className="modal-patient-info">
                <span className="modal-label">Patient:</span>
                <span className="modal-value">
                  {assignModal.patientName || 'Unknown'} (#{assignModal.caseId})
                </span>
              </div>
              {assignModal.remedy && (
                <div className="modal-patient-info">
                  <span className="modal-label">Remedy:</span>
                  <span className="modal-value">
                    {assignModal.remedy} {assignModal.potency} — {assignModal.days} days
                  </span>
                </div>
              )}

              {assignModal.postType === 'Courier' ? (
                <>
                  <div className="modal-field">
                    <label>
                      POD (Tracking Number) <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter POD / Tracking Number"
                      value={assignPcd}
                      onChange={(e) => setAssignPcd(e.target.value)}
                      className="modal-input"
                      autoFocus
                    />
                  </div>
                  <div className="modal-field">
                    <label>
                      Courier Company <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DTDC, BlueDart, Delhivery"
                      value={assignCourier}
                      onChange={(e) => setAssignCourier(e.target.value)}
                      className="modal-input"
                    />
                  </div>
                </>
              ) : (
                <div className="modal-field">
                  <label className="pickup-checkbox">
                    <input
                      type="checkbox"
                      checked={assignPickup}
                      onChange={(e) => setAssignPickup(e.target.checked)}
                    />
                    <span>Medicine Picked up by {assignModal.patientName || 'Patient'}</span>
                  </label>
                </div>
              )}

              <div
                style={{
                  marginTop: '32px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px dashed rgba(59, 130, 246, 0.2)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Note:</strong> Once assigned, you can send a WhatsApp notification to the
                  patient with these details.
                </p>
              </div>
            </div>
            <div className="courier-modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setAssignModal(null)}>
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleAssign}
                disabled={
                  assignMutation.isPending ||
                  (assignModal.postType === 'Courier' && (!assignPcd || !assignCourier))
                }
              >
                {assignMutation.isPending ? 'Saving...' : 'Save & Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Message Modal ─── */}
      {messageModal && (
        <div
          className="courier-modal-overlay courier-modal-center"
          onClick={() => setMessageModal(null)}
        >
          <div className="courier-modal" onClick={(e) => e.stopPropagation()}>
            <div className="courier-modal-header">
              <h3>
                <MessageCircle size={18} /> Send WhatsApp Message
              </h3>
              <button onClick={() => setMessageModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="courier-modal-body">
              <div className="modal-field">
                <label>Mobile Number</label>
                <NumericInput
                  name="mobile"
                  value={messageModal.phone}
                  onChange={(e) => setMessageModal({ ...messageModal, phone: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label>Patient Name (Variable 1)</label>
                <input
                  type="text"
                  value={messageModal.patientName}
                  onChange={(e) =>
                    setMessageModal({ ...messageModal, patientName: e.target.value })
                  }
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label>Courier Company (Variable 2)</label>
                <input
                  type="text"
                  value={messageModal.courierCompany}
                  onChange={(e) =>
                    setMessageModal({ ...messageModal, courierCompany: e.target.value })
                  }
                  className="modal-input"
                  placeholder="e.g. DTDC"
                />
              </div>
              <div className="modal-field">
                <label>POD Number (Variable 3)</label>
                <input
                  type="text"
                  value={messageModal.podNumber}
                  onChange={(e) => setMessageModal({ ...messageModal, podNumber: e.target.value })}
                  className="modal-input"
                  placeholder="Tracking Number"
                />
              </div>
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--pp-bg-subtle)',
                  border: '1px solid var(--pp-border)',
                }}
              >
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>Template Preview:</strong> Dear{' '}
                  <strong>{messageModal.patientName || '{name}'}</strong> Your medicines has been
                  dispatched via <strong>{messageModal.courierCompany || '{courier}'}</strong> and
                  the POD number is <strong>{messageModal.podNumber || '{pod}'}</strong> For
                  tracking log on www.dtdc.com Regards MMC HomeoTech
                </p>
              </div>
            </div>
            <div className="courier-modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setMessageModal(null)}>
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-whatsapp"
                onClick={handleSendWhatsApp}
                disabled={sendText.isPending}
              >
                <Send size={14} /> {sendText.isPending ? 'Sending...' : 'Send via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Modal ─── */}
      {historyModal && (
        <div
          className="courier-modal-overlay courier-modal-center"
          onClick={() => setHistoryModal(null)}
        >
          <div className="courier-modal courier-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="courier-modal-header">
              <h3>
                <History size={18} /> Previous Dispatch Records — #{historyModal.regid}
              </h3>
              <button onClick={() => setHistoryModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="courier-modal-body">
              {historyModal.entries.length === 0 ? (
                <p className="history-empty">No previous courier records found.</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>POD / Tracking</th>
                        <th>Courier Company</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyModal.entries.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {e.createdAt
                              ? new Date(e.createdAt as string).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : e.currentdate}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {e.pcd || '—'}
                            </span>
                          </td>
                          <td>{e.courier || '—'}</td>
                          <td>
                            <span
                              className={`type-badge type-${e.postType.toLowerCase()}`}
                              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                            >
                              {e.postType}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                color: e.isAssign === 1 ? '#22c55e' : 'var(--text-muted)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              {e.isAssign === 1 ? '✓ Assigned' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="courier-modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setHistoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        }
        maxWidth="600px"
      >
        <div style={{ padding: '0', background: 'var(--pp-bg-subtle)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {historyModal?.entries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Package size={32} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p>No previous courier records found.</p>
            </div>
          ) : (
            <div className="appt-card" style={{ margin: '16px', border: '1px solid var(--pp-border)', boxShadow: 'none' }}>
              <div className="pp-table-scroll">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>POD / Tracking</th>
                      <th>Courier</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal?.entries.map((e) => (
                      <tr key={e.id}>
                        <td data-label="Date">
                          <span className="appt-cell-phone">
                            {e.createdAt ? new Date(e.createdAt as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : e.currentdate}
                          </span>
                        </td>
                        <td data-label="POD / Tracking">
                          <span className="appt-cell-phone font-mono">{e.pcd || '—'}</span>
                        </td>
                        <td data-label="Courier">
                          <span className="text-secondary" style={{ fontSize: '13px' }}>{e.courier || '—'}</span>
                        </td>
                        <td data-label="Type">
                          <span className={`appt-badge ${e.postType === 'Courier' ? 'appt-badge-wait' : 'appt-badge-done'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {e.postType}
                          </span>
                        </td>
                        <td data-label="Status">
                          {e.isAssign === 1 ? (
                            <span className="appt-badge appt-badge-done" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              ✓ Assigned
                            </span>
                          ) : (
                            <span className="appt-badge appt-badge-wait" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
