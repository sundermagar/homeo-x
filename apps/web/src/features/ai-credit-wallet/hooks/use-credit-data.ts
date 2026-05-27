import { useMemo } from 'react';

export function useCreditSummary() {
  return useMemo(() => ({
    totalAllocated: 50000,
    consumed: 35920,
    remaining: 14080,
    percentageUsed: 71.8,
    dailyBurnRate: 1997,
    burnRateTrend: 12, // 12% increase
    resetDate: '2026-06-01',
  }), []);
}

export function useCreditTimeline(days: 7 | 14 | 30 = 7) {
  return useMemo(() => {
    // Generate data that matches the curve in the screenshot roughly
    const data = [
      { date: 'May 21', Consultation: 1800, STT: 900, Summarisation: 700, Prescription: 400, WhatsApp: 350, EmailSMS: 200 },
      { date: 'May 22', Consultation: 1950, STT: 1100, Summarisation: 750, Prescription: 420, WhatsApp: 380, EmailSMS: 180 },
      { date: 'May 23', Consultation: 2100, STT: 980, Summarisation: 900, Prescription: 350, WhatsApp: 410, EmailSMS: 220 },
      { date: 'May 24', Consultation: 1750, STT: 1050, Summarisation: 650, Prescription: 320, WhatsApp: 290, EmailSMS: 170 },
      { date: 'May 25', Consultation: 2200, STT: 1200, Summarisation: 800, Prescription: 500, WhatsApp: 450, EmailSMS: 210 },
      { date: 'May 26', Consultation: 2050, STT: 1000, Summarisation: 820, Prescription: 400, WhatsApp: 500, EmailSMS: 240 },
      { date: 'May 27', Consultation: 1800, STT: 850, Summarisation: 700, Prescription: 350, WhatsApp: 520, EmailSMS: 200 },
    ];
    return data;
  }, [days]);
}

export function useModuleBreakdown() {
  return useMemo(() => {
    return [
      { name: 'Consultation AI', value: 13650, percent: 38, color: '#10b981', trend: 8 },
      { name: 'STT (Voice)', value: 7540, percent: 21, color: '#2563eb', trend: 23 },
      { name: 'Summarisation', value: 6106, percent: 17, color: '#ea580c', trend: -4 },
      { name: 'Prescription AI', value: 3951, percent: 11, color: '#b45309', trend: 2 },
      { name: 'WhatsApp msgs', value: 2874, percent: 8, color: '#8b5cf6', trend: 41 },
      { name: 'Email', value: 1120, percent: 3, color: '#9ca3af', trend: -1 },
      { name: 'SMS', value: 679, percent: 2, color: '#d1d5db', trend: 0 },
    ];
  }, []);
}

export function useRecentTransactions() {
  return useMemo(() => {
    return [
      { id: '1', type: 'add', title: 'Credits added — Starter Pack', time: 'Today, 10:42 AM', amount: 10000 },
      { id: '2', type: 'stt', title: 'STT — Dr. Mehta session', time: 'Today, 09:17 AM', amount: -340 },
      { id: '3', type: 'whatsapp', title: 'WhatsApp — 23 appt reminders', time: 'Today, 08:00 AM', amount: -115 },
      { id: '4', type: 'summary', title: 'Summarisation — 8 records', time: 'Yesterday, 06:50 PM', amount: -480 },
      { id: '5', type: 'prescription', title: 'Prescription — 12 generated', time: 'Yesterday, 05:30 PM', amount: -204 },
    ];
  }, []);
}

export function useBurnForecast() {
  const summary = useCreditSummary();
  return useMemo(() => {
    const daysRemainingCredits = Math.floor(summary.remaining / summary.dailyBurnRate);
    
    // Hardcoding to match screenshot exact text and data
    return {
      daysRemainingCredits: 7,
      daysUntilReset: 5,
      projectedShortfall: 6000,
      exhaustionDate: 'Jun 1, 2026',
    };
  }, [summary]);
}
