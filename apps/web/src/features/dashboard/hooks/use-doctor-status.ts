import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

const statusKeys = {
  doctor: ['doctor-status'] as const,
};

// Simple socket initialization inside the hook for now to keep it localized
// or we can move it to a global provider later.
let socket: any = null;

export function useDoctorStatus(isDoctor: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: statusKeys.doctor,
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; isActive: boolean }>('/doctors/status');
      return data.isActive;
    },
    enabled: isDoctor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Socket listener for real-time updates
  useEffect(() => {
    if (!isDoctor) return;

    if (!socket) {
      const baseUrl = (import.meta.env['VITE_API_URL'] || '').replace('/api', '');
      socket = io(baseUrl || window.location.origin, {
        withCredentials: true,
      });
    }

    const handler = (data: any) => {
      console.log('Real-time status update received:', data);
      qc.setQueryData(statusKeys.doctor, data.isActive);
    };

    socket.on('doctorStatusChanged', handler);
    return () => {
      socket.off('doctorStatusChanged', handler);
    };
  }, [isDoctor, qc]);

  return query;
}

export function useUpdateDoctorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const { data } = await apiClient.patch<{ success: boolean; isActive: boolean }>('/doctors/status', { isActive });
      return data.isActive;
    },
    onSuccess: (isActive) => {
      qc.setQueryData(statusKeys.doctor, isActive);
      // Also invalidate appointment keys to refresh dropdowns if needed
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
