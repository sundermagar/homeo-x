import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../shared/components/drawer';
import { Loader2, HeartPulse, History, Building2, Calendar, FileText, CheckCircle2, Pill } from 'lucide-react';
import {
  useRequestConsentMutation,
  usePollConsentStatusQuery,
  useFetchHealthInfoMutation,
  useAbhaHistoryQuery,
} from '../hooks/use-abha-hiu';

interface AbhaMedicalHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  abhaId: string;
  patientName: string;
}

export function AbhaMedicalHistoryDrawer({ isOpen, onClose, abhaId, patientName }: AbhaMedicalHistoryDrawerProps) {
  const [consentId, setConsentId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<'idle' | 'requesting' | 'waiting' | 'fetching' | 'success'>('idle');

  const requestMutation = useRequestConsentMutation();
  const pollQuery = usePollConsentStatusQuery(consentId);
  const fetchMutation = useFetchHealthInfoMutation();
  
  // We only fetch history records if step is fetching or success
  const historyQuery = useAbhaHistoryQuery(activeStep === 'fetching' || activeStep === 'success');

  // Handle polling success
  useEffect(() => {
    if (activeStep === 'waiting' && pollQuery.data?.status === 'GRANTED') {
      setActiveStep('fetching');
      fetchMutation.mutate({ consentArtifactId: pollQuery.data.consentArtifactId }, {
        onSuccess: () => {
          // In real life, we would wait for webhook. For demo, we just transition to success
          // after a short delay to simulate data parsing.
          setTimeout(() => {
            setActiveStep('success');
            historyQuery.refetch();
          }, 2000);
        }
      });
    }
  }, [pollQuery.data?.status, activeStep, fetchMutation, historyQuery]);

  const handleRequestConsent = () => {
    setActiveStep('requesting');
    requestMutation.mutate({ abhaId, purpose: 'Consultation & Review' }, {
      onSuccess: (res) => {
        setConsentId(res.consentId);
        setActiveStep('waiting');
      },
      onError: () => {
        setActiveStep('idle');
      }
    });
  };

  const handleSimulateApproval = () => {
    // For Sandbox Demo purposes
    setActiveStep('fetching');
    fetchMutation.mutate({ consentArtifactId: 'MOCK-ART-123' }, {
      onSuccess: () => {
        setTimeout(() => {
          setActiveStep('success');
          historyQuery.refetch();
        }, 1500);
      }
    });
  };

  const renderContent = () => {
    if (activeStep === 'idle' || activeStep === 'requesting') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-6 mt-12 px-4 text-center">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800">
            <History className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Fetch External Medical History</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Request consent to pull {patientName}'s past prescriptions, lab reports, and diagnoses from other ABDM registered hospitals.
            </p>
          </div>
          
          <button 
            className="btn btn-primary w-full max-w-xs mt-4" 
            onClick={handleRequestConsent}
            disabled={activeStep === 'requesting'}
          >
            {activeStep === 'requesting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : <HeartPulse className="mr-2 h-4 w-4 inline-block" />}
            Request Consent
          </button>

          {/* Hidden backdoor for simulation */}
          <button onClick={handleSimulateApproval} className="text-xs text-muted-foreground opacity-50 hover:opacity-100 mt-8 underline">
            Simulate Instant Approval (Sandbox)
          </button>
        </div>
      );
    }

    if (activeStep === 'waiting') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-6 mt-12 px-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-200 dark:bg-amber-800/30 blur-xl rounded-full opacity-50 animate-pulse"></div>
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin relative z-10" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Waiting for Patient Approval</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              A notification has been sent to the patient's ABHA mobile app. 
              Waiting for them to grant permission...
            </p>
          </div>
          <button className="btn btn-outline mt-4" onClick={handleSimulateApproval}>
            Simulate Patient Tap (Sandbox)
          </button>
        </div>
      );
    }

    if (activeStep === 'fetching') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-6 mt-12 px-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-200 dark:bg-green-800/30 blur-xl rounded-full opacity-50 animate-pulse"></div>
            <CheckCircle2 className="w-16 h-16 text-green-500 relative z-10" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Consent Granted!</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Securely fetching and decrypting medical records from external hospitals...
            </p>
          </div>
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      );
    }

    if (activeStep === 'success') {
      const records = historyQuery.data || [];

      if (historyQuery.isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;
      }

      return (
        <div style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: '1rem', marginTop: '1.5rem' }}>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: '#6366f1' }} />
                <span className="text-sm font-medium" style={{ color: '#4338ca' }}>
                  Secure connection established. Data is End-to-End Encrypted.
                </span>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                No external records found for this ABHA ID.
              </div>
            ) : (
              <div className="relative border-l border-gray-200 ml-3 space-y-8 pb-8">
                {records.map((record) => (
                  <div key={record.id} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
                    
                    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">
                              {new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="font-semibold text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            {record.hospitalName}
                          </h4>
                          <p className="text-sm text-gray-500 ml-6">Consulted by {record.doctorName}</p>
                        </div>
                      </div>

                      <hr className="my-3 border-gray-100" />

                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Diagnoses
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {record.diagnoses.map((diag, i) => (
                            <span key={i} className="text-xs font-medium px-2.5 py-0.5 rounded" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}>
                              {diag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" /> Medications
                        </h5>
                        <div className="space-y-2">
                          {record.medications.map((med, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded-md" style={{ background: '#f8fafc' }}>
                              <span className="font-medium text-gray-800">{med.name}</span>
                              <span className="text-gray-500 text-xs">{med.dosage}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div>
          <div className="text-lg font-bold">External Medical History</div>
          <div className="text-sm font-normal text-gray-500 mt-1">Fetch past records from the ABDM network</div>
        </div>
      }
      maxWidth="600px"
    >
      <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50 p-2">
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </Drawer>
  );
}
