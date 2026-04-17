import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicClinicalData } from '../hooks/use-public-api';
import { DosageHelper } from '../components/dosage-helper';
import { 
  FileText, 
  History, 
  Stethoscope, 
  User,
  CalendarDays,
  Activity,
  ArrowRight
} from 'lucide-react';

export const PublicClinicalShell: React.FC = () => {
  const { phone } = useParams<{ phone: string }>();
  const { data, isLoading, error } = usePublicClinicalData(phone || '');
  const [activeTab, setActiveTab] = React.useState<'schedule' | 'history' | 'prescriptions'>('schedule');

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Safely fetching your records...</p>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/verify-otp" />;
  }

  const { patientInfo, history, prescriptions, frequencies } = data;

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-header-inner">
          <div className="profile-group">
            <div className="profile-avatar">
              <User size={40} />
            </div>
            <div>
              <h1 className="profile-name">{patientInfo.name}</h1>
              <div className="profile-badge">
                <span style={{color: 'var(--primary)'}}>ID: {patientInfo.regid}</span>
                <span style={{width: 4, height: 4, background: '#cbd5e1', borderRadius: '50%'}} />
                <span>Public Access Session</span>
              </div>
            </div>
          </div>

          <div className="tab-container">
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            >
              <Stethoscope size={20} />
              <span>Today's Meds</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History size={20} />
              <span>My History</span>
            </button>
            <button 
              onClick={() => setActiveTab('prescriptions')}
              className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
            >
              <FileText size={20} />
              <span>Prescriptions</span>
            </button>
          </div>
        </div>
      </div>

      <main className="clinical-main">
        {activeTab === 'schedule' && (
          <DosageHelper prescriptions={prescriptions} frequencies={frequencies} />
        )}

        {activeTab === 'history' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <h2 className="section-title">
              <Activity size={24} style={{color: 'var(--primary)'}} />
              Past Consultations
            </h2>
            <div>
              {history.map((h: any, i: number) => (
                <div key={i} className="history-card">
                  <div className="history-icon-wrapper">
                    <CalendarDays size={24} />
                  </div>
                  <div className="history-content">
                    <div className="history-meta">
                      <span className="history-date">
                        {new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="history-badge">Consultation Done</span>
                    </div>
                    <h3 className="history-title">{h.condition || 'General Follow-up'}</h3>
                    <div className="history-notes">
                      <div className="history-notes-title">Advice & Observations</div>
                      {h.notes || 'No public notes provided for this visit.'}
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div style={{textAlign: 'center', padding: '4rem 0', background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)'}}>
                  <History size={48} style={{color: 'var(--border)', margin: '0 auto 1rem'}} />
                  <p style={{color: 'var(--text-muted)'}}>No medical history records found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <h2 className="section-title">
              <FileText size={24} style={{color: 'var(--primary)'}} />
              Your Prescriptions
            </h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>
              Showing detailed medicine list from your recent visits.
            </p>
            
            <div className="rx-table-container">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Medicine</th>
                    <th>Potency</th>
                    <th style={{textAlign: 'right'}}>Dosage</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p: any, i: number) => (
                    <tr key={i}>
                      <td style={{fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap'}}>
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="rx-medicine-name">{p.remedy}</div>
                      </td>
                      <td>
                        <span className="rx-potency-badge">{p.potency}</span>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <div style={{fontWeight: 700, color: 'var(--text-main)', marginBottom: 4}}>{p.frequency}</div>
                        <div style={{fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap'}}>
                          {p.days} Days Course
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prescriptions.length === 0 && (
                <div style={{textAlign: 'center', padding: '4rem 0'}}>
                  <p style={{color: 'var(--text-disabled)'}}>No active prescriptions found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <div style={{maxWidth: 900, margin: '0 auto', padding: '0 1rem'}}>
        <div className="banner-card">
          <div className="banner-icon">
            <span style={{fontSize: '2.5rem'}}>💡</span>
          </div>
          <div className="banner-text" style={{flexGrow: 1}}>
            <h3>Questions about your treatment?</h3>
            <p>Our FAQ section covers everything from dosage timings to storage advice. Check it out for quick help.</p>
          </div>
          <div style={{display: 'flex', gap: '1rem', flexDirection: 'column', flexShrink: 0}}>
            <a href="/faqs" className="btn btn-primary" style={{background: 'white', color: 'var(--primary)'}}>
              Browse FAQs
              <ArrowRight size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
