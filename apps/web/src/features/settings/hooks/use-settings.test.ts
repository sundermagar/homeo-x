/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('settings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: [] });
    apiClient.put.mockResolvedValue({ data: [] });
    apiClient.delete.mockResolvedValue({ data: [] });
    useQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
  });

  it('registers departments list query and fetches from correct endpoint', async () => {
    useDepartments();

    expect(useQuery).toHaveBeenCalled();
    const queryOptions = useQuery.mock.calls[0][0];
    expect(queryOptions.queryKey).toEqual(['settings', 'departments']);

    await queryOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith('/settings/departments');
  });

  it('creates a department and invalidates the departments query key', async () => {
    const invalidateQueries = vi.fn();
    useQueryClient.mockReturnValue({ invalidateQueries });

    useCreateDepartment();
    expect(useMutation).toHaveBeenCalled();

    const mutationOptions = useMutation.mock.calls[0][0];
    await mutationOptions.mutationFn({ name: 'Homeopathy' });
    mutationOptions.onSuccess?.();

    expect(apiClient.post).toHaveBeenCalledWith('/settings/departments', { name: 'Homeopathy' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('updates a department using PUT on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    useQueryClient.mockReturnValue({ invalidateQueries });

    useUpdateDepartment();
    const mutationOptions = useMutation.mock.calls[0][0];
    await mutationOptions.mutationFn({ id: 22, name: 'Updated Dept' });
    mutationOptions.onSuccess?.();

    expect(apiClient.put).toHaveBeenCalledWith('/settings/departments/22', { name: 'Updated Dept' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('deletes a department using DELETE on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    useQueryClient.mockReturnValue({ invalidateQueries });

    useDeleteDepartment();
    const mutationOptions = useMutation.mock.calls[0][0];
    await mutationOptions.mutationFn(44);
    mutationOptions.onSuccess?.();

    expect(apiClient.delete).toHaveBeenCalledWith('/settings/departments/44');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('loads stock logs with medicineId query parameter when provided', async () => {
    useStockLogs(17);

    expect(useQuery).toHaveBeenCalled();
    const queryOptions = useQuery.mock.calls[0][0];
    expect(queryOptions.queryKey).toEqual(['settings', 'stock-logs', 17]);

    await queryOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith('/settings/stock-logs?medicineId=17');
  });
});
