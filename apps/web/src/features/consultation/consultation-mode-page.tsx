import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { LoadingState } from '../../components/shared/loading-state';
import { useConsultationState } from './hooks/use-consultation-state';
import { useVideoService } from '../../hooks/use-video-service';
import { HomeopathyConsultationLayout } from './layouts/homeopathy-consultation-layout';
import type { VideoCallState } from './components/consultation-header';

// ─── Fetch waitlist entry + patient info ───
function useWaitlistVisit(waitlistId: string | undefined) {
  return useQuery({
    queryKey: ['waitlist-visit', waitlistId],
    queryFn: async () => {
      // Fetch today's waitlist
      const { data } = await apiClient.get('/appointments/waiting');
      const list = Array.isArray(data) ? data : [];
      const entry = list.find((w: any) => String(w.id) === waitlistId);
      
      if (!entry) {
        // If not found in waitlist, create a minimal visit object
        // This handles cases where the patient was already completed
        return {
          id: waitlistId,
          patientId: null,
          visitNumber: `W${waitlistId}`,
          status: 'IN_PROGRESS',
          specialty: 'Homeopathy',
          patient: { firstName: 'Patient', lastName: '' },
          vitals: null,
        };
      }

      // Try to fetch patient details
      let patientDetails = null;
      if (entry.patientId) {
        try {
          const { data: pData } = await apiClient.get(`/patients/${entry.patientId}`);
          patientDetails = pData;
        } catch { /* ok - patient details are optional */ }
      }

      return {
        id: String(entry.id),
        patientId: entry.patientId,
        visitNumber: `W${entry.waitingNumber}`,
        status: entry.status === 0 ? 'CHECKED_IN' : entry.status === 1 ? 'IN_PROGRESS' : 'COMPLETED',
        specialty: 'Homeopathy',
        patient: patientDetails || {
          firstName: entry.patientName?.split(' ')[0] || 'Patient',
          lastName: entry.patientName?.split(' ').slice(1).join(' ') || '',
          gender: patientDetails?.gender,
          dateOfBirth: patientDetails?.dateOfBirth || patientDetails?.dob,
          allergies: patientDetails?.allergies,
        },
        vitals: null,
        doctorId: entry.doctorId,
      };
    },
    enabled: !!waitlistId,
    retry: 1,
  });
}

// ─── Outer shell ───
export default function ConsultationModePage() {
  const { visitId } = useParams<{ visitId: string }>();
  const { data: visit, isLoading, isError } = useWaitlistVisit(visitId);

  if (isLoading) return <LoadingState message="Loading consultation..." />;

  // Even if we can't fetch the waitlist, still render the consultation UI
  // so the doctor can start working immediately
  const effectiveVisit = visit || {
    id: visitId,
    patientId: null,
    visitNumber: `W${visitId}`,
    status: 'IN_PROGRESS',
    specialty: 'Homeopathy',
    patient: { firstName: 'Patient', lastName: '' },
    vitals: null,
  };

  return (
    <ConsultationModeInner
      visitId={visitId!}
      visit={effectiveVisit}
      patient={effectiveVisit.patient}
    />
  );
}

// ─── Inner component: all hooks called unconditionally ───
function ConsultationModeInner({
  visitId,
  visit,
  patient,
}: {
  visitId: string;
  visit: any;
  patient?: any;
}) {
  // ─── Video call state ───
  const [videoCallState, setVideoCallState] = useState<VideoCallState | null>(null);

  // Shared consultation state consumed by all layouts
  const consultationState = useConsultationState({ visitId, visit, patient, uiHints: undefined });

  const video = useVideoService();

  useEffect(() => {
    if (videoCallState) {
      video.join(videoCallState.appId, videoCallState.channel, videoCallState.token, videoCallState.uid);
    } else {
      video.leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoCallState]);

  // ─── Always render the Homeopathy Layout ───
  return (
    <HomeopathyConsultationLayout
      visitId={visitId}
      visit={visit}
      patient={patient}
      uiHints={undefined}
      state={consultationState}
      refetch={() => {}}
      videoCallState={videoCallState}
      onStartVideoCall={setVideoCallState}
      video={video}
    />
  );
}
