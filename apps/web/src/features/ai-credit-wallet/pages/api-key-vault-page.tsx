import React, { useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import { KeyVaultList } from '../components/key-vault-list';
import { KeyAuditTable } from '../components/key-audit-table';
import { AddKeyModal } from '../components/add-key-modal';
import '../styles/credit-wallet.css';

export default function ApiKeyVaultPage() {
  const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');
  const [showAddKey, setShowAddKey] = useState(false);

  return (
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh' }}>
      <div className="cw-header">
        <div>
          <h1>
            <Shield size={18} />
            Security Vault
          </h1>
          <p>Securely store encrypted provider keys, track expiry dates, and manage key rotation.</p>
        </div>
        <button 
          className="plat-btn plat-btn-ghost" 
          onClick={() => setShowAddKey(true)}
          style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Key
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
          <button 
            onClick={() => setActiveTab('vault')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'vault' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'vault' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Configured Keys
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'audit' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'audit' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Security Audit Log
          </button>
        </div>
      </div>

      {activeTab === 'vault' && <KeyVaultList />}
      {activeTab === 'audit' && <KeyAuditTable />}

      {showAddKey && <AddKeyModal onClose={() => setShowAddKey(false)} />}
    </div>
  );
}
