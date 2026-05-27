import React from 'react';
import { Plus, Mic, MessageCircle, FileText, Link } from 'lucide-react';
import { useRecentTransactions } from '../hooks/use-credit-data';

export function RecentTransactions() {
  const data = useRecentTransactions();

  const getIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus size={18} />;
      case 'stt': return <Mic size={18} />;
      case 'whatsapp': return <MessageCircle size={18} />;
      case 'summary': return <FileText size={18} />;
      case 'prescription': return <Link size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="cw-card" style={{ height: '100%' }}>
      <div className="cw-card-header">
        <h3 className="cw-card-title">Recent transactions</h3>
        <div className="cw-card-header-right">Last 24 hours</div>
      </div>
      
      <div className="cw-tx-list">
        {data.map((tx) => (
          <div key={tx.id} className="cw-tx-item">
            <div className={`cw-tx-icon ${tx.type}`}>
              {getIcon(tx.type)}
            </div>
            <div className="cw-tx-content">
              <div className="cw-tx-title">{tx.title}</div>
              <div className="cw-tx-time">{tx.time}</div>
            </div>
            <div className={`cw-tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
