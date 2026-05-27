import { useMemo } from 'react';

export type LogStatus = 'SUCCESS' | 'FAILED' | 'FALLBACK_USED' | 'DEPOSIT_COMPLETED';
export type LogType = 'DEDUCTION' | 'DEPOSIT';

export interface RequestLog {
  id: string;
  type: LogType;
  createdAt: string;
  feature: string;
  modelId: string;
  isFallback: boolean;
  tenantId: string;
  userId: string;
  prompt: string;
  responseText: string;
  inputTokens?: number;
  outputTokens?: number;
  audioMinutes?: number;
  creditsDeducted: number; // can be negative for deposits to indicate adding to balance
  costInr: number;
  runningBalance?: number;
  latencyMs?: number;
  status: LogStatus;
  errorCode?: string;
  sessionId: string;
}

export function useRequestLogs(): RequestLog[] {
  return useMemo(() => {
    const logs: RequestLog[] = [
      {
        id: 'txn_dep_01',
        type: 'DEPOSIT',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        feature: 'Wallet Top-up',
        modelId: '-',
        isFallback: false,
        tenantId: 'SYSTEM',
        userId: 'admin.super',
        prompt: 'Payment Ref: INV-2026-05A\nAdded funds via NEFT transfer.',
        responseText: 'Deposit successful. Applied to global pool.',
        creditsDeducted: -50000, // Negative means addition to balance
        costInr: 5000,
        status: 'DEPOSIT_COMPLETED',
        sessionId: 'dep_99x',
        runningBalance: 88420, // Example running balance
      },
      {
        id: 'log_001',
        type: 'DEDUCTION',
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        feature: 'Consultation AI',
        modelId: 'GPT-4o',
        isFallback: false,
        tenantId: 'KH-0042',
        userId: 'dr.smith',
        prompt: 'Patient complains of severe headaches and nausea for the past 3 days. History of migraines. Suggest differential diagnosis and treatment plan.',
        responseText: 'Based on the provided symptoms (severe headaches, nausea, 3 days duration) and history of migraines, the differential diagnosis includes:\n1. Status Migrainosus\n2. Tension-type headache\n3. Secondary headache (requires ruling out red flags).\n\nSuggested Plan:\n- Prescribe antiemetic (e.g., Ondansetron)\n- Triptan therapy if not contraindicated\n- Advise rest in a dark, quiet room.',
        inputTokens: 125,
        outputTokens: 350,
        creditsDeducted: 475,
        costInr: 0.4500,
        latencyMs: 3200,
        status: 'SUCCESS',
        sessionId: 'sess_883a2',
        runningBalance: 38420,
      },
      {
        id: 'log_002',
        type: 'DEDUCTION',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        feature: 'Transcription',
        modelId: 'Whisper v3',
        isFallback: false,
        tenantId: 'KH-0042',
        userId: 'dr.smith',
        prompt: '[Audio file: consultation_recording.wav]',
        responseText: 'So how have you been feeling since the last visit? Well doctor, the pain in my lower back is mostly gone but now my knee is acting up...',
        inputTokens: 0,
        outputTokens: 0,
        audioMinutes: 12.5,
        creditsDeducted: 125,
        costInr: 1.2500,
        latencyMs: 8400,
        status: 'SUCCESS',
        sessionId: 'sess_883a2',
        runningBalance: 38895,
      },
      {
        id: 'log_003',
        type: 'DEDUCTION',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        feature: 'Summarization',
        modelId: 'GPT-4o Mini',
        isFallback: false,
        tenantId: 'KH-0089',
        userId: 'dr.jones',
        prompt: 'Summarize the following clinical notes: ...',
        responseText: '',
        inputTokens: 850,
        outputTokens: 0,
        creditsDeducted: 0,
        costInr: 0,
        latencyMs: 15000,
        status: 'FAILED',
        errorCode: 'rate_limit_exceeded',
        sessionId: 'sess_991b4',
        runningBalance: 39020,
      },
      {
        id: 'log_004',
        type: 'DEDUCTION',
        createdAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
        feature: 'Summarization',
        modelId: 'Gemini 1.5 Pro',
        isFallback: true,
        tenantId: 'KH-0089',
        userId: 'dr.jones',
        prompt: 'Summarize the following clinical notes: ...',
        responseText: 'Patient presented with acute bronchitis. Prescribed antibiotics and recommended 5 days rest.',
        inputTokens: 850,
        outputTokens: 120,
        creditsDeducted: 970,
        costInr: 0.1500,
        latencyMs: 2100,
        status: 'FALLBACK_USED',
        sessionId: 'sess_991b4',
        runningBalance: 39020,
      },
      {
        id: 'log_005',
        type: 'DEDUCTION',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        feature: 'Analysis',
        modelId: 'Claude Sonnet 3.5',
        isFallback: false,
        tenantId: 'KH-0102',
        userId: 'nurse.sarah',
        prompt: 'Analyze blood report values: HbA1c 7.2, Fasting Glucose 145...',
        responseText: 'The results indicate elevated blood glucose levels consistent with pre-diabetes or poorly controlled diabetes. Immediate dietary intervention and follow-up HbA1c in 3 months is recommended.',
        inputTokens: 420,
        outputTokens: 180,
        creditsDeducted: 600,
        costInr: 0.8500,
        latencyMs: 4100,
        status: 'SUCCESS',
        sessionId: 'sess_772c1',
        runningBalance: 39990,
      },
    ];
    return logs;
  }, []);
}

export function useFailedRequestsData() {
  return useMemo(() => {
    return [
      { errorType: 'Rate Limit', count: 145, color: '#F59E0B' },
      { errorType: 'Timeout', count: 82, color: '#EF4444' },
      { errorType: 'Auth Failure', count: 12, color: '#8B5CF6' },
      { errorType: 'Model Overloaded', count: 45, color: '#3B82F6' },
    ];
  }, []);
}
