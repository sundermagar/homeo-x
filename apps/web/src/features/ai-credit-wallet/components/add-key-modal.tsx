import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAddApiKey } from '../hooks/use-api-keys-data';
import '../styles/ai-models.css';

interface AddKeyModalProps {
  onClose: () => void;
}

export function AddKeyModal({ onClose }: AddKeyModalProps) {
  const [provider, setProvider] = useState('OpenAI');
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addKeyMutation = useAddApiKey();

  const handleSave = async () => {
    if (!keyName || !keyValue) return;
    
    setIsSaving(true);
    try {
      await addKeyMutation.mutateAsync({
        provider: provider.toLowerCase(),
        label: keyName,
        key: keyValue,
      });
      toast({
        title: 'Key Added Successfully',
        description: `The ${provider} key has been encrypted and securely stored.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error Saving Key',
        description: 'An error occurred while saving the API key.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <>
      <div className="cw-slide-overlay animate-fade-in" onClick={onClose} />
      <div className="cw-slide-panel animate-slide-in">
        <div className="cw-slide-header" style={{ padding: '24px 24px 16px', borderBottom: 'none' }}>
          <h2 className="cw-slide-title" style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Add Provider Key</h2>
          <button className="cw-slide-close" onClick={onClose} style={{ color: '#111827' }}>
            <X size={20} />
          </button>
        </div>

        <div className="cw-slide-content" style={{ padding: '0 24px 24px' }}>
          <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
            <Key size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E3A8A', margin: '0 0 6px 0' }}>Secure Storage</h4>
              <p style={{ fontSize: '13px', color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                Keys are encrypted via AES-256-GCM. The plaintext value will be destroyed immediately after saving and cannot be retrieved.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Provider
            </label>
            <select
              className="cw-form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
            >
              <option value="OpenAI">OpenAI</option>
              <option value="Anthropic">Anthropic</option>
              <option value="Google AI">Google AI</option>
              <option value="Custom">Custom / Open Source</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Key Name / Label
            </label>
            <input
              type="text"
              placeholder="e.g. Production Primary Key"
              className="cw-form-input"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              autoComplete="off"
              style={{ padding: '12px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              API Key Value
            </label>
            <input
              type="password"
              placeholder="Paste the plaintext API key here"
              className="cw-form-input"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              autoComplete="off"
              style={{ padding: '12px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
            />
          </div>

          <button 
            className="plat-btn plat-btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px' }}
            disabled={!keyName || !keyValue || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Encrypting and Saving...' : 'Save & Encrypt Key'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
