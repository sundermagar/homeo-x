import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/shared/page-header';
import { LoadingState } from '../../components/shared/loading-state';
import { VitalsPanel } from './components/vitals-panel';
import { SoapEditor } from './components/soap-editor';
import { AmbientScribe } from './components/ambient-scribe';
import { PrescriptionBuilder, type PrescriptionFormData } from './components/prescription-builder';
import type { SoapSuggestion } from '../../types/ai';
import { useVisit } from '../../hooks/use-visits';
import { useStartConsultation, useCompleteConsultation } from '../../hooks/use-consultations';
import { useSpecialtyConfig } from '../../hooks/use-specialties';
import { usePatient } from '../../hooks/use-patients';
import { toast } from '../../hooks/use-toast';
import { ROUTES } from '../../lib/constants';
import { formatName, calculateAge } from '../../lib/format';

type Step = 'vitals' | 'soap' | 'prescription' | 'review';

export function ConsultationPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { data: visit, isLoading, refetch } = useVisit(visitId);
  const startConsultation = useStartConsultation();
  const completeConsultation = useCompleteConsultation();
  const { data: specialtyConfig } = useSpecialtyConfig(visit?.specialty);
  const { data: patient } = usePatient(visit?.patientId);

  const [step, setStep] = useState<Step>('vitals');
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    icdCodes: '',
    specialtyData: {} as Record<string, unknown>,
  });

  const [scribeSuggestion, setScribeSuggestion] = useState<SoapSuggestion | null>(null);

  const rxForm = useForm<PrescriptionFormData>({
    defaultValues: { notes: '', items: [] },
  });

  // Start consultation if visit is CHECKED_IN
  useEffect(() => {
    if (visit && visit.status === 'CHECKED_IN' && visitId) {
      startConsultation.mutateAsync(visitId).then(() => refetch()).catch(() => {});
    }
  }, [visit?.status]);

  if (isLoading) return <LoadingState message="Loading consultation..." />;
  if (!visit) return <p className="text-center py-12 text-gray-500">Visit not found</p>;

  const handleComplete = async () => {
    if (!visitId) return;

    const rxData = rxForm.getValues();
    const icdCodes = soapData.icdCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      await completeConsultation.mutateAsync({
        visitId,
        soap: {
          subjective: soapData.subjective || undefined,
          objective: soapData.objective || undefined,
          assessment: soapData.assessment || undefined,
          plan: soapData.plan || undefined,
          icdCodes: icdCodes.length > 0 ? icdCodes : undefined,
          specialtyData: Object.keys(soapData.specialtyData).length > 0 ? soapData.specialtyData : undefined,
        },
        prescription: (() => {
          const filledItems = rxData.items.filter((item) => item.medicationName && item.dosage && item.frequency && item.duration);
          return filledItems.length > 0
            ? { notes: rxData.notes || undefined, items: filledItems }
            : undefined;
        })(),
        autoApprove: true,
      });
      toast({ title: 'Consultation completed', variant: 'success' });
      navigate(ROUTES.DOCTOR_QUEUE);
    } catch (err) {
      toast({
        title: 'Failed to complete consultation',
        description: err instanceof Error ? err.message : '',
        variant: 'error',
      });
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'vitals', label: 'Vitals' },
    { key: 'soap', label: 'SOAP Note' },
    { key: 'prescription', label: 'Prescription' },
    { key: 'review', label: 'Complete' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation"
        description={
          visit.patient
            ? `${formatName(visit.patient.firstName, visit.patient.lastName)} · ${visit.visitNumber}`
            : visit.visitNumber
        }
        actions={
          <Badge variant="outline">{typeof visit.specialty === 'string' ? visit.specialty : String((visit.specialty as any)?.displayName || (visit.specialty as any)?.name || '')}</Badge>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-primary-600 text-white'
                  : i < currentIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i < currentIndex && <CheckCircle className="h-3 w-3" />}
              <span>{i + 1}. {s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className="h-px w-6 bg-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'vitals' && (
        <VitalsPanel
          visitId={visit.id}
          existingVitals={visit.vitals}
          onComplete={() => setStep('soap')}
        />
      )}

      {step === 'soap' && (
        <div className="space-y-4">
          {/* Voice-first: Ambient Scribe */}
          {visitId && (
            <AmbientScribe
              visitId={visitId}
              aiContext={{
                chiefComplaint: visit.chiefComplaint || undefined,
                specialty: visit.specialty,
                patientAge: patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined,
                patientGender: patient?.gender,
                allergies: patient?.allergies,
              }}
              onSoapGenerated={(suggestion) => setScribeSuggestion(suggestion)}
            />
          )}

          <SoapEditor
            data={soapData}
            onChange={setSoapData}
            specialtyFields={specialtyConfig?.soapFields}
            aiContext={visitId && visit.chiefComplaint ? {
              visitId,
              chiefComplaint: visit.chiefComplaint,
              specialty: visit.specialty,
              vitals: visit.vitals ? {
                heightCm: visit.vitals.heightCm,
                weightKg: visit.vitals.weightKg,
                temperatureF: visit.vitals.temperatureF,
                pulseRate: visit.vitals.pulseRate,
                systolicBp: visit.vitals.systolicBp,
                diastolicBp: visit.vitals.diastolicBp,
              } : undefined,
              patientAge: patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined,
              patientGender: patient?.gender,
              allergies: patient?.allergies,
            } : undefined}
            externalSuggestion={scribeSuggestion}
            onExternalSuggestionHandled={() => setScribeSuggestion(null)}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('vitals')}>Back</Button>
            <Button onClick={() => setStep('prescription')}>Next: Prescription</Button>
          </div>
        </div>
      )}

      {step === 'prescription' && (
        <div className="space-y-4">
          <PrescriptionBuilder
            control={rxForm.control}
            register={rxForm.register}
            aiContext={soapData.assessment ? {
              diagnoses: [soapData.assessment],
              patientAge: patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined,
              patientGender: patient?.gender,
              patientWeight: visit.vitals?.weightKg ?? undefined,
              allergies: patient?.allergies,
              specialty: visit.specialty,
            } : undefined}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('soap')}>Back</Button>
            <Button onClick={() => setStep('review')}>Next: Review</Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold">Review & Complete</h3>

            {(soapData.subjective || soapData.objective || soapData.assessment || soapData.plan) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">SOAP Note</h4>
                {soapData.subjective && <p className="text-sm"><strong>S:</strong> {soapData.subjective}</p>}
                {soapData.objective && <p className="text-sm"><strong>O:</strong> {soapData.objective}</p>}
                {soapData.assessment && <p className="text-sm"><strong>A:</strong> {soapData.assessment}</p>}
                {soapData.plan && <p className="text-sm"><strong>P:</strong> {soapData.plan}</p>}
              </div>
            )}

            {rxForm.getValues().items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Prescription ({rxForm.getValues().items.length} medications)
                </h4>
                {rxForm.getValues().items.map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.medicationName} - {item.dosage} {item.frequency} for {item.duration}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('prescription')}>Back</Button>
            <Button onClick={handleComplete} disabled={completeConsultation.isPending}>
              <CheckCircle className="h-4 w-4" />
              {completeConsultation.isPending ? 'Completing...' : 'Complete Consultation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
