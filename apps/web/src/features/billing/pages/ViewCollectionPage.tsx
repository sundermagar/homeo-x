import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, CreditCard, Building2, Wallet, ShoppingBag,
  Calendar, TrendingDown, Landmark, Banknote, Info, Target,
  ListOrdered, BarChart3, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useExtendedDailySummary } from '../hooks/use-billing';
import { PaymentDrilldownModal } from '../components/PaymentDrilldownModal';
import { MonthListView } from '../components/MonthListView';
import { CollectionTargetView } from '../components/CollectionTargetView';
import '../styles/view-collection.css';

type ViewTab = 'daily' | 'monthList' | 'target';

export default function ViewCollectionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewTab>('daily');
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  const { data: summary, isLoading } = useExtendedDailySummary(selectedDate);

  // Drilldown modal state
  const [drilldown, setDrilldown] = useState<{ mode: string; title: string } | null>(null);

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

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const openDrilldown = (mode: string, title: string) => {
    setDrilldown({ mode, title: `${title} — ${formatDate(selectedDate)}` });
  };

  return (
    <div className="vc-page">
      {/* Header */}
      <div className="vc-header">
        <div className="vc-header-left">
          <h1 className="vc-title">
            <DollarSign size={22} />
            View Collection
          </h1>
          <p className="vc-subtitle">Daily collection overview & financial tracking</p>
        </div>
        <div className="vc-header-actions">
          <button
            className="vc-nav-link"
            onClick={() => navigate('/billing/deposits')}
          >
            <Landmark size={16} /> Deposits
          </button>
          <button
            className="vc-nav-link"
            onClick={() => navigate('/billing/expenses')}
          >
            <TrendingDown size={16} /> Expenses
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="vc-tabs">
        <button
          className={`vc-tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <DollarSign size={16} /> Day View
        </button>
        <button
          className={`vc-tab ${activeTab === 'monthList' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthList')}
        >
          <ListOrdered size={16} /> Month List
        </button>
        <button
          className={`vc-tab ${activeTab === 'target' ? 'active' : ''}`}
          onClick={() => setActiveTab('target')}
        >
          <Target size={16} /> Collection Target
        </button>
      </div>

      {/* Daily View */}
      {activeTab === 'daily' && (
        <>
          {/* Date Navigator */}
          <div className="vc-date-nav">
            <button className="vc-date-btn" onClick={handlePrevDay}>
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="vc-date-center">
              <Calendar size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="vc-date-input"
              />
              <span className="vc-date-display">{formatDate(selectedDate)}</span>
            </div>
            <button className="vc-date-btn" onClick={handleNextDay}>
              Next <ChevronRight size={18} />
            </button>
            <button className="vc-today-btn" onClick={handleToday}>Today</button>
          </div>

          {isLoading ? (
            <div className="vc-loading">Loading collection data...</div>
          ) : summary ? (
            <div className="vc-daily-content">
              {/* Main Cards Grid */}
              <div className="vc-cards-grid">
                {/* Left Column — Collection Breakdown */}
                <div className="vc-card-group">
                  <h3 className="vc-group-title">Collection Breakdown</h3>

                  <div className="vc-summary-card vc-card-total">
                    <div className="vc-card-icon"><DollarSign size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Total Collection</span>
                      <span className="vc-card-value">₹{summary.collection.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="vc-card-count">{summary.recordCount} txns</span>
                  </div>

                  <div className="vc-summary-card vc-card-cash">
                    <div className="vc-card-icon"><Banknote size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Cash</span>
                      <span className="vc-card-value">₹{summary.cash.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="vc-info-btn" onClick={() => openDrilldown('Cash', 'Cash Payment')}>
                      <Info size={14} />
                    </button>
                  </div>

                  <div className="vc-summary-card vc-card-card">
                    <div className="vc-card-icon"><CreditCard size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Credit Card</span>
                      <span className="vc-card-value">₹{summary.card.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="vc-info-btn" onClick={() => openDrilldown('Card', 'Credit Card Payment')}>
                      <Info size={14} />
                    </button>
                  </div>

                  <div className="vc-summary-card vc-card-cheque">
                    <div className="vc-card-icon"><Building2 size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Cheque</span>
                      <span className="vc-card-value">₹{summary.cheque.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="vc-info-btn" onClick={() => openDrilldown('Cheque', 'Cheque Payment')}>
                      <Info size={14} />
                    </button>
                  </div>

                  <div className="vc-summary-card vc-card-online">
                    <div className="vc-card-icon"><Wallet size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Online</span>
                      <span className="vc-card-value">₹{summary.online.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="vc-info-btn" onClick={() => openDrilldown('Online', 'Online Payment')}>
                      <Info size={14} />
                    </button>
                  </div>

                  <div className="vc-summary-card vc-card-product">
                    <div className="vc-card-icon"><ShoppingBag size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Product Charges</span>
                      <span className="vc-card-value">₹{summary.productCharges.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="vc-info-btn" onClick={() => openDrilldown('Product', 'Product Charges')}>
                      <Info size={14} />
                    </button>
                  </div>

                  <div className="vc-summary-card vc-card-expense">
                    <div className="vc-card-icon"><TrendingDown size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Expenses</span>
                      <span className="vc-card-value">₹{summary.expenses.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column — Deposits & Balances */}
                <div className="vc-card-group">
                  <h3 className="vc-group-title">Deposits & Balance</h3>

                  <div className="vc-summary-card vc-card-recp">
                    <div className="vc-card-icon"><Banknote size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Recp Handed (Cash Dep.)</span>
                      <span className="vc-card-value">₹{summary.cashDeposited.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className={`vc-summary-card ${summary.deficit >= 0 ? 'vc-card-positive' : 'vc-card-negative'}`}>
                    <div className="vc-card-icon"><BarChart3 size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Deficit</span>
                      <span className="vc-card-value">₹{summary.deficit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="vc-summary-card vc-card-bank">
                    <div className="vc-card-icon"><Landmark size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Bank Deposit</span>
                      <span className="vc-card-value">₹{summary.bankDeposit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="vc-summary-card vc-card-cih">
                    <div className="vc-card-icon"><Wallet size={20} /></div>
                    <div className="vc-card-body">
                      <span className="vc-card-label">Cash in Hand</span>
                      <span className="vc-card-value vc-card-value-big">₹{summary.cashInHand.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="vc-quick-links">
                    <button className="vc-quick-link" onClick={() => navigate('/billing/deposits')}>
                      <Banknote size={16} /> Cash Deposit
                    </button>
                    <button className="vc-quick-link" onClick={() => navigate('/billing/deposits')}>
                      <Landmark size={16} /> Bank Deposit
                    </button>
                    <button className="vc-quick-link" onClick={() => navigate('/billing/expenses')}>
                      <TrendingDown size={16} /> Expense
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="vc-empty">No data available for this date.</div>
          )}
        </>
      )}

      {/* Month List View */}
      {activeTab === 'monthList' && <MonthListView />}

      {/* Collection Target View */}
      {activeTab === 'target' && <CollectionTargetView />}

      {/* Payment Drilldown Modal */}
      {drilldown && (
        <PaymentDrilldownModal
          isOpen={!!drilldown}
          onClose={() => setDrilldown(null)}
          date={selectedDate}
          mode={drilldown.mode}
          title={drilldown.title}
        />
      )}
    </div>
  );
}
