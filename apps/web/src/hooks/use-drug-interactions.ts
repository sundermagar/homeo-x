import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type { DrugInteractionWarning } from '../types/ai';

export function useCheckInteractions() {
  return useMutation({
    mutationFn: (drugs: string[]) =>
      api.post<DrugInteractionWarning[]>(API.DRUG_INTERACTIONS.CHECK, { drugs }),
  });
}
