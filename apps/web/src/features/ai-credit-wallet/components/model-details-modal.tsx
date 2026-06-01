import React from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, Server, AlertCircle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { useModelDetails, AIModel } from '../hooks/use-ai-models-data';

interface ModelDetailsModalProps {
  model: AIModel;
  onClose: () => void;
}

export function ModelDetailsModal({ model, onClose }: ModelDetailsModalProps) {
  const details = useModelDetails(model.id);

  if (!details) return null;

  return createPortal(
    <>
      <div className="cw-slide-overlay" onClick={onClose} />
      <div className="cw-slide-panel" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="cw-slide-header">
          <div>
            <div className="cw-slide-title">{model.name} Usage Statistics</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Provider: {model.provider} · ID: {model.id}</div>
          </div>
          <button className="plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cw-slide-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="cw-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Monthly Requests</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{model.monthlyRequests.toLocaleString()}</div>
            </div>
            <div className="cw-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Average Latency (p50)</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{details.latencyP50} <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>ms</span></div>
            </div>
            <div className="cw-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Error Rate (7 days)</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: details.errorRate > 1 ? '#991B1B' : '#166534' }}>
                {details.errorRate}%
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="cw-card" style={{ padding: '20px' }}>
              <h3 className="cw-card-title" style={{ marginBottom: '16px' }}>Daily Request Volume (30 Days)</h3>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={details.dailyRequests}>
                    <defs>
                      <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="requests" stroke="#2563EB" fillOpacity={1} fill="url(#colorReq)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="cw-card" style={{ padding: '20px' }}>
              <h3 className="cw-card-title" style={{ marginBottom: '16px' }}>Top Features</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {details.topFeatures.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{f.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{f.percentage}%</span>
                  </div>
                ))}
              </div>
              
              {model.pricingBasis === 'Input + Output tokens' && (
                <div style={{ marginTop: '32px' }}>
                  <h3 className="cw-card-title" style={{ marginBottom: '16px' }}>Token Split</h3>
                  <div style={{ height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Tokens', input: 8.5, output: 3.2 }]} layout="vertical" barSize={30}>
                        <XAxis type="number" hide />
                        <Tooltip cursor={false} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="input" name="Input (M)" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} />
                        <Bar dataKey="output" name="Output (M)" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
