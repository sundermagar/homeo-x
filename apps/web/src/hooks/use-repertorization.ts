// @ts-nocheck
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type {
  RubricExtractionInput,
  RubricExtractionResult,
  RepertorizeScoreInput,
  RepertorizationResult,
  AnalyzeCaseInput,
  ClinicalExtractionResult,
  SummaryOutput,
} from '../types/ai';

export function useExtractRubrics() {
  return useMutation({
    mutationFn: (input: RubricExtractionInput) =>
      api.post<RubricExtractionResult>(API.AI.REPERTORIZE_EXTRACT, input),
  });
}

export function useExtractDiseaseRubrics() {
  return useMutation({
    mutationFn: (input: { disease: string }) =>
      api.post<any>(API.AI.DISEASE_RUBRICS, input),
  });
}

export function useRepertorizeScore() {
  return useMutation({
    mutationFn: (input: RepertorizeScoreInput) =>
      api.post<RepertorizationResult>(API.AI.REPERTORIZE_SCORE, input),
  });
}

export function useAnalyzeCase() {
  return useMutation({
    mutationFn: (input: AnalyzeCaseInput) =>
      api.post<ClinicalExtractionResult>(API.AI.CASE_EXTRACT, input),
  });
}

export function useSuggestSoap() {
  return useMutation({
    mutationFn: (input: { transcript: string; chiefComplaint?: string; patientAge?: number; patientGender?: string }) =>
      api.post<any>(API.AI.SUGGEST_SOAP, input),
  });
}

export function useGenerateSummary() {
  return useMutation({
    mutationFn: (input: {
      observations: string[];
      clinicalFindings: string[];
      selectedRemedies: Array<{ name: string; score: number }>;
    }) => api.post<SummaryOutput>(API.AI.CASE_SUMMARY, input),
  });
}
