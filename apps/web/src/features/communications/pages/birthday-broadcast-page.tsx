import React, { useState, useEffect } from 'react';
import { Gift, MessageCircle, RefreshCw, Send, CheckCircle2, User } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function BirthdayBroadcastPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("Happy Birthday! Wishing you a day filled with happiness and a year filled with joy. Regards, Homoeo Home Clinic.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/patients/meta/birthdays');
      if (res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setPatients(data);
        // Select all by default
        setSelectedIds(new Set(data.map((p: any) => p.id)));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch birthdays', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === patients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(patients.map(p => p.id)));
  };

  const handleBroadcast = async () => {
    if (selectedIds.size === 0) return alert('Select at least one patient');
    setSending(true);
    try {
      const selectedPatients = patients.filter(p => selectedIds.has(p.id));
      const patientIds = selectedPatients.map(p => p.regid);

      const res = await apiClient.post('/api/communications/whatsapp/broadcast', {
        patientIds,
        message
      });

      if (res.data?.success) {
        toast({ 
          title: 'Broadcast Started', 
          description: `Successfully initiated broadcast for ${res.data?.sent || selectedIds.size} patients.`,
          variant: 'success'
        });
        setSelectedIds(new Set());
      } else {
        throw new Error(res.data?.error || 'Broadcast failed');
      }
    } catch (err: any) {
      toast({ title: 'Broadcast Failed', description: err.message, variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Gift size={22} style={{ color: 'var(--pp-danger-fg)' }} /> Birthday Broadcast
          </h1>
          <p className="pp-page-hero-sub">Send personalized greetings to patients celebrating today ({format(new Date(), 'dd MMMM')})</p>
        </div>
        <button 
          onClick={fetchBirthdays} 
          className="btn-secondary"
          disabled={loading}
          style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--pp-text-3)' }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="lg-grid-3">
        {/* Left: Message Editor */}
        <div>
          <div className="pp-stat-card-enhanced" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pp-ink)' }}>
              <MessageCircle size={18} style={{ color: 'var(--pp-blue)' }} /> Greet Message
            </h3>
            <textarea
              style={{ width: '100%', height: 160, padding: 16, borderRadius: 12, background: 'var(--pp-warm-1)', border: '1px solid var(--pp-warm-4)', color: 'var(--pp-ink)', outline: 'none', resize: 'none', fontSize: 14 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your birthday message here..."
            />
            <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--pp-blue-tint)', border: '1px solid var(--pp-blue-border)' }}>
              <p style={{ fontSize: 12, color: 'var(--pp-blue)', lineHeight: 1.6 }}>
                <strong>Pro Tip:</strong> Keeping messages warm and personal improves patient loyalty and clinical engagement.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Patient List */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="pp-table-container-enhanced">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--pp-warm-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pp-warm-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input 
                  type="checkbox" 
                  style={{ width: 16, height: 16, borderRadius: 4 }} 
                  checked={selectedIds.size === patients.length && patients.length > 0}
                  onChange={toggleAll}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pp-ink)' }}>
                  {selectedIds.size} of {patients.length} Selected
                </span>
              </div>
              <button
                onClick={handleBroadcast}
                disabled={sending || selectedIds.size === 0}
                className="btn-primary"
                style={{ gap: 8 }}
              >
                {sending ? 'Sending...' : <><Send size={16} /> Send Greetings</>}
              </button>
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--pp-text-3)' }}>Loading birthdays...</div>
              ) : patients.length === 0 ? (
                <div className="pp-empty-enhanced">
                  <div className="pp-empty-icon-circle">
                    <User size={28} style={{ color: 'var(--pp-text-3)' }} />
                  </div>
                  <p className="pp-empty-title">No birthdays today</p>
                  <p className="pp-empty-sub">No birthdays identified for today.</p>
                </div>
              ) : (
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}></th>
                      <th>Patient</th>
                      <th>RegID</th>
                      <th>Mobile</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr 
                        key={p.id} 
                        className="pp-hover-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleSelect(p.id)}
                      >
                        <td data-label="Select" style={{ paddingLeft: 20 }}>
                          <input 
                            type="checkbox" 
                            style={{ width: 16, height: 16, borderRadius: 4 }} 
                            checked={selectedIds.has(p.id)}
                            readOnly
                          />
                        </td>
                        <td data-label="Patient">
                          <div style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{p.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--pp-text-3)' }}>{p.gender}, {p.age || 'N/A'} yrs</div>
                        </td>
                        <td data-label="RegID"><span className="pp-regid-pill">{p.regid}</span></td>
                        <td data-label="Mobile" style={{ fontSize: 13, color: 'var(--pp-text-2)' }}>{p.phone || p.mobile1 || '—'}</td>
                        <td data-label="Status">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: 'var(--pp-success-fg)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>
                            <CheckCircle2 size={10} /> Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
