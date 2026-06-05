import React from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  UserCheck,
  Users,
  Package,
  FileText,
} from 'lucide-react';
import { useDashboard } from '../hooks/use-dashboard';
import './super-admin-dashboard.css';

export function SuperAdminDashboard() {
  const { data: dashData, isLoading } = useDashboard('month');
  
  const stats = dashData?.platformStats;
  const clinicCount = stats?.totalClinics ?? 0;
  const activeCount = stats?.activeClinics ?? 0;
  const deletedCount = stats?.deletedClinics ?? 0;
  const newCount = stats?.newClinicsLast30Days ?? 0;
  const staffCount = stats?.totalStaff ?? 0;
  const patientCount = stats?.totalPatients ?? 0;
  const consultationCount = stats?.totalConsultations ?? 0;
  const prescriptionCount = stats?.totalPrescriptions ?? 0;

  if (isLoading) {
    return (
      <div className="sa-root sa-loading-skeleton">
        {/* Section: Clinic Overview Skeleton */}
        <section>
          <div className="sa-section-header">
            <div className="skeleton-box skeleton-text title" style={{ width: '200px', marginBottom: '8px' }} />
          </div>
          
          <div className="sa-metric-grid-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="sa-metric-card" style={{ height: '88px', opacity: 0.7 }}>
                <div className="skeleton-box" style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '60%', marginBottom: '8px' }} />
                  <div className="skeleton-box skeleton-text title" style={{ width: '40%', marginBottom: 0, height: '24px' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="sa-wide-card" style={{ opacity: 0.7 }}>
            <div className="skeleton-box" style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-box skeleton-text" style={{ width: '150px', marginBottom: '12px' }} />
              <div className="skeleton-box skeleton-text title" style={{ width: '80px', marginBottom: 0, height: '36px' }} />
            </div>
          </div>
        </section>

        {/* Section: Platform Usage Skeleton */}
        <section>
          <div className="sa-section-header">
            <div className="skeleton-box skeleton-text title" style={{ width: '180px', marginBottom: '8px' }} />
          </div>

          <div className="sa-usage-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sa-usage-card" style={{ height: '96px', opacity: 0.7 }}>
                <div className="skeleton-box" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '60%', marginBottom: '10px' }} />
                  <div className="skeleton-box skeleton-text title" style={{ width: '40%', marginBottom: 0, height: '28px' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sa-root">
      
      {/* ── Section: Clinic Overview ── */}
      <section>
        <div className="sa-section-header">
          <h2 className="sa-section-title">Clinic Overview</h2>
        </div>
        
        <div className="sa-metric-grid-5">
          <MetricCard 
            label="TOTAL CLINICS" 
            value={clinicCount} 
            icon={<Building2 size={24} />} 
            iconBg="rgba(99, 102, 241, 0.15)" 
            iconColor="#6366f1" 
          />
          <MetricCard 
            label="ACTIVE" 
            value={activeCount} 
            icon={<CheckCircle2 size={24} />} 
            iconBg="rgba(34, 197, 94, 0.15)" 
            iconColor="#22c55e" 
          />
          <MetricCard 
            label="SUSPENDED" 
            value={stats?.suspendedClinics ?? 0} 
            icon={<AlertTriangle size={24} />} 
            iconBg="rgba(239, 68, 68, 0.15)" 
            iconColor="#ef4444" 
          />
          <MetricCard 
            label="TRIAL" 
            value={stats?.trialClinics ?? 0} 
            icon={<Clock size={24} />} 
            iconBg="rgba(234, 179, 8, 0.15)" 
            iconColor="#eab308" 
          />
          <MetricCard 
            label="DELETED" 
            value={deletedCount} 
            icon={<Trash2 size={24} />} 
            iconBg="rgba(100, 116, 139, 0.15)" 
            iconColor="#64748b" 
          />
        </div>

        <div className="sa-wide-card">
          <div className="sa-wide-icon-box" style={{ background: '#334155', color: '#38bdf8' }}>
            <UserCheck size={28} />
          </div>
          <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="sa-metric-label" style={{ fontSize: '11px', color: '#94a3b8' }}>NEW CLINICS (LAST 30 DAYS)</div>
            <div className="sa-metric-value" style={{ fontSize: '32px', color: '#fff' }}>{newCount}</div>
          </div>
        </div>
      </section>

      {/* ── Section: Platform Usage ── */}
      <section>
        <div className="sa-section-header">
          <h2 className="sa-section-title">Platform Usage</h2>
        </div>

        <div className="sa-usage-grid">
          <UsageCard 
            label="TOTAL USERS" 
            value={staffCount} 
            icon={<Users size={24} />} 
            iconBg="rgba(168, 85, 247, 0.15)" 
            iconColor="#a855f7" 
          />
          <UsageCard 
            label="TOTAL PATIENTS" 
            value={patientCount} 
            icon={<UserCheck size={24} />} 
            iconBg="rgba(59, 130, 246, 0.15)" 
            iconColor="#3b82f6" 
          />
          <UsageCard 
            label="TOTAL CASES" 
            value={consultationCount} 
            icon={<FileText size={24} />} 
            iconBg="rgba(249, 115, 22, 0.15)" 
            iconColor="#f97316" 
          />
          <UsageCard 
            label="TOTAL PRESCRIPTIONS" 
            value={prescriptionCount} 
            icon={<Package size={24} />} 
            iconBg="rgba(236, 72, 153, 0.15)" 
            iconColor="#ec4899" 
          />
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, iconBg, iconColor }: any) {
  return (
    <div className="sa-metric-card">
      <div className="sa-icon-box" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="sa-metric-body">
        <span className="sa-metric-label">{label}</span>
        <span className="sa-metric-value">{value}</span>
      </div>
    </div>
  );
}

function UsageCard({ label, value, icon, iconBg, iconColor }: any) {
  return (
    <div className="sa-usage-card">
      <div className="sa-usage-icon-box" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="sa-metric-body">
        <span className="sa-metric-label">{label}</span>
        <span className="sa-metric-value" style={{ fontSize: '24px' }}>{value}</span>
      </div>
    </div>
  );
}
