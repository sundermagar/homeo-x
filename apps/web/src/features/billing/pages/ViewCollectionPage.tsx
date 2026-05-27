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
import { AddDepositDrawer } from '../components/AddDepositDrawer';
import { AddExpenseDrawer } from '../components/AddExpenseDrawer';
import '../styles/view-collection.css';
import '@/features/appointments/styles/appointments.css';

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

  // Quick Actions Drawer States
  const [depositDrawer, setDepositDrawer] = useState<{ isOpen: boolean, tab: 'bank' | 'cash' }>({ isOpen: false, tab: 'cash' });
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);

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
    <div className="pp-page-container appt-page animate-fade-in">
      {/* Hero Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <DollarSign size={22} strokeWidth={1.8} />
            View Collection
          </h1>
          <p className="pp-page-hero-sub">Daily collection overview & financial tracking</p>
        </div>
        <div className="pp-page-hero-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate('/billing/deposits')}
          >
            <Landmark size={14} strokeWidth={1.6} /> Deposits
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate('/billing/expenses')}
          >
            <TrendingDown size={14} strokeWidth={1.6} /> Expenses
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        <button
          className={`appt-tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Day View
        </button>
        <button
          className={`appt-tab ${activeTab === 'monthList' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthList')}
        >
          Month List
        </button>
        <button
          className={`appt-tab ${activeTab === 'target' ? 'active' : ''}`}
          onClick={() => setActiveTab('target')}
        >
          Collection Target
        </button>
      </div>

      {/* Daily View */}
      {activeTab === 'daily' && (
        <>
          {/* Date Navigator */}
          <div className="pp-filter-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={handlePrevDay}>
                <ChevronLeft size={14} strokeWidth={1.6} /> Previous
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pp-input"
                style={{ width: '160px', height: '36px', padding: '0 12px', borderRadius: '8px' }}
              />
              <button className="btn-secondary" onClick={handleNextDay}>
                Next <ChevronRight size={14} strokeWidth={1.6} />
              </button>
            </div>

            <div className="pp-filter-controls">
              <button className="btn-primary" onClick={handleToday}>Today</button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'pulse 1.5s infinite', padding: '12px 0' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '60px', borderRadius: '12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div className="skeleton-box" style={{ height: '340px', borderRadius: '16px' }} />
                <div className="skeleton-box" style={{ height: '340px', borderRadius: '16px' }} />
              </div>
            </div>
          ) : summary ? (
            <div className="vc-daily-content">
              <div className="vc-ledger-layout">
                {/* Left Column: Collection Breakdown */}
                <div className="appt-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="appt-card-header">
                    <h3 className="appt-card-title">Collection Breakdown</h3>
                    <div className="vc-ledger-total">
                      Total: <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>₹{summary.collection.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="pp-table-scroll">
                    <table className="pp-table vc-summary-table">
                      <tbody>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Banknote size={15} strokeWidth={1.8} /> Cash
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.cash.toLocaleString('en-IN')}</td>
                          <td className="vc-right" style={{ width: 40 }}>
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Cash', 'Cash Payment')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <CreditCard size={15} strokeWidth={1.8} /> Credit Card
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.card.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Card', 'Credit Card Payment')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Building2 size={15} strokeWidth={1.8} /> Cheque
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.cheque.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Cheque', 'Cheque Payment')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Wallet size={15} strokeWidth={1.8} /> Online
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.online.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Online', 'Online Payment')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Banknote size={15} strokeWidth={1.8} /> UPI
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{(summary.upi || 0).toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('UPI', 'UPI Payment')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <ShoppingBag size={15} strokeWidth={1.8} /> Product Charges
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.productCharges.toLocaleString('en-IN')}</td>
                          <td className="vc-right">
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Product', 'Product Charges')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Deposits & Balance */}
                <div className="appt-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="appt-card-header">
                    <h3 className="appt-card-title">Deposits & Balance</h3>
                    <div className="vc-ledger-total vc-cih-highlight">
                      Cash in Hand: <span style={{ fontWeight: 800, color: 'var(--pp-success-fg)' }}>₹{summary.cashInHand.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="pp-table-scroll" style={{ flex: 1 }}>
                    <table className="pp-table vc-summary-table">
                      <tbody>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <TrendingDown size={15} strokeWidth={1.8} /> Expenses
                            </div>
                          </td>
                          <td className="vc-right vc-bold vc-negative" style={{ fontSize: '14px' }}>₹{summary.expenses.toLocaleString('en-IN')}</td>
                          <td className="vc-right" style={{ width: 40 }}>
                            <button className="vc-info-btn-sm" onClick={() => openDrilldown('Expense', 'Expenses')} title="View Details">
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Banknote size={15} strokeWidth={1.8} /> Recp Handed (Cash Dep.)
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.cashDeposited.toLocaleString('en-IN')}</td>
                          <td className="vc-right"></td>
                        </tr>
                        <tr className="pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <Landmark size={15} strokeWidth={1.8} /> Bank Deposit
                            </div>
                          </td>
                          <td className="vc-right vc-bold" style={{ fontSize: '14px' }}>₹{summary.bankDeposit.toLocaleString('en-IN')}</td>
                          <td className="vc-right"></td>
                        </tr>
                        <tr className="vc-ledger-highlight-row pp-hover-row">
                          <td>
                            <div className="vc-ledger-label" style={{ fontWeight: 600 }}>
                              <BarChart3 size={15} strokeWidth={1.8} /> Deficit / Surplus
                            </div>
                          </td>
                          <td className={`vc-right vc-bold ${summary.deficit >= 0 ? 'vc-positive' : 'vc-negative'}`} style={{ fontSize: '14px' }}>
                            {summary.deficit > 0 ? '+' : ''}₹{summary.deficit.toLocaleString('en-IN')}
                          </td>
                          <td className="vc-right"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Actions Links */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-2)',
                    borderTop: '1px solid var(--border-main)',
                    flexWrap: 'wrap'
                  }}>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setDepositDrawer({ isOpen: true, tab: 'cash' })}>
                      <Banknote size={14} strokeWidth={1.6} /> Add Cash Deposit
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setDepositDrawer({ isOpen: true, tab: 'bank' })}>
                      <Landmark size={14} strokeWidth={1.6} /> Add Bank Deposit
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--pp-danger-fg)', borderColor: 'var(--pp-danger-border)' }} onClick={() => setIsExpenseDrawerOpen(true)}>
                      <TrendingDown size={14} strokeWidth={1.6} /> Add Expense
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

      {/* Quick Actions Drawers */}
      <AddDepositDrawer
        isOpen={depositDrawer.isOpen}
        onClose={() => setDepositDrawer({ ...depositDrawer, isOpen: false })}
        initialTab={depositDrawer.tab}
      />
      <AddExpenseDrawer
        isOpen={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
      />
    </div>
  );
}
