import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiKey } from '../hooks/use-api-keys-data';
import { X, ShieldAlert, Key, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '../styles/ai-models.css';

interface RotateKeyModalProps {
  apiKey: ApiKey;
  onClose: () => void;
}

export function RotateKeyModal({ apiKey, onClose }: RotateKeyModalProps) {
  const [newKey, setNewKey] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = () => {
    if (!newKey) return;
    
    setIsRotating(true);
    // Simulate API call and atomic swap
    setTimeout(() => {
      setIsRotating(false);
      toast({
        title: 'Key Rotated Successfully',
        description: `The new API key for ${apiKey.provider} has been encrypted and saved.`,
      });
      onClose();
    }, 1200);
  };

  return createPortal(
    <>
      <div className="cw-slide-overlay animate-fade-in" onClick={onClose} />
      <div className="cw-slide-panel animate-slide-in">
        <div className="cw-slide-header" style={{ padding: '24px 24px 16px', borderBottom: 'none' }}>
          <h2 className="cw-slide-title" style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Rotate Provider Key</h2>
          <button className="cw-slide-close" onClick={onClose} style={{ color: '#111827' }}>
            <X size={20} />
          </button>
        </div>

        <div className="cw-slide-content" style={{ padding: '0 24px 24px' }}>
          <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
            <Key size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E3A8A', margin: '0 0 6px 0' }}>{apiKey.provider} - {apiKey.keyName}</h4>
              <p style={{ fontSize: '13px', color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                You are about to rotate this API key. The new key will be encrypted and immediately swapped into the routing engine.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Current Masked Key
            </label>
            <input 
              type="text"
              readOnly
              disabled
              value={apiKey.maskedPreview}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#F9FAFB', fontFamily: 'monospace', fontSize: '14px', color: '#6B7280', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              New API Key
            </label>
            <input
              type="password"
              placeholder="Paste the new plaintext API key here"
              className="cw-form-input"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoComplete="off"
              style={{ padding: '12px 16px', fontSize: '14px' }}
            />
          </div>

          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
            <ShieldAlert size={18} color="#991B1B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', margin: '0 0 6px 0' }}>Atomic Overwrite</h4>
              <p style={{ fontSize: '13px', color: '#DC2626', margin: 0, lineHeight: 1.5 }}>
                The previous encrypted value will be permanently destroyed. This action cannot be undone and will be permanently recorded in the audit log.
              </p>
            </div>
          </div>

          <button 
            className="plat-btn plat-btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px' }}
            disabled={!newKey || isRotating}
            onClick={handleRotate}
          >
            {isRotating ? 'Encrypting and Saving...' : 'Save & Rotate Key'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
