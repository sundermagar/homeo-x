import React from 'react';
import { useFailedRequestsData } from '../hooks/use-logs-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { ShieldAlert, Activity } from 'lucide-react';

export function FailedRequestsDashboard() {
  const data = useFailedRequestsData();

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Failed Request Analytics</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Identify patterns in API failures, rate limits, and overloaded models.</p>
        </div>
      </div>
      
      <div style={{ padding: '32px 24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {data.map((item) => (
            <div key={item.errorType} style={{ background: '#F9FAFB', border: `1px solid ${item.color}30`, borderRadius: '8px', padding: '16px', borderTop: `4px solid ${item.color}` }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>{item.errorType}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{item.count}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Last 30 days</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={18} color="#3B82F6" />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Failure Distribution by Type</h4>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="errorType" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
