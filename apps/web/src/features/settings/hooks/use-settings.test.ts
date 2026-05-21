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

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedApi = {
  get: vi.mocked(apiClient.get),
  post: vi.mocked(apiClient.post),
  put: vi.mocked(apiClient.put),
  delete: vi.mocked(apiClient.delete),
};

describe('settings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: [] } as any);
    mockedApi.post.mockResolvedValue({ data: [] } as any);
    mockedApi.put.mockResolvedValue({ data: [] } as any);
    mockedApi.delete.mockResolvedValue({ data: [] } as any);
    mockedUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() } as any);
  });

  it('registers departments list query and fetches from correct endpoint', async () => {
    useDepartments();

    expect(mockedUseQuery).toHaveBeenCalled();
    const queryOptions = mockedUseQuery.mock.calls[0]![0] as any;
    expect(queryOptions.queryKey).toEqual(['settings', 'departments']);

    await queryOptions.queryFn();
    expect(mockedApi.get).toHaveBeenCalledWith('/settings/departments');
  });

  it('creates a department and invalidates the departments query key', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries } as any);

    useCreateDepartment();
    expect(mockedUseMutation).toHaveBeenCalled();

    const mutationOptions = mockedUseMutation.mock.calls[0]![0] as any;
    await mutationOptions.mutationFn({ name: 'Homeopathy' });
    mutationOptions.onSuccess?.();

    expect(mockedApi.post).toHaveBeenCalledWith('/settings/departments', { name: 'Homeopathy' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('updates a department using PUT on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries } as any);

    useUpdateDepartment();
    const mutationOptions = mockedUseMutation.mock.calls[0]![0] as any;
    await mutationOptions.mutationFn({ id: 22, name: 'Updated Dept' });
    mutationOptions.onSuccess?.();

    expect(mockedApi.put).toHaveBeenCalledWith('/settings/departments/22', { name: 'Updated Dept' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('deletes a department using DELETE on the correct URL', async () => {
    const invalidateQueries = vi.fn();
    mockedUseQueryClient.mockReturnValue({ invalidateQueries } as any);

    useDeleteDepartment();
    const mutationOptions = mockedUseMutation.mock.calls[0]![0] as any;
    await mutationOptions.mutationFn(44);
    mutationOptions.onSuccess?.();

    expect(mockedApi.delete).toHaveBeenCalledWith('/settings/departments/44');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings', 'departments'] });
  });

  it('loads stock logs with medicineId query parameter when provided', async () => {
    useStockLogs(17);

    expect(mockedUseQuery).toHaveBeenCalled();
    const queryOptions = mockedUseQuery.mock.calls[0]![0] as any;
    expect(queryOptions.queryKey).toEqual(['settings', 'stock-logs', 17]);

    await queryOptions.queryFn();
    expect(mockedApi.get).toHaveBeenCalledWith('/settings/stock-logs?medicineId=17');
  });
});
