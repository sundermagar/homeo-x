import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { dashboardKeys } from './use-dashboard';

export function useQueueMgmt() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const checkIn = useMutation({
    mutationFn: (dto: { patientId?: number; appointmentId?: number; doctorId?: number; consultationFee?: number }) =>
      apiClient.post('/appointments/waiting', dto),
    onSuccess: invalidate,
  });

  const callNext = useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/waiting/${id}/call-next`),
    onSuccess: invalidate,
  });

  const skip = useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/waiting/${id}/skip`),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/waiting/${id}/complete`),
    onSuccess: invalidate,
  });

  const issueToken = useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/${id}/issue-token`),
    onSuccess: invalidate,
  });

  return {
    checkIn,
    callNext,
    skip,
    complete,
    issueToken,
    isLoading: checkIn.isPending || callNext.isPending || skip.isPending || complete.isPending || issueToken.isPending
  };
}
