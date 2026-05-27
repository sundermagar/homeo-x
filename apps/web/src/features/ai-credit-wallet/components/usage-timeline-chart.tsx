import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useCreditTimeline } from '../hooks/use-credit-data';

export function UsageTimelineChart() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [endDateStr, setEndDateStr] = useState<string>('2026-05-27');
  const data = useCreditTimeline(days, endDateStr);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: '#1F2937', 
          border: '1px solid #374151',
          borderRadius: '6px', 
          padding: '12px',
          color: '#F9FAFB',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
            {label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', gap: '8px' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: entry.color,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                }} />
                <span style={{ color: '#D1D5DB' }}>{entry.name === 'EmailSMS' ? 'Email/SMS' : entry.name}:</span>
                <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cw-card">
      <div className="cw-card-header">
        <h3 className="cw-card-title">Credit consumption over time</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
              {data.length > 0 ? `${data[0].date} – ` : ''}
            </span>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              style={{ 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                padding: '4px 8px', 
                fontSize: '12px', 
                color: '#374151',
                fontWeight: 600,
                background: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <div className="cw-toggle-group">
            <button className={`cw-toggle-btn ${days === 7 ? 'active' : ''}`} onClick={() => setDays(7)}>7 days</button>
            <button className={`cw-toggle-btn ${days === 14 ? 'active' : ''}`} onClick={() => setDays(14)}>14 days</button>
            <button className={`cw-toggle-btn ${days === 30 ? 'active' : ''}`} onClick={() => setDays(30)}>30 days</button>
          </div>
        </div>
      </div>
      
      <div style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              axisLine={{ stroke: '#E5E7EB' }} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(val) => val === 0 ? '0' : val.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '3 3' }} animationDuration={150} animationEasing="ease-out" />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#374151' }} 
              iconType="plainline"
            />
            <Line type="monotone" dataKey="Consultation" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="STT" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="Summarisation" stroke="#ea580c" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="Prescription" stroke="#b45309" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="WhatsApp" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="EmailSMS" name="Email/SMS" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
