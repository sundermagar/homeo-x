import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Appointment, WaitlistEntry, AvailabilitySlot, CreateAppointmentDto, UpdateAppointmentDto } from '@mmc/types';

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const apptKeys = {
  all: ['appointments'] as const,
  list: (f: Record<string, any>) => [...apptKeys.all, 'list', f] as const,
  today: () => [...apptKeys.all, 'today'] as const,
  detail: (id: number) => [...apptKeys.all, 'detail', id] as const,
  slots: (doctorId: number, date: string) => [...apptKeys.all, 'slots', doctorId, date] as const,
  waitlist: (date: string) => [...apptKeys.all, 'waitlist', date] as const,
};

// ─── List Appointments ────────────────────────────────────────────────────────
export function useAppointments(filters: {
  date?: string;
  from_date?: string;
  to_date?: string;
  doctor_id?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: apptKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const res = await apiClient.get(`/appointments?${params}`);
      return res.data as { data: Appointment[]; total: number; success: boolean };
    },
    staleTime: 30_000,
  });
}

// ─── Today's List ─────────────────────────────────────────────────────────────
export function useTodayAppointments() {
  return useQuery({
    queryKey: apptKeys.today(),
    queryFn: async () => {
      const res = await apiClient.get('/appointments/today');
      return res.data as Appointment[];
    },
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

// ─── Available Slots ──────────────────────────────────────────────────────────
export function useAvailableSlots(doctorId: number | undefined, date: string | undefined) {
  return useQuery({
    queryKey: apptKeys.slots(doctorId!, date!),
    queryFn: async () => {
      const res = await apiClient.get(`/appointments/availability?doctor_id=${doctorId}&date=${date}`);
      return res.data as AvailabilitySlot[];
    },
    enabled: !!doctorId && !!date,
  });
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────
export function useWaitlist(date: string, doctorId?: number) {
  return useQuery({
    queryKey: [...apptKeys.waitlist(date), doctorId],
    queryFn: async () => {
      const url = `/appointments/waiting?date=${date}${doctorId ? `&doctor_id=${doctorId}` : ''}`;
      const res = await apiClient.get(url);
      return res.data as WaitlistEntry[];
    },
    refetchInterval: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) => apiClient.post('/appointments', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateAppointmentDto }) =>
      apiClient.put(`/appointments/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cancellationReason }: { id: number; status: string; cancellationReason?: string }) =>
      apiClient.post(`/appointments/${id}/status`, { status, cancellationReason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useIssueToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: number) =>
      apiClient.post(`/appointments/${appointmentId}/issue-token`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useAddToWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { patientId: number; appointmentId?: number; doctorId?: number; consultationFee?: number }) =>
      apiClient.post('/appointments/waiting', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useCallNext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/waiting/${id}/call-next`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useCompleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/appointments/waiting/${id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}
