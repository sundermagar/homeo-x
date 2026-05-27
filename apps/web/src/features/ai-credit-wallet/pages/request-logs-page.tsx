import React, { useState } from 'react';
import { FileText, Download, Plus } from 'lucide-react';
import { AuditLogsTable } from '../components/audit-logs-table';
import { FailedRequestsDashboard } from '../components/failed-requests-dashboard';
import { toast } from '@/hooks/use-toast';
import '../styles/credit-wallet.css';

export default function RequestLogsPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'analysis'>('audit');

  const handleExport = () => {
    toast({
      title: 'Export Initiated',
      description: 'Your CSV export is processing. A download link will be emailed to you shortly.',
    });
  };

  return (
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh' }}>
      <div className="cw-header">
        <div>
          <h1>
            <FileText size={18} />
            Request & Response Logs
          </h1>
          <p>Full audit trail of AI model interactions, token consumption, and cost attribution.</p>
        </div>
        <button 
          className="plat-btn plat-btn-ghost" 
          onClick={handleExport}
          style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
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
            Audit Trail
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'analysis' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'analysis' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Failure Analysis
          </button>
        </div>
      </div>

      {activeTab === 'audit' && <AuditLogsTable />}
      {activeTab === 'analysis' && <FailedRequestsDashboard />}
    </div>
  );
}
