import React, { useState } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { CreditAlertBar } from '../components/credit-alert-bar';
import { CreditMetricCards } from '../components/credit-metric-cards';
import { UsageTimelineChart } from '../components/usage-timeline-chart';
import { DashboardShortcuts } from '../components/dashboard-shortcuts';
import { RecentTransactions } from '../components/recent-transactions';
import { BurnRateForecast } from '../components/burn-rate-forecast';
import { AddCreditsModal } from '../components/add-credits-modal';
import '../styles/credit-wallet.css';
import '../../platform/styles/platform.css';
import { useCreditSummary } from '../hooks/use-credit-data';
import { DashboardSkeleton } from '../components/skeletons';

export default function CreditWalletPage() {
  const [showAddCredits, setShowAddCredits] = useState(false);
  const { loading } = useCreditSummary();

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh' }}>
      
      {/* Alert Bar */}
      <CreditAlertBar onAddCredits={() => setShowAddCredits(true)} />

      {/* Header */}
      <div className="cw-header">
        <div>
          <h1>
            <Wallet size={18} />
            Credit Ledger
          </h1>
          <p>Kreed.health — Clinic ID: KH-0042 · Cycle: May 2026</p>
        </div>
        <button 
          className="plat-btn plat-btn-ghost" 
          onClick={() => setShowAddCredits(true)}
          style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Credits
        </button>
      </div>

      {/* Metric Cards */}
      <CreditMetricCards />

      {/* Main Chart */}
      <UsageTimelineChart />

      {/* Quick Navigation Shortcuts */}
      <DashboardShortcuts />

      {/* Half Row: Recent Transactions + Forecast */}
      <div className="cw-row-half">
        <RecentTransactions />
        <BurnRateForecast onTopUp={() => setShowAddCredits(true)} />
      </div>

      {showAddCredits && <AddCreditsModal onClose={() => setShowAddCredits(false)} />}
    </div>
  );
}
