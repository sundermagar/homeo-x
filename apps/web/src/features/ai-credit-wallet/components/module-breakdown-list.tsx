import React from 'react';
import { Bot, Mic, FileText, Link, MessageCircle, Mail, MessageSquare } from 'lucide-react';
import { useModuleBreakdown } from '../hooks/use-credit-data';
import { getAiModuleColor } from '../constants/aiModuleColors';
import { Loader2 } from 'lucide-react';

export function ModuleBreakdownList() {
  const { data, loading } = useModuleBreakdown();

  const getIcon = (name: string) => {
    const color = getAiModuleColor(name);
    if (name.includes('Consultation')) return <Bot size={16} color={color} />;
    if (name.includes('STT')) return <Mic size={16} color={color} />;
    if (name.includes('Summarization')) return <FileText size={16} color={color} />;
    if (name.includes('Prescription')) return <Link size={16} color={color} />;
    if (name.includes('WhatsApp')) return <MessageCircle size={16} color={color} />;
    if (name.includes('Email')) return <Mail size={16} color={color} />;
    return <MessageSquare size={16} color={color} />;
  };

  const maxVal = Math.max(...data.map((d: any) => d.value));

  return (
    <div className="cw-card" style={{ height: '100%' }}>
      <div className="cw-card-header">
        <h3 className="cw-card-title">Module breakdown</h3>
        <div className="cw-card-header-right">vs last cycle</div>
      </div>
      
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px', padding: '40px 0' }}>
          No usage data available
        </div>
      ) : (
      <div className="cw-module-list">
        {data.map((item: any, i: number) => (
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
      )}
    </div>
  );
}
