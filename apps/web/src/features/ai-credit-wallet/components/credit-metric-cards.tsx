import React from 'react';
import { useCreditSummary } from '../hooks/use-credit-data';

export function CreditMetricCards() {
  const summary = useCreditSummary();

  return (
    <div className="cw-metrics-row">
      <div className="cw-stat-card" style={{ '--top-color': '#10b981' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> TOTAL CREDITS
        </div>
        <div className="cw-stat-value">{summary.totalAllocated.toLocaleString()}</div>
        <div className="cw-stat-sub">Current billing cycle</div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': '#ea580c' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> CONSUMED
        </div>
        <div className="cw-stat-value">{summary.consumed.toLocaleString()}</div>
        <div className="cw-stat-sub">
          <strong>{summary.percentageUsed}%</strong> of total used
        </div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': '#2563eb' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> REMAINING
        </div>
        <div className="cw-stat-value">{summary.remaining.toLocaleString()}</div>
        <div className="cw-stat-sub">
          <strong>~{Math.floor(summary.remaining / summary.dailyBurnRate)} days</strong> at current burn
        </div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': '#d97706' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> DAILY BURN
        </div>
        <div className="cw-stat-value">{summary.dailyBurnRate.toLocaleString()}</div>
        <div className="cw-stat-sub">
          <span className={summary.burnRateTrend > 0 ? 'cw-trend-down' : 'cw-trend-up'}>
            {summary.burnRateTrend > 0 ? '↑' : '↓'} {Math.abs(summary.burnRateTrend)}%
          </span>{' '}
          vs last week
        </div>
      </div>
    </div>
  );
}
