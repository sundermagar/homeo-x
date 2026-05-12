import { useState, useMemo, useEffect } from 'react';
import { usePatientPrescriptions, useSavePrescription, useDeletePrescription } from './use-remedy-chart';

export interface RxForm {
  remedyName: string;
  potencyName: string;
  frequencyName: string;
  days: number;
  instructions: string;
  notes: string;
}

export function usePrescriptionWorkflow(regid: number, visitId?: number) {
  const { data: history, isLoading } = usePatientPrescriptions(regid);
  const saveMutation = useSavePrescription();
  const deleteMutation = useDeletePrescription(regid);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [delivery, setDelivery] = useState('clinic');
  const [manualInstruction, setManualInstruction] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RxForm>({
    remedyName: '',
    potencyName: '',
    frequencyName: '',
    days: 0,
    instructions: '',
    notes: ''
  });

  const isRxToday = useMemo(() => {
    return (history || []).some(rx => {
      const dateVal = rx.created_at || rx.dateval;
      if (!dateVal) return false;
      return new Date(dateVal).toDateString() === new Date().toDateString();
    });
  }, [history]);

  const firstRxOfToday = useMemo(() => {
    const todayRxs = (history || []).filter(rx => {
      const dateVal = rx.created_at || rx.dateval || rx.createdAt;
      if (!dateVal) return false;
      return new Date(dateVal).toDateString() === new Date().toDateString();
    });
    if (todayRxs.length === 0) return undefined;
    // Return the one with the smallest ID (oldest)
    return todayRxs.reduce((prev, curr) => (prev.id < curr.id ? prev : curr));
  }, [history]);

  // Sync delivery mode from history
  useEffect(() => {
    if (history?.length) {
      const mode = history[0]?.deliveryMode;
      if (mode && ['clinic', 'courier', 'pickup'].includes(mode)) {
        setDelivery(mode);
      }
    }
  }, [history]);

  const startNewRx = async () => {
    if (!regid) return;
    const initialDays = firstRxOfToday ? Number(firstRxOfToday.days) || 0 : 0;
    const initialForm = { remedyName: '', potencyName: '', frequencyName: '', days: initialDays, instructions: '', notes: '' };
    setForm(initialForm);
    setActiveTab('rx');
    
    try {
      const res = await saveMutation.mutateAsync({
        regid,
        visitId,
        deliveryMode: delivery,
        ...initialForm
      });
      if (res && typeof res === 'object' && 'id' in res) {
        setEditingId(Number(res.id));
      }
    } catch (err) {
      console.error('Failed to start new Rx:', err);
    }
  };

  const repeatRx = async (rx: any) => {
    if (!regid || !rx) return;
    const repeatData = {
      remedyName: rx.remedy_name || rx.remedyName || '',
      potencyName: rx.potency_name || rx.potencyName || '',
      frequencyName: rx.frequency_name || rx.frequencyName || '',
      days: Number(rx.days) || 0,
      instructions: rx.prescription || rx.notes || rx.instructions || '',
      notes: rx.notes || ''
    };

    setForm(repeatData);
    setActiveTab('rx');
    setManualInstruction(true);

    try {
      const res = await saveMutation.mutateAsync({
        regid,
        visitId,
        deliveryMode: delivery,
        ...repeatData
      });
      if (res && typeof res === 'object' && 'id' in res) {
        setEditingId(Number(res.id));
      }
    } catch (err) {
      console.error('Failed to repeat Rx:', err);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!editingId || !regid) return;

    const timer = setTimeout(() => {
      saveMutation.mutate({
        regid,
        visitId,
        id: editingId,
        deliveryMode: delivery,
        ...form
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [form, editingId, delivery, regid, visitId]);

  return {
    history,
    isLoading,
    isRxToday,
    firstRxOfToday,
    form,
    setForm,
    editingId,
    setEditingId,
    delivery,
    setDelivery,
    manualInstruction,
    setManualInstruction,
    startNewRx,
    repeatRx,
    saveMutation,
    deleteMutation,
    activeTab,
    setActiveTab
  };
}
