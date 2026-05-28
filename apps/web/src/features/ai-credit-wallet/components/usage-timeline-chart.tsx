import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useCreditTimeline } from '../hooks/use-credit-data';
import { getAiModuleColor } from '../constants/aiModuleColors';

export function UsageTimelineChart() {
  const [days, setDays] = useState<0 | 7 | 14 | 30>(0);
  const [endDateStr, setEndDateStr] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const { data } = useCreditTimeline(days, endDateStr);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
              {data.length > 0 ? `${data[0].date} – ` : ''}
            </span>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setDays(0);
              }}
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
            <button className={`cw-toggle-btn ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>Bar</button>
            <button className={`cw-toggle-btn ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>Line</button>
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
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(229, 231, 235, 0.4)' }} animationDuration={150} animationEasing="ease-out" />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#374151' }} 
                iconType="circle"
              />
              <Bar dataKey="Consultation" stackId="a" fill={getAiModuleColor('Consultation')} />
              <Bar dataKey="STT" stackId="a" fill={getAiModuleColor('STT')} />
              <Bar dataKey="Summarization" stackId="a" fill={getAiModuleColor('Summarization')} />
              <Bar dataKey="Prescription" stackId="a" fill={getAiModuleColor('Prescription')} />
              <Bar dataKey="WhatsApp" stackId="a" fill={getAiModuleColor('WhatsApp')} />
              <Bar dataKey="Email" stackId="a" fill={getAiModuleColor('Email')} />
              <Bar dataKey="SMS" stackId="a" fill={getAiModuleColor('SMS')} />
            </BarChart>
          ) : (
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(229, 231, 235, 0.4)', strokeWidth: 2 }} animationDuration={150} animationEasing="ease-out" />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#374151' }} 
                iconType="circle"
              />
              <Line type="monotone" dataKey="Consultation" stroke={getAiModuleColor('Consultation')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="STT" stroke={getAiModuleColor('STT')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Summarization" stroke={getAiModuleColor('Summarization')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Prescription" stroke={getAiModuleColor('Prescription')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="WhatsApp" stroke={getAiModuleColor('WhatsApp')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Email" stroke={getAiModuleColor('Email')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="SMS" stroke={getAiModuleColor('SMS')} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

