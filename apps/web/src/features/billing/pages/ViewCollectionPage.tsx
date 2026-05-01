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
          <button className="billing-btn secondary" onClick={() => refetch()}>
            <RefreshCw size={16} />
            Refresh
          </button>
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
                    <td className="bill-no">#{record.billNo || record.id}</td>
                    <td className="patient-name">
                      <button
                        className="link-btn"
                        onClick={() => navigate(`/patients/${record.regid}`)}
                      >
                        {record.patientName || `Patient ${record.regid}`}
                      </button>
                    </td>
                    <td className="phone">{record.phone || '—'}</td>
                    <td className="charges">₹{(record.charges || 0).toLocaleString('en-IN')}</td>
                    <td className="received success">₹{(record.received || 0).toLocaleString('en-IN')}</td>
                    <td className={`balance ${(record.balance || 0) > 0 ? 'pending' : 'paid'}`}>
                      ₹{(record.balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`payment-badge ${record.paymentMode?.toLowerCase() || 'cash'}`}>
                        {record.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="date">
                      {record.billDate ? new Date(record.billDate).toLocaleDateString('en-GB') : '—'}
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
    </div>
  );
}
