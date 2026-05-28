import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Zap, Clock, User, Cpu, ChevronRight, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useRecentTransactions } from '../hooks/use-credit-data';

import { getAiModuleColor } from '../constants/aiModuleColors';

function getFeatureColor(feature: string | null) {
  if (!feature) return { bg: '#F3F4F6', text: '#6B7280' };
  const baseColor = getAiModuleColor(feature);
  // Optional: We can just use baseColor for text, and a semi-transparent version for bg
  return { bg: `${baseColor}1A`, text: baseColor };
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RecentTransactions() {
  const { data, loading } = useRecentTransactions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{
        background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB',
        padding: '24px', height: '100%', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Recent Activity</h3>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} />
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div style={{
      background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB',
      padding: '24px', height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={14} color="#fff" />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Recent Activity</h3>
        </div>
        <button
          onClick={() => navigate('/ai-credits/logs')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 600, color: '#6366F1',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: '6px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          View all <ArrowRight size={13} />
        </button>
      </div>

      {/* Transaction list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'auto' }}>
        {isEmpty ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#9CA3AF', gap: '8px', padding: '32px 0',
          }}>
            <Zap size={32} strokeWidth={1.5} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No transactions yet</span>
            <span style={{ fontSize: '11px' }}>AI usage will appear here</span>
          </div>
        ) : (
          data.slice(0, 6).map((tx: any, i: number) => {
            const fc = getFeatureColor(tx.feature);
            const isDeposit = tx.type === 'DEPOSIT';
            const creditVal = tx.amount || 0;

            return (
              <div
                key={tx.id || i}
                onClick={() => navigate('/ai-credits/logs')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '10px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  borderBottom: i < data.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Feature dot */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: isDeposit ? '#DCFCE7' : fc.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isDeposit
                    ? <TrendingUp size={16} color="#16A34A" />
                    : <TrendingDown size={16} color={fc.text} />
                  }
                </div>

                {/* Middle: feature + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600, color: '#111827',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {isDeposit ? 'Credit Top-up' : (tx.feature || 'AI Request')}
                    </span>
                    {tx.feature && !isDeposit && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                        padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.5px',
                        background: fc.bg, color: fc.text,
                        flexShrink: 0,
                      }}>
                        {tx.logStatus === 'SUCCESS' ? '✓' : tx.logStatus === 'FAILED' ? '✗' : '⟳'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '11px', color: '#9CA3AF',
                  }}>
                    {tx.userName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <User size={10} /> {tx.userName}
                      </span>
                    )}
                    {tx.modelId && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        <Cpu size={10} /> {tx.modelId.split('/').pop()}
                      </span>
                    )}
                    {tx.tokens > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Zap size={10} /> {tx.tokens.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: credits + time */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '14px', fontWeight: 700,
                    color: creditVal > 0 ? '#16A34A' : '#DC2626',
                  }}>
                    {creditVal > 0 ? '+' : ''}{creditVal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <Clock size={9} /> {formatTimeAgo(tx.createdAt)}
                  </div>
                </div>

                {/* Nav chevron */}
                <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {!isEmpty && (
        <div style={{
          marginTop: '12px', paddingTop: '12px',
          borderTop: '1px solid #F3F4F6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
            Showing last {Math.min(data.length, 6)} of {data.length} transactions
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
            Total: {data.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0).toLocaleString()} credits
          </span>
        </div>
      )}
    </div>
  );
}
