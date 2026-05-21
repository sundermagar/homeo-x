/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies of usePrescriptionWorkflow
const mockUsePatientPrescriptions = vi.fn();
const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();

vi.mock('./use-remedy-chart', () => ({
  usePatientPrescriptions: (regid: number) => mockUsePatientPrescriptions(regid),
  useSavePrescription: () => ({
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
  }),
  useDeletePrescription: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}));

import { usePrescriptionWorkflow } from './use-prescription-workflow';

describe('usePrescriptionWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatientPrescriptions.mockReturnValue({ data: [], isLoading: false });
    mockMutateAsync.mockResolvedValue({ id: 123, created_at: new Date().toISOString() });
  });

  it('should NOT automatically create a prescription draft on initialization when history is empty', () => {
    const { result } = renderHook(() => usePrescriptionWorkflow(1, 10, null, vi.fn()));

    // Active tab and editingId should remain null on load
    expect(result.current.activeTab).toBeNull();
    expect(result.current.editingId).toBeNull();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should automatically select and edit the latest prescription if a today\'s prescription already exists', () => {
    const todayStr = new Date().toDateString();
    const todayIso = new Date().toISOString();
    const existingRxs = [
      {
        id: 10,
        remedy_name: 'Belladonna',
        potency_name: '30C',
        frequency_name: 'TDS',
        days: 3,
        notes: 'Take with water',
        prescription: 'Take with water',
        created_at: todayIso,
      },
    ];

    mockUsePatientPrescriptions.mockReturnValue({ data: existingRxs, isLoading: false });

    const { result } = renderHook(() => usePrescriptionWorkflow(1, 10, todayIso, vi.fn()));

    // It should automatically set editing ID, fill form and active tab to 'rx'
    expect(result.current.activeTab).toBe('rx');
    expect(result.current.editingId).toBe(10);
    expect(result.current.form.remedyName).toBe('Belladonna');
    expect(result.current.form.potencyName).toBe('30C');
    expect(result.current.form.days).toBe(3);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should successfully create a new prescription when startNewRx is explicitly called', async () => {
    const onSelectDate = vi.fn();
    const { result } = renderHook(() => usePrescriptionWorkflow(1, 10, null, onSelectDate));

    // Initially form and editing are empty
    expect(result.current.editingId).toBeNull();
    expect(result.current.activeTab).toBeNull();

    // Call startNewRx explicitly
    await act(async () => {
      await result.current.startNewRx();
    });

    // It should trigger save mutation
    expect(mockMutateAsync).toHaveBeenCalledWith({
      regid: 1,
      visitId: 10,
      deliveryMode: 'clinic',
      remedyName: '',
      potencyName: '',
      frequencyName: '',
      days: 0,
      instructions: '',
      notes: '',
    });

    // After success, it sets activeTab and editingId
    expect(result.current.activeTab).toBe('rx');
    expect(result.current.editingId).toBe(123);
  });
});
