import React, { useState } from 'react';
import { Target, Save } from 'lucide-react';
import { useCollectionTarget, useSetTarget } from '../hooks/use-billing';

export function CollectionTargetView() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [newTarget, setNewTarget] = useState('');
  const { data, isLoading } = useCollectionTarget(month);
  const setTargetMutation = useSetTarget();

  const handleSetTarget = () => {
    const amt = Number(newTarget);
    if (amt > 0) {
      setTargetMutation.mutate(amt, {
        onSuccess: () => setNewTarget(''),
      });
    }
  };

  return (
    <div className="vc-target-view">
      <div className="vc-target-header">
        <h2><Target size={20} /> Collection Target</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="vc-date-input"
          />
        </div>
      </div>

      {/* Set Target Form */}
      <div className="vc-target-form">
        <div className="vc-target-current">
          <span className="vc-target-label">Monthly Target:</span>
          <span className="vc-target-amount">₹{(data?.monthlyTarget || 0).toLocaleString('en-IN')}</span>
          <span className="vc-target-info">
            ({data?.workingDays || 0} working days • ₹{(data?.dailyTarget || 0).toLocaleString('en-IN')}/day)
          </span>
        </div>
        <div className="vc-target-set">
          <input
            type="number"
            placeholder="New target amount..."
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="vc-target-input"
          />
          <button
            className="vc-target-btn"
            onClick={handleSetTarget}
            disabled={setTargetMutation.isPending || !newTarget}
          >
            <Save size={16} />
            {setTargetMutation.isPending ? 'Saving...' : 'Set Target'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="vc-loading">Loading target data...</div>
      ) : (
        <div className="vc-table-scroll">
          <table className="vc-table vc-target-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="vc-right">Collection</th>
                <th className="vc-right">Daily Target</th>
                <th className="vc-right">+/−</th>
                <th className="vc-right">Cumulative Coll.</th>
                <th className="vc-right">Cumulative Target</th>
                <th className="vc-right">Cumulative +/−</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows || []).map((row, idx) => (
                <tr
                  key={idx}
                  className={row.isSunday ? 'vc-row-sunday' : row.collection === 0 && !row.isSunday ? 'vc-row-zero' : ''}
                >
                  <td className="vc-date-cell">{row.date}</td>
                  {row.isSunday ? (
                    <>
                      <td className="vc-right vc-sunday-label" colSpan={6}>Sunday</td>
                    </>
                  ) : (
                    <>
                      <td className="vc-right vc-bold">₹{row.collection.toLocaleString('en-IN')}</td>
                      <td className="vc-right">₹{row.dailyTarget.toLocaleString('en-IN')}</td>
                      <td className={`vc-right vc-bold ${row.difference >= 0 ? 'vc-positive' : 'vc-negative'}`}>
                        {row.difference >= 0 ? '+' : ''}₹{row.difference.toLocaleString('en-IN')}
                      </td>
                      <td className="vc-right">₹{row.cumulativeCollection.toLocaleString('en-IN')}</td>
                      <td className="vc-right">₹{row.cumulativeTarget.toLocaleString('en-IN')}</td>
                      <td className={`vc-right vc-bold ${row.cumulativeDifference >= 0 ? 'vc-positive' : 'vc-negative'}`}>
                        {row.cumulativeDifference >= 0 ? '+' : ''}₹{row.cumulativeDifference.toLocaleString('en-IN')}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
