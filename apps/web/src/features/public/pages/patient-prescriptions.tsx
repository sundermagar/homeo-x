import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicClinicalData } from '../hooks/use-public-api';
import { PatientHeader } from '../components/patient-header';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { Pill } from 'lucide-react';

export function PatientPrescriptions() {
  const { phone } = useParams<{ phone: string }>();
  const { data, isLoading, error } = usePublicClinicalData(phone || '');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #dcfce7', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/patient/login" />;
  }

  const { patientInfo, prescriptions } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {prescriptions.length > 0 ? (
          <div className="patient-rx-list">
            {prescriptions.map((p: any, i: number) => (
              <div key={i} className="patient-rx-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="patient-rx-icon">
                  Rx
                </div>
                <div className="patient-rx-info">
                  <div className="patient-rx-name">{p.remedy}</div>
                  <div className="patient-rx-details">
                    <span className="patient-rx-tag potency">{p.potency}</span>
                    <span className="patient-rx-tag frequency">{p.frequency}</span>
                    <span className="patient-rx-tag days">{p.days} Days</span>
                  </div>
                  <div className="patient-rx-date">
                    {new Date(p.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="patient-empty-state">
            <div className="patient-empty-state-icon">
              <Pill size={28} />
            </div>
            <div className="patient-empty-state-title">No prescriptions</div>
            <div className="patient-empty-state-text">Your prescribed medicines will appear here</div>
          </div>
        )}
    </div>
  );
}

export default PatientPrescriptions;
