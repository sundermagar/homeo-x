import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingState } from '../../components/shared/loading-state';
import { useVisit } from '../../hooks/use-visits';
import { useStartConsultation, useConsultationSummary } from '../../hooks/use-consultations';
import { useSpecialtyConfig } from '../../hooks/use-specialties';
import { usePatient } from '../../features/patients/hooks/use-patients';
import { useConsultationState } from './hooks/use-consultation-state';
import { useVideoService } from '../../hooks/use-video-service';
import { HomeopathyConsultationLayout } from './layouts/homeopathy-consultation-layout';
import { useAppointment } from '../../features/appointments/hooks/use-appointments';
import type { Visit } from '../../types/visit';
import type { Patient } from '../../types/patient';
import type { UiHints } from '../../types/consultation';
import type { VideoCallState } from './components/consultation-header';

// ─── Outer shell ───
// We always render the consultation UI as long as :visitId is in the URL.
// If the visit isn't fetched yet (or the API returns nothing), we synthesize
// a minimal visit so the doctor can start working immediately.
export default function ConsultationModePage() {
  const { visitId } = useParams<{ visitId: string }>();
  const { data: visit, refetch, isLoading: isVisitLoading } = useVisit(visitId);
  const { data: appointment, isLoading: isApptLoading } = useAppointment(visitId);

  // The actual patientId might come from the visit or the appointment
  const patientIdToFetch = visit?.patientId || appointment?.patientId || (appointment as any)?.regid;
  const { data: fullPatient, isLoading: isPatientLoading } = usePatient(Number(patientIdToFetch));

  if (!visitId) return null;

  if (isVisitLoading || isApptLoading || (patientIdToFetch && isPatientLoading)) {
    return <LoadingState message="Loading consultation details..." />;
  }

  const effectiveVisit: Visit = (visit as Visit) ?? ({
    id: visitId,
    patientId: patientIdToFetch as string,
    visitNumber: appointment?.tokenNo ? `T-${appointment.tokenNo}` : `A${visitId}`,
    status: appointment?.status === 'Waitlist' ? 'CHECKED_IN' : 'IN_PROGRESS',
    specialty: 'Homeopathy',
    chiefComplaint: appointment?.notes || '',
    patient: { 
      firstName: appointment?.patientName ? appointment.patientName.split(' ')[0] : 'Patient', 
      lastName: appointment?.patientName ? appointment.patientName.split(' ').slice(1).join(' ') : '' 
    },
    vitals: (appointment as any)?.vitals || null,
  } as unknown as Visit);

  // The visits API now returns a normalized patient sub-object directly on
  // the visit, but it may be incomplete (missing DOB, allergies, etc). 
  // We explicitly fetch fullPatient and use that if available, falling back
  // to the visit's embedded patient data.
  // We map 'surname' to 'lastName' for compatibility with existing components.
  const patient = fullPatient ? {
    ...fullPatient,
    lastName: (fullPatient as any).surname || (fullPatient as any).lastName || '',
  } : ((effectiveVisit as any).patient ?? null);

  return (
    <ConsultationModeInner
      visitId={visitId}
      visit={effectiveVisit}
      patient={patient}
      refetch={refetch}
    />
  );
}

// ─── Inner component: all hooks called unconditionally ───
function ConsultationModeInner({
  visitId,
  visit,
  patient,
  refetch,
}: {
  visitId: string;
  visit: Visit;
  patient?: Patient | null;
  refetch: () => void;
}) {
  const startConsultation = useStartConsultation();
  useSpecialtyConfig(visit.specialty);

  // Default category to 'TOTALITY' so the layout renders immediately —
  // we no longer wait on the start-consultation API to land.
  const [activeCategory, setActiveCategory] = useState<string | null>('TOTALITY');
  const [activeUiHints, setActiveUiHints] = useState<UiHints | undefined>(undefined);
  const [, setInitError] = useState(false);

  const isStarted = visit.status === 'IN_PROGRESS' || visit.status === 'COMPLETED';
  
  // 1. Always fetch summary if IN_PROGRESS or COMPLETED
  const { data: summary, isError: summaryError, isPending: summaryPending } = useConsultationSummary(
    isStarted ? visitId : undefined
  );

  // Sync summary to active state
  useEffect(() => {
    if (isStarted && summary) {
      setActiveCategory(summary.clinicCategory || 'TOTALITY');
      if (summary.uiHints) setActiveUiHints(summary.uiHints);
    } else if (isStarted && summaryError) {
      setActiveCategory('TOTALITY'); // Absolute fallback on error
    }
  }, [isStarted, summary, summaryError]);

  // 2. Start consultation if CHECKED_IN
  const hasStartedRef = useRef<string | null>(null);
  useEffect(() => {
    if (visit.status === 'CHECKED_IN' && hasStartedRef.current !== visitId) {
      hasStartedRef.current = visitId;
      startConsultation.mutate(visitId, {
        onSuccess: (response) => {
          if (response?.clinicCategory) setActiveCategory(response.clinicCategory);
          else setActiveCategory('TOTALITY'); // fallback
          if (response?.uiHints) setActiveUiHints(response.uiHints);
          refetch(); // Trigger visit update
        },
        onError: () => {
          setActiveCategory('TOTALITY');
          setInitError(true);
        }
      });
    } else if (visit.status !== 'IN_PROGRESS' && visit.status !== 'CHECKED_IN' && visit.status !== 'COMPLETED') {
      // Fallback for SCHEDULED, CANCELLED
      if (!activeCategory) setActiveCategory('TOTALITY');
    }
  }, [visit.status, visitId, refetch, activeCategory, startConsultation]);

  // Initialization barrier removed — we render the layout immediately so the
  // doctor lands on PATIENT_INFO straight from the dashboard.

  // ─── Video call state ───
  const [videoCallState, setVideoCallState] = useState<VideoCallState | null>(null);

  // Shared consultation state consumed by all layouts
  const consultationState = useConsultationState({ visitId, visit, patient, uiHints: activeUiHints });

  const video = useVideoService();

  useEffect(() => {
    if (videoCallState) {
      console.log(`[ConsultationMode] Joining video call channel: ${videoCallState.channel}`);
      video.join(videoCallState.appId, videoCallState.channel, videoCallState.token, videoCallState.uid);
    } else {
      video.leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoCallState]);

  // ─── Dispatch strictly restricted to Homeopathy Layout ───
  return (
    <HomeopathyConsultationLayout
      visitId={visitId}
      visit={visit}
      patient={patient}
      uiHints={activeUiHints}
      state={consultationState}
      refetch={refetch}
      videoCallState={videoCallState}
      onStartVideoCall={setVideoCallState}
      video={video}
    />
  );
}

