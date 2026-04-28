import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';
import { API } from '../../../lib/constants';
import type {
  ExtractSymptomsInput,
  CategorizedSymptoms,
} from '../../../types/ai';

export function useSymptomExtraction() {
  return useMutation({
    mutationFn: (input: ExtractSymptomsInput) =>
      api.post<CategorizedSymptoms>(API.AI.EXTRACT_SYMPTOMS, input),
  });
}
