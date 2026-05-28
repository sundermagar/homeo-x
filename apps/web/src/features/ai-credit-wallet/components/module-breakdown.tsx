import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useModuleBreakdown } from '../hooks/use-credit-data';

export function ModuleBreakdown() {
  const { data, loading } = useModuleBreakdown();
  
  const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
  const totalFormatted = total > 1000 ? (total / 1000).toFixed(1) + 'K' : total.toString();

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
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
            {pData.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', gap: '8px' }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              backgroundColor: pData.color,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
            }} />
            <span style={{ color: '#D1D5DB' }}>{pData.name}:</span>
            <span style={{ fontWeight: 600 }}>{pData.percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="cw-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 className="cw-card-title" style={{ marginBottom: '24px' }}>Credit split by model</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF' }} />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="cw-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 className="cw-card-title" style={{ marginBottom: '24px' }}>Credit split by model</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px' }}>
          No model usage data available
        </div>
      </div>
    );
  }

  return (
    <div className="cw-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 className="cw-card-title" style={{ marginBottom: '24px' }}>Credit split by model</h3>
      
      <div style={{ position: 'relative', height: '220px', marginBottom: '24px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} animationDuration={150} animationEasing="ease-out" />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {totalFormatted}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>used</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
        {data.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color }} />
            <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}
            </div>
            <div style={{ fontSize: '12px', color: '#111827', fontWeight: 700 }}>{item.percent}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
