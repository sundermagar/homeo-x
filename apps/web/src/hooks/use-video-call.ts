// @ts-nocheck
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';

export interface VideoCallToken {
  token: string;
  channel: string;
  appId: string;
  uid: number;
  visitId: string;
  patientJoinLink: string;
  tenantId?: string;
}

/**
 * Generate Agora token for doctor (authenticated).
 */
export function useVideoCallToken() {
  return useMutation({
    mutationFn: (data: { visitId: string; role?: 'host' | 'audience' }) =>
      api.post<VideoCallToken>(API.VIDEO_CALL.TOKEN, data),
  });
}

/**
 * Get Agora token for patient (public, no auth).
 */
export async function fetchPatientToken(roomId: string): Promise<VideoCallToken> {
  const response = await fetch(`${window.location.origin}${API.VIDEO_CALL.PATIENT_TOKEN(roomId)}`);
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || 'Failed to join room');
  }
  return body.data;
}
