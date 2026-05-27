import { useMemo } from 'react';

export type FeatureColor = '#10B981' | '#3B82F6' | '#F59E0B' | '#93C5FD' | '#F43F5E';

export interface RoutingRule {
  id: string;
  feature: string;
  color: FeatureColor;
  primaryModel: string;
  fallbackModels: string[];
  dailyBudget: number;
  isEnabled: boolean;
}

export interface ClinicWallet {
  id: string;
  name: string;
  monthlyLimit: number;
  spentThisMonth: number;
}

export interface AlertRule {
  id: string;
  title: string;
  description: string;
  type: 'threshold' | 'event' | 'days';
  threshold?: number;
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export function useRoutingRules(): RoutingRule[] {
  return useMemo(() => [
    { id: '1', feature: 'Consultation AI', color: '#10B981', primaryModel: 'gpt-4o', fallbackModels: ['claude-sonnet-3.5', 'gemini-1.5-pro'], dailyBudget: 2500, isEnabled: true },
    { id: '2', feature: 'Transcription', color: '#3B82F6', primaryModel: 'whisper-v3', fallbackModels: [], dailyBudget: 1500, isEnabled: true },
    { id: '3', feature: 'Summarization', color: '#F59E0B', primaryModel: 'gpt-4o-mini', fallbackModels: ['gemini-1.5-flash'], dailyBudget: 800, isEnabled: true },
    { id: '4', feature: 'Follow-ups', color: '#F59E0B', primaryModel: 'gpt-4o-mini', fallbackModels: ['gemini-1.5-flash'], dailyBudget: 500, isEnabled: true },
    { id: '5', feature: 'Analysis', color: '#93C5FD', primaryModel: 'claude-sonnet-3.5', fallbackModels: ['gpt-4o'], dailyBudget: 1200, isEnabled: false },
    { id: '6', feature: 'Prescription', color: '#F43F5E', primaryModel: 'gpt-4o', fallbackModels: [], dailyBudget: 1000, isEnabled: true },
  ], []);
}

export function useClinicWallets(): ClinicWallet[] {
  return useMemo(() => [
    { id: 'KH-0042', name: 'Main City Branch', monthlyLimit: 25000, spentThisMonth: 21500 },
    { id: 'KH-0089', name: 'Westside Clinic', monthlyLimit: 10000, spentThisMonth: 3400 },
    { id: 'KH-0102', name: 'Pediatrics Center', monthlyLimit: 5000, spentThisMonth: 4850 },
    { id: 'KH-0155', name: 'North Suburbs', monthlyLimit: 15000, spentThisMonth: 15000 },
  ], []);
}

export function useAlertRules(): AlertRule[] {
  return useMemo(() => [
    { id: '1', title: 'Wallet low', description: 'Triggers when central wallet balance drops below threshold', type: 'threshold', threshold: 5000, inApp: true, email: true, sms: false },
    { id: '2', title: 'Model overspend', description: 'Triggers if daily model spend exceeds budget by 20%', type: 'event', inApp: true, email: false, sms: false },
    { id: '3', title: 'Clinic near limit', description: 'Triggers when a clinic consumes ≥80% of monthly limit', type: 'event', inApp: true, email: true, sms: true },
    { id: '4', title: 'Wallet depletion imminent', description: 'Triggers when projected credits will exhaust in X days', type: 'days', threshold: 7, inApp: true, email: true, sms: true },
    { id: '5', title: 'Fallback routing triggered', description: 'Triggers when a primary model fails and fallback is used', type: 'event', inApp: true, email: false, sms: false },
    { id: '6', title: 'API key expiring', description: 'Triggers when a configured provider key expires in X days', type: 'days', threshold: 14, inApp: true, email: true, sms: false },
  ], []);
}
