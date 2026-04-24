import { useState } from 'react';
import { Send, MessageSquare, Users, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useSmsTemplates, useSendSms, useBroadcastSms } from '../hooks/use-communications';
import '../styles/communications.css';

const RECIPIENT_TYPES = [
  { id: 'manual', label: 'Manual Entry' },
  { id: 'all', label: 'All Patients' },
  { id: 'birthday', label: 'Birthday This Month' },
];

export default function GroupSmsPage() {
  const { data: templates = [] } = useSmsTemplates();
  const sendSingle = useSendSms();
  const broadcast = useBroadcastSms();

  const [mode, setMode] = useState<'single' | 'broadcast'>('single');
  const [recipientType, setRecipientType] = useState('manual');
  const [phone, setPhone] = useState('');
  const [patientIds, setPatientIds] = useState('');
  const [message, setMessage] = useState('');
  const [smsType, setSmsType] = useState('General');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const charCount = message.length;

  const preview = message
    .replace(/{#name#}/gi, 'Rajesh Kumar')
    .replace(/{#date#}/gi, new Date().toLocaleDateString('en-IN'));

  const applyTemplate = (tpl: { message: string; smsType: string }) => {
    setMessage(tpl.message);
    setSmsType(tpl.smsType);
  };

  const handleSendSingle = async () => {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!message.trim()) { setError('Message is required'); return; }
    setError('');
    try {
      const res = await sendSingle.mutateAsync({ phone: phone.trim(), message, smsType });
      setResult(res.data as { sent: number; failed: number });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to send SMS');
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setError('');
    const ids = patientIds
      ? patientIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];
    try {
      const res = await broadcast.mutateAsync({ patientIds: ids.length ? ids : undefined, message, smsType });
      setResult(res.data as { sent: number; failed: number });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Broadcast failed');
    }
  };

  const handleSubmit = () => {
    if (mode === 'single') handleSendSingle();
    else handleBroadcast();
  };

  return (
    <div className="comm-page">
      {/* Header */}
      <header className="comm-header">
        <div>
          <h1 className="comm-title">
            <Send size={20} strokeWidth={1.6} className="comm-title-icon-blue" />
            Send SMS
          </h1>
          <p className="comm-subtitle">Compose and send SMS messages to patients</p>
        </div>
      </header>

      <div className="comm-two-col">
        {/* Composer */}
        <div className="comm-card">
          <div className="comm-card-header">
            <h2 className="comm-card-title"><MessageSquare size={15} /> Compose Message</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`comm-btn comm-btn-sm${mode === 'single' ? ' comm-btn-primary' : ''}`}
                onClick={() => setMode('single')}>Single</button>
              <button
                className={`comm-btn comm-btn-sm${mode === 'broadcast' ? ' comm-btn-primary' : ''}`}
                onClick={() => setMode('broadcast')}>
                <Users size={12} /> Group
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
                Sent: {result.sent} · Failed: {result.failed}
              </div>
            )}

            <div className="comm-composer">
              {/* Template selector */}
              <div className="comm-form-group">
                <label className="comm-form-label">Template (optional)</label>
                <div className="comm-template-select">
                  {templates.map(t => (
                    <button key={t.id} className="comm-template-chip" onClick={() => applyTemplate(t)}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient */}
              {mode === 'single' ? (
                <div className="comm-form-group">
                  <label className="comm-form-label">Phone Number *</label>
                  <NumericInput className="comm-form-input" placeholder="e.g. 9876543210"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              ) : (
                <div className="comm-form-group">
                  <label className="comm-form-label">Recipients</label>
                  <div className="comm-form-row-2">
                    <select className="comm-form-select" value={recipientType} onChange={e => setRecipientType(e.target.value)}>
                      {RECIPIENT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <input className="comm-form-input" placeholder="Patient IDs (comma-separated)"
                      value={patientIds} onChange={e => setPatientIds(e.target.value)} />
                  </div>
                  <div className="comm-placeholder-hint" style={{ marginTop: 4 }}>
                    Leave IDs empty to send to all patients
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="comm-form-group">
                <label className="comm-form-label">Message *</label>
                <textarea className="comm-form-textarea" placeholder="Type your message or select a template…"
                  value={message} onChange={e => setMessage(e.target.value)} />
                <div className={`comm-char-count${charCount > 160 ? ' over' : ''}`}>
                  {charCount} chars · {Math.ceil(charCount / 160)} SMS
                </div>
              </div>

              <div className="comm-placeholder-hint">
                Placeholders: <code>{'{#name#}'}</code> Patient name · <code>{'{#date#}'}</code> Today · <code>{'{#clinic#}'}</code> Clinic name
              </div>

              {/* Preview */}
              {preview && (
                <div className="comm-form-group">
                  <label className="comm-form-label">Preview</label>
                  <div className="comm-preview-box">{preview}</div>
                </div>
              )}

              {/* Category */}
              <div className="comm-form-group">
                <label className="comm-form-label">SMS Category</label>
                <select className="comm-form-select" value={smsType} onChange={e => setSmsType(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Appointment">Appointment</option>
                  <option value="Reminder">Reminder</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Transactional">Transactional</option>
                </select>
              </div>

              <button
                className="comm-btn comm-btn-primary comm-btn-lg"
                onClick={handleSubmit}
                disabled={sendSingle.isPending || broadcast.isPending}
              >
                {sendSingle.isPending || broadcast.isPending
                  ? <><RefreshCw size={14} className="comm-spin" /> Sending…</>
                  : <><Send size={14} /> {mode === 'single' ? 'Send SMS' : 'Broadcast SMS'}</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Right panel: Info */}
        <div className="comm-info-col">
          <div className="comm-card">
            <div className="comm-card-header">
              <h2 className="comm-card-title">Quick Tips</h2>
            </div>
            <div className="comm-card-body">
              <div className="comm-info-text">
                <p><strong>SMS Length:</strong> Each SMS is 160 characters. Messages longer than 160 chars are split into multiple segments.</p>
                <p><strong>Placeholders:</strong> Use <code>{'{#name#}'}</code> to insert the patient&apos;s name automatically. Works with broadcast mode.</p>
                <p><strong>Categories:</strong> Transactional SMS has higher delivery rates. Promotional SMS may be delayed by carriers.</p>
                <p><strong>Template reuse:</strong> Select any saved template to quickly fill the message body, then customize as needed.</p>
              </div>
            </div>
          </div>
          <div className="comm-placeholder-card">
            <div className="comm-placeholder-icon">📱</div>
            <div className="comm-placeholder-text">
              In production, SMS is sent via your configured gateway (BulkShooters / MSG91 / Twilio).
              Currently messages are logged to the delivery reports.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
