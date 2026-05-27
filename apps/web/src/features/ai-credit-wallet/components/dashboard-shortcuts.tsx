import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, Key, ShieldCheck, ArrowRight } from 'lucide-react';

export function DashboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts = [
    {
      title: 'Model Directory',
      stat: '4 Active Models',
      desc: 'Manage AI Models & Budgets',
      icon: <Server size={20} color="#2563EB" />,
      bg: '#EFF6FF',
      path: '/ai-credits/models'
    },
    {
      title: 'Routing Rules',
      stat: '12 Chains Configured',
      desc: 'Configure Fallbacks',
      icon: <Activity size={20} color="#10B981" />,
      bg: '#ECFDF5',
      path: '/ai-credits/routing'
    },
    {
      title: 'Security Vault',
      stat: '2 Keys rotating soon',
      desc: 'Manage Encrypted Keys',
      icon: <Key size={20} color="#F59E0B" />,
      bg: '#FEF3C7',
      path: '/ai-credits/keys'
    },
    {
      title: 'Audit Logs',
      stat: '0 Anomalies Today',
      desc: 'View Request Ledgers',
      icon: <ShieldCheck size={20} color="#8B5CF6" />,
      bg: '#F5F3FF',
      path: '/ai-credits/logs'
    },
  ];

  return (
    <div className="cw-card" style={{ padding: '24px' }}>
      <h3 className="cw-card-title" style={{ marginBottom: '20px' }}>Quick Navigation</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {shortcuts.map((shortcut, idx) => (
          <div 
            key={idx} 
            className="cw-shortcut-card"
            onClick={() => navigate(shortcut.path)}
          >
            <div className="cw-shortcut-header">
              <div className="cw-shortcut-icon-wrapper" style={{ background: shortcut.bg }}>
                {shortcut.icon}
              </div>
              <ArrowRight className="cw-shortcut-arrow" size={16} />
            </div>
            
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>
              {shortcut.title}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
              {shortcut.stat}
            </div>
            
            <div className="cw-shortcut-action">
              {shortcut.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
