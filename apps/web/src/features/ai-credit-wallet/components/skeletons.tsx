import React from 'react';
import { Skeleton } from '../../../components/ui/skeleton';
import { Wallet } from 'lucide-react';
import '../styles/credit-wallet.css';
import '../../platform/styles/platform.css';

export function DashboardSkeleton() {
  return (
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh', padding: '24px' }}>
      {/* Alert Bar */}
      <Skeleton style={{ height: '48px', width: '100%', marginBottom: '24px', borderRadius: '8px' }} />

      {/* Header */}
      <div className="cw-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wallet size={24} />
            <Skeleton style={{ height: '32px', width: '200px' }} />
          </h1>
          <Skeleton style={{ height: '20px', width: '300px' }} />
        </div>
        <Skeleton style={{ height: '40px', width: '120px', borderRadius: '8px' }} />
      </div>

      {/* Metric Cards */}
      <div className="cw-metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cw-stat-card" style={{ padding: '24px' }}>
            <Skeleton style={{ height: '16px', width: '100px', marginBottom: '16px' }} />
            <Skeleton style={{ height: '40px', width: '140px', marginBottom: '8px' }} />
            <Skeleton style={{ height: '14px', width: '180px' }} />
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="cw-card" style={{ marginBottom: '32px', padding: '24px' }}>
        <Skeleton style={{ height: '24px', width: '150px', marginBottom: '24px' }} />
        <Skeleton style={{ height: '300px', width: '100%' }} />
      </div>

      {/* Quick Navigation Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ height: '80px', width: '100%', borderRadius: '12px' }} />
        ))}
      </div>

      {/* Half Row */}
      <div className="cw-row-half" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="cw-card" style={{ padding: '24px' }}>
           <Skeleton style={{ height: '24px', width: '150px', marginBottom: '24px' }} />
           {[1, 2, 3, 4].map((i) => (
             <Skeleton key={i} style={{ height: '60px', width: '100%', marginBottom: '12px' }} />
           ))}
        </div>
        <div className="cw-card" style={{ padding: '24px' }}>
           <Skeleton style={{ height: '24px', width: '150px', marginBottom: '24px' }} />
           <Skeleton style={{ height: '200px', width: '100%', marginBottom: '16px' }} />
           <Skeleton style={{ height: '40px', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

export function StubSkeleton() {
  return (
    <div className="animate-fade-in" style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton style={{ height: '32px', width: '250px', marginBottom: '8px' }} />
          <Skeleton style={{ height: '20px', width: '400px' }} />
        </div>
        <Skeleton style={{ height: '40px', width: '140px', borderRadius: '8px' }} />
      </div>

      {/* Main Content Area (Table/List) */}
      <div className="cw-card" style={{ padding: '24px' }}>
        {/* Table Header/Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Skeleton style={{ height: '36px', width: '300px' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Skeleton style={{ height: '36px', width: '100px' }} />
            <Skeleton style={{ height: '36px', width: '100px' }} />
          </div>
        </div>

        {/* Table Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton style={{ height: '48px', width: '100%', borderRadius: '4px' }} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} style={{ height: '64px', width: '100%', borderRadius: '8px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
