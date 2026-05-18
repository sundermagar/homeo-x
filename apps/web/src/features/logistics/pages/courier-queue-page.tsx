import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, MapPin, Search, Calendar, 
  CheckCircle2, MessageCircle, Clock, History,
  X, Send, ExternalLink, User, Hash
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import { useSendWhatsApp } from '@/features/communications/hooks/use-communications';
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
  const sendWhatsApp = useSendWhatsApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [assignModal, setAssignModal] = useState<CourierEntry | null>(null);
  const [messageModal, setMessageModal] = useState<{ phone: string; message: string; regid: number } | null>(null);
  const [historyModal, setHistoryModal] = useState<{ regid: number; entries: CourierEntry[] } | null>(null);

  // Assign form state
  const [assignPcd, setAssignPcd] = useState('');
  const [assignCourier, setAssignCourier] = useState('');
  const [assignPickup, setAssignPickup] = useState(false);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['courier-queue', selectedDate],
    queryFn: async () => {
      const { data } = await apiClient.get(`/courier/queue?date=${selectedDate}`);
      return data.data as CourierEntry[];
    }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-queue'] });
      setAssignModal(null);
      setAssignPcd('');
      setAssignCourier('');
      setAssignPickup(false);
    }
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

  const handleOpenMessage = async (entry: CourierEntry) => {
    try {
      const { data } = await apiClient.get(`/courier/${entry.id}/sms-detail`);
      setMessageModal(data.data);
    } catch {
      // Fallback
      setMessageModal({
        phone: entry.phone || '',
        regid: entry.caseId,
        message: `Dear ${entry.patientName || 'Patient'}, your medicines have been dispatched via ${entry.courier || 'courier'} and the POD number is ${entry.pcd || 'N/A'}. Regards, Kreed.health`
      });
    }
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
    sendWhatsApp.mutate({ phone: finalPhone, message: messageModal.message }, {
      onSuccess: () => {
        setMessageModal(null);
        alert('WhatsApp message sent directly via Meta Cloud API!');
      },
      onError: (err: any) => {
        alert('Failed to send WhatsApp message: ' + (err.response?.data?.message || err.message));
      }
    });
  };

  const filteredQueue = queue.filter(e => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(s) ||
      String(e.caseId).includes(s) ||
      e.remedy?.toLowerCase().includes(s)
    );
  });

  const pendingCount = queue.filter(e => e.isAssign === 0).length;
  const assignedCount = queue.filter(e => e.isAssign === 1).length;

  return (
    <div className="courier-queue-page">
      {/* Header */}
      <div className="courier-header">
        <div className="courier-header-left">
          <div>
            <h1 className="courier-title">Dispatch Queue</h1>
            <p className="courier-subtitle">Manage medicine dispatch and patient pickups</p>
          </div>
        </div>
        <div className="courier-header-right">
          <div className="courier-stat courier-stat-pending">
            <Clock size={14} />
            <span>{pendingCount} Pending</span>
          </div>
          <div className="courier-stat courier-stat-done">
            <CheckCircle2 size={14} />
            <span>{assignedCount} Assigned</span>
          </div>
        </div>
      </div>

      <div>
        {/* Controls */}
        <div className="courier-controls">
          <div className="courier-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, regid, or remedy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="courier-date-picker">
            <Calendar size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Queue Content */}
        {isLoading ? (
          <div className="courier-table-wrapper">
            <TableSkeleton rows={8} columns={8} />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="courier-empty">
            <Package size={48} />
            <h3>No entries for this date</h3>
            <p>No dispatch entries found for {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        ) : (
          <>
            <div className="courier-table-wrapper">
              <div className="courier-table-scroll">
                <table className="courier-table">
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
                            {entry.potency && <span className="potency-tag">{entry.potency}</span>}
                            {entry.days && <span className="days-tag">{entry.days}d</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`type-badge type-${entry.postType.toLowerCase()}`}>
                            {entry.postType === 'Courier' ? <Truck size={12} /> : <MapPin size={12} />}
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
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : entry.currentdate}
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
                  <><Truck size={20} /> Assign Dispatch Details</>
                ) : (
                  <><MapPin size={20} /> Confirm Pickup</>
                )}
              </h3>
              <button onClick={() => setAssignModal(null)}><X size={18} /></button>
            </div>
            <div className="courier-modal-body">
              <div className="modal-patient-info">
                <span className="modal-label">Patient:</span>
                <span className="modal-value">{assignModal.patientName || 'Unknown'} (#{assignModal.caseId})</span>
              </div>
              {assignModal.remedy && (
                <div className="modal-patient-info">
                  <span className="modal-label">Remedy:</span>
                  <span className="modal-value">{assignModal.remedy} {assignModal.potency} — {assignModal.days} days</span>
                </div>
              )}

              {assignModal.postType === 'Courier' ? (
                <>
                  <div className="modal-field">
                    <label>POD (Tracking Number) <span className="required">*</span></label>
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
                    <label>Courier Company <span className="required">*</span></label>
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
              
              <div style={{ marginTop: '32px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Note:</strong> Once assigned, you can send a WhatsApp notification to the patient with these details.
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
                disabled={assignMutation.isPending || (assignModal.postType === 'Courier' && (!assignPcd || !assignCourier))}
              >
                {assignMutation.isPending ? 'Saving...' : 'Save & Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Message Modal ─── */}
      {messageModal && (
        <div className="courier-modal-overlay courier-modal-center" onClick={() => setMessageModal(null)}>
          <div className="courier-modal" onClick={(e) => e.stopPropagation()}>
            <div className="courier-modal-header">
              <h3><MessageCircle size={18} /> Send WhatsApp Message</h3>
              <button onClick={() => setMessageModal(null)}><X size={18} /></button>
            </div>
            <div className="courier-modal-body">
              <div className="modal-field">
                <label>Mobile Number</label>
                <input
                  type="text"
                  value={messageModal.phone}
                  onChange={(e) => setMessageModal({ ...messageModal, phone: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label>Message Content</label>
                <textarea
                  value={messageModal.message}
                  onChange={(e) => setMessageModal({ ...messageModal, message: e.target.value })}
                  className="modal-textarea"
                  rows={4}
                />
              </div>
            </div>
            <div className="courier-modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setMessageModal(null)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-whatsapp" onClick={handleSendWhatsApp}>
                <Send size={14} /> Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Modal ─── */}
      {historyModal && (
        <div className="courier-modal-overlay courier-modal-center" onClick={() => setHistoryModal(null)}>
          <div className="courier-modal courier-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="courier-modal-header">
              <h3><History size={18} /> Previous Dispatch Records — #{historyModal.regid}</h3>
              <button onClick={() => setHistoryModal(null)}><X size={18} /></button>
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
                          <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : e.currentdate}</td>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{e.pcd || '—'}</span></td>
                          <td>{e.courier || '—'}</td>
                          <td>
                            <span className={`type-badge type-${e.postType.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                              {e.postType}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: e.isAssign === 1 ? '#22c55e' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
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
        </div>
      )}

    </div>
  );
}
