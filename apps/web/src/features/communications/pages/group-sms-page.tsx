import { useState } from 'react';
import { MessageSquare, Users, RefreshCw, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useSendWhatsApp, useBroadcastWhatsApp } from '../hooks/use-communications';
import '../styles/communications.css';

const RECIPIENT_TYPES = [
  { id: 'manual', label: 'Manual Entry' },
  { id: 'all', label: 'All Patients' },
  { id: 'birthday', label: 'Birthday This Month' },
];

export default function GroupSmsPage() {
  const waSingle = useSendWhatsApp();
  const waBroadcast = useBroadcastWhatsApp();

  const [mode, setMode] = useState<'single' | 'broadcast'>('single');
  const [recipientType, setRecipientType] = useState('manual');
  const [phone, setPhone] = useState('');
  const [patientIds, setPatientIds] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const charCount = message.length;

  const preview = message
    .replace(/{#name#}/gi, 'Rajesh Kumar')
    .replace(/{#date#}/gi, new Date().toLocaleDateString('en-IN'));

  const parseError = (err: any) => {
    const raw = (err as { response?: { data?: any } }).response?.data;
    if (typeof raw === 'string' && raw.includes('<!DOCTYPE')) {
      return 'Server returned 404/500 (Check if backend is running)';
    }
    return raw?.error ?? 'Failed to complete action';
  };

  const handleWhatsAppSingle = async () => {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!message.trim()) { setError('Message is required'); return; }
    setError('');
    try {
      await waSingle.mutateAsync({ phone: phone.trim(), message });
      setResult({ sent: 1, failed: 0 });
    } catch (err: unknown) {
      setError(parseError(err));
    }
  };

  const handleWhatsAppBroadcast = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setError('');
    const ids = patientIds
      ? patientIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];
    try {
      const res = await waBroadcast.mutateAsync({ 
        patientIds: ids.length ? ids : undefined, 
        message,
        phone: recipientType === 'manual' && phone ? [phone] : undefined
      });
      setResult(res.data as { sent: number; failed: number });
    } catch (err: unknown) {
      setError(parseError(err));
    }
  };

  const handleSubmit = () => {
    if (mode === 'single') handleWhatsAppSingle();
    else handleWhatsAppBroadcast();
  };

  return (
    <div className="pp-page-container comm-page animate-fade-in">
      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <MessageCircle size={22} style={{ color: '#25D366' }} strokeWidth={2} />
            WhatsApp Messaging
          </h1>
          <p className="pp-page-hero-sub">Securely communicate with patients via Meta Cloud API</p>
        </div>
      </div>

      <div className="comm-two-col">
        {/* Composer */}
        <div className="pp-table-container-enhanced" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="comm-card-title" style={{ fontSize: '1rem' }}><MessageSquare size={16} /> Compose Message</h2>
            <div className="pp-segmented-toggle">
              <button
                type="button"
                className={`pp-segmented-btn ${mode === 'single' ? 'active' : ''}`}
                onClick={() => setMode('single')}>Direct</button>
              <button
                type="button"
                className={`pp-segmented-btn ${mode === 'broadcast' ? 'active' : ''}`}
                onClick={() => setMode('broadcast')}>
                <Users size={16} /> Broadcast
              </button>
            </div>
          </div>

          <div className="comm-card-body">
            {error && (
              <div className="comm-alert comm-alert-error">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {result && (
              <div className="comm-alert comm-alert-success">
                <CheckCircle2 size={16} />
                WhatsApp Messages Sent: {result.sent} · Failed: {result.failed}
              </div>
            )}

            <div className="comm-composer">
              {/* Recipient */}
              {mode === 'single' ? (
                <div className="comm-form-group">
                  <label className="comm-form-label">Patient WhatsApp Number *</label>
                  <NumericInput className="comm-form-input" placeholder="e.g. 9876543210"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                  <p className="text-[10px] text-muted mt-1">Include country code without &quot;+&quot; prefix (e.g. 91 for India).</p>
                </div>
              ) : (
                <div className="comm-form-group">
                  <label className="comm-form-label">Broadcast Recipients</label>
                  <div className="comm-form-row-2">
                    <select className="comm-form-select" value={recipientType} onChange={e => setRecipientType(e.target.value)}>
                      {RECIPIENT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <input className="comm-form-input" placeholder="Patient IDs (comma-separated)"
                      value={patientIds} onChange={e => setPatientIds(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="comm-form-group">
                <label className="comm-form-label">Message Content *</label>
                <textarea className="comm-form-textarea" placeholder="Type your message to the patient…"
                  value={message} onChange={e => setMessage(e.target.value)} />
                <div className="comm-char-count">
                  {charCount} characters
                </div>
              </div>

              <div className="comm-placeholder-hint">
                Placeholders: <code>{'{#name#}'}</code> Patient name · <code>{'{#date#}'}</code> Today
              </div>

              {/* Preview */}
              {preview && (
                <div className="comm-form-group">
                  <label className="comm-form-label">Message Preview</label>
                  <div className="comm-preview-box">{preview}</div>
                </div>
              )}

              <div style={{ display: 'flex', marginTop: '12px' }}>
                <button
                  className="comm-btn comm-btn-wa comm-btn-lg"
                  onClick={handleSubmit}
                  disabled={waSingle.isPending || waBroadcast.isPending}
                  style={{ flex: 1 }}
                >
                  {waSingle.isPending || waBroadcast.isPending
                    ? <><RefreshCw size={14} className="comm-spin" /> Transmitting…</>
                    : <><MessageCircle size={14} /> {mode === 'single' ? 'Send WhatsApp' : 'Broadcast via WhatsApp'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Info */}
        <div className="comm-info-col">
          <div className="pp-table-container-enhanced" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 className="comm-card-title" style={{ fontSize: '1rem' }}>Clinical Guidelines</h2>
            </div>
            <div className="comm-card-body">
              <div className="comm-info-text">
                <p><strong>Meta Compliance:</strong> For initial outbound messages, ensure you are using approved templates to avoid being flagged.</p>
                <p><strong>Placeholders:</strong> Use <code>{'{#name#}'}</code> to personalize messages. Personalization increases patient engagement.</p>
                <p><strong>E2E Encryption:</strong> All messages sent through Homeo-X are secured using Meta&apos;s end-to-end encryption pipeline.</p>
              </div>
            </div>
          </div>
          <div className="comm-placeholder-card" style={{ borderColor: '#25D366' }}>
            <div className="comm-placeholder-icon">🛡️</div>
            <div className="comm-placeholder-text">
              Legacy SMS messaging has been deactivated. All clinical correspondence is now routed through the Meta Verified WhatsApp Cloud API.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
