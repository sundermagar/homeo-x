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
            label="Total Clinics" 
            value={clinicCount} 
            icon={<Building2 size={24} />} 
            iconBg="#f3f4f6" 
            iconColor="#6b7280" 
          />
          <MetricCard 
            label="Active" 
            value={activeCount} 
            icon={<CheckCircle2 size={24} />} 
            iconBg="#f0fdf4" 
            iconColor="#22c55e" 
          />
          <MetricCard 
            label="Suspended" 
            value={stats?.suspendedClinics ?? 0} 
            icon={<AlertTriangle size={24} />} 
            iconBg="#fff1f2" 
            iconColor="#f43f5e" 
          />
          <MetricCard 
            label="Trial" 
            value={stats?.trialClinics ?? 0} 
            icon={<Clock size={24} />} 
            iconBg="#fffbeb" 
            iconColor="#f59e0b" 
          />
          <MetricCard 
            label="Deleted" 
            value={deletedCount} 
            icon={<Trash2 size={24} />} 
            iconBg="#f9fafb" 
            iconColor="#9ca3af" 
          />
        </div>

        <div className="sa-wide-card">
          <div className="sa-wide-icon-box">
            <UserCheck size={28} />
          </div>
          <div>
            <div className="sa-metric-label" style={{ fontSize: '13px' }}>New Clinics (Last 30 Days)</div>
            <div className="sa-metric-value" style={{ fontSize: '32px' }}>{newCount}</div>
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
            label="Total Users" 
            value={staffCount} 
            icon={<Users size={20} />} 
            iconBg="#f5f3ff" 
            iconColor="#8b5cf6" 
          />
          <UsageCard 
            label="Total Patients" 
            value={patientCount} 
            icon={<UserCheck size={20} />} 
            iconBg="#eff6ff" 
            iconColor="#3b82f6" 
          />
          <UsageCard 
            label="Total Cases" 
            value={consultationCount} 
            icon={<FileText size={20} />} 
            iconBg="#fff7ed" 
            iconColor="#f97316" 
          />
          <UsageCard 
            label="Total Prescriptions" 
            value={prescriptionCount} 
            icon={<Package size={20} />} 
            iconBg="#fdf2f8" 
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
