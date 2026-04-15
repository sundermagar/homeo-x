// @ts-nocheck
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type {
  SoapSuggestion,
  DiagnosisSuggestion,
  PrescriptionSuggestion,
  SuggestSoapInput,
  SuggestDiagnosisInput,
  SuggestPrescriptionInput,
  AiFeedbackInput,
  TranslateTextInput,
  TranslationResponse,
} from '../types/ai';


export function useAiSuggestSoap() {
  return useMutation({
    mutationFn: (data: SuggestSoapInput) =>
      api.post<SoapSuggestion>(API.AI.SUGGEST_SOAP, data),
  });
}

export function useAiSuggestDiagnosis() {
  return useMutation({
    mutationFn: (data: SuggestDiagnosisInput) =>
      api.post<DiagnosisSuggestion>(API.AI.SUGGEST_DIAGNOSIS, data),
  });
}

export function useAiSuggestPrescription() {
  return useMutation({
    mutationFn: (data: SuggestPrescriptionInput) =>
      api.post<PrescriptionSuggestion>(API.AI.SUGGEST_PRESCRIPTION, data),
  });
}

export function useAiFeedback() {
  return useMutation({
    mutationFn: (data: AiFeedbackInput) =>
      api.post(API.AI.FEEDBACK, data),
  });
}

export function useAiTranslate() {
  return useMutation({
    mutationFn: (data: TranslateTextInput) =>
      api.post<TranslationResponse>(API.AI.TRANSLATE, data),
  });
}

import { useAuthStore } from '../shared/stores/auth-store';

export function useParseLabReport() {
  return useMutation({
    mutationFn: async (file: File) => {
      const token = useAuthStore.getState().accessToken;
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract just the base64 part, stripping the data:application/pdf;base64, prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${baseUrl}${API.AI.PARSE_LAB_REPORT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          base64,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to parse lab report');
      return body.data?.parsedText || body.parsedText as string;
    },
  });
}

