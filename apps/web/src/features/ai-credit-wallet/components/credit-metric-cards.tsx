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
        <div className="cw-stat-sub">Resets on {new Date(summary.resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': '#ea580c' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> CONSUMED
        </div>
        <div className="cw-stat-value">{summary.consumed.toLocaleString()}</div>
        <div className="cw-stat-sub">
          <strong>{summary.percentageUsed}%</strong> of total budget
        </div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': summary.remaining < (summary.totalAllocated * 0.1) ? '#ef4444' : summary.remaining < (summary.totalAllocated * 0.2) ? '#f59e0b' : '#3b82f6' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" style={{ backgroundColor: summary.remaining < (summary.totalAllocated * 0.1) ? '#ef4444' : summary.remaining < (summary.totalAllocated * 0.2) ? '#f59e0b' : undefined }} /> REMAINING
        </div>
        <div className="cw-stat-value">{summary.remaining.toLocaleString()}</div>
        <div className="cw-stat-sub">
          <strong>{summary.dailyBurnRate > 0 ? `~${Math.floor(summary.remaining / summary.dailyBurnRate)}` : '∞'} days</strong> at current burn
        </div>
      </div>

      <div className="cw-stat-card" style={{ '--top-color': '#d97706' } as React.CSSProperties}>
        <div className="cw-stat-title">
          <div className="cw-stat-dot" /> AVG DAILY BURN
        </div>
        <div className="cw-stat-value">{summary.dailyBurnRate.toLocaleString()}</div>
        <div className="cw-stat-sub">
          7-day average
        </div>
      </div>
    </div>
  );
}
