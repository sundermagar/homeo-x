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

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  const handlePrevDay = () => shiftDate(-1);
  const handleNextDay = () => shiftDate(1);

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
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="vc-date-input"
              />
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
              <div className="vc-ledger-layout">
                {/* Left Column: Collection Breakdown */}
                <div className="vc-ledger-panel">
                  <div className="vc-ledger-header">
                    <h3 className="vc-ledger-title">Collection Breakdown</h3>
                    <div className="vc-ledger-total">
                      Total: <span>₹{summary.collection.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="vc-ledger-table-wrap">
                    <table className="vc-ledger-table">
                      <tbody>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Banknote size={16} /> Cash
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.cash.toLocaleString('en-IN')}</td>
                          <td className="vc-right" style={{ width: 40 }}>
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Cash', 'Cash Payment')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <CreditCard size={16} /> Credit Card
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.card.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Card', 'Credit Card Payment')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Building2 size={16} /> Cheque
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.cheque.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Cheque', 'Cheque Payment')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Wallet size={16} /> Online
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.online.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Online', 'Online Payment')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Banknote size={16} /> UPI
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.upi.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('UPI', 'UPI Payment')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <ShoppingBag size={16} /> Product Charges
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.productCharges.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Product', 'Product Charges')} title="View Details">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Deposits & Balance */}
                <div className="vc-ledger-panel">
                  <div className="vc-ledger-header">
                    <h3 className="vc-ledger-title">Deposits & Balance</h3>
                    <div className="vc-ledger-total vc-cih-highlight">
                      Cash in Hand: <span>₹{summary.cashInHand.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="vc-ledger-table-wrap">
                    <table className="vc-ledger-table">
                      <tbody>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <TrendingDown size={16} /> Expenses
                            </div>
                          </td>
                          <td className="vc-right vc-bold vc-negative">₹{summary.expenses.toLocaleString('en-IN')}</td>
                          <td className="vc-right" style={{ width: 40 }}></td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Banknote size={16} /> Recp Handed (Cash Dep.)
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.cashDeposited.toLocaleString('en-IN')}</td>
                          <td className="vc-right"></td>
                        </tr>
                        <tr>
                          <td>
                            <div className="vc-ledger-label">
                              <Landmark size={16} /> Bank Deposit
                            </div>
                          </td>
                          <td className="vc-right vc-bold">₹{summary.bankDeposit.toLocaleString('en-IN')}</td>
                          <td className="vc-right"></td>
                        </tr>
                        <tr className="vc-ledger-highlight-row">
                          <td>
                            <div className="vc-ledger-label">
                              <BarChart3 size={16} /> Deficit / Surplus
                            </div>
                          </td>
                          <td className={`vc-right vc-bold ${summary.deficit >= 0 ? 'vc-positive' : 'vc-negative'}`}>
                            {summary.deficit > 0 ? '+' : ''}₹{summary.deficit.toLocaleString('en-IN')}
                          </td>
                          <td className="vc-right"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Links */}
                  <div className="vc-ledger-actions">
                    <button className="vc-action-btn" onClick={() => navigate('/billing/deposits')}>
                      <Banknote size={16} /> Add Cash Deposit
                    </button>
                    <button className="vc-action-btn" onClick={() => navigate('/billing/deposits')}>
                      <Landmark size={16} /> Add Bank Deposit
                    </button>
                    <button className="vc-action-btn vc-action-btn-danger" onClick={() => navigate('/billing/expenses')}>
                      <TrendingDown size={16} /> Add Expense
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
