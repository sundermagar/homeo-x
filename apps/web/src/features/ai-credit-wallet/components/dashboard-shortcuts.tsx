import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, Key, ShieldCheck, ArrowRight } from 'lucide-react';

import { useAIModels } from '../hooks/use-ai-models-data';
import { useRoutingRules } from '../hooks/use-routing-data';
import { useApiKeys } from '../hooks/use-api-keys-data';
import { useRequestLogs } from '../hooks/use-logs-data';

export function DashboardShortcuts() {
  const navigate = useNavigate();

  // Fetch data to make stats dynamic
  const { data: models = [] } = useAIModels();
  const { data: rules = [] } = useRoutingRules();
  const { data: keys = [] } = useApiKeys();
  const { data: logs = [] } = useRequestLogs();

  const activeModelsCount = models.filter(m => m.status === 'Active').length;
  const configuredChainsCount = rules.length;
  const rotatingSoonKeysCount = keys.filter(k => k.status === 'Expiring soon').length;
  const activeKeysCount = keys.filter(k => k.status === 'Valid').length;

  const todayStr = new Date().toISOString().split('T')[0] || '';
  const todayAnomalies = logs.filter(l => 
    l.status === 'FAILED' && l.createdAt.startsWith(todayStr)
  ).length;

  const shortcuts = [
    {
      title: 'Model Directory',
      stat: `${activeModelsCount} Active Models`,
      desc: 'Manage AI Models & Budgets',
      icon: <Server size={20} color="#2563EB" />,
      bg: '#EFF6FF',
      path: '/ai-credits/models'
    },
    {
      title: 'Routing Rules',
      stat: `${configuredChainsCount} Chains Configured`,
      desc: 'Configure Fallbacks',
      icon: <Activity size={20} color="#10B981" />,
      bg: '#ECFDF5',
      path: '/ai-credits/routing'
    },
    {
      title: 'Security Vault',
      stat: keys.length === 0 ? '0 Keys Configured' : (rotatingSoonKeysCount > 0 ? `${rotatingSoonKeysCount} Keys rotating soon` : `${activeKeysCount} Active Keys`),
      statColor: keys.length === 0 ? '#EF4444' : '#111827',
      desc: 'Manage Encrypted Keys',
      icon: <Key size={20} color={keys.length === 0 ? "#EF4444" : "#F59E0B"} />,
      bg: keys.length === 0 ? '#FEE2E2' : '#FEF3C7',
      path: '/ai-credits/keys'
    },
    {
      title: 'Audit Logs',
      stat: `${todayAnomalies} Anomalies Today`,
      statColor: todayAnomalies > 0 ? '#EF4444' : '#111827',
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
            <div style={{ fontSize: '15px', fontWeight: 700, color: (shortcut as any).statColor || '#111827', marginBottom: '16px' }}>
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
