import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { Pill, Search, CheckCircle2, Clock, AlertTriangle, Printer, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { printThermalStickers } from '@/shared/utils/print';
import '@/features/dashboard/pages/role-dashboards.css';

interface Medicine {
  id: number;
  remedy: string;
  potency: string;
  frequency: string;
  days: string;
  cost: number;
}

interface PendingSticker {
  caseId: number;
  randId: string;
  dateval: string;
  patientName: string;
  phone: string;
  medicines: Medicine[];
  totalMedicineCost: number;
  postType: string;
}

function DispensarySkeleton() {
  return (
    <div className="pp-page-container fade-in">
      <div className="pp-page-hero">
        <div>
          <div className="skeleton-box skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '8px' }} />
          <div className="skeleton-box skeleton-text" style={{ width: '150px', height: '16px' }} />
        </div>
      </div>
      <div className="pp-stat-grid" style={{ marginBottom: '24px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="appt-stat-card">
            <div className="skeleton-box skeleton-text" style={{ width: '100px', height: '16px', marginBottom: '8px' }} />
            <div className="skeleton-box skeleton-text" style={{ width: '40px', height: '24px' }} />
          </div>
        ))}
      </div>
      <div className="dash-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="appt-card">
            <div className="skeleton-box" style={{ height: '350px', borderRadius: '16px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DispensaryDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dispensary-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/logistics/dispensary-dashboard');
      return res.data.data;
    },
    refetchInterval: 10000 // auto-poll every 10 seconds so dispensary staff doesn't need to refresh
  });

  const printMutation = useMutation({
    mutationFn: async (randId: string) => {
      await apiClient.post(`/logistics/stickers/print`, { randId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispensary-dashboard'] })
  });

  const dispenseMutation = useMutation({
    mutationFn: async (randId: string) => {
      await apiClient.post(`/logistics/stickers/dispense`, { randId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispensary-dashboard'] })
  });

  const handlePrepare = (sticker: PendingSticker) => {
    printThermalStickers(sticker, (user as any)?.clinicName || "Dr. Nanda's Homeoclinic");
    printMutation.mutate(sticker.randId);
  };

  const toPrepare = data?.toPrepare || [];
  const readyToHandover = data?.readyToHandover || [];
  const dispensedToday = data?.dispensedToday || [];
  const lowStock = data?.lowStock || [];

  if (isLoading) {
    return <DispensarySkeleton />;
  }

  return (
    <div className="pp-page-container fade-in">
      
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">Dispensary Dashboard</h1>
          <p className="pp-page-hero-sub">Manage prescriptions and pharmacy logistics</p>
        </div>
      </div>

      {/* 1. KPI Strip */}
      <div className="pp-stat-grid" style={{ marginBottom: '24px' }}>
        <div className="appt-stat-card" style={{ background: 'var(--pp-danger-bg)' }}>
          <div className="appt-stat-icon-wrap" style={{ color: 'var(--pp-danger-fg)', background: 'rgba(255, 255, 255, 0.5)' }}>
            <Pill size={16} />
          </div>
          <div>
            <div className="appt-stat-label">New Rx to prepare</div>
            <div className="appt-stat-value" style={{ color: 'var(--pp-danger-fg)' }}>{toPrepare.length}</div>
          </div>
        </div>
        
        <div className="appt-stat-card" style={{ background: 'var(--pp-blue-tint)' }}>
          <div className="appt-stat-icon-wrap" style={{ color: 'var(--pp-blue)', background: 'rgba(255, 255, 255, 0.5)' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="appt-stat-label">Ready to hand over</div>
            <div className="appt-stat-value" style={{ color: 'var(--pp-blue)' }}>{readyToHandover.length}</div>
          </div>
        </div>
        
        <div className="appt-stat-card" style={{ background: 'var(--pp-warning-bg)' }}>
          <div className="appt-stat-icon-wrap" style={{ color: 'var(--pp-warning-fg)', background: 'rgba(255, 255, 255, 0.5)' }}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <div className="appt-stat-label">Low stock items</div>
            <div className="appt-stat-value" style={{ color: 'var(--pp-warning-fg)' }}>{lowStock.length}</div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid */}
      <div className="dash-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px' }}>
        
        {/* Prescriptions to prepare */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              Prescriptions to prepare
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800 }}>FROM DOCTOR</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '350px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
            {toPrepare.length === 0 ? (
              <div className="rd-empty">No new prescriptions.</div>
            ) : (
              toPrepare.map((item: any) => (
                <div key={item.randId} className="rd-list-item" style={{ background: 'var(--bg-surface-1)', border: '1px dashed var(--border-light)', borderRadius: '12px', padding: '12px 16px' }}>
                  <div className="rd-list-info" style={{ flex: 1 }}>
                    <div className="rd-list-name">{item.patientName}</div>
                    <div className="rd-list-sub" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {item.medicines.map((m: any, idx: number) => (
                        <span key={idx} style={{ background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                          {m.remedy} {m.potency}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handlePrepare(item)} disabled={printMutation.isPending} style={{ background: 'var(--pp-blue)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <Printer size={14} /> Prepare & Print
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ready to hand over */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              Ready to hand over
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800 }}>→ RECEPTION BILLS</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '350px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
            {readyToHandover.length === 0 ? (
              <div className="rd-empty">No items ready.</div>
            ) : (
              readyToHandover.map((item: any) => (
                <div key={item.randId} className="rd-list-item" style={{ background: 'var(--bg-surface-1)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ background: 'var(--pp-purple-tint)', color: 'var(--pp-purple)', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', fontFamily: 'var(--pp-font-mono)' }}>
                      #{item.caseId}
                    </div>
                    <div className="rd-list-info">
                      <div className="rd-list-name">{item.patientName}</div>
                      <div className="rd-list-sub" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {item.medicines.map((m: any, idx: number) => (
                          <span key={idx} style={{ color: 'var(--pp-success-fg)', fontSize: '11px', fontWeight: 600 }}>
                            {m.remedy} {m.potency}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => dispenseMutation.mutate(item.randId)} disabled={dispenseMutation.isPending} style={{ background: 'var(--pp-purple-tint)', color: 'var(--pp-purple)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                    Hand over
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              Low stock
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800 }}>REORDER</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '350px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: '0' }}>
            {lowStock.length === 0 ? (
              <div className="rd-empty">Inventory is healthy.</div>
            ) : (
              lowStock.map((item: any, idx: number) => (
                <div key={idx} className="rd-list-item" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ background: 'var(--pp-warning-bg)', color: 'var(--pp-warning-fg)', padding: '6px', borderRadius: '6px' }}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="rd-list-info">
                      <div className="rd-list-name">{item.name}</div>
                      <div className="rd-list-sub">{item.quantity} units left</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--pp-warning-bg)', color: 'var(--pp-warning-fg)', padding: '2px 10px', borderRadius: '16px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                    low
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dispensed Today */}
        <div className="rd-compact-card">
          <div className="rd-compact-card-header">
            <div className="rd-compact-card-title">
              Dispensed today
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800 }}>LOG</span>
          </div>
          <div className="rd-compact-card-body db-scroll" style={{ maxHeight: '350px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: '0' }}>
            {dispensedToday.length === 0 ? (
              <div className="rd-empty">No items dispensed today.</div>
            ) : (
              dispensedToday.map((item: any) => (
                <div key={item.randId} className="rd-list-item" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px' }}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="rd-list-info">
                      <div className="rd-list-name" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {item.medicines.map((m:any) => m.remedy).join(', ')} 
                        <ArrowRight size={10} style={{ color: 'var(--text-muted)' }}/> 
                        <span style={{ color: 'var(--text-main)' }}>{item.patientName}</span>
                      </div>
                      <div className="rd-list-sub">#{item.caseId}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', padding: '2px 10px', borderRadius: '16px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                    done
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
