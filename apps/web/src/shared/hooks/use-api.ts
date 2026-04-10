import { apiClient } from '@/infrastructure/api-client';

export function useApi() {
  return apiClient;
}
