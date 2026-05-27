import React from 'react';
import { useAlertRules } from '../hooks/use-routing-data';
import { Bell, Mail, MessageSquare } from 'lucide-react';

export function AlertConfigList() {
  const rules = useAlertRules();

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Budget Alert Configuration</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Define thresholds that trigger automated notifications to administrators.</p>
        </div>
      </div>
      
      <div style={{ padding: '8px 24px' }}>
        {rules.map((rule, idx) => (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx < rules.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
            <div style={{ flex: 1, paddingRight: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{rule.title}</div>
              
              <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {rule.type === 'threshold' && (
                  <>
                    <span>Trigger when wallet drops below</span>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }}>₹</span>
                      <input type="number" className="cw-form-input" defaultValue={rule.threshold} style={{ width: '100px', padding: '4px 8px 4px 20px', fontSize: '13px' }} />
                    </div>
                  </>
                )}
                {rule.type === 'days' && (
                  <>
                    <span>Trigger when remaining time is under</span>
                    <input type="number" className="cw-form-input" defaultValue={rule.threshold} style={{ width: '60px', padding: '4px 8px', fontSize: '13px' }} />
                    <span>days</span>
                  </>
                )}
                {rule.type === 'event' && (
                  <span>{rule.description}</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Bell size={12} /> In-app</span>
                <input type="checkbox" defaultChecked={rule.inApp} style={{ width: '16px', height: '16px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> Email</span>
                <input type="checkbox" defaultChecked={rule.email} style={{ width: '16px', height: '16px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> SMS</span>
                <input type="checkbox" defaultChecked={rule.sms} style={{ width: '16px', height: '16px' }} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
