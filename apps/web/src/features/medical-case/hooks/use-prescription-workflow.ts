import { useState, useMemo, useEffect, useRef } from 'react';
import {
  usePatientPrescriptions,
  useSavePrescription,
  useDeletePrescription,
} from './use-remedy-chart';

export interface RxForm {
  remedyName: string;
  potencyName: string;
  frequencyName: string;
  days: number;
  instructions: string;
  notes: string;
}

/**
 * Safely extract delivery mode from a prescription row.
 * DB drivers may return the column as deliveryMode, deliverymode, or delivery_mode.
 */
function getRowDeliveryMode(rx: any): string {
  const mode = rx?.deliveryMode || rx?.deliverymode || rx?.delivery_mode;
  if (mode && ['clinic', 'courier', 'pickup'].includes(mode)) return mode;
  return 'clinic';
}

export function usePrescriptionWorkflow(
  regid: number,
  visitId?: number,
  selectedDate?: string | null,
  onSelectDate?: (date: string | null) => void,
) {
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
    notes: '',
  });

  // Keep a ref of delivery so the auto-save can read the latest value
  // without having `delivery` in its dependency array (prevents race condition).
  const deliveryRef = useRef(delivery);
  deliveryRef.current = delivery;

  const isRxToday = useMemo(() => {
    return (history || []).some((rx) => {
      const dateVal = rx.created_at || rx.dateval;
      if (!dateVal) return false;
      return new Date(dateVal).toDateString() === new Date().toDateString();
    });
  }, [history]);

  const firstRxOfToday = useMemo(() => {
    const todayRxs = (history || []).filter((rx) => {
      const dateVal = rx.created_at || rx.dateval;
      if (!dateVal) return false;
      return new Date(dateVal).toDateString() === new Date().toDateString();
    });
    if (todayRxs.length === 0) return undefined;
    // Return the one with the smallest ID (oldest)
    return todayRxs.reduce((prev, curr) => (prev.id < curr.id ? prev : curr));
  }, [history]);

  // Auto-open rx tab for the current date if we revisit the page
  const hasAutoOpenedRef = useRef(false);
  const selectedDateStr = selectedDate
    ? new Date(selectedDate).toDateString()
    : new Date().toDateString();

  useEffect(() => {
    hasAutoOpenedRef.current = false;
  }, [selectedDateStr]);

  // We need to keep a stable reference to startNewRx for the useEffect below
  const startNewRx = async () => {
    if (!regid) return;
    setEditingId(null); // Clear editing ID first to prevent auto-saving form changes to the previous Rx!
    const initialDays = firstRxOfToday ? Number(firstRxOfToday.days) || 0 : 0;
    const initialForm = {
      remedyName: '',
      potencyName: '',
      frequencyName: '',
      days: initialDays,
      instructions: '',
      notes: '',
    };
    setForm(initialForm);
    setActiveTab('rx');

    // Auto-select today's date immediately to update other tabs without delay
    const todayIso = new Date().toISOString();
    onSelectDate?.(todayIso);

    try {
      const res = await saveMutation.mutateAsync({
        regid,
        visitId,
        deliveryMode: deliveryRef.current,
        ...initialForm,
      });
      if (res && typeof res === 'object' && 'id' in res) {
        setEditingId(Number(res.id));

        // Auto-select with exact timestamp from server response if available
        const rxDate = res.created_at || res.dateval || res.createdAt || todayIso;
        onSelectDate?.(rxDate);
      }
    } catch (err) {
      console.error('Failed to start new Rx:', err);
    }
  };

  useEffect(() => {
    if (!isLoading && history && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;

      const isToday = selectedDateStr === new Date().toDateString();
      if (!isToday) return;

      const dateRxs = history.filter((rx) => {
        const dateVal = rx.created_at || rx.dateval;
        return dateVal && new Date(dateVal).toDateString() === selectedDateStr;
      });

      if (dateRxs.length > 0) {
        // Auto-edit the latest rx for this date
        const latestRx = dateRxs.reduce((prev, curr) => (prev.id > curr.id ? prev : curr));
        setEditingId(latestRx.id);
        setManualInstruction(true);
        setForm({
          remedyName: latestRx.remedy_name || '',
          potencyName: latestRx.potency_name || '',
          frequencyName: latestRx.frequency_name || '',
          days: Number(latestRx.days) || 0,
          instructions: latestRx.prescription || latestRx.notes || '',
          notes: latestRx.notes || '',
        });
        setActiveTab('rx');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, isLoading, selectedDateStr]);

  // Sync delivery mode from history when selectedDate or history changes.
  // Uses getRowDeliveryMode helper to handle all possible property name variants.
  useEffect(() => {
    if (!history?.length) return;

    // If we have a selected date, find the delivery mode for that date
    if (selectedDate) {
      const selectedRxs = history.filter((rx) => {
        const dateVal = rx.created_at || rx.dateval;
        return (
          dateVal && new Date(dateVal).toDateString() === new Date(selectedDate).toDateString()
        );
      });
      if (selectedRxs.length > 0) {
        const mode = getRowDeliveryMode(selectedRxs[0]);
        setDelivery(mode);
        return;
      }
    }

    // Fallback to latest entry if no date selected or no matches
    const mode = getRowDeliveryMode(history[0]);
    setDelivery(mode);
  }, [history, selectedDate]);

  // startNewRx moved above for dependency use

  // Debounced auto-save
  useEffect(() => {
    if (!editingId || !regid) return;

    const timer = setTimeout(() => {
      saveMutation.mutate({
        regid,
        visitId,
        id: editingId,
        deliveryMode: deliveryRef.current,
        ...form,
      });
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editingId, regid, visitId]);

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
    saveMutation,
    deleteMutation,
    activeTab,
    setActiveTab,
  };
}
