import { useState } from 'react';
import { MessageCircle, Send, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Clock, Link as LinkIcon, QrCode } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useSendWhatsApp, useBroadcastWhatsApp, useWhatsAppLogs, useSmsTemplates, useWhatsAppQr, useWhatsAppStatus } from '../hooks/use-communications';
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
  const [result, setResult]         = useState<{ sent: number; failed: number; automated?: boolean } | null>(null);
  const [error, setError]           = useState('');
  const [showQr, setShowQr]         = useState(false);
  const [instanceId, setInstanceId] = useState<string | null>(localStorage.getItem('wa_instance_id'));

  const { data: qrData, refetch: fetchQr, isFetching: isFetchingQr } = useWhatsAppQr();
  const { data: status } = useWhatsAppStatus(instanceId);

  const isConnected = !!status?.connected;

  const preview = message
    .replace(/{#name#}/gi, 'Rajesh Kumar')
    .replace(/{#date#}/gi, new Date().toLocaleDateString('en-IN'));

  const applyTemplate = (tpl: { message: string }) => setMessage(tpl.message);

  const handleSend = async () => {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!message.trim()) { setError('Message is required'); return; }
    setError(''); setResult(null);
    try {
      const res = await sendWa.mutateAsync({ phone: phone.trim(), message, instanceId: instanceId || undefined });
      const d = res.data?.data as { details?: Array<{ deepLink?: string; automated?: boolean }> };
      const mainDetail = d.details?.[0];
      setDeepLink(mainDetail?.deepLink ?? '');
      setResult({ sent: 1, failed: 0, automated: mainDetail?.automated });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to send WhatsApp');
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setError(''); setResult(null);
    const ids = patientIds
      ? patientIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];
    try {
      await broadcastWa.mutateAsync({ patientIds: ids.length ? ids : undefined, message, instanceId: instanceId || undefined });
      setResult({ sent: ids.length || 1, failed: 0, automated: !!instanceId });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Broadcast failed');
    }
  };

  const handleConnect = async () => {
    setShowQr(true);
    const res = await fetchQr();
    if (res.data?.instanceId) {
      localStorage.setItem('wa_instance_id', res.data.instanceId);
      setInstanceId(res.data.instanceId);
    }
  };

  return (
    <div className="pp-page-container comm-page animate-fade-in">
      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <MessageCircle size={22} style={{ color: 'var(--pp-success-fg)' }} strokeWidth={2.2} />
            WhatsApp Messaging
          </h1>
          <p className="pp-page-hero-sub">
            {isConnected 
              ? <span style={{ color: 'var(--pp-success-fg)', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}><CheckCircle2 size={14} /> Connected (Automatic Mode)</span>
              : 'Send WhatsApp messages via deep links or connect account for automation'
            }
          </p>
        </div>
        <div className="pp-page-hero-actions">
          {!isConnected ? (
            <button className="btn-primary" style={{ background: 'var(--pp-success-fg)', borderColor: 'var(--pp-success-fg)' }} onClick={handleConnect} disabled={isFetchingQr}>
              <LinkIcon size={16} /> {isFetchingQr ? 'Fetching QR...' : 'Connect WhatsApp'}
            </button>
          ) : (
            <button className="btn-ghost" disabled style={{ color: 'var(--pp-success-fg)', fontWeight: 700 }}>
              <CheckCircle2 size={16} /> Linked: {instanceId?.substring(0, 8)}...
            </button>
          )}
          <button className="btn-secondary" onClick={() => window.open(deepLink, '_blank')} disabled={!deepLink}>
            <ExternalLink size={16} /> Open WhatsApp
          </button>
        </div>
      </div>

      {showQr && !isConnected && qrData?.qrCode && (
        <div className="wa-qr-overlay animate-fade-in">
          <div className="wa-qr-card">
            <h3>Link WhatsApp Account</h3>
            <p>Scan this QR code from your WhatsApp App (Linked Devices)</p>
            <div className="wa-qr-img-container">
              <img src={qrData.qrCode} alt="WhatsApp QR" />
              {isFetchingQr && <div className="wa-qr-loading"><RefreshCw className="comm-spin" /></div>}
            </div>
            <div className="wa-qr-footer">
              <button className="comm-btn" onClick={() => setShowQr(false)}>Close</button>
              <button className="comm-btn comm-btn-wa" onClick={() => fetchQr()}>
                <RefreshCw size={13} /> Refresh QR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="comm-two-col">
        {/* Composer */}
        <div className="pp-table-container-enhanced" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 className="comm-card-title comm-card-title-green" style={{ fontSize: '1rem' }}>
              <MessageCircle size={16} /> Compose WhatsApp
            </h2>
          </div>
          <div className="comm-card-body">
            {error && (
              <div className="comm-alert comm-alert-error">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {result && (
              <div className={`comm-alert ${result.automated ? 'comm-alert-wa' : 'comm-alert-success'}`}>
                {result.automated ? <CheckCircle2 size={16} /> : <QrCode size={16} />}
                {result.automated 
                  ? `Message Sent Automatically to ${result.sent} recipient(s)` 
                  : `WhatsApp Link Generated for ${result.sent} recipient(s)`
                }
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
              <button className="btn-primary" style={{ background: 'var(--pp-success-fg)', borderColor: 'var(--pp-success-fg)', flex: 1 }} onClick={handleSend} disabled={sendWa.isPending}>
                {sendWa.isPending
                  ? <><RefreshCw size={14} className="comm-spin" /> …</>
                  : isConnected 
                    ? <><Send size={14} /> Send Automatically</>
                    : <><Send size={14} /> Generate Link</>
                }
              </button>
              {patientIds && (
                <button className="btn-secondary" style={{ flex: 1 }}
                  onClick={handleBroadcast} disabled={broadcastWa.isPending}>
                  {broadcastWa.isPending
                    ? <><RefreshCw size={14} className="comm-spin" /> …</>
                    : <><MessageCircle size={14} /> Broadcast</>}
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
        <div className="pp-table-container-enhanced" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 className="comm-card-title" style={{ fontSize: '1rem' }}><Clock size={16} /> Recent Logs</h2>
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
