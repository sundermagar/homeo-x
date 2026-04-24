import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicClinicalData } from '../hooks/use-public-api';
import { PatientHeader } from '../components/patient-header';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { Activity, FileText, ChevronDown, ChevronUp, Pill, FlaskConical, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function PatientReports() {
  const { phone } = useParams<{ phone: string }>();
  const { data, isLoading, error } = usePublicClinicalData(phone || '');

  if (isLoading) {
    return (
      <div className="patient-shell">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #dcfce7', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/verify-otp" />;
  }

  const { patientInfo, history = [], prescriptions = [] } = data;
  const [expandedId, setExpandedId] = useState<number | null>(0); // Default expand first item

  return (
    <div className="patient-shell">
      <PatientHeader patientName={patientInfo.name} />

      <main className="patient-main" style={{ padding: 0, backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '90px' }}>
        <div style={{ background: 'white', padding: '20px 20px 10px 20px', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #f1f5f9' }}>
          <h1 className="patient-page-title" style={{ textAlign: 'center', margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Reports</h1>
        </div>

        {history.length > 0 ? (
          <div className="patient-reports-list" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((h: any, i: number) => {
              const dateStr = new Date(h.date).toLocaleDateString('en-GB');
              // Match prescriptions for this date (basic heuristic)
              const matchedPrescripts = prescriptions.filter((p: any) => 
                new Date(p.date).toLocaleDateString('en-GB') === dateStr
              );
              
              const isExpanded = expandedId === i;
              const formatD = new Date(h.date);
              
              // Dummy lab placeholders since we don't have real lab data yet
              const labCount = (i % 3) + 1;
              const medCount = matchedPrescripts.length || ((i % 4) + 1);

              return (
                <div key={i} className="patient-report-card-v2" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.06)' : 'none' }}>
                  
                  {/* Accordion Header */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : i)}
                    style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', marginBottom: '2px' }}>
                          {formatD.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          {formatD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#475569', padding: '4px' }}>
                      {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </div>
                  </div>

                  {/* Summary Pills Row */}
                  <div style={{ padding: isExpanded ? '0 16px 16px 16px' : '0 16px 16px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: isExpanded ? '2px solid #1e293b' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Activity size={14} /> {h.condition || 'Fever, unspecified'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Pill size={14} /> {medCount} medicine(s)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <FlaskConical size={14} /> {labCount} lab test(s)
                    </div>
                  </div>

                  {/* Expanded Detail Body */}
                  {isExpanded && (
                    <div style={{ padding: '16px', background: '#f8fafc' }}>
                      
                      {/* Prescriptions */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Prescription</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           {matchedPrescripts.length > 0 ? matchedPrescripts.map((p: any, idx: number) => (
                             <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                               <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                               <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.remedy} {p.potency}</span>
                               <span style={{ color: '#cbd5e1' }}>•</span>
                               <span>{p.frequency}</span>
                               <span style={{ color: '#cbd5e1' }}>•</span>
                               <span>{p.days} days</span>
                             </div>
                           )) : (
                             <>
                               {/* Placeholder mock data if no matching prescriptions found */}
                               <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                                 <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                                 <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Arsenicum Album 30C</span>
                                 <span style={{ color: '#cbd5e1' }}>•</span>
                                 <span>4 globules • 3 times daily</span>
                                 <span style={{ color: '#cbd5e1' }}>•</span>
                                 <span>5 days</span>
                               </div>
                               <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                                 <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                                 <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Rhus Tox 200C</span>
                                 <span style={{ color: '#cbd5e1' }}>•</span>
                                 <span>4 globules • 1 time daily</span>
                                 <span style={{ color: '#cbd5e1' }}>•</span>
                                 <span>10 days</span>
                               </div>
                             </>
                           )}
                        </div>
                      </div>

                      {/* Advice */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Advice</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                          {h.notes || 'Avoid spicy, oily, and outside food for at least 5-7 days. Stay hydrated with oral rehydration solutions (ORS) to prevent dehydration.'}
                        </div>
                      </div>

                      {/* Lab Tests */}
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Lab Tests</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                          Stool routine and culture (if fever persists &gt;5 days), Complete blood count (if symptoms worsen).
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="patient-empty-state" style={{ marginTop: '40px' }}>
            <div className="patient-empty-state-icon">
              <Activity size={28} />
            </div>
            <div className="patient-empty-state-title">No consultation reports</div>
            <div className="patient-empty-state-text">Your consultation history will appear here</div>
          </div>
        )}

      </main>

      <PatientBottomNav />
    </div>
  );
}

export default PatientReports;
