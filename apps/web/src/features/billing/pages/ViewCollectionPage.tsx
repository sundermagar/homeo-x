import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Building2,
  Calendar, Search, Filter, Download, RefreshCw, Target, ChevronRight
} from 'lucide-react';
import { useCollectionSummary, useDailyCollection } from '../hooks/use-billing';
import { useAuthStore } from '@/shared/stores/auth-store';
import '../styles/billing.css';

export default function ViewCollectionPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [activeView, setActiveView] = useState<'collection' | 'deposit' | 'expense'>('collection');

  const { data: collection, isLoading, refetch } = useDailyCollection(selectedDate);
  const { data: summary } = useCollectionSummary(selectedDate);
  const user = useAuthStore(s => s.user);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Calculate payment mode breakdown
  const paymentBreakdown = {
    cash: collection?.records?.filter(r => r.paymentMode === 'Cash').reduce((s, r) => s + (r.received || 0), 0) || 0,
    card: collection?.records?.filter(r => r.paymentMode === 'Card').reduce((s, r) => s + (r.received || 0), 0) || 0,
    cheque: collection?.records?.filter(r => r.paymentMode === 'Cheque').reduce((s, r) => s + (r.received || 0), 0) || 0,
    online: collection?.records?.filter(r => r.paymentMode === 'Online').reduce((s, r) => s + (r.received || 0), 0) || 0,
    other: collection?.records?.filter(r => !['Cash', 'Card', 'Cheque', 'Online'].includes(r.paymentMode || '')).reduce((s, r) => s + (r.received || 0), 0) || 0,
  };

  return (
    <div className="billing-page">
      {/* Header */}
      <div className="billing-header">
        <div className="billing-header-left">
          <h1 className="billing-title">
            <DollarSign size={24} />
            View Collection
          </h1>
          <p className="billing-subtitle">Daily collection overview and payment analysis</p>
        </div>
        <div className="billing-header-actions">
          <button className="billing-btn secondary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="date-navigator">
        <button className="date-nav-btn" onClick={handlePrevDay}>
          ← Previous
        </button>
        <div className="date-input-group">
          <Calendar size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="date-input"
          />
        </div>
        <button className="date-nav-btn" onClick={handleNextDay}>
          Next →
        </button>
        <button className="date-today-btn" onClick={handleToday}>
          Today
        </button>
      </div>

      {/* Summary Cards */}
      <div className="collection-summary-cards">
        <div className="summary-card total">
          <div className="summary-card-icon">
            <DollarSign size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Total Collection</span>
            <span className="summary-card-value">
              ₹{(collection?.totalReceived || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="summary-card cash">
          <div className="summary-card-icon">
            <DollarSign size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Cash</span>
            <span className="summary-card-value">
              ₹{paymentBreakdown.cash.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="summary-card card">
          <div className="summary-card-icon">
            <CreditCard size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Card</span>
            <span className="summary-card-value">
              ₹{paymentBreakdown.card.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="summary-card cheque">
          <div className="summary-card-icon">
            <Building2 size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Cheque</span>
            <span className="summary-card-value">
              ₹{paymentBreakdown.cheque.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="summary-card online">
          <div className="summary-card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Online</span>
            <span className="summary-card-value">
              ₹{paymentBreakdown.online.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats-row">
        <div className="quick-stat">
          <span className="quick-stat-label">Total Charges</span>
          <span className="quick-stat-value">₹{(collection?.totalCharges || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Received</span>
          <span className="quick-stat-value success">₹{(collection?.totalReceived || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Balance Pending</span>
          <span className="quick-stat-value danger">₹{(collection?.totalBalance || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Transactions</span>
          <span className="quick-stat-value">{collection?.recordCount || 0}</span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveView('collection')}
        >
          Collection List
        </button>
        <button
          className={`view-tab ${activeView === 'deposit' ? 'active' : ''}`}
          onClick={() => navigate('/billing/deposits')}
        >
          Deposits
        </button>
        <button
          className={`view-tab ${activeView === 'expense' ? 'active' : ''}`}
          onClick={() => navigate('/billing/expenses')}
        >
          Expenses
        </button>
      </div>

      {/* Collection Table */}
      {activeView === 'collection' && (
        <div className="billing-table-container">
          {isLoading ? (
            <div className="billing-loading">Loading collection data...</div>
          ) : collection?.records && collection.records.length > 0 ? (
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Charges</th>
                  <th>Received</th>
                  <th>Balance</th>
                  <th>Payment Mode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {collection.records.map((record: any) => (
                  <tr key={record.id}>
                    <td data-label="Bill No" className="bill-no">
                      <div>#{record.billNo || record.id}</div>
                    </td>
                    <td data-label="Patient" className="patient-name">
                      <div>
                        <button
                          className="link-btn"
                          onClick={() => navigate(`/patients/${record.regid}`)}
                        >
                          {record.patientName || `Patient ${record.regid}`}
                        </button>
                      </div>
                    </td>
                    <td data-label="Phone" className="phone">
                      <div>{record.phone || '—'}</div>
                    </td>
                    <td data-label="Charges" className="charges">
                      <div className="plat-cell-val">₹{(record.charges || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td data-label="Received" className="received success">
                      <div className="plat-cell-val">₹{(record.received || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td data-label="Balance" className={`balance ${(record.balance || 0) > 0 ? 'pending' : 'paid'}`}>
                      <div className="plat-cell-val">₹{(record.balance || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td data-label="Mode">
                      <div className="plat-cell-val">
                        <span className={`payment-badge ${record.paymentMode?.toLowerCase() || 'cash'}`}>
                          {record.paymentMode || 'Cash'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Date" className="date">
                      <div>{record.billDate ? new Date(record.billDate).toLocaleDateString('en-GB') : '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="billing-empty">
              <DollarSign size={48} />
              <h3>No collection records</h3>
              <p>No billing records found for {selectedDate}</p>
            </div>
          )}
        </div>
      )}
      <style>{`
        @media (max-width: 1024px) {
          .billing-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .billing-header-actions { width: 100%; }
          .billing-header-actions .billing-btn { width: 100%; height: 44px; justify-content: center; border-radius: 12px; }

          .date-navigator { flex-wrap: wrap; gap: 8px !important; }
          .date-nav-btn { flex: 1; min-width: 120px; height: 40px; justify-content: center; }
          .date-input-group { width: 100% !important; order: -1; margin-bottom: 8px; height: 44px; }
          .date-today-btn { width: 100%; height: 40px; justify-content: center; }

          .collection-summary-cards { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .summary-card { padding: 12px !important; }
          .summary-card-icon { width: 36px !important; height: 36px !important; min-width: 36px !important; }
          .summary-card-value { font-size: 16px !important; }

          .quick-stats-row { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; padding: 12px !important; }
          .quick-stat { padding: 0 !important; border: none !important; }

          .view-tabs { width: 100%; display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
          .view-tab { flex: 1; min-width: 110px; white-space: nowrap; height: 36px; padding: 0 12px !important; font-size: 12px !important; }

          .billing-table-container { border: none !important; background: transparent !important; box-shadow: none !important; }
          .billing-table { display: block !important; width: 100% !important; }
          .billing-table thead { display: none !important; }
          .billing-table tbody { display: block !important; width: 100% !important; }
          .billing-table tr { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
          }
          .billing-table td {
            display: grid !important;
            grid-template-columns: 120px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 48px;
            text-align: right !important;
          }
          .billing-table td:last-child { border-bottom: none !important; }
          
          .billing-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            text-align: left !important;
          }
          .plat-cell-val { width: 100% !important; text-align: right !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; }
          [data-label="Bill No"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; margin-bottom: 4px; }
        }
      `}</style>
    </div>
  );
}
