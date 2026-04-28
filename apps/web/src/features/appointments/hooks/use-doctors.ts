import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export const doctorKeys = {
  all: ['doctors'] as const,
};

let socket: any = null;

export function useDoctors() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: doctorKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: any[] }>('/doctors');
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Socket listener for real-time updates to doctor status
  useEffect(() => {
    if (!socket) {
      const baseUrl = (import.meta.env['VITE_API_URL'] || '').replace('/api', '');
      socket = io(baseUrl || window.location.origin, {
        withCredentials: true,
      });
    }

    const handler = (data: any) => {
      console.log('Real-time doctor update received:', data);
      // We could update the specific doctor in the cache, or just invalidate
      qc.invalidateQueries({ queryKey: doctorKeys.all });
    };

    socket.on('doctorStatusChanged', handler);
    return () => {
      socket.off('doctorStatusChanged', handler);
    };
  }, [qc]);

  return query;
}
