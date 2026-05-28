import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RequestLog } from '../hooks/use-logs-data';
import { X, Lock, Calculator, Clock, Server, FileText, Eye, EyeOff } from 'lucide-react';
import '../styles/ai-models.css';

interface LogDetailsDrawerProps {
  log: RequestLog;
  onClose: () => void;
}

export function LogDetailsDrawer({ log, onClose }: LogDetailsDrawerProps) {
  const [showRaw, setShowRaw] = useState(false);
  
  return createPortal(
    <>
      <div className="cw-slide-overlay animate-fade-in" onClick={onClose} />
      <div className="cw-slide-panel animate-slide-in" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="cw-slide-header" style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 className="cw-slide-title" style={{ fontSize: '18px' }}>Log Detail: {log.id}</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
              {new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}
            </p>
          </div>
          <button className="cw-slide-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cw-slide-content" style={{ padding: '24px', overflowY: 'auto' }}>
          
          {/* Super Admin Notice */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F3F4F6', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4B5563' }}>
              <Lock size={14} color="#6B7280" />
              <span><strong>Super-Admin Access:</strong> You are viewing raw prompt and response payloads which may contain PHI.</span>
            </div>
            <button 
              onClick={() => setShowRaw(!showRaw)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showRaw ? <><EyeOff size={14} /> Hide Raw Data</> : <><Eye size={14} /> Reveal Raw Data</>}
            </button>
          </div>

          {/* Grid Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}>Routing</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                <Server size={14} />
                {log.modelId} {log.isFallback && <span style={{ color: '#D97706', fontSize: '11px', fontWeight: 600 }}>(Fallback)</span>}
              </div>
            </div>
            
            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}>Performance</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                <Clock size={14} />
                {log.latencyMs} ms
              </div>
            </div>

            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}>Context</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                <FileText size={14} />
                {log.tenantId} • {log.userId}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Session: {log.sessionId}</div>
            </div>

            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}>Cost Deduction</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                <Calculator size={14} />
                ₹{log.costInr.toFixed(4)}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{log.creditsDeducted} Credits Consumed</div>
            </div>
          </div>

          {/* Full Payload */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>Request Prompt</h4>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {showRaw ? (log.prompt || 'No prompt recorded.') : '•••••••••••••••••••••••••••••••••••• [MASKED]'}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>Response Text</h4>
            {log.status === 'FAILED' ? (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>
                API Request Failed: {log.errorCode}
              </div>
            ) : (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {showRaw ? (log.responseText || 'No response recorded.') : '•••••••••••••••••••••••••••••••••••• [MASKED]'}
              </div>
            )}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
