import React from 'react';
import { useMyMedicalRecords } from '@/features/medical-case/hooks/use-medical-cases';
import { Pill, Calendar, Clock, RotateCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuthStore } from '@/shared/stores/auth-store';
import '@/features/appointments/styles/appointments.css';

export default function PrescriptionsPage() {
  const { data: records, isLoading } = useMyMedicalRecords();
  const prescriptions = records?.prescriptions || [];
  
  const { user } = useAuthStore();
  const isPatient = user?.type === 'Patient' || (user as any)?.role === 'patient';

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading your prescriptions...</div>;
  }

  return (
    <div className="pp-page-container appt-page animate-fade-in">
      {/* Hero Header */}
      <div className="pp-page-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isPatient && (
            <Link 
              to="/portal/select-track"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--pp-bg-hover)',
                color: 'var(--pp-text-1)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--pp-bg-hover)'}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </Link>
          )}
          <div>
            <h1 className="pp-page-hero-title">
              <Pill size={22} strokeWidth={1.8} />
              My Prescriptions
            </h1>
            <p className="pp-page-hero-sub">
              View your prescribed homeopathic remedies and instructions.
            </p>
          </div>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions found"
          description="Your doctor hasn't prescribed any remedies for you yet."
          variant="card"
          className="my-8"
        />
      ) : (
        <div className="appt-card-grid">
          {prescriptions.map((rx: any) => (
            <div key={rx.id} className="appt-grid-card-minimal animate-fade-in">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    Rx
                  </div>
                  <div>
                    <div className="font-bold text-base text-foreground">
                      {rx.remedyName || rx.remedy_name}
                    </div>
                    <div className="text-xs text-primary font-semibold">
                      {rx.potencyName || rx.potency_name || rx.potency || 'Standard Potency'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                  <Calendar size={13} className="mr-1.5 text-primary" />
                  {rx.dateval ? format(new Date(rx.dateval), 'dd MMM yyyy') : 'Unknown'}
                </div>
              </div>

              {/* Card Body */}
              <div className="appt-grid-card-body-minimal">
                <div className="appt-grid-detail-item">
                  <span className="label flex items-center gap-1.5">
                    <RotateCw size={14} className="text-blue-500" /> Frequency
                  </span>
                  <span className="value">
                    {rx.frequencyTitle || rx.frequency_name || rx.frequency || 'As directed'}
                  </span>
                </div>
                <div className="appt-grid-detail-item">
                  <span className="label flex items-center gap-1.5">
                    <Clock size={14} className="text-orange-500" /> Duration
                  </span>
                  <span className="value">
                    {rx.days || rx.rx_days ? `${rx.days || rx.rx_days} days` : 'Ongoing'}
                  </span>
                </div>
              </div>

              {/* Card Instructions */}
              {(rx.instructions || rx.prescription) && (
                <div className="mt-auto p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
                    <p className="italic font-medium text-foreground/80">
                      "{rx.instructions || rx.prescription}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
