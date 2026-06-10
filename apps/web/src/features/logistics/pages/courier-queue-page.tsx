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
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);
  
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
  const [historyModal, setHistoryModal] = useState<{ regid: number; entries: CourierEntry[] } | null>(null);

  // Assign form state
  const [assignPcd, setAssignPcd] = useState('');
  const [assignCourier, setAssignCourier] = useState('');
  const [assignPickup, setAssignPickup] = useState(false);
  const [assignSendWhatsapp, setAssignSendWhatsapp] = useState(true);
  const [pickupBy, setPickupBy] = useState<'patient' | 'relative'>('patient');
  const [relativeName, setRelativeName] = useState('');
  const [relativePhone, setRelativePhone] = useState('');

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['courier-queue', selectedDate, debouncedSearch],
    queryFn: async () => {
      const url = debouncedSearch
        ? `/courier/queue?search=${encodeURIComponent(debouncedSearch)}`
        : `/courier/queue?date=${selectedDate}`;
      const { data } = await apiClient.get(url);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courier-queue'] });
      
      // Auto-send WhatsApp on assign
      if (assignSendWhatsapp && assignModal?.phone && (variables.pcd || variables.pickup)) {
        const phone = assignModal.phone.replace(/\D/g, '');
        const finalPhone = phone.startsWith('91') ? phone : '91' + phone;
        
        let textMessage = '';
        if (variables.pickup) {
          if (pickupBy === 'relative') {
            textMessage = `Dear ${assignModal.patientName || 'Patient'},\n\nYour medicines have been picked up by your relative/representative: *${relativeName}*${relativePhone ? ` (${relativePhone})` : ''}.\n\nRegards,\nMMC HomeoTech`;
          } else {
            textMessage = `Dear ${assignModal.patientName || 'Patient'},\n\nYour medicines have been picked up at the clinic.\n\nRegards,\nMMC HomeoTech`;
          }
        } else {
          textMessage = `Dear ${assignModal.patientName || 'Patient'},\n\nYour medicines have been dispatched via *${variables.courier || 'DTDC'}* and the POD number is *${variables.pcd || 'N/A'}*.\n\nFor tracking, log on to the courier tracking website.\n\nRegards,\nMMC HomeoTech`;
        }
        
        sendText.mutate({
          phone: finalPhone,
          message: textMessage,
        }, {
          onSuccess: () => alert('✅ Dispatch details saved and WhatsApp message sent!'),
          onError: (err: any) => alert('❌ Dispatch saved, but failed to send WhatsApp: ' + (err.response?.data?.message || err.message))
        });
      }

      setAssignModal(null);
      setAssignPcd('');
      setAssignCourier('');
      setAssignPickup(false);
      setAssignSendWhatsapp(true);
      setPickupBy('patient');
      setRelativeName('');
      setRelativePhone('');
    }
  });

  const handleAssign = () => {
    if (!assignModal) return;
    assignMutation.mutate({
      id: assignModal.id,
      pcd: assignModal.postType === 'Pickup' ? relativePhone : (assignPcd || undefined),
      courier: assignModal.postType === 'Pickup' ? (pickupBy === 'relative' ? relativeName : 'Patient') : (assignCourier || undefined),
      pickup: assignModal.postType === 'Pickup' ? 1 : (assignPickup ? 1 : 0),
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
      }
    );
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
          <EmptyState 
            icon={Package}
            title="No entries for this date"
            description={`No dispatch entries found for ${new Date(selectedDate as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            variant="card"
            className="my-8"
          />
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
                      <tr key={entry.id} className={entry.isAssign === 1 ? 'bg-green-50/30' : ''}>
                        <td data-label="RegID">
                          <span className="appt-cell-id">#{entry.caseId}</span>
                        </td>
                        <td data-label="Patient Name">
                          <div className="appt-cell-name flex items-center gap-1.5">
                            <span>{entry.patientName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td data-label="Remedy">
                          <div className="flex flex-wrap gap-1.5">
                            {entry.remedy && <span className="appt-badge appt-badge-done">{entry.remedy}</span>}
                            {entry.potency && <span className="appt-badge appt-badge-done" style={{ opacity: 0.8 }}>{entry.potency}</span>}
                            {entry.days && <span className="appt-badge appt-badge-absent">{entry.days}d</span>}
                          </div>
                        </td>
                        <td data-label="Type">
                          <span className={`appt-badge ${entry.postType === 'Courier' ? 'appt-badge-wait' : 'appt-badge-done'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {entry.postType === 'Courier' ? <Truck size={10} /> : <MapPin size={10} />}
                            {entry.postType}
                          </span>
                        </td>
                        <td data-label="Status">
                          {entry.isAssign === 1 ? (
                            <span className="appt-badge appt-badge-done" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={10} /> Assigned
                            </span>
                          ) : (
                            <span className="appt-badge appt-badge-wait" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </td>
                        <td data-label="POD">
                          {entry.pcd ? (
                            <span className="appt-cell-phone font-mono">{entry.pcd}</span>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                        <td data-label="Date">
                          <span className="appt-cell-phone">
                            {entry.createdAt ? new Date(entry.createdAt as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : entry.currentdate}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="flex gap-2">
                            {entry.isAssign === 0 ? (
                              <button
                                className="btn-primary"
                                style={{ padding: '4px 12px', fontSize: '11px', height: '28px' }}
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
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-success-fg)', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--pp-success-bg)', borderRadius: 6 }}>
                                <CheckCircle2 size={12} /> Assigned
                              </span>
                            )}
                            <button
                              className="btn-ghost"
                              style={{ padding: '4px 8px', height: '28px' }}
                              onClick={() => handleOpenHistory(entry.caseId)}
                            >
                              <History size={14} strokeWidth={1.6} />
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
      <Drawer
        isOpen={!!assignModal}
        onClose={() => {
          setAssignModal(null);
          setAssignPcd('');
          setAssignCourier('');
          setAssignPickup(false);
          setAssignSendWhatsapp(true);
          setPickupBy('patient');
          setRelativeName('');
          setRelativePhone('');
        }}
        title={
          assignModal?.postType === 'Courier' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} /> Assign Dispatch Details
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} /> Confirm Pickup
            </div>
          )
        }
        maxWidth="500px"
      >
        {assignModal && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
            <div className="courier-modal-body" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ background: 'var(--pp-warm-1)', border: '1px solid var(--pp-warm-4)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: assignModal.remedy ? '12px' : '0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                    {assignModal.patientName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--pp-ink)' }}>{assignModal.patientName || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--pp-text-3)', fontWeight: 600 }}>Case #{assignModal.caseId}</div>
                  </div>
                </div>
                {assignModal.remedy && (
                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--pp-warm-2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prescribed Remedy</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--pp-ink)' }}>{assignModal.remedy} {assignModal.potency} — {assignModal.days} days</div>
                  </div>
                )}
              </div>

              {assignModal.postType === 'Courier' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="modal-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pp-ink)' }}>POD (Tracking Number) <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Enter POD / Tracking Number"
                      value={assignPcd}
                      onChange={(e) => setAssignPcd(e.target.value)}
                      className="pp-input"
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--pp-warm-4)', background: 'var(--bg-card)' }}
                      autoFocus
                    />
                  </div>
                  <div className="modal-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pp-ink)' }}>Courier Company <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. DTDC, BlueDart, Delhivery"
                      value={assignCourier}
                      onChange={(e) => setAssignCourier(e.target.value)}
                      className="pp-input"
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--pp-warm-4)', background: 'var(--bg-card)' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pp-ink)' }}>Who picked up the medicine?</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 16px', borderRadius: '10px', border: pickupBy === 'patient' ? '1px solid var(--pp-blue)' : '1px solid var(--pp-warm-4)', background: pickupBy === 'patient' ? 'var(--pp-blue-tint)' : 'var(--bg-card)', transition: 'all 0.2s' }}>
                      <input
                        type="radio"
                        name="pickupBy"
                        checked={pickupBy === 'patient'}
                        onChange={() => setPickupBy('patient')}
                        style={{ accentColor: 'var(--pp-blue)', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: pickupBy === 'patient' ? 'var(--pp-blue)' : 'var(--pp-ink)' }}>Patient Themself</span>
                    </label>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 16px', borderRadius: '10px', border: pickupBy === 'relative' ? '1px solid var(--pp-blue)' : '1px solid var(--pp-warm-4)', background: pickupBy === 'relative' ? 'var(--pp-blue-tint)' : 'var(--bg-card)', transition: 'all 0.2s' }}>
                      <input
                        type="radio"
                        name="pickupBy"
                        checked={pickupBy === 'relative'}
                        onChange={() => setPickupBy('relative')}
                        style={{ accentColor: 'var(--pp-blue)', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: pickupBy === 'relative' ? 'var(--pp-blue)' : 'var(--pp-ink)' }}>Relative / Other</span>
                    </label>
                  </div>
                  
                  {pickupBy === 'relative' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--pp-warm-1)', borderRadius: '12px', border: '1px solid var(--pp-warm-2)' }}>
                      <div className="modal-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pp-ink)' }}>Relative's Name <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                        <input
                          type="text"
                          placeholder="Enter relative's name"
                          value={relativeName}
                          onChange={(e) => setRelativeName(e.target.value)}
                          className="pp-input"
                          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pp-warm-4)', background: 'var(--bg-card)' }}
                          autoFocus
                        />
                      </div>
                      <div className="modal-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pp-ink)' }}>Relative's Phone (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={relativePhone}
                          onChange={(e) => setRelativePhone(e.target.value)}
                          className="pp-input"
                          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pp-warm-4)', background: 'var(--bg-card)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <label style={{ marginTop: '32px', display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', padding: '16px', borderRadius: '12px', background: assignSendWhatsapp ? 'rgba(34, 197, 94, 0.08)' : 'var(--pp-warm-1)', border: assignSendWhatsapp ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--pp-warm-4)', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={assignSendWhatsapp}
                    onChange={(e) => setAssignSendWhatsapp(e.target.checked)}
                    style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#16a34a' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: assignSendWhatsapp ? '#16a34a' : 'var(--pp-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageCircle size={14} /> Send WhatsApp Notification
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--pp-text-3)', marginTop: '4px', lineHeight: 1.4, fontWeight: 500 }}>
                      Automatically message {assignModal.phone ? `+91 ${assignModal.phone.replace(/\D/g, '')}` : 'the patient'} with tracking details once assigned.
                    </span>
                  </div>
              </label>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-main)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setAssignModal(null);
                  setAssignPcd('');
                  setAssignCourier('');
                  setAssignPickup(false);
                  setAssignSendWhatsapp(true);
                  setPickupBy('patient');
                  setRelativeName('');
                  setRelativePhone('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAssign}
                disabled={assignMutation.isPending || (assignModal.postType === 'Courier' && (!assignPcd || !assignCourier)) || (assignModal.postType === 'Pickup' && pickupBy === 'relative' && !relativeName)}
              >
                {assignMutation.isPending ? 'Saving...' : 'Save & Assign'}
              </button>
            </div>
          </div>
        )}
      </Drawer>

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
                  onChange={(e) => setMessageModal({ ...messageModal, patientName: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label>Courier Company (Variable 2)</label>
                <input
                  type="text"
                  value={messageModal.courierCompany}
                  onChange={(e) => setMessageModal({ ...messageModal, courierCompany: e.target.value })}
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
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--pp-bg-subtle)', border: '1px solid var(--pp-border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>Template Preview:</strong> Dear <strong>{messageModal.patientName || '{name}'}</strong> Your medicines has been dispatched via <strong>{messageModal.courierCompany || '{courier}'}</strong> and the POD number is <strong>{messageModal.podNumber || '{pod}'}</strong> For tracking log on www.dtdc.com Regards MMC HomeoTech
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

      {/* ─── History Drawer ─── */}
      <Drawer
        isOpen={!!historyModal}
        onClose={() => setHistoryModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} /> Previous Dispatch Records
            {historyModal && (
              <span className="appt-badge appt-badge-done" style={{ marginLeft: 8 }}>
                #{historyModal.regid}
              </span>
            )}
          </div>
        }
        maxWidth="800px"
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
                      <th>POD / Contact</th>
                      <th>Courier / Person</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal?.entries.map((e) => (
                      <tr key={e.id}>
                        <td data-label="Date" style={{ whiteSpace: 'nowrap' }}>
                          <span className="appt-cell-phone">
                            {e.createdAt ? new Date(e.createdAt as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : e.currentdate}
                          </span>
                        </td>
                        <td data-label="POD / Contact">
                          <span className="appt-cell-phone font-mono">{e.pcd || '—'}</span>
                        </td>
                        <td data-label="Courier / Person">
                          {e.postType === 'Pickup' ? (
                            <span className="text-secondary" style={{ fontSize: '13px', fontWeight: 600 }}>
                              {e.courier === 'Patient' ? 'Patient' : (e.courier ? `Relative: ${e.courier}` : 'Patient')}
                            </span>
                          ) : (
                            <span className="text-secondary" style={{ fontSize: '13px' }}>{e.courier || '—'}</span>
                          )}
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
      </Drawer>

    </div>
  );
}
