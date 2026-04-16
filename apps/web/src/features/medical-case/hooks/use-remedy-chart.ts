import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RemedyTreeNode {
  id: number;
  parentId: number;
  label: string;
  description: string | null;
  nodeType: string;
  sortOrder: number;
  children?: RemedyTreeNode[];
}

export interface AlphabetGroup {
  letter: string;
  nodes: RemedyTreeNode[];
}

export interface RemedyLookups {
  medicines:   { id: number; name: string }[];
  potencies:   { id: number; name: string }[];
  frequencies: { id: number; name: string }[];
}

export interface RemedyAlternative {
  id: number;
  treeId: number;
  remedy: string;
  potency: string | null;
  notes:   string | null;
}

export interface PrescriptionRow {
  id: number;
  regid: number;
  dateval: string;
  todate: string;
  remedy_name: string;
  potency_name: string;
  frequency_name: string;
  days: number;
  notes: string;
  prescription: string;
  created_at: string;
}

export interface SavePrescriptionDto {
  id?:            number;
  regid:          number;
  visitId?:       number;
  remedyName:     string;
  potencyName:    string;
  frequencyName:  string;
  days:           number;
  notes?:         string;
  instructions?:  string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Full hierarchical remedy tree, optionally filtered by label */
export function useRemedyTree(label?: string) {
  return useQuery<RemedyTreeNode[]>({
    queryKey: ['remedy-chart', 'tree', label ?? ''],
    queryFn:  () =>
      apiClient
        .get('/medical-cases/remedy-chart/tree', { params: label ? { label } : {} })
        .then(r => (r.data as any).data ?? r.data),
    staleTime: 60_000,
  });
}

/** A-Z alphabet index of root nodes */
export function useAlphabetIndex() {
  return useQuery<AlphabetGroup[]>({
    queryKey: ['remedy-chart', 'alphabet'],
    queryFn:  () =>
      apiClient
        .get('/medical-cases/remedy-chart/tree/alphabet')
        .then(r => (r.data as any).data ?? r.data),
    staleTime: 5 * 60_000,
  });
}

/** Nodes filtered by first letter */
export function useTreeByLetter(letter: string) {
  return useQuery<AlphabetGroup[]>({
    queryKey: ['remedy-chart', 'filter', letter],
    queryFn:  () =>
      apiClient
        .get('/medical-cases/remedy-chart/tree/filter', { params: { letter } })
        .then(r => (r.data as any).data ?? r.data),
    enabled: !!letter,
  });
}

/** Medicines, potencies, and frequencies for dropdown selects */
export function useRemedyLookups() {
  return useQuery<RemedyLookups>({
    queryKey: ['remedy-chart', 'lookups'],
    queryFn:  () =>
      apiClient
        .get('/medical-cases/remedy-chart/lookups')
        .then(r => (r.data as any).data ?? r.data),
    staleTime: 10 * 60_000,
  });
}

/** Alternative medicines for a selected tree node */
export function useRemedyAlternatives(treeNodeId: number | null) {
  return useQuery<RemedyAlternative[]>({
    queryKey: ['remedy-chart', 'alternatives', treeNodeId],
    queryFn:  () =>
      apiClient
        .get(`/medical-cases/remedy-chart/alternatives/${treeNodeId}`)
        .then(r => (r.data as any).data ?? r.data),
    enabled: treeNodeId !== null && treeNodeId > 0,
  });
}

/** Prescription history for a patient */
export function usePatientPrescriptions(regid: number) {
  return useQuery<PrescriptionRow[]>({
    queryKey: ['remedy-chart', 'prescriptions', regid],
    queryFn:  () =>
      apiClient
        .get(`/medical-cases/remedy-chart/${regid}`)
        .then(r => (r.data as any).data ?? r.data),
    enabled: !!regid,
  });
}

/** Save (upsert) a prescription row */
export function useSavePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SavePrescriptionDto) =>
      apiClient
        .post('/medical-cases/remedy-chart', dto)
        .then(r => (r.data as any).data ?? r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['remedy-chart', 'prescriptions', vars.regid] });
    },
  });
}

/** Soft-delete a prescription row */
export function useDeletePrescription(regid: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/medical-cases/remedy-chart/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remedy-chart', 'prescriptions', regid] });
    },
  });
}
