import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PricingType } from '../hooks/use-ai-models-data';

interface AddModelModalProps {
  onClose: () => void;
}

export function AddModelModal({ onClose }: AddModelModalProps) {
  const [pricingType, setPricingType] = useState<PricingType>('Input + Output tokens');

  return createPortal(
    <>
      <div className="cw-slide-overlay" onClick={onClose} />
      <div className="cw-slide-panel">
        <div className="cw-slide-header">
          <div className="cw-slide-title">Add AI Model</div>
          <button className="plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="cw-slide-body">
          <div className="cw-form-group">
            <label className="cw-form-label">Display Name</label>
            <input type="text" className="cw-form-input" placeholder="e.g. GPT-4o" />
          </div>
          
          <div className="cw-form-group">
            <label className="cw-form-label">Model Identifier</label>
            <input type="text" className="cw-form-input" placeholder="e.g. gpt-4o" />
          </div>
          
          <div className="cw-form-group">
            <label className="cw-form-label">Provider</label>
            <select className="cw-form-select">
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Google</option>
              <option>Custom / Local</option>
            </select>
          </div>
          
          <div className="cw-form-group">
            <label className="cw-form-label">API Endpoint (Optional)</label>
            <input type="text" className="cw-form-input" placeholder="https://api.openai.com/v1" />
          </div>

          <div style={{ height: '1px', background: '#E5E7EB', margin: '24px 0' }} />

          <div className="cw-form-group">
            <label className="cw-form-label">Pricing Type</label>
            <select 
              className="cw-form-select" 
              value={pricingType} 
              onChange={(e) => setPricingType(e.target.value as PricingType)}
            >
              <option value="Input + Output tokens">Token-based (Input/Output)</option>
              <option value="Per minute of audio">Per-minute of audio</option>
              <option value="Configurable">Per-request / Flat</option>
            </select>
          </div>

          {pricingType === 'Input + Output tokens' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="cw-form-group">
                <label className="cw-form-label">Input Cost (₹ / 1K)</label>
                <input type="number" step="0.01" className="cw-form-input" placeholder="0.00" />
              </div>
              <div className="cw-form-group">
                <label className="cw-form-label">Output Cost (₹ / 1K)</label>
                <input type="number" step="0.01" className="cw-form-input" placeholder="0.00" />
              </div>
            </div>
          )}

          {pricingType === 'Per minute of audio' && (
            <div className="cw-form-group">
              <label className="cw-form-label">Cost per minute (₹)</label>
              <input type="number" step="0.01" className="cw-form-input" placeholder="0.00" />
            </div>
          )}

          {pricingType === 'Configurable' && (
            <div className="cw-form-group">
              <label className="cw-form-label">Flat Cost per request (₹)</label>
              <input type="number" step="0.01" className="cw-form-input" placeholder="0.00" />
            </div>
          )}

          <div className="cw-form-group">
            <label className="cw-form-label">Credits Multiplier</label>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>How many credits equal ₹1?</p>
            <input type="number" className="cw-form-input" defaultValue={1000} />
          </div>

          <div className="cw-form-group" style={{ marginTop: '24px' }}>
            <label className="cw-form-label">Administrative Notes</label>
            <textarea className="cw-form-input" rows={3} placeholder="Optional notes..."></textarea>
          </div>

        </div>

        <div className="cw-slide-footer">
          <button className="plat-btn plat-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="plat-btn plat-btn-primary" onClick={onClose}>Save Model</button>
        </div>
      </div>
    </>,
    document.body
  );
}
