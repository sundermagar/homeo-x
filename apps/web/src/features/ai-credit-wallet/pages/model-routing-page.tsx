import React, { useState } from 'react';
import { Activity, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RoutingRulesTable } from '../components/routing-rules-table';
import { ClinicWalletsTable } from '../components/clinic-wallets-table';
import { AlertConfigList } from '../components/alert-config-list';
import '../styles/credit-wallet.css';
import '../../platform/styles/platform.css';

export default function ModelRoutingPage() {
  const [activeTab, setActiveTab] = useState<'routing' | 'wallets' | 'alerts'>('routing');

  return (
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh' }}>
      <div className="cw-header">
        <div>
          <h1>
            <Activity size={18} />
            Routing Rules
          </h1>
          <p>Map features to primary and fallback models, set daily budget caps, and configure alerts.</p>
        </div>
        <button 
          className="plat-btn plat-btn-ghost" 
          onClick={() => toast({ title: 'Feature Complete', description: 'All core platform features are currently mapped. Custom routing coming in v2.' })}
          style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Route
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
          <button 
            onClick={() => setActiveTab('routing')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'routing' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'routing' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Feature Routing Rules
          </button>
          <button 
            onClick={() => setActiveTab('wallets')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'wallets' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'wallets' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Multi-Tenant Sub-Wallets
          </button>
          <button 
            onClick={() => setActiveTab('alerts')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'alerts' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'alerts' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Budget Alerts
          </button>
        </div>
      </div>

      {activeTab === 'routing' && <RoutingRulesTable />}
      {activeTab === 'wallets' && <ClinicWalletsTable />}
      {activeTab === 'alerts' && <AlertConfigList />}
      
    </div>
  );
}
