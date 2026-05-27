import { useMemo } from 'react';

export type KeyStatus = 'Valid' | 'Expiring soon' | 'Expired' | 'Revoked';

export interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  maskedPreview: string;
  status: KeyStatus;
  expiresAt: string | null;
  createdAt: string;
  lastRotatedAt: string | null;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'VIEWED_MASKED' | 'KEY_ADDED' | 'KEY_ROTATED' | 'KEY_REVOKED';
  provider: string;
  adminId: string;
  ipAddress: string;
}

export function useApiKeys(): ApiKey[] {
  return useMemo(() => [
    {
      id: 'k_1',
      provider: 'OpenAI',
      keyName: 'Production Org Key (Default)',
      maskedPreview: 'sk-proj-••••••Kd9x',
      status: 'Valid',
      expiresAt: null,
      createdAt: '2025-11-10T10:00:00Z',
      lastRotatedAt: '2026-03-15T14:30:00Z',
      createdBy: 'admin_sys_01'
    },
    {
      id: 'k_2',
      provider: 'Anthropic',
      keyName: 'Claude Sonnet Primary',
      maskedPreview: 'sk-ant-••••••f1pA',
      status: 'Expiring soon',
      expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
      createdAt: '2026-01-05T09:15:00Z',
      lastRotatedAt: '2026-01-05T09:15:00Z',
      createdBy: 'admin_sys_01'
    },
    {
      id: 'k_3',
      provider: 'Google AI',
      keyName: 'Gemini General Key',
      maskedPreview: 'AIzaSy••••••_j8H',
      status: 'Expired',
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      createdAt: '2025-12-20T11:45:00Z',
      lastRotatedAt: null,
      createdBy: 'admin_sys_02'
    }
  ], []);
}

export function useKeyAuditLogs(): AuditLog[] {
  return useMemo(() => [
    { id: 'log_1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), action: 'VIEWED_MASKED', provider: 'OpenAI', adminId: 'admin_sys_01', ipAddress: '192.168.1.45' },
    { id: 'log_2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), action: 'KEY_ROTATED', provider: 'OpenAI', adminId: 'admin_sys_01', ipAddress: '192.168.1.45' },
    { id: 'log_3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), action: 'KEY_REVOKED', provider: 'Google AI', adminId: 'admin_sys_02', ipAddress: '10.0.0.8' },
    { id: 'log_4', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), action: 'KEY_ADDED', provider: 'Anthropic', adminId: 'admin_sys_01', ipAddress: '192.168.1.45' },
  ], []);
}
