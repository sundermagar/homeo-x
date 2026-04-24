/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/infrastructure/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import OperationsDashboard from './operations-dashboard';
import { apiClient } from '@/infrastructure/api-client';

const mockedApiClientGet = vi.mocked(apiClient.get, true);

describe('OperationsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logistics tab by default and shows active shipments', () => {
    render(
      <MemoryRouter initialEntries={['/operations?tab=logistics']}>
        <OperationsDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Logistics & Couriers')).toBeDefined();
    expect(screen.getByText('Active Shipments')).toBeDefined();
    expect(screen.getByText('Rahul Sharma')).toBeDefined();
  });

  it('loads CRM data and shows empty state when no leads are returned', async () => {
    mockedApiClientGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter initialEntries={['/operations?tab=crm']}>
        <OperationsDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Lead Pipeline')).toBeDefined();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/crm/leads');
      expect(apiClient.get).toHaveBeenCalledWith('/crm/referrals/summary');
      expect(apiClient.get).toHaveBeenCalledWith('/crm/reminders');
    });

    expect(screen.getByText('No leads found.')).toBeDefined();
    expect(screen.getByText('No referrals found.')).toBeDefined();
    expect(screen.getByText('No reminders found.')).toBeDefined();
  });
});
