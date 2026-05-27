import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useBurnForecast, useCreditSummary } from '../hooks/use-credit-data';

interface BurnRateForecastProps {
  onTopUp?: () => void;
}

export function BurnRateForecast({ onTopUp }: BurnRateForecastProps) {
  const forecast = useBurnForecast();
  const summary = useCreditSummary();
  
  const widthPercent = (summary.consumed / summary.totalAllocated) * 100;

  return (
    <div className="cw-card" style={{ height: '100%' }}>
      <h3 className="cw-card-title" style={{ marginBottom: '20px' }}>Burn rate & forecast</h3>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
          <span style={{ color: '#4B5563' }}>Credits used this cycle</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            {summary.consumed.toLocaleString()} <span style={{ color: '#6B7280', fontWeight: 400 }}>/ {summary.totalAllocated.toLocaleString()}</span>
          </span>
        </div>
        <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${widthPercent}%`, 
              background: 'linear-gradient(90deg, #10b981 0%, #ea580c 100%)',
              borderRadius: '3px'
            }} 
          />
        </div>
      </div>

      <div className="cw-burn-list">
        <div className="cw-burn-item">
          <div className="cw-burn-label">Avg daily burn</div>
          <div className="cw-burn-val">{summary.dailyBurnRate.toLocaleString()} credits</div>
        </div>
        <div className="cw-burn-item">
          <div className="cw-burn-label">Credits will last</div>
          <div className="cw-burn-val danger">~{forecast.daysRemainingCredits} more days</div>
        </div>
        <div className="cw-burn-item">
          <div className="cw-burn-label">Cycle resets</div>
          <div className="cw-burn-val">{forecast.exhaustionDate}</div>
        </div>
        <div className="cw-burn-item">
          <div className="cw-burn-label">Projected shortfall</div>
          <div className="cw-burn-val danger">~{forecast.projectedShortfall.toLocaleString()} credits</div>
        </div>
      </div>

      <button className="cw-topup-btn" onClick={onTopUp}>
        <ArrowUpRight size={16} /> Top up wallet
      </button>
    </div>
  );
}
