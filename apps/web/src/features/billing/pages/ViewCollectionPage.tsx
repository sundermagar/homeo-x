import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Target,
  ChevronRight,
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeView, setActiveView] = useState<'collection' | 'deposit' | 'expense'>('collection');

  const { data: collection, isLoading, refetch } = useDailyCollection(selectedDate);
  const { data: summary } = useCollectionSummary(selectedDate);
  const user = useAuthStore((s) => s.user);

  // Drilldown modal state
  const [drilldown, setDrilldown] = useState<{ mode: string; title: string } | null>(null);

  // Quick Actions Drawer States
  const [depositDrawer, setDepositDrawer] = useState<{ isOpen: boolean, tab: 'bank' | 'cash' }>({ isOpen: false, tab: 'cash' });
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number) as [number, number, number];
    const dateObj = new Date(y, m - 1, d + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  const handlePrevDay = () => shiftDate(-1);
  const handleNextDay = () => shiftDate(1);

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]!);
  };

  // Calculate payment mode breakdown
  const paymentBreakdown = {
    cash:
      collection?.records
        ?.filter((r) => r.paymentMode === 'Cash')
        .reduce((s, r) => s + (r.received || 0), 0) || 0,
    card:
      collection?.records
        ?.filter((r) => r.paymentMode === 'Card')
        .reduce((s, r) => s + (r.received || 0), 0) || 0,
    cheque:
      collection?.records
        ?.filter((r) => r.paymentMode === 'Cheque')
        .reduce((s, r) => s + (r.received || 0), 0) || 0,
    online:
      collection?.records
        ?.filter((r) => r.paymentMode === 'Online')
        .reduce((s, r) => s + (r.received || 0), 0) || 0,
    other:
      collection?.records
        ?.filter((r) => !['Cash', 'Card', 'Cheque', 'Online'].includes(r.paymentMode || ''))
        .reduce((s, r) => s + (r.received || 0), 0) || 0,
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
          <span className="quick-stat-value">
            ₹{(collection?.totalCharges || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Received</span>
          <span className="quick-stat-value success">
            ₹{(collection?.totalReceived || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Balance Pending</span>
          <span className="quick-stat-value danger">
            ₹{(collection?.totalBalance || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Transactions</span>
          <span className="quick-stat-value">{collection?.recordCount || 0}</span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
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
                      <div className="plat-cell-val">
                        ₹{(record.charges || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td data-label="Received" className="received success">
                      <div className="plat-cell-val">
                        ₹{(record.received || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td
                      data-label="Balance"
                      className={`balance ${(record.balance || 0) > 0 ? 'pending' : 'paid'}`}
                    >
                      <div className="plat-cell-val">
                        ₹{(record.balance || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td data-label="Mode">
                      <div className="plat-cell-val">
                        <span
                          className={`payment-badge ${record.paymentMode?.toLowerCase() || 'cash'}`}
                        >
                          {record.paymentMode || 'Cash'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Date" className="date">
                      <div>
                        {record.billDate
                          ? new Date(record.billDate).toLocaleDateString('en-GB')
                          : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No collection records"
              description={`No billing records were found for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.`}
              actionLabel="Go to Today"
              onAction={handleToday}
              variant="card"
              className="my-8"
            />
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
