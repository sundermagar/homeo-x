import { useState } from 'react';
import { MessageCircle, Send, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useSendWhatsApp, useBroadcastWhatsApp, useWhatsAppLogs, useSmsTemplates } from '../hooks/use-communications';
import type { WhatsAppLog } from '@mmc/types';
import '../styles/communications.css';

export default function WhatsAppPage() {
  const { data: logs = [] }       = useWhatsAppLogs();
  const { data: templates = [] }  = useSmsTemplates();
  const sendWa     = useSendWhatsApp();
  const broadcastWa = useBroadcastWhatsApp();

  const [phone, setPhone]           = useState('');
  const [patientIds, setPatientIds] = useState('');
  const [message, setMessage]       = useState('');
  const [deepLink, setDeepLink]     = useState('');
  const [result, setResult]         = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError]           = useState('');

  const preview = message
    .replace(/{#name#}/gi, 'Rajesh Kumar')
    .replace(/{#date#}/gi, new Date().toLocaleDateString('en-IN'));

  const applyTemplate = (tpl: { message: string }) => setMessage(tpl.message);

  const handleSend = async () => {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!message.trim()) { setError('Message is required'); return; }
    setError(''); setResult(null);
    try {
      const res = await sendWa.mutateAsync({ phone: phone.trim(), message });
      const d = res.data as { details?: Array<{ deepLink?: string }> };
      setDeepLink(d.details?.[0]?.deepLink ?? '');
      setResult({ sent: 1, failed: 0 });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to generate WhatsApp link');
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setError(''); setResult(null);
    const ids = patientIds
      ? patientIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];
    try {
      await broadcastWa.mutateAsync({ patientIds: ids.length ? ids : undefined, message });
      setResult({ sent: ids.length || 1, failed: 0 });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Broadcast failed');
    }
  };

  return (
    <div className="comm-page">
      {/* Header */}
      <header className="comm-header">
        <div>
          <h1 className="comm-title">
            <MessageCircle size={20} strokeWidth={1.6} className="comm-title-icon-green" />
            WhatsApp Messaging
          </h1>
          <p className="comm-subtitle">Send WhatsApp messages via deep links · Log delivery</p>
        </div>
        <div className="comm-header-actions">
          <button className="comm-btn comm-btn-sm" onClick={() => window.open(deepLink, '_blank')}>
            <ExternalLink size={13} /> Open WhatsApp
          </button>
        </div>
      </header>

      <div className="comm-two-col">
        {/* Composer */}
        <div className="comm-card">
          <div className="comm-card-header">
            <h2 className="comm-card-title comm-card-title-green">
              <MessageCircle size={15} /> Compose WhatsApp
            </h2>
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
                WhatsApp: {result.sent} sent · {result.failed ?? 0} failed
              </div>
            )}

            {/* Templates */}
            <div className="comm-form-group">
              <label className="comm-form-label">Templates (optional)</label>
              <div className="comm-template-select">
                {templates.map(t => (
                  <button key={t.id} className="comm-template-chip" onClick={() => applyTemplate(t)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="comm-form-group">
              <label className="comm-form-label">Phone Number *</label>
              <NumericInput className="comm-form-input" placeholder="e.g. 9876543210"
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            {/* Bulk IDs */}
            <div className="comm-form-group">
              <label className="comm-form-label">Bulk Patient IDs (comma-separated, optional)</label>
              <input className="comm-form-input" placeholder="e.g. 1,2,3,4,5"
                value={patientIds} onChange={e => setPatientIds(e.target.value)} />
            </div>

            {/* Message */}
            <div className="comm-form-group">
              <label className="comm-form-label">Message *</label>
              <textarea className="comm-form-textarea" placeholder="Type your message…"
                value={message} onChange={e => setMessage(e.target.value)} />
            </div>

            {preview && (
              <div className="comm-form-group">
                <label className="comm-form-label">Preview</label>
                <div className="wa-preview-card">{preview}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="comm-btn" onClick={handleSend} disabled={sendWa.isPending}>
                {sendWa.isPending
                  ? <><RefreshCw size={13} className="comm-spin" /> Generating…</>
                  : <><Send size={13} /> Generate Link</>}
              </button>
              {patientIds && (
                <button className="comm-btn comm-btn-wa"
                  onClick={handleBroadcast} disabled={broadcastWa.isPending}>
                  {broadcastWa.isPending
                    ? <><RefreshCw size={13} className="comm-spin" /> …</>
                    : <><MessageCircle size={13} /> Broadcast</>}
                </button>
              )}
            </div>

            {/* Deep link result */}
            {deepLink && (
              <div style={{ marginTop: 14 }}>
                <div className="comm-form-label">WhatsApp Deep Link Generated</div>
                <a href={deepLink} target="_blank" rel="noreferrer" className="wa-deep-link wa-deep-link-mt">
                  <MessageCircle size={16} /> Open in WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="comm-card">
          <div className="comm-card-header">
            <h2 className="comm-card-title"><Clock size={15} /> Recent Logs</h2>
          </div>
          <div className="comm-card-body comm-card-body-flush">
            {logs.length === 0 ? (
              <div className="comm-empty comm-empty-pad-lg">
                <MessageCircle size={28} className="comm-empty-icon" />
                <p className="comm-empty-text">No WhatsApp logs yet</p>
              </div>
            ) : (
              <div className="comm-logs-scroll">
                {logs.map((log: WhatsAppLog) => (
                  <div key={log.id} className="comm-log-item">
                    <div className="comm-log-header">
                      <span className="comm-log-phone">+{log.phone}</span>
                      <span className="comm-log-date">
                        {new Date(log.sendDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="comm-log-message">{log.message}</div>
                    {log.deepLink && (
                      <a href={log.deepLink} target="_blank" rel="noreferrer" className="comm-log-link">
                        <ExternalLink size={11} /> Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="comm-info-banner">
        <strong>How it works:</strong> WhatsApp messages are sent via deep links (<code>api.whatsapp.com/send?phone=…</code>).
        This opens the WhatsApp app/web with the pre-filled message. In production, integrate the <strong>WhatsApp Business API</strong> (Meta Graph API) for direct delivery without user interaction.
      </div>
    </div>
  );
}
