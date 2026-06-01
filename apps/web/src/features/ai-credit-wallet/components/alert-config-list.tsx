import React from 'react';
import { useAlertRules } from '../hooks/use-routing-data';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function AlertConfigList() {
  const { data: rules, loading, updateRule, isUpdating } = useAlertRules();

  if (loading) {
    return (
      <div className="cw-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const handleToggle = (id: string, field: 'inApp' | 'email' | 'sms', currentValue: boolean) => {
    updateRule({ id, updates: { [field]: !currentValue } });
  };

  const handleThresholdChange = (id: string, value: number) => {
    updateRule({ id, updates: { threshold: value } });
  };

  const uniqueRules = Array.from(new Map(rules.map(r => [r.title, r])).values());

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Budget Alert Configuration</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Define thresholds that trigger automated notifications to administrators.</p>
        </div>
      </div>
      
      <div style={{ padding: '8px 24px' }}>
        {uniqueRules.map((rule, idx) => (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx < rules.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
            <div style={{ flex: 1, paddingRight: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{rule.title}</div>
              
              <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {rule.type === 'threshold' && (
                  <>
                    <span>Trigger when wallet drops below</span>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number" 
                        className="cw-form-input" 
                        defaultValue={rule.threshold || 0} 
                        onBlur={(e) => handleThresholdChange(rule.id, parseInt(e.target.value, 10))}
                        style={{ width: '100px', padding: '4px 8px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none' }} 
                      />
                      <span>credits</span>
                    </div>
                  </>
                )}
                {rule.type === 'days' && (
                  <>
                    <span>Trigger when remaining time is under</span>
                    <input 
                      type="number" 
                      className="cw-form-input" 
                      defaultValue={rule.threshold || 0} 
                      onBlur={(e) => handleThresholdChange(rule.id, parseInt(e.target.value, 10))}
                      style={{ width: '60px', padding: '4px 8px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none' }} 
                    />
                    <span>days</span>
                  </>
                )}
                {rule.type === 'event' && (
                  <span>{rule.description}</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}><Bell size={12} /> In-app</span>
                <input 
                  type="checkbox" 
                  checked={rule.inApp} 
                  onChange={() => handleToggle(rule.id, 'inApp', rule.inApp)}
                  className="cw-custom-checkbox"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> Email</span>
                <input 
                  type="checkbox" 
                  checked={rule.email} 
                  onChange={() => handleToggle(rule.id, 'email', rule.email)}
                  className="cw-custom-checkbox"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> SMS</span>
                <input 
                  type="checkbox" 
                  checked={rule.sms} 
                  onChange={() => handleToggle(rule.id, 'sms', rule.sms)}
                  className="cw-custom-checkbox"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', background: '#F9FAFB' }}>
        <button 
          onClick={() => {
            toast({ title: 'Configuration Saved', description: 'Budget alerts have been successfully updated.' });
          }}
          disabled={isUpdating}
          style={{ padding: '8px 20px', background: '#0F172A', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isUpdating ? 0.7 : 1 }}
        >
          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
          Save configuration
        </button>
      </div>
    </div>
  );
}
