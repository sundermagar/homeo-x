/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/infrastructure/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useStockLogs,
} from './use-settings';

const mockedGet = apiClient.get as Mock;
const mockedPost = apiClient.post as Mock;
const mockedPut = apiClient.put as Mock;
const mockedDelete = apiClient.delete as Mock;
const mockedUseQuery = useQuery as Mock;
const mockedUseMutation = useMutation as Mock;
const mockedUseQueryClient = useQueryClient as Mock;

describe('settings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue({ data: [] });
    mockedPost.mockResolvedValue({ data: [] });
    mockedPut.mockResolvedValue({ data: [] });
    mockedDelete.mockResolvedValue({ data: [] });
    mockedUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
  });

  it('registers departments list query and fetches from correct endpoint', async () => {
    useDepartments();

    expect(mockedUseQuery).toHaveBeenCalled();
    const queryOptions = mockedUseQuery.mock.calls[0]![0];
    expect(queryOptions.queryKey).toEqual(['settings', 'departments']);

    await queryOptions.queryFn();
    expect(mockedGet).toHaveBeenCalledWith('/settings/departments');
  });

  it('creates a department and invalidates the departments query key', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries });

    useCreateDepartment();
    expect(mockedUseMutation).toHaveBeenCalled();

    const mutationOptions = mockedUseMutation.mock.calls[0]![0];
    await mutationOptions.mutationFn({ name: 'Homeopathy' });
    mutationOptions.onSuccess?.();

    expect(mockedPost).toHaveBeenCalledWith('/settings/departments', { name: 'Homeopathy' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('updates a department using PUT on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries });

    useUpdateDepartment();
    const mutationOptions = mockedUseMutation.mock.calls[0]![0];
    await mutationOptions.mutationFn({ id: 22, name: 'Updated Dept' });
    mutationOptions.onSuccess?.();

    expect(mockedPut).toHaveBeenCalledWith('/settings/departments/22', { name: 'Updated Dept' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('deletes a department using DELETE on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries });

    useDeleteDepartment();
    const mutationOptions = mockedUseMutation.mock.calls[0]![0];
    await mutationOptions.mutationFn(44);
    mutationOptions.onSuccess?.();

    expect(mockedDelete).toHaveBeenCalledWith('/settings/departments/44');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('loads stock logs with medicineId query parameter when provided', async () => {
    useStockLogs(17);

    expect(mockedUseQuery).toHaveBeenCalled();
    const queryOptions = mockedUseQuery.mock.calls[0]![0];
    expect(queryOptions.queryKey).toEqual(['settings', 'stock-logs', 17]);

    await queryOptions.queryFn();
    expect(mockedGet).toHaveBeenCalledWith('/settings/stock-logs?medicineId=17');
  });
});
