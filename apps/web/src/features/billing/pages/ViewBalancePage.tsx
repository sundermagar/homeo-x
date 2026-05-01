import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Building2, DollarSign, TrendingUp, TrendingDown,
  Calendar, RefreshCw, Download, ArrowRight, PieChart
} from 'lucide-react';
import { useBalanceSummary, useDailyCollection } from '../hooks/use-billing';
import '../styles/billing.css';

export default function ViewBalancePage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  const { data: collection } = useDailyCollection(selectedDate);
  const { data: balanceSummary } = useBalanceSummary(selectedDate);

  const totalReceived = collection?.totalReceived || 0;
  const totalCharges = collection?.totalCharges || 0;
  const totalBalance = collection?.totalBalance || 0;

  // Mock data - in real implementation these would come from API
  const cashInHand = totalReceived * 0.6; // Assuming 60% cash
  const bankBalance = totalReceived * 0.4; // Assuming 40% bank
  const todayExpenses = 1500; // Mock
  const todayDeposits = 2000; // Mock

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

  return (
    <div className="billing-page">
      {/* Header */}
      <div className="billing-header">
        <div className="billing-header-left">
          <h1 className="billing-title">
            <Wallet size={24} />
            View Balance
          </h1>
          <p className="billing-subtitle">Daily balance overview - Cash in hand and bank positions</p>
        </div>
        <div className="billing-header-actions">
          <button className="billing-btn secondary">
            <Download size={16} />
            Export Report
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
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <button className="date-nav-btn" onClick={handleNextDay}>
          Next →
        </button>
      </div>

      {/* Balance Summary Cards */}
      <div className="balance-cards-grid">
        {/* Cash in Hand */}
        <div className="balance-card cash">
          <div className="balance-card-header">
            <DollarSign size={28} />
            <span className="balance-card-badge">Cash</span>
          </div>
          <div className="balance-card-amount">
            ₹{cashInHand.toLocaleString('en-IN')}
          </div>
          <div className="balance-card-label">Cash in Hand</div>
          <div className="balance-card-breakdown">
            <span>Received: ₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="balance-card bank">
          <div className="balance-card-header">
            <Building2 size={28} />
            <span className="balance-card-badge">Bank</span>
          </div>
          <div className="balance-card-amount">
            ₹{bankBalance.toLocaleString('en-IN')}
          </div>
          <div className="balance-card-label">Bank Deposits</div>
          <div className="balance-card-breakdown">
            <span>Total: ₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Collection */}
        <div className="balance-card total">
          <div className="balance-card-header">
            <TrendingUp size={28} />
            <span className="balance-card-badge">Collection</span>
          </div>
          <div className="balance-card-amount">
            ₹{totalReceived.toLocaleString('en-IN')}
          </div>
          <div className="balance-card-label">Total Collection</div>
          <div className="balance-card-breakdown">
            <span>Charges: ₹{totalCharges.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="balance-card pending">
          <div className="balance-card-header">
            <TrendingDown size={28} />
            <span className="balance-card-badge">Pending</span>
          </div>
          <div className="balance-card-amount">
            ₹{totalBalance.toLocaleString('en-IN')}
          </div>
          <div className="balance-card-label">Balance Pending</div>
          <div className="balance-card-breakdown">
            <span>{collection?.recordCount || 0} transactions</span>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="balance-summary-section">
        <h3 className="section-title">
          <PieChart size={20} />
          Balance Summary for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        </h3>

        <div className="balance-summary-grid">
          {/* Opening Balance */}
          <div className="balance-summary-item">
            <span className="balance-summary-label">Opening Balance</span>
            <span className="balance-summary-value">₹0.00</span>
          </div>

          {/* Total Collection */}
          <div className="balance-summary-item highlight-success">
            <span className="balance-summary-label">+ Total Collection</span>
            <span className="balance-summary-value">₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>

          {/* Cash Deposits */}
          <div className="balance-summary-item">
            <span className="balance-summary-label">- Cash Deposits</span>
            <span className="balance-summary-value">₹{todayDeposits.toLocaleString('en-IN')}</span>
          </div>

          {/* Expenses */}
          <div className="balance-summary-item highlight-danger">
            <span className="balance-summary-label">- Expenses</span>
            <span className="balance-summary-value">₹{todayExpenses.toLocaleString('en-IN')}</span>
          </div>

          {/* Closing Balance */}
          <div className="balance-summary-item closing">
            <span className="balance-summary-label">Closing Balance</span>
            <span className="balance-summary-value">
              ₹{(cashInHand - todayExpenses).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="balance-nav-links">
        <button className="balance-nav-card" onClick={() => navigate('/billing/collection')}>
          <DollarSign size={24} />
          <span>View Collection</span>
          <ArrowRight size={16} />
        </button>
        <button className="balance-nav-card" onClick={() => navigate('/billing/deposits')}>
          <Building2 size={24} />
          <span>Deposits</span>
          <ArrowRight size={16} />
        </button>
        <button className="balance-nav-card" onClick={() => navigate('/billing/expenses')}>
          <TrendingDown size={24} />
          <span>Expenses</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}