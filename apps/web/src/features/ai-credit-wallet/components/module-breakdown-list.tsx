import React from 'react';
import { Bot, Mic, FileText, Link, MessageCircle, Mail, MessageSquare } from 'lucide-react';
import { useModuleBreakdown } from '../hooks/use-credit-data';

export function ModuleBreakdownList() {
  const data = useModuleBreakdown();

  const getIcon = (name: string) => {
    if (name.includes('Consultation')) return <Bot size={16} color="#10b981" />;
    if (name.includes('STT')) return <Mic size={16} color="#2563eb" />;
    if (name.includes('Summarisation')) return <FileText size={16} color="#ea580c" />;
    if (name.includes('Prescription')) return <Link size={16} color="#b45309" />;
    if (name.includes('WhatsApp')) return <MessageCircle size={16} color="#8b5cf6" />;
    if (name.includes('Email')) return <Mail size={16} color="#9ca3af" />;
    return <MessageSquare size={16} color="#d1d5db" />;
  };

  const maxVal = Math.max(...data.map(d => d.value));

  return (
    <div className="cw-card" style={{ height: '100%' }}>
      <div className="cw-card-header">
        <h3 className="cw-card-title">Module breakdown</h3>
        <div className="cw-card-header-right">vs last cycle</div>
      </div>
      
      <div className="cw-module-list">
        {data.map((item, i) => (
          <div key={i} className="cw-module-item">
            <div className="cw-module-icon">
              {getIcon(item.name)}
            </div>
            <div className="cw-module-name">{item.name}</div>
            
            <div className="cw-module-bar-container">
              <div 
                className="cw-module-bar" 
                style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }} 
              />
            </div>
            
            <div className="cw-module-value">{item.value.toLocaleString()}</div>
            
            <div style={{ width: '45px', textAlign: 'right' }}>
              {item.trend !== 0 ? (
                <span className={`cw-badge ${item.trend > 0 ? 'cw-badge-up' : 'cw-badge-down'}`}>
                  {item.trend > 0 ? '↑' : '↓'}{Math.abs(item.trend)}%
                </span>
              ) : (
                <span className="cw-badge cw-badge-neutral">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
