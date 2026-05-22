import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit, Save,
  History, Camera, Zap, CreditCard, Clock, Share2,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical, Microscope,
  Printer, Paperclip, Upload, X, Eye, Loader2, Trash2, Thermometer,
  TrendingUp, Stethoscope, Scale, Syringe, BarChart3, Pill, Check, User,
  Video, FileAudio, ChevronLeft,
  MoveVertical,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  Copy,
  Mail,
  ShieldCheck,
  Award,
  Download,
  Unlink,
  Link2
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAutoSave } from '@/shared/hooks/use-auto-save';
import {
  useFullMedicalCase,
  useManageClinicalRecords,
  useMasterVaccines,
  useCommunicationLogs,
  useSendSms
} from '../hooks/use-medical-cases';
import { usePatientPrescriptions, useRemedyLookups } from '../hooks/use-remedy-chart';
import { usePrescriptionWorkflow } from '../hooks/use-prescription-workflow';
import { useParsePrescription } from '../../../hooks/use-ai-suggest';
// QuickRxForm removed — not used in current render
import { useDayCharges } from '../../billing/hooks/use-accounts';
import { AssignPackageModal } from '../../packages/components/assign-package-modal';
import { VitalsFormModal } from '../components/vitals-form-modal';
import { FinalizeConsultationModal } from '../components/finalize-consultation-modal';
import { FollowupScheduler } from '../components/followup-scheduler';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { RemedyChartSession } from '../components/remedy-chart-session';
import { AiRemedyView } from '../components/ai-remedy-view';
import { AiConsultantView } from '../components/ai-consultant-view';
import { usePatientBills } from '../../billing/hooks/use-billing';
import { useActivePackage } from '../../packages/hooks/use-packages';
import { BillingUpdateModal } from '../components/billing-update-modal';
import { PaymentReceiptModal } from '../../billing/components/payment-receipt-modal';
import { useAbhaStatus, useAbhaUnlink } from '../../patients/hooks/use-abha';
import { AbhaLinkingModal } from '../../patients/components/abha-linking-modal';
import { toast } from '@/hooks/use-toast';

import { useAppointments } from '../../appointments/hooks/use-appointments';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { ClinicBrandingHeader } from '../components/clinic-branding-header';
import { printHtml } from '@/lib/print';
import { generatePrescriptionHtml } from '@/lib/print-templates';
import type { PrescriptionPrintData } from '@/lib/print-templates';
import { getClinicLetterhead, getDoctorLetterhead } from '@/lib/clinic-letterhead';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { usePdfSettings, useMedicines } from '../../settings/hooks/use-settings';
import '../styles/medical-case.css';
import { useTableGrouping } from '../hooks/use-table-grouping';
import { DateGroupCell } from '../components/date-group-cell';
import { InvestigationPreviewModal } from '../components/investigation-preview-modal';
import { InvestigationComparisonView } from '../components/investigation-comparison-view';

// ─── Static tab config ─ defined outside component to avoid recreation on every render ───
const TABS = [
  { id: 'summary', label: 'Followup History', icon: History },
  { id: 'diagnosis', label: 'AI Follow up', icon: Sparkles },
  { id: 'media', label: 'Media', icon: Camera },
  { id: 'labs', label: 'Investigation Report', icon: FlaskConical },
  { id: 'vitals', label: 'Vitals', icon: Stethoscope },
  { id: 'vaccine', label: 'Vaccines', icon: Syringe },
  { id: 'analytics', label: 'Graph (H/W)', icon: BarChart3 },
];

export function AutoSaveNoteArea({ value, onChange, onSave, placeholder = '', minHeight = '120px' }: { value: string, onChange: (v: string) => void, onSave: (val: string) => Promise<void>, placeholder?: string, minHeight?: string }) {
  const { status, forceSave } = useAutoSave({
    value: value,
    onSave: onSave,
    delay: 1500
  });

  return (
    <div className="mc-followup-editor">
      <textarea
        placeholder={placeholder || "Record patient follow-up or status..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={forceSave}
        style={{ minHeight }}
        className="mc-fu-textarea custom-scrollbar"
      />
      <div className="mc-save-status">
        {status === 'saving' && <span className="status-saving"><RefreshCw size={12} className="animate-spin" /> Saving...</span>}
        {status === 'saved' && <span className="status-saved"><Check size={12} /> Saved</span>}
        {status === 'error' && <span className="status-error">Failed to save</span>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: any) {
  return (
    <div className="pp-card" style={{ padding: '80px 48px', textAlign: 'center', background: 'white', border: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: '20px', background: 'var(--bg-surface-2)', borderRadius: '50%', marginBottom: '20px' }}>
        <Icon size={48} style={{ color: 'var(--pp-text-3)' }} />
      </div>
      <h3 style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: 'var(--pp-text-3)', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button className="pp-link" style={{ marginTop: '16px', fontWeight: 700 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}



export default function MedicalCaseDetailPage() {
  const { regid } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [activeBillingTab, setActiveBillingTab] = useState<'regular' | 'custom' | 'payment'>('regular');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data: fullData, isLoading, error, refetch: refetchFull } = useFullMedicalCase(Number(regid));
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const { data: abhaStatus } = useAbhaStatus(Number(regid));
  const abhaUnlinkMutation = useAbhaUnlink(Number(regid));
  const medicalCase = fullData?.medicalCase;
  const visitId = medicalCase?.id;
  const { data: dayCharges = [] } = useDayCharges();
  const { data: medicines = [] } = useMedicines();

  const formatName = useCallback((name?: string | null) => {
    if (!name) return '';
    return name.replace(/\b\w/g, c => c.toUpperCase());
  }, []);

  const { data: lookups } = useRemedyLookups();
  const rxWorkflow = usePrescriptionWorkflow(Number(regid), visitId, selectedDate, setSelectedDate);

  // Building day options from day-charges module
  const dayOptions = useMemo(() => {
    return dayCharges.map((dc: any) => String(dc.days)).filter(Boolean);
  }, [dayCharges]);

  // Get the amount for the selected days
  const selectedDayCharge = useMemo(() => {
    if (!rxWorkflow.form.days) return null;
    return dayCharges.find((dc: any) => String(dc.days) === String(rxWorkflow.form.days));
  }, [rxWorkflow.form.days, dayCharges]);

  const [followUpNote, setFollowUpNote] = useState('');
  const [pendingCharge, setPendingCharge] = useState(0);
  const [mobileDrawer, setMobileDrawer] = useState<'followup' | 'billing' | 'contact' | 'package' | null>(null);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [fabY, setFabY] = useState(180);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const hasMoved = useRef(false);
  const [editingVitals, setEditingVitals] = useState<any>(null);

  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  // Refs for drag state — avoids stale closures in event listeners
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const fabYRef = useRef(fabY);
  fabYRef.current = fabY;

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    hasMoved.current = false;
    setIsDragging(true);
    const clientY = 'touches' in e
      ? (e.touches[0]?.clientY ?? 0)
      : (e as React.MouseEvent).clientY;
    dragStartYRef.current = clientY - fabYRef.current;
    setDragStartY(dragStartYRef.current);
  }, []);

  const onDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current) return;
    hasMoved.current = true;
    const clientY = 'touches' in e
      ? ((e as TouchEvent).touches[0]?.clientY ?? 0)
      : (e as MouseEvent).clientY;
    setFabY(clientY - dragStartYRef.current);
  }, []);

  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  // Register drag listeners once on mount — stable refs prevent stale captures
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => onDrag(e);
    const handleEnd = () => onDragEnd();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed duplicate fullData declaration
  const { data: prescriptionsHistory } = usePatientPrescriptions(Number(regid));
  const { finalizeConsultation, saveNote, updateDiagnosis, saveSoap, deleteRecord } = useManageClinicalRecords();
  const { data: summary } = usePatientBills(Number(regid));
  const { data: activePackage } = useActivePackage(Number(regid));
  // Moved useDayCharges to top of component
  const { data: orgs = [] } = useOrganizations();
  const { data: pdfSettings = [] } = usePdfSettings();
  const user = useAuthStore(s => s.user);

  // Initialize selectedDate to latest prescription date on load
  useEffect(() => {
    if (prescriptionsHistory?.length && !selectedDate) {
      const sorted = [...prescriptionsHistory].sort((a, b) =>
        new Date(b.created_at || b.dateval).getTime() - new Date(a.created_at || a.dateval).getTime()
      );
      if (sorted[0]) {
        setSelectedDate(sorted[0].created_at || sorted[0].dateval);
      }
    }
  }, [prescriptionsHistory]);

  // Diagnosis State
  const [showDiagnosisDrawer, setShowDiagnosisDrawer] = useState(false);
  const [editingDiagnosisRecord, setEditingDiagnosisRecord] = useState<any>(null);
  const [diagForm, setDiagForm] = useState({
    diagnosis: '',
    complaint: '',
    medication: '',
    medicationTaking: ''
  });

  const [medicationRows, setMedicationRows] = useState<MedicationRow[]>([
    { medicine: '', frequency: 'Once', days: '', issue: '' }
  ]);
  const [activeMedicineFocusIdx, setActiveMedicineFocusIdx] = useState<number | null>(null);
  const [aiDetectingIdx, setAiDetectingIdx] = useState<number | null>(null);

  // AI Prescription Scanner State
  const parsePrescriptionMutation = useParsePrescription();
  const prescriptionFileInputRef = useRef<HTMLInputElement>(null);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [scannedPrescription, setScannedPrescription] = useState<{
    diagnosis: string;
    complaint: string;
    investigation: string;
  } | null>(null);
  const [scannedMedicationRows, setScannedMedicationRows] = useState<MedicationRow[]>([
    { medicine: '', frequency: 'Once', days: '', issue: '' }
  ]);

  const handlePrescriptionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parsePrescriptionMutation.mutateAsync(file);
      if (result) {
        setScannedPrescription({
          diagnosis: result.diagnosis || '',
          complaint: result.complaint || '',
          investigation: result.investigation || '',
        });
        setScannedMedicationRows(
          result.medications && result.medications.length > 0
            ? result.medications.map((m: any) => ({
                medicine: m.medicine || '',
                frequency: m.frequency || 'Once',
                days: '',
                issue: m.issue || ''
              }))
            : [{ medicine: '', frequency: 'Once', days: '', issue: '' }]
        );
        setShowPrescriptionPreview(true);
      }
    } catch (err) {
      console.error('Prescription scanning failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to scan the prescription image. Please try again.');
    } finally {
      if (prescriptionFileInputRef.current) {
        prescriptionFileInputRef.current.value = '';
      }
    }
  };

  const triggerPrescriptionScan = () => {
    prescriptionFileInputRef.current?.click();
  };

  const handleSaveScannedPrescription = async () => {
    if (!scannedPrescription) return;
    try {
      if (scannedPrescription.diagnosis.trim()) {
        await updateDiagnosis.mutateAsync({ regid: Number(regid), condition: scannedPrescription.diagnosis.trim() });
      }
      const serializedMeds = JSON.stringify(scannedMedicationRows.filter(r => r.medicine.trim() !== ''));
      const soapDate = displayDate ? displayDate.toISOString() : new Date().toISOString();

      await saveSoap.mutateAsync({
        id: currentVisitSoap?.id,
        regid: Number(regid),
        visitId: currentVisitId || visitId,
        subjective: scannedPrescription.complaint,
        objective: serializedMeds,
        assessment: scannedPrescription.diagnosis,
        plan: scannedPrescription.investigation,
        dateval: soapDate,
        createdAt: soapDate
      });

      if (!currentVisitSoap) {
        setSelectedDate(soapDate);
      }

      setShowPrescriptionPreview(false);
      setScannedPrescription(null);
    } catch (err) {
      console.error(err);
    }
  };

  const updateScannedMedicationRow = (index: number, field: keyof MedicationRow, value: string) => {
    setScannedMedicationRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const addScannedMedicationRow = () => {
    setScannedMedicationRows(prev => [...prev, { medicine: '', frequency: 'Once', days: '', issue: '' }]);
  };

  const removeScannedMedicationRow = (index: number) => {
    setScannedMedicationRows(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : [{ medicine: '', frequency: 'Once', days: '', issue: '' }];
    });
  };

  const handleOpenDiagnosis = (record?: any) => {
    // Priority: 1. Passed record (from table), 2. Current visit record (from sidebar context)
    const activeRecord = record || currentVisitSoap;

    let initialMeds: MedicationRow[] = [{ medicine: '', frequency: 'Once', days: '', issue: '' }];
    const objectiveStr = activeRecord?.objective;
    if (objectiveStr) {
      try {
        if (objectiveStr.trim().startsWith('[') || objectiveStr.trim().startsWith('{')) {
          const parsed = JSON.parse(objectiveStr);
          initialMeds = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          initialMeds = [{ medicine: objectiveStr, frequency: 'Once', days: '', issue: '' }];
        }
      } catch (e) {
        initialMeds = [{ medicine: objectiveStr, frequency: 'Once', days: '', issue: '' }];
      }
    }
    setMedicationRows(initialMeds);

    if (activeRecord) {
      setDiagForm({
        diagnosis: activeRecord.assessment || '',
        complaint: activeRecord.subjective || '',
        medication: activeRecord.plan || '',
        medicationTaking: activeRecord.objective || ''
      });
      setEditingDiagnosisRecord(activeRecord);
    } else {
      // New record for today
      setDiagForm({
        diagnosis: '',
        complaint: '',
        medication: '',
        medicationTaking: ''
      });
      setEditingDiagnosisRecord(null);
    }
    setShowDiagnosisDrawer(true);
  };

  const updateMedicationRow = (index: number, field: keyof MedicationRow, value: string) => {
    setMedicationRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const addMedicationRow = () => {
    setMedicationRows(prev => [...prev, { medicine: '', frequency: 'Once', days: '', issue: '' }]);
  };

  const removeMedicationRow = (index: number) => {
    setMedicationRows(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : [{ medicine: '', frequency: 'Once', days: '', issue: '' }];
    });
  };

  const detectMedicineIssue = async (index: number, medicineName: string) => {
    if (!medicineName.trim()) return;
    setAiDetectingIdx(index);
    try {
      const res = await apiClient.post<{ success: boolean; data: { issue: string; provider?: string } }>(
        '/medical-cases/ai-detect-medicine-issue',
        { medicine: medicineName.trim() }
      );
      const detected = res.data?.data?.issue;
      if (detected) {
        updateMedicationRow(index, 'issue', detected);
      }
    } catch (err) {
      console.warn('AI medicine detection failed:', err);
    } finally {
      setAiDetectingIdx(null);
    }
  };

  const handleSaveDiagnosis = async () => {
    try {
      const finalRecordId = editingDiagnosisRecord?.id;

      if (diagForm.diagnosis.trim()) {
        await updateDiagnosis.mutateAsync({ regid: Number(regid), condition: diagForm.diagnosis.trim() });
      }
      const serializedMeds = JSON.stringify(medicationRows.filter(r => r.medicine.trim() !== ''));

      const soapDate = displayDate ? displayDate.toISOString() : new Date().toISOString();

      await saveSoap.mutateAsync({
        id: finalRecordId,
        regid: Number(regid),
        visitId: currentVisitId || visitId,
        subjective: diagForm.complaint,
        objective: serializedMeds,
        assessment: diagForm.diagnosis,
        plan: diagForm.medication,
        dateval: soapDate,
        createdAt: soapDate
      });

      // If it's a new diagnosis, switch view to exactly the saved date so it shows up immediately
      if (!editingDiagnosisRecord) {
        setSelectedDate(soapDate);
      }

      setShowDiagnosisDrawer(false);
      setEditingDiagnosisRecord(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to safely parse dates — stable reference via useCallback
  const parseSafeDate = useCallback((d: any): Date | null => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  }, []);

  const toClinicDateString = useCallback((d: Date | string | null | undefined): string | null => {
    if (!d) return null;
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return null;
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (e) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }, []);

  const filterByDate = useCallback((items: any[], date: Date | null) => {
    if (!date || !items) return [];
    const targetStr = toClinicDateString(date);
    if (!targetStr) return [];
    return items.filter(item => {
      const itemDate = item.createdAt || item.created_at || item.dateval || item.recordedAt || item.recorded_at || item.visitDate || item.visit_date || item.date_val;
      return toClinicDateString(itemDate) === targetStr;
    });
  }, [toClinicDateString]);

  // Derived data with safety checks for loading states
  const notes = fullData?.notes || [];
  // Removed redundant medicalCase declaration as it is already declared at the top level
  const prescriptionsFromFull = fullData?.prescriptions || [];

  const followupNotes = React.useMemo(() => {
    return (notes || []).filter((n: any) =>
      n.notesType === 'Followup' || n.noteType === 'Followup' || n.notes_type === 'Followup'
    ).sort((a: any, b: any) => new Date(b.createdAt || b.created_at || b.dateval || 0).getTime() - new Date(a.createdAt || a.created_at || a.dateval || 0).getTime());
  }, [notes]);

  const latestPrescriptionObj = React.useMemo(() => {
    return (prescriptionsHistory || []).sort((a: any, b: any) => {
      const d1 = parseSafeDate(b.created_at || b.createdAt || b.dateval)?.getTime() || 0;
      const d2 = parseSafeDate(a.created_at || a.createdAt || a.dateval)?.getTime() || 0;
      return d1 - d2;
    })[0];
  }, [prescriptionsHistory]);

  const latestPrescriptionDateStr = latestPrescriptionObj?.created_at || latestPrescriptionObj?.dateval;
  const latestNoteDate = followupNotes[0] ? parseSafeDate(followupNotes[0].createdAt || followupNotes[0].created_at || followupNotes[0].dateval) : null;
  const latestRxDate = parseSafeDate(latestPrescriptionDateStr);

  const defaultEncounterDate = (latestNoteDate && latestRxDate)
    ? (latestNoteDate > latestRxDate ? latestNoteDate : latestRxDate)
    : (latestNoteDate || latestRxDate);

  const displayDate = selectedDate ? new Date(selectedDate) : defaultEncounterDate;

  const activeNote = React.useMemo(() => {
    if (!displayDate) return null;
    const displayStr = toClinicDateString(displayDate);
    return followupNotes.find((n: any) => {
      const d1 = n.createdAt || n.created_at || n.dateval;
      return toClinicDateString(d1) === displayStr;
    }) || null;
  }, [followupNotes, displayDate, toClinicDateString]);

  // Sync followUpNote with activeNote when activeNote changes
  React.useEffect(() => {
    setFollowUpNote(activeNote?.notes || '');
  }, [activeNote]);


  const appendNote = (text: string) => {
    setFollowUpNote(prev => {
      const separator = prev.trim() ? '\n\n' : '';
      return prev + separator + text;
    });
  };

  const handleSaveNote = React.useCallback(async (content: string) => {
    if (!content.trim() || !currentVisitId) return;
    try {
      // Use displayDate for dateval so notes are linked to the viewed encounter
      const noteDate = displayDate ? displayDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      await saveNote.mutateAsync({
        regid: Number(regid),
        visitId: currentVisitId,
        id: activeNote?.id,
        notesType: 'Followup',
        notes: content.trim(),
        dateval: noteDate
      });
    } catch (err) {
      console.error('Failed to save follow-up note', err);
      throw err;
    }
  }, [regid, medicalCase?.id, activeNote?.id, saveNote, displayDate]);

  const latestRx = useMemo(() => {
    const all = [...(prescriptionsHistory || []), ...(prescriptionsFromFull || [])];
    if (all.length === 0) return null;
    return all.sort((a, b) => new Date(b.created_at || b.dateval).getTime() - new Date(a.created_at || a.dateval).getTime())[0];
  }, [prescriptionsHistory, prescriptionsFromFull]);

  const selectedBill = useMemo(() => {
    if (!displayDate || !summary?.bills) return null;
    const displayStr = toClinicDateString(displayDate);
    return summary.bills.find(b => {
      const d = b.billDate || b.createdAt;
      return toClinicDateString(d) === displayStr;
    });
  }, [displayDate, summary?.bills, toClinicDateString]);

  const billingValues = useMemo(() => {
    // 1. Calculate additional charges for the selected displayDate
    const additional = (() => {
      if (!displayDate || !fullData?.additionalCharges) return 0;
      const displayStr = toClinicDateString(displayDate);
      return fullData.additionalCharges
        .filter((ac: any) => {
          return toClinicDateString(ac.createdAt) === displayStr;
        })
        .reduce((sum: number, ac: any) => sum + (Number(ac.amount) || 0), 0);
    })();

    // 2. Fetch all bills for the selected displayDate to sum received amount
    const dayBills = (() => {
      if (!displayDate || !summary?.bills) return [];
      const displayStr = toClinicDateString(displayDate);
      return summary.bills.filter(b => {
        const d = b.billDate || b.createdAt;
        return toClinicDateString(d) === displayStr;
      });
    })();

    // Sum of received amount for all bills on this date
    const currentPaid = dayBills.reduce((sum: number, b: any) => sum + (Number(b.received) || 0), 0);

    // Sum of all regular bills currently saved in the database for today (excluding custom, additional, and package bills)
    const savedRegularBillsSum = dayBills
      .filter(b => 
        b.billType !== 'Custom' && 
        (b.billType as string) !== 'Additional' && 
        !b.treatment?.startsWith('Package:')
      )
      .reduce((sum, b) => sum + (Number(b.charges) || 0), 0);

    const isCompleted = medicalCase?.status === 'Completed';

    // 3. Dynamic Medicine Days Charge (e.g. 600 for 3 days of medicine)
    const rawEffectiveDaysCharge = (() => {
      if (pendingCharge > 0) return pendingCharge;
      if (!displayDate) return 0;
      
      const displayStr = toClinicDateString(displayDate);
      const allRx = [...(prescriptionsHistory || []), ...(prescriptionsFromFull || [])];
      const todayRx = allRx.filter((rx: any) => {
        const d = rx.created_at || rx.dateval;
        return toClinicDateString(d) === displayStr;
      });

      if (todayRx.length === 0) return 0;
      
      const savedDays = Number(todayRx[0].days) || 0;
      if (savedDays <= 0) return 0;

      const match = dayCharges.find((dc: any) => Number(dc.days) === savedDays);
      return match ? Number(match.regularCharges) || 0 : 0;
    })();
    
    const hasActivePackage = !!fullData?.activePackage;
    
    // Waive medicine charges if covered by package and session isn't completed yet
    const effectiveDaysCharge = (hasActivePackage && fullData?.activePackage?.coversMedicine && !isCompleted)
      ? 0
      : rawEffectiveDaysCharge;

    // 4. Registration Charge (shown as "Registration Charge" row in UI)
    // It must strictly be the base consultation/registration fee without dynamic medicine day charges.
    const originalRegular = medicalCase?.consultationFee || 0;
    const regular = (() => {
      if (isCompleted) {
        // If completed, the savedRegularBillsSum already includes the finalized day charge.
        // We subtract it to show only the base consultation/registration fee in this row.
        return Math.max(0, savedRegularBillsSum - effectiveDaysCharge);
      }
      // Otherwise (active session), it is the saved bills sum (like registration fee) + doctor fee.
      const baseFee = originalRegular;
      return savedRegularBillsSum + baseFee;
    })();

    // 5. Total Bill Amount = Registration Charge (regular) + Medicine Days Charge + Additional Charges
    const currentTotal = regular + effectiveDaysCharge + additional;
    const currentBalance = currentTotal - currentPaid;

    return {
      regular,
      originalRegular,
      additional,
      total: currentTotal,
      received: currentPaid,
      balance: currentBalance,
      daysCharge: effectiveDaysCharge,
      originalDaysCharge: rawEffectiveDaysCharge,
      hasActivePackage,
      activePackageName: fullData?.activePackage?.packageName,
      activePackageColor: fullData?.activePackage?.colorCode
    };
  }, [
    summary?.bills,
    medicalCase,
    pendingCharge,
    displayDate,
    fullData?.additionalCharges,
    prescriptionsHistory,
    prescriptionsFromFull,
    dayCharges,
    toClinicDateString
  ]);

  // ─── Derived from fullData (safe after query completes) ───
  const fullVitals = fullData?.vitals;
  const fullSoap = fullData?.soap;
  const fullImages = fullData?.images;
  const fullInvestigations = fullData?.investigations;
  const fullVaccines = fullData?.vaccines;

  const ageString = useMemo(() => {
    const dob = medicalCase?.dateOfBirth || medicalCase?.dob;
    if (!dob) return 'Unknown Age';
    const birthDate = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} Year${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} Month${months > 1 ? 's' : ''}`;
    return `${Math.max(days, 1)} Day${days > 1 ? 's' : ''}`;
  }, [medicalCase?.dateOfBirth, medicalCase?.dob]);
  const isToday = displayDate && displayDate.toDateString() === new Date().toDateString();

  const currentVisitSoaps = useMemo(() => {
    const soap = fullData?.soap || [];
    if (!displayDate || !soap.length) return [];
    return filterByDate(soap, displayDate);
  }, [displayDate, fullData?.soap, filterByDate]);

  const currentVisitSoap = currentVisitSoaps[0] || null;

  const currentVisitPrescriptions = useMemo(() => {
    if (!displayDate) return [];
    const fromHistory = prescriptionsHistory || [];
    const fromFull = fullData?.prescriptions || [];
    const all = [...fromHistory, ...fromFull];
    return filterByDate(all, displayDate);
  }, [displayDate, prescriptionsHistory, fullData?.prescriptions, filterByDate]);

  const currentVisitId = useMemo(() => {
    // Attempt to extract visit ID from any clinical record on the currently viewed date
    const rx = currentVisitPrescriptions?.[0];
    const soap = currentVisitSoaps?.[0];
    
    // Check various common field names for visit IDs
    const idFromRx = rx ? (rx.visitId ?? rx.visit_id ?? rx.consultationId ?? rx.consultation_id) : null;
    const idFromSoap = soap ? (soap.visitId ?? soap.visit_id) : null;
    
    // Priority: 1. ID from today's prescriptions, 2. ID from today's SOAP notes, 3. The global active case ID
    return idFromRx ?? idFromSoap ?? medicalCase?.id;
  }, [currentVisitPrescriptions, currentVisitSoaps, medicalCase?.id]);

  // tabContent MUST be declared before any early returns (Rules of Hooks)
  const tabContent = useMemo(() => {
    if (!fullData || !medicalCase) return null;
    const vitals = fullVitals || [];
    const soap = fullSoap || [];
    const images = fullImages || [];
    const investigations = fullInvestigations || [];
    const vaccines = fullVaccines || [];

    const filteredSoap = displayDate ? filterByDate(soap, displayDate) : soap;
    const filteredImages = displayDate ? filterByDate(images, displayDate) : images;
    const filteredInvestigations = displayDate ? filterByDate(investigations, displayDate) : investigations;
    const filteredVitals = displayDate ? filterByDate(vitals, displayDate) : vitals;
    const filteredVaccines = displayDate ? filterByDate(vaccines, displayDate) : vaccines;
    switch (activeTab) {
      case 'summary': return <RemedyChartSession
        regid={Number(regid)}
        visitId={medicalCase.id}
        onDayChargeChange={setPendingCharge}
        onSelectDate={setSelectedDate}
        onStartRx={() => setSelectedDate(new Date().toISOString())}
        workflow={rxWorkflow}
        lookups={lookups}
        dayCharges={dayCharges}
        selectedDate={selectedDate}
        onAddAdditionalCharge={() => {
          setActiveBillingTab('custom');
          setShowBillingModal(true);
        }}
      />;
      case 'diagnosis': return <div className="mc-tab-content-wrapper"><DiagnosisView
        regid={Number(regid)}
        visitId={medicalCase.id}
        medicalCase={medicalCase}
        soapRecords={filteredSoap}
        onAppendNote={appendNote}
        onEditRecord={handleOpenDiagnosis}
        onAddRecord={() => handleOpenDiagnosis()}
        isDateFiltered={!!displayDate}
      /></div>;
      case 'media': return <div className="mc-tab-content-wrapper"><MediaView regid={Number(regid)} visitId={medicalCase.id} images={filteredImages} isDateFiltered={!!displayDate} /></div>;
      case 'labs': return <div className="mc-tab-content-wrapper"><LabsView investigations={filteredInvestigations} regid={Number(regid)} visitId={medicalCase.id} onAppendNote={appendNote} isDateFiltered={!!displayDate} /></div>;
      case 'vitals': return <div className="mc-tab-content-wrapper"><VitalsView vitals={filteredVitals} onRecord={(data) => {
        setEditingVitals(data || null);
        setShowVitalsModal(true);
      }} phone={medicalCase.phone || medicalCase.mobile || ''} name={medicalCase.patientName || ''} regid={Number(regid)} clinicName={clinicName} onAppendNote={appendNote} /></div>;
      case 'communication': return <div className="mc-tab-content-wrapper"><CommunicationView regid={Number(regid)} phone={medicalCase.phone || ''} name={medicalCase.patientName || ''} onAppendNote={appendNote} /></div>;
      case 'vaccine': return <div className="mc-tab-content-wrapper"><VaccineView regid={Number(regid)} caseVaccines={vaccines} onAppendNote={appendNote} /></div>;
      case 'analytics': return <div className="mc-tab-content-wrapper"><AnalyticsView vitals={vitals} regid={Number(regid)} visitId={medicalCase.id} name={medicalCase.patientName || ''} phone={medicalCase.phone || medicalCase.mobile || ''} clinicName={clinicName} onAppendNote={appendNote} /></div>;
      case 'reports': return <div className="mc-tab-content-wrapper"><ReportsView regid={Number(regid)} investigations={filteredInvestigations} /></div>;
      case 'ai-assist': return <div className="mc-tab-content-wrapper"><AiConsultantView regid={Number(regid)} /></div>;
      default: return <RemedyChartSession
        regid={Number(regid)}
        visitId={medicalCase.id}
        onDayChargeChange={setPendingCharge}
        onSelectDate={setSelectedDate}
        onStartRx={() => setSelectedDate(new Date().toISOString())}
        workflow={rxWorkflow}
        lookups={lookups}
        dayCharges={dayCharges}
        onAddAdditionalCharge={() => {
          setActiveBillingTab('custom');
          setShowBillingModal(true);
        }}
      />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, displayDate, fullVitals, fullSoap, fullImages, fullInvestigations, fullVaccines,
    fullData, selectedDate, regid, medicalCase, rxWorkflow, lookups, dayCharges,
    appendNote, handleOpenDiagnosis, clinicName, filterByDate, setPendingCharge, setSelectedDate]);

  // ─── Loading / Error guards (AFTER all hooks) ───
  if (isLoading) return <MedicalCasePageSkeleton />;
  if (error || !fullData) return <div className="mc-error">Failed to load clinical records.</div>;

  const { vitals, soap, examination, images, investigations, vaccines } = fullData;

  return (
    <div className="mc-detail-container animate-fade-in">

      {/* ─── Redesigned Header Section ─── */}
      <div className="patient-profile-card">
        <div className="profile-top-row">
          <div className="profile-identity">
            <button 
              onClick={() => navigate('/patients')}
              style={{ 
                cursor: 'pointer', 
                background: 'transparent', 
                border: 'none', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px',
                borderRadius: '8px',
                transition: 'background 0.2s',
                marginRight: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Back to Patient List"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="profile-name-id">
              <h1 className="profile-name">{formatName(medicalCase.patientName)}</h1>
              <span className="profile-id">Patient #{regid}</span>
            </div>
            <div className={`profile-status-chip ${activePackage?.status === 'Active' ? 'active' : ''}`}>
              {activePackage?.status === 'Active' ? <Award size={12} /> : <Clock size={12} />}
              {activePackage?.packageName ? `${activePackage.packageName} (${activePackage.status})` : 'No active plan'}
            </div>

            {/* ABHA Health ID Chip */}
            {abhaStatus?.isLinked ? (
              <div 
                className="profile-status-chip active" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                  color: '#4ade80',
                  paddingRight: '6px'
                }}
              >
                <ShieldCheck size={12} />
                <span>ABHA: {abhaStatus.abhaId}</span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Remove ABHA link from this patient?')) return;
                    try {
                      await abhaUnlinkMutation.mutateAsync();
                      toast({ title: 'ABHA Unlinked', description: 'ABHA ID removed from patient profile', variant: 'success' });
                    } catch (err: any) {
                      toast({ title: 'Failed', description: err.message, variant: 'error' });
                    }
                  }}
                  disabled={abhaUnlinkMutation.isPending}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  title="Unlink ABHA ID"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Unlink size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAbhaModal(true)}
                className="profile-status-chip"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
              >
                <Link2 size={12} />
                <span>Link ABHA</span>
              </button>
            )}
          </div>

          <div className="profile-actions">
              <button
                className="profile-btn"
                onClick={() => {
                  const myOrg: any = orgs.find(o => o.id === user?.contextId) || orgs[0];
                  const defaultTemplate = pdfSettings.find((s: any) => s.isDefault) || pdfSettings[0];
                  const baseClinic = getClinicLetterhead();
                  const clinic = {
                    ...baseClinic,
                    name: myOrg?.name || baseClinic.name,
                    tagline: myOrg?.tagLine || baseClinic.tagline,
                    logoUrl: myOrg?.logo || baseClinic.logoUrl,
                    address: myOrg?.address || baseClinic.address,
                    address2: myOrg?.address2 || baseClinic.address2,
                    phone: myOrg?.phone || baseClinic.phone,
                    timing: myOrg?.timing || baseClinic.timing,
                    email: myOrg?.email || baseClinic.email,
                    website: myOrg?.website || baseClinic.website,
                    registrationNo: myOrg?.registration || baseClinic.registrationNo,
                    headerHtml: (defaultTemplate as any)?.headerHtml,
                    footerHtml: (defaultTemplate as any)?.footerHtml,
                  };

                  const doctor = getDoctorLetterhead();

                  const medications = (prescriptionsHistory?.length ? prescriptionsHistory : prescriptionsFromFull || [])
                    .filter((p: any) => p.remedy_name || p.remedyName || p.medicineName || p.medicine)
                    .map((p: any) => ({
                      name: p.remedy_name || p.remedyName || p.medicineName || p.medicine || '—',
                      genericName: undefined,
                      dosage: p.potency_name || p.potencyName || p.potency || '—',
                      frequency: p.frequency_name || p.frequencyName || p.frequencyTitle || p.frequency || '—',
                      duration: (p.days || p.rx_days || p.rxdays) ? `${p.days || p.rx_days || p.rxdays} days` : '—',
                      route: undefined,
                      instructions: p.prescription || p.rx_prescription || p.instructions || p.notes || undefined,
                      quantity: undefined,
                      date: p.created_at || p.createdAt || p.dateval,
                    }));

                  const followUpEntry = notes?.find((n: any) => n.notesType === 'Followup');
                  const diagnosisNote = medicalCase.condition || soap?.find((s: any) => s.notesType === 'assessment')?.notes || '';

                  const latestVitals = vitals?.[0];
                  const vitalsData = latestVitals ? {
                    heightCm: latestVitals.heightCm ?? undefined,
                    weightKg: latestVitals.weightKg ?? undefined,
                    bmi: latestVitals.bmi ?? undefined,
                    temperatureF: latestVitals.temperatureF ?? undefined,
                    pulseRate: latestVitals.pulseRate ?? undefined,
                    systolicBp: latestVitals.systolicBp ?? undefined,
                    diastolicBp: latestVitals.diastolicBp ?? undefined,
                    oxygenSaturation: latestVitals.oxygenSaturation ?? undefined,
                  } : undefined;

                  const printData: PrescriptionPrintData = {
                    clinic: clinic as any,
                    doctor,
                    patient: {
                      name: formatName(medicalCase.patientName) || `Patient ${regid}`,
                      age: ageString.replace(' Years', ''),
                      gender: medicalCase.gender || undefined,
                      mrn: String(regid),
                      phone: medicalCase.phone || medicalCase.mobile || undefined,
                    },
                    visit: {
                      visitNumber: String(regid),
                      date: medicalCase.createdAt || new Date().toISOString(),
                      chiefComplaint: medicalCase.condition || undefined,
                    },
                    diagnosis: diagnosisNote ? { assessment: diagnosisNote } : undefined,
                    followUp: followUpEntry?.notes || undefined,
                    medications,
                    vitals: vitalsData,
                  };

                  const html = generatePrescriptionHtml(printData);
                  printHtml(html, { title: `Prescription - ${printData.patient.name}` });
                }}>
              <Printer size={16} /> Print Prescription
            </button>
            <button className="profile-btn" onClick={() => setMobileDrawer('contact')}>
              <MessageSquare size={16} /> Message
            </button>
          </div>
        </div>

        <div className="profile-bottom-grid">
          <div className="profile-info-cell">
            <label>GENDER</label>
            <span>{medicalCase.gender || 'Other'}</span>
          </div>
          <div className="profile-info-cell">
            <label>AGE</label>
            <span>{ageString || 'Unknown'}</span>
          </div>
          <div className="profile-info-cell">
            <label>PHONE</label>
            <div className="info-with-icon">
              <Phone size={14} /> {medicalCase.mobile || medicalCase.phone || '—'}
            </div>
          </div>

          <div className="profile-info-cell">
            <label>DOCTOR</label>
            <div className="info-with-icon">
              <Stethoscope size={14} /> {formatName(medicalCase.doctorName) || '—'}
            </div>
          </div>
          <div className="profile-info-cell">
            <label>REGISTERED</label>
            <span>{(() => {
              const regDate = medicalCase.registeredAt || medicalCase.createdAt;
              if (!regDate) return '—';
              return new Date(regDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            })()}</span>
          </div>
          {activePackage?.expiryDate && (
            <div className="profile-info-cell">
              <label>EXPIRES</label>
              <div className="info-with-icon">
                <Clock size={14} /> {new Date(activePackage.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          )}
          <div className="profile-info-cell">
            <label>ADDRESS</label>
            <span title={medicalCase.address}>{medicalCase.address || 'Not provided'}</span>
          </div>
          <div className="profile-info-cell">
            <label>CONDITION</label>
            <span title={medicalCase.condition}>{medicalCase.condition || 'General'}</span>
          </div>
        </div>
      </div>


      {/* ─── Layout with Left Tabs ─── */}
      <div className="mc-layout-wrapper">
        {/* ─── Tab Navigation ─── */}
        <div className="mc-left-tabs-container">
          <div className="mc-left-tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`mc-left-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'summary') rxWorkflow.setActiveTab(null);
                  }}
                  title={tab.label}
                >
                  <Icon size={20} />
                  <span className="mc-left-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>


        {/* ─── Main Content & Sidebar Grid ─── */}
        <div className="mc-body-grid">

          <div className="mc-body-main">
            {tabContent || (
              <div className="mc-tab-empty">
                <History size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>Select a tab to view clinical data</p>
              </div>
            )}

            {/* ─── Billing Summary (Positioned below Prescription Table) ─── */}
            {activeTab === 'summary' && (
              <div style={{
                marginTop: '32px',
                padding: '24px',
                background: '#fff',
                border: '1px solid var(--border-main)',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                    <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '10px', color: '#3b82f6' }}>
                      <CreditCard size={20} />
                    </div>
                    Billing Overview
                  </div>
                  {displayDate && (
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                      {displayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>

                {billingValues.hasActivePackage && (
                  <div style={{ background: `${billingValues.activePackageColor || '#3b82f6'}1a`, border: `1px solid ${billingValues.activePackageColor || '#3b82f6'}33`, padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' }}>
                    <span style={{ fontSize: '1rem' }}>💎</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: billingValues.activePackageColor || '#1e40af' }}>
                      Active Plan: {billingValues.activePackageName}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Charges Waived</span>
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
                  {[
                    { label: 'Registration Charge', value: billingValues.regular, color: '#1e293b', tab: 'regular', isCovered: billingValues.hasActivePackage && billingValues.originalRegular > 0 && billingValues.regular === 0, originalValue: billingValues.originalRegular },
                    { label: 'Medicine Days Charge', value: billingValues.daysCharge, color: '#475569', tab: 'regular', isCovered: billingValues.hasActivePackage && billingValues.originalDaysCharge > 0 && billingValues.daysCharge === 0, originalValue: billingValues.originalDaysCharge },
                    { label: 'Additional Charge', value: billingValues.additional, color: '#64748b', tab: 'custom' },
                    { label: 'Total Bill Amount', value: billingValues.total, color: '#2563eb', bold: true, tab: 'regular' },
                    { label: 'Amount Received', value: billingValues.received, color: '#059669', tab: 'payment' },
                    { label: 'Pending Balance', value: billingValues.balance, color: '#dc2626', bold: true, noEdit: true },
                  ].map((row, idx) => (
                    <div key={idx} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 140px 40px', 
                      padding: '10px 16px', 
                      borderBottom: idx === 5 ? 'none' : '1px solid #f1f5f9',
                      alignItems: 'center',
                      background: idx % 2 === 0 ? 'transparent' : '#f8fafc'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{row.label}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: row.bold ? 800 : 700, color: row.color, textAlign: 'right', paddingRight: '20px' }}>
                        {row.isCovered ? (
                          <>
                            <del style={{ color: '#94a3b8', fontSize: '0.75rem', marginRight: '6px' }}>₹{row.originalValue}</del>
                            <span style={{ color: '#059669', fontWeight: 800 }}>₹0</span>
                          </>
                        ) : (
                          `₹${row.value}`
                        )}
                      </span>
                      {row.noEdit || !isToday ? (
                        <div style={{ width: '28px', height: '28px' }} />
                      ) : (
                        <button 
                          onClick={() => {
                            setActiveBillingTab(row.tab as any);
                            setShowBillingModal(true);
                          }}
                          style={{ 
                            width: '28px',
                            height: '28px',
                            padding: '0', 
                            background: '#fff', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = '#64748b';
                          }}
                        >
                          <Edit size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    style={{ 
                      padding: '10px 24px', 
                      background: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '10px', 
                      fontWeight: 700, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <Share2 size={16} /> Share Payment Receipt
                  </button>
                </div>
              </div>
            )}

          </div>

          <aside className="mc-body-side">


            {/* ─── Clinical History / Follow-up Timeline ─── */}
            <div className="mc-side-card" style={{ marginBottom: '16px' }}>
              <div className="mc-side-card-header">
                <div className="mc-side-card-title">
                  <History size={16} />
                  {displayDate
                    ? `Follow Up on ${displayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : "No Follow-up"
                  }
                </div>
              </div>
              <div className="mc-side-card-body" style={{ padding: '16px' }}>
                <AutoSaveNoteArea
                  value={followUpNote}
                  onChange={setFollowUpNote}
                  placeholder={displayDate ? "Record patient follow-up or status..." : "No history available"}
                  onSave={handleSaveNote}
                  minHeight="180px"
                />
              </div>
            </div>

            {/* ─── Homeo Details Snapshot ─── */}
            <div className="mc-side-card" style={{ marginBottom: '16px' }}>
              <div className="mc-side-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>Homeo details</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    ref={prescriptionFileInputRef}
                    onChange={handlePrescriptionFileChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                  <button
                    onClick={triggerPrescriptionScan}
                    disabled={parsePrescriptionMutation.isPending}
                    style={{
                      background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                      color: '#7c3aed',
                      border: '1px solid #c4b5fd',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: parsePrescriptionMutation.isPending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(124, 58, 237, 0.05)',
                      transition: 'all 0.2s ease',
                      opacity: parsePrescriptionMutation.isPending ? 0.7 : 1
                    }}
                    title="AI Scan Handwritten Prescription"
                  >
                    {parsePrescriptionMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin text-purple-600" />
                    ) : (
                      <BrainCircuit size={12} className="text-purple-600" />
                    )}
                    <span>AI Scan</span>
                  </button>
                  <div 
                    onClick={() => handleOpenDiagnosis(currentVisitSoap)}
                    style={{ color: '#3b82f6', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Edit Assessment"
                  >
                    <Edit size={14} />
                  </div>
                  {!isToday && currentVisitSoaps.length > 1 && (
                    <div 
                      onClick={() => setActiveTab('diagnosis')}
                      style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      See all ({currentVisitSoaps.length}) <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              </div>
              <div className="mc-side-card-body custom-scrollbar" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '400px', overflowY: 'auto' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>Diagnosis</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{currentVisitSoap?.assessment || '—'}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>Complaint Intensity</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{currentVisitSoap?.subjective || '—'}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>Medication Taking</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    {renderMedicationTakingSnapshot(currentVisitSoap?.objective)}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>Investigation</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{currentVisitSoap?.plan || currentVisitSoap?.advice || '—'}</div>
                </div>
              </div>
            </div>




            {/* ─── Global Diagnosis Form Drawer ─── */}
            {showDiagnosisDrawer && ReactDOM.createPortal(
              <>
                <div className="mc-drawer-backdrop" onClick={() => setShowDiagnosisDrawer(false)} />
                <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px' }}>
                  <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
                    <div className="mc-drawer-header-title">
                      <Sparkles size={18} /> {editingDiagnosisRecord ? 'Edit AI Follow up' : 'New AI Follow up'}
                    </div>
                    <button className="mc-drawer-close" onClick={() => setShowDiagnosisDrawer(false)} style={{ color: 'white', opacity: 0.8 }}>
                      <X size={16} />
                    </button>
                  </header>

                  <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--pp-warm-1)', borderRadius: '8px', border: '1px solid var(--pp-warm-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--pp-blue)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>
                        Record Date: {(displayDate || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnosis</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.diagnosis}
                        onChange={e => setDiagForm({ ...diagForm, diagnosis: e.target.value })}
                        placeholder="Final clinical assessment..."
                        style={{ minHeight: '60px', fontSize: '1rem', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complaint Intensity</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.complaint}
                        onChange={e => setDiagForm({ ...diagForm, complaint: e.target.value })}
                        placeholder="Patient symptoms & intensity..."
                        style={{ minHeight: '100px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medication Taking</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {medicationRows.map((row, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              padding: '12px', 
                              background: '#f8fafc',
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '10px',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Medication #{idx + 1}
                              </span>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  color: '#ef4444',
                                  padding: '6px',
                                  border: '1px solid transparent',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#fef2f2',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => removeMedicationRow(idx)}
                                title="Remove medication"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Medicine Name</label>
                                <input
                                  type="text"
                                  className="pp-input"
                                  placeholder="Search or enter medicine name"
                                  value={row.medicine}
                                  onChange={e => updateMedicationRow(idx, 'medicine', e.target.value)}
                                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                                  autoComplete="off"
                                />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Frequency</label>
                                  <select
                                    className="pp-input"
                                    value={row.frequency}
                                    onChange={e => updateMedicationRow(idx, 'frequency', e.target.value)}
                                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem', height: '38px', background: 'white' }}
                                  >
                                    <option value="Once">Once</option>
                                    <option value="Twice">Twice</option>
                                    <option value="Thrice">Thrice</option>
                                    <option value="Bed Time">Bed Time</option>
                                    <option value="Empty Stomach">Empty Stomach</option>
                                    <option value="weekly">weekly</option>
                                  </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Issue</label>
                                    <button
                                      type="button"
                                      disabled={!row.medicine.trim() || aiDetectingIdx === idx}
                                      onClick={() => detectMedicineIssue(idx, row.medicine)}
                                      title="AI auto-detect issue from medicine name"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        color: aiDetectingIdx === idx ? '#94a3b8' : '#7c3aed',
                                        background: aiDetectingIdx === idx ? '#f1f5f9' : 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                                        border: '1px solid',
                                        borderColor: aiDetectingIdx === idx ? '#e2e8f0' : '#c4b5fd',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        cursor: !row.medicine.trim() || aiDetectingIdx === idx ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        opacity: !row.medicine.trim() ? 0.4 : 1,
                                        letterSpacing: '0.02em',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {aiDetectingIdx === idx ? (
                                        <><Loader2 size={10} className="animate-spin" /> Detecting...</>
                                      ) : (
                                        <><Sparkles size={10} /> AI Detect</>
                                      )}
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    className="pp-input"
                                    placeholder="e.g. Fever"
                                    value={row.issue}
                                    onChange={e => updateMedicationRow(idx, 'issue', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', height: '38px', background: 'white' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addMedicationRow}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '4px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px dashed #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dbeafe';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                          e.currentTarget.style.borderColor = '#bfdbfe';
                        }}
                      >
                        <Plus size={14} /> Add Medication
                      </button>
                      <datalist id="medicines-catalog-list">
                        {(medicines as any[]).map((m: any) => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investigation</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.medication}
                        onChange={e => setDiagForm({ ...diagForm, medication: e.target.value })}
                        placeholder="Investigations or next steps..."
                        style={{ minHeight: '80px' }}
                      />
                    </div>
                  </div>

                  <footer style={{
                    padding: '20px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '12px',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10
                  }}>
                    <button
                      onClick={() => setShowDiagnosisDrawer(false)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                        background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDiagnosis}
                      style={{
                        flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                        background: 'var(--pp-blue)', color: 'white', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)'
                      }}
                    >
                      <Save size={18} /> Save Assessment
                    </button>
                  </footer>
                </div>
              </>
              , document.body)}

            {/* ─── AI Prescription Scan Preview Drawer ─── */}
            {showPrescriptionPreview && scannedPrescription && ReactDOM.createPortal(
              <>
                <div className="mc-drawer-backdrop" onClick={() => setShowPrescriptionPreview(false)} />
                <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '540px' }}>
                  <header className="mc-drawer-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
                    <div className="mc-drawer-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BrainCircuit size={18} /> AI Scanned Details
                    </div>
                    <button className="mc-drawer-close" onClick={() => setShowPrescriptionPreview(false)} style={{ color: 'white', opacity: 0.8 }}>
                      <X size={16} />
                    </button>
                  </header>

                  <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '10px 14px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} style={{ color: '#7c3aed' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6' }}>
                        Handwritten prescription successfully scanned by AI
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnosis</label>
                      <textarea
                        className="pp-textarea"
                        value={scannedPrescription.diagnosis}
                        onChange={e => setScannedPrescription({ ...scannedPrescription, diagnosis: e.target.value })}
                        placeholder="Diagnosis parsed from image..."
                        style={{ minHeight: '60px', fontSize: '1rem', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complaint Intensity</label>
                      <textarea
                        className="pp-textarea"
                        value={scannedPrescription.complaint}
                        onChange={e => setScannedPrescription({ ...scannedPrescription, complaint: e.target.value })}
                        placeholder="Complaints parsed from image..."
                        style={{ minHeight: '100px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medication Taking</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {scannedMedicationRows.map((row, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              padding: '12px', 
                              background: '#f8fafc',
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '10px',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Medication #{idx + 1}
                              </span>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  color: '#ef4444',
                                  padding: '6px',
                                  border: '1px solid transparent',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#fef2f2',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => removeScannedMedicationRow(idx)}
                                title="Remove medication"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Medicine Name</label>
                                <input
                                  type="text"
                                  className="pp-input"
                                  placeholder="Enter medicine name"
                                  value={row.medicine}
                                  onChange={e => updateScannedMedicationRow(idx, 'medicine', e.target.value)}
                                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                                  autoComplete="off"
                                />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Frequency</label>
                                  <select
                                    className="pp-input"
                                    value={row.frequency}
                                    onChange={e => updateScannedMedicationRow(idx, 'frequency', e.target.value)}
                                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem', height: '38px', background: 'white' }}
                                  >
                                    <option value="Once">Once</option>
                                    <option value="Twice">Twice</option>
                                    <option value="Thrice">Thrice</option>
                                    <option value="Bed Time">Bed Time</option>
                                    <option value="Empty Stomach">Empty Stomach</option>
                                    <option value="weekly">weekly</option>
                                  </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Issue</label>
                                  <input
                                    type="text"
                                    className="pp-input"
                                    placeholder="e.g. Fever"
                                    value={row.issue}
                                    onChange={e => updateScannedMedicationRow(idx, 'issue', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', height: '38px', background: 'white' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addScannedMedicationRow}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '4px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#7c3aed',
                          background: '#f5f3ff',
                          border: '1px dashed #c4b5fd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Plus size={14} /> Add Medication
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investigation</label>
                      <textarea
                        className="pp-textarea"
                        value={scannedPrescription.investigation}
                        onChange={e => setScannedPrescription({ ...scannedPrescription, investigation: e.target.value })}
                        placeholder="Investigations parsed from image..."
                        style={{ minHeight: '80px' }}
                      />
                    </div>
                  </div>

                  <footer style={{
                    padding: '20px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '12px',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10
                  }}>
                    <button
                      onClick={() => setShowPrescriptionPreview(false)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                        background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={triggerPrescriptionScan}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #c4b5fd',
                        background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <RefreshCw size={14} /> Refetch
                    </button>
                    <button
                      onClick={handleSaveScannedPrescription}
                      style={{
                        flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.1)'
                      }}
                    >
                      <Save size={18} /> Save Details
                    </button>
                  </footer>
                </div>
              </>
              , document.body)}

            <PaymentReceiptModal
              isOpen={showReceiptModal}
              onClose={() => setShowReceiptModal(false)}
              patientData={medicalCase}
              billingData={billingValues}
            />
          </aside>



        </div>
      </div>

      {/* ─── Mobile Floating Action Bar Removed ─── */}

      {/* ─── Mobile Drawer ─── */}
      {mobileDrawer && (
        <>
          <div className="mc-drawer-backdrop" onClick={() => setMobileDrawer(null)} />
          <div className="mc-drawer">
            <div className="mc-drawer-header">
              <div className="mc-drawer-header-title">
                {mobileDrawer === 'followup' && <><FileText size={18} /> Follow-up Notes</>}
                {mobileDrawer === 'billing' && <><CreditCard size={18} /> Billing Summary</>}
                {mobileDrawer === 'contact' && <><Phone size={18} /> Patient Contact</>}
                {mobileDrawer === 'package' && <><Package size={18} /> Package Info</>}
              </div>
              <button className="mc-drawer-close" onClick={() => setMobileDrawer(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="mc-drawer-body">
              {mobileDrawer === 'followup' && (
                <>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                    {(notes || []).filter((n: any) => n.notesType === 'Followup' || n.noteType === 'Followup').length > 0 ? (
                      (notes || []).filter((n: any) => n.notesType === 'Followup' || n.noteType === 'Followup')
                        .sort((a: any, b: any) => new Date(b.createdAt || b.created_at || b.dateval || 0).getTime() - new Date(a.createdAt || a.created_at || a.dateval || 0).getTime())
                        .map((note: any) => (
                          <div key={note.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-main)', fontSize: '0.85rem' }}>
                            <div style={{ color: 'var(--pp-text-3)', fontSize: '0.7rem', marginBottom: '4px' }}>
                              {(note.createdAt || note.created_at || note.dateval) ? new Date(note.createdAt || note.created_at || note.dateval).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              }) : '—'}
                            </div>
                            <div style={{ color: 'var(--pp-ink)', lineHeight: 1.5 }}>{note.notes}</div>
                          </div>
                        ))
                    ) : (
                      <div style={{ color: 'var(--pp-text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                        No follow-up notes yet. Add one below.
                      </div>
                    )}
                  </div>
                  <AutoSaveNoteArea
                    value={followUpNote}
                    onChange={setFollowUpNote}
                    onSave={handleSaveNote}
                    placeholder="Add follow-up notes here..."
                    minHeight="200px"
                  />
                </>
              )}


              {mobileDrawer === 'billing' && (
                <>
                  <div className="mc-side-card" style={{ background: 'var(--bg-card)' }}>
                    <div className="mc-side-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Total</span>
                        <strong style={{ color: 'var(--pp-ink)' }}>₹{billingValues.total}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Paid</span>
                        <strong style={{ color: 'var(--pp-success-fg)' }}>₹{billingValues.received}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Balance</span>
                        <strong style={{ color: 'var(--pp-danger-fg)' }}>₹{billingValues.balance}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--pp-blue)', borderTop: '2px solid var(--border-main)', paddingTop: '14px', marginTop: '8px' }}>
                        <span>Outstanding</span>
                        <strong>₹{billingValues.balance}</strong>
                      </div>
                    </div>
                  </div>
                  {isToday && (
                    <button
                      onClick={() => { setMobileDrawer(null); setShowBillingModal(true); }}
                      style={{
                        width: '100%', padding: '14px', background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)',
                        border: '1px solid #BBF7D0', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                      }}
                    >
                      Record Payment
                    </button>
                  )}
                </>
              )}

              {mobileDrawer === 'contact' && (
                <div className="mc-side-card" style={{ background: 'white' }}>
                  <div className="mc-side-card-body" style={{ gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--pp-text-3)' }}>Name</span>
                      <strong>{medicalCase.patientName || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--pp-text-3)' }}>Mobile</span>
                      <strong>{medicalCase.mobile || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--pp-text-3)' }}>Email</span>
                      <strong>{medicalCase.email || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--pp-text-3)' }}>Address</span>
                      <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{medicalCase.address || '—'}</strong>
                    </div>
                    {medicalCase.mobile && (
                      <a
                        href={`tel:${medicalCase.mobile}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          width: '100%', padding: '12px', background: '#2563eb', color: 'white',
                          border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
                          textDecoration: 'none', marginTop: '8px'
                        }}
                      >
                        <Phone size={16} /> Call Patient
                      </a>
                    )}
                  </div>
                </div>
              )}

              {mobileDrawer === 'package' && (
                <>
                  <div className="mc-side-card" style={{ background: 'white' }}>
                    <div className="mc-side-card-body" style={{ gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Scheme</span>
                        <strong>{activePackage?.packageName || '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Status</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                          background: activePackage?.status === 'Active' ? '#dcfce7' : '#fef3c7',
                          color: activePackage?.status === 'Active' ? '#166534' : '#92400e'
                        }}>
                          {activePackage?.status || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--pp-text-3)' }}>Expiry</span>
                        <strong>{activePackage?.expiryDate ? new Date(activePackage.expiryDate).toLocaleDateString() : '—'}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileDrawer(null); setShowAssignModal(true); }}
                    style={{
                      width: '100%', padding: '14px', background: 'var(--pp-blue-faded)', color: 'var(--pp-blue)',
                      border: '1px solid #C7D2FE', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Manage Package
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showVitalsModal && <VitalsFormModal initialData={editingVitals} visitId={medicalCase.id} regid={Number(regid)} onClose={() => {
        setShowVitalsModal(false);
        setEditingVitals(null);
      }} />}
      {showAssignModal && (
        <AssignPackageModal
          isOpen={showAssignModal}
          patientId={Number(regid)}
          patientName={medicalCase.patientName || ''}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => { 
            refetchFull();
          }}
        />
      )}
      {showFinalizeModal && (
        <FinalizeConsultationModal
          regid={Number(regid)}
          visitId={medicalCase.id}
          prescriptions={prescriptionsHistory || []}
          defaultConsultationFee={medicalCase.consultationFee || 0}
          defaultMedicineDaysCharge={billingValues.daysCharge || 0}
          activePackageName={billingValues.activePackageName}
          onClose={() => setShowFinalizeModal(false)}
        />
      )}
      {showBillingModal && (
        <BillingUpdateModal
          regid={Number(regid)}
          patientName={medicalCase.patientName || ''}
          currentConsultationFee={medicalCase.consultationFee || 0}
          defaultTab={activeBillingTab}
          additionalCharges={fullData?.additionalCharges || []}
          displayDate={displayDate || undefined}
          rxWorkflow={rxWorkflow}
          visitId={medicalCase.id}
          onClose={() => setShowBillingModal(false)}
        />
      )}
      {showAbhaModal && (
        <AbhaLinkingModal
          isOpen={showAbhaModal}
          onClose={() => setShowAbhaModal(false)}
          regid={Number(regid)}
          patientName={medicalCase.patientName || ''}
        />
      )}
    </div>
  );
}

function MedicalCasePageSkeleton() {
  return (
    <div className="mc-detail-container animate-fade-in" style={{ padding: '12px' }}>
      {/* ─── Redesigned Header Card Skeleton ─── */}
      <div className="patient-profile-card">
        <div className="profile-top-row">
          <div className="profile-identity">
            <button 
              disabled
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px',
                borderRadius: '8px',
                marginRight: '8px',
                opacity: 0.5
              }}
            >
              <ArrowLeft size={24} />
            </button>
            <div className="profile-name-id">
              <div className="skeleton-box" style={{ width: '180px', height: '24px', marginBottom: '6px' }} />
              <div className="skeleton-box" style={{ width: '90px', height: '14px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '130px', height: '24px', borderRadius: '100px' }} />
            <div className="skeleton-box" style={{ width: '100px', height: '24px', borderRadius: '100px' }} />
          </div>
          <div className="profile-actions">
            <div className="skeleton-box" style={{ width: '150px', height: '36px', borderRadius: '8px' }} />
            <div className="skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
          </div>
        </div>
        <div className="profile-bottom-grid">
          <div className="profile-info-cell">
            <label>GENDER</label>
            <div className="skeleton-box" style={{ width: '60px', height: '15px', marginTop: '4px' }} />
          </div>
          <div className="profile-info-cell">
            <label>AGE</label>
            <div className="skeleton-box" style={{ width: '80px', height: '15px', marginTop: '4px' }} />
          </div>
          <div className="profile-info-cell">
            <label>PHONE</label>
            <div className="info-with-icon">
              <Phone size={14} style={{ opacity: 0.3 }} />
              <div className="skeleton-box" style={{ width: '100px', height: '15px' }} />
            </div>
          </div>
          <div className="profile-info-cell">
            <label>DOCTOR</label>
            <div className="info-with-icon">
              <Stethoscope size={14} style={{ opacity: 0.3 }} />
              <div className="skeleton-box" style={{ width: '120px', height: '15px' }} />
            </div>
          </div>
          <div className="profile-info-cell">
            <label>REGISTERED</label>
            <div className="skeleton-box" style={{ width: '90px', height: '15px', marginTop: '4px' }} />
          </div>
          <div className="profile-info-cell">
            <label>EXPIRES</label>
            <div className="info-with-icon">
              <Clock size={14} style={{ opacity: 0.3 }} />
              <div className="skeleton-box" style={{ width: '85px', height: '15px' }} />
            </div>
          </div>
          <div className="profile-info-cell">
            <label>ADDRESS</label>
            <div className="skeleton-box" style={{ width: '140px', height: '15px', marginTop: '4px' }} />
          </div>
          <div className="profile-info-cell">
            <label>CONDITION</label>
            <div className="skeleton-box" style={{ width: '100px', height: '15px', marginTop: '4px' }} />
          </div>
        </div>
      </div>

      <div className="mc-body-grid" style={{ marginTop: '32px' }}>
        <div className="mc-body-main">
          {/* Main Content Area Shimmer */}
          <div className="pp-card" style={{ padding: '32px', minHeight: '400px', marginBottom: '24px' }}>
            <div className="skeleton-box skeleton-text title" style={{ width: '30%', marginBottom: '32px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '300px', borderRadius: '16px' }} />
          </div>

          {/* ─── Itemized Billing Summary Skeleton ─── */}
          <div style={{ padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <div className="skeleton-box skeleton-text title" style={{ width: '120px', height: '14px', marginBottom: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 40px', padding: '10px 16px', borderBottom: i === 5 ? 'none' : '1px solid #f1f5f9' }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '80px', height: '10px' }} />
                  <div className="skeleton-box skeleton-text" style={{ width: '60px', height: '14px', marginLeft: 'auto' }} />
                  <div className="skeleton-box" style={{ width: '28px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="mc-body-side">
          {[1, 2].map(i => (
            <div key={i} className="mc-side-card" style={{ padding: '20px', background: 'white' }}>
              <div className="skeleton-box skeleton-text title" style={{ width: '60%', marginBottom: '16px' }} />
              <div className="skeleton-box skeleton-text" style={{ width: '100%', marginBottom: '10px' }} />
              <div className="skeleton-box skeleton-text" style={{ width: '80%', marginBottom: '10px' }} />
              <div className="skeleton-box skeleton-text" style={{ width: '90%' }} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

/* ─── Internal Sub-Components ─── */

function VaccineView({ regid, caseVaccines, onAppendNote }: { regid: number; caseVaccines: any[]; onAppendNote?: (text: string) => void }) {
  const { data: masterVaccines = [], isLoading } = useMasterVaccines();
  const { saveVaccine } = useManageClinicalRecords();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'marked' | 'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Build grouped list (categories + children) like the settings page
  const flatGrouped = React.useMemo(() => {
    const catMap: Record<number, any> = {};
    const childMap: Record<number, any[]> = {};
    masterVaccines.forEach((v: any) => {
      if (v.parentId === 0) catMap[v.id] = v;
      else {
        if (!childMap[v.parentId]) childMap[v.parentId] = [];
        childMap[v.parentId]!.push(v);
      }
    });
    const list: (any & { isHeader?: boolean })[] = [];
    Object.values(catMap).sort((a: any, b: any) => (a.months || 0) - (b.months || 0)).forEach((cat: any) => {
      list.push({ ...cat, isHeader: true });
      (childMap[cat.id] || []).sort((a: any, b: any) => (a.months || 0) - (b.months || 0)).forEach((c: any) => list.push(c));
    });
    // Orphans
    masterVaccines.filter((v: any) => v.parentId !== 0 && !catMap[v.parentId]).forEach((v: any) => list.push(v));

    let filtered = list;
    if (search) {
      filtered = filtered.filter((v: any) => v.label?.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort non-header items
    if (sortOrder !== 'asc') {
      const nonHeaders = filtered.filter(v => !v.isHeader);
      if (sortOrder === 'marked') {
        return nonHeaders.filter(v => caseVaccines.some((cv: any) => cv.vaccineId === v.id));
      } else if (sortOrder === 'desc') {
        nonHeaders.sort((a, b) => (b.label || '').localeCompare(a.label || ''));
      }
      return nonHeaders;
    }

    return filtered;
  }, [masterVaccines, search, sortOrder, caseVaccines]);

  const totalPages = Math.ceil(flatGrouped.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVaccines = flatGrouped.slice(startIndex, startIndex + pageSize);

  const handleMarkDone = async (vaccineId: number) => {
    setSavingId(vaccineId);
    try {
      await saveVaccine.mutateAsync({ regid, vaccineId, notes: 'Administered' });
    } finally { setSavingId(null); }
  };

  return (
    <div style={{ animation: 'none' }}>


      {/* Search and Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)' }} />
          <input
            type="text"
            placeholder="Search vaccine..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid var(--border-main)', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-surface-2)', boxSizing: 'border-box', color: 'var(--pp-ink)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>Sort by:</span>
          <select
            className="pp-select"
            style={{ width: '140px', padding: '8px 12px' }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="marked">Marked</option>
            <option value="asc">Ascending (A-Z)</option>
            <option value="desc">Descending (Z-A)</option>
          </select>
          {(sortOrder !== 'asc' || search) && (
            <button
              onClick={() => { setSortOrder('asc'); setSearch(''); setCurrentPage(1); }}
              className="btn-ghost"
              style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
        <div className="mc-table-container">
          <table className="pp-table mc-responsive-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Vaccine & Description</th>
                <th style={{ width: '160px' }}>Recommended Age</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentVaccines.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--pp-text-3)' }}>
                  <Syringe size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                  <p>No vaccine records found.</p>
                </td></tr>
              )}
              {currentVaccines.map((vac: any, idx: number) => {
                if (vac.isHeader) {
                  return (
                    <tr key={`hdr-${vac.id}`} style={{ background: '#f0f9ff' }}>
                      <td colSpan={5} style={{ padding: '10px 14px', borderBottom: '1px solid #dbeafe' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={13} style={{ color: 'var(--pp-blue)' }} />
                          <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e40af' }}>
                            {vac.label}
                          </span>
                          {vac.months !== undefined && vac.months !== 999 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>(At {vac.months} Months)</span>
                          )}
                          <div style={{ flex: 1, borderTop: '1px dashed #cbd5e1', marginLeft: '8px', opacity: 0.5 }} />
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isDone = caseVaccines.some((cv: any) => cv.vaccineId === vac.id);
                const doneRecord = caseVaccines.find((cv: any) => cv.vaccineId === vac.id);

                return (
                  <tr key={vac.id} className="hover-row">
                    <td style={{ color: 'var(--pp-text-3)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                      {idx + 1 + startIndex}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--pp-ink)' }}>{vac.label}</div>
                      {vac.description && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', marginTop: '2px' }}>{vac.description}</div>
                      )}
                      {isDone && doneRecord?.createdAt && (
                        <div style={{ fontSize: '0.68rem', color: '#22c55e', marginTop: '3px', fontWeight: 600 }}>
                          ✓ Given on {new Date(doneRecord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {doneRecord.notes && doneRecord.notes !== 'Administered' && doneRecord.notes !== 'Done' ? ` — ${doneRecord.notes}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      {vac.months !== null && vac.months !== undefined ? (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: vac.months === 0 ? '#f0fdf4' : '#eff6ff', color: vac.months === 0 ? '#16a34a' : '#2563eb', border: `1px solid ${vac.months === 0 ? '#bbf7d0' : '#bfdbfe'}` }}>
                          {vac.months === 0 ? 'At Birth' : `${vac.months} Months`}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      {isDone ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                          <Check size={12} /> Administered
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: '#fef9c3', color: '#a16207', border: '1px solid #fde68a' }}>
                          <AlertCircle size={11} /> Pending
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isDone && (
                        <button
                          onClick={() => handleMarkDone(vac.id)}
                          disabled={savingId === vac.id}
                          style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #e2e8f0', background: 'white', color: '#2563eb', cursor: 'pointer' }}
                        >
                          {savingId === vac.id ? '...' : 'Mark Done'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={flatGrouped.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

function AnalyticsView({ vitals, regid, visitId, name, phone, clinicName, onAppendNote }: { vitals: any[]; regid: number; visitId: number; name: string; phone: string; clinicName: string; onAppendNote?: (text: string) => void }) {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [hVal, setHVal] = useState('');
  const [wVal, setWVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const { saveVitals } = useManageClinicalRecords();
  const sendSms = useSendSms();

  const handleSave = async () => {
    if (!hVal && !wVal) return;
    setSaving(true);
    try {
      const h = parseFloat(hVal);
      const w = parseFloat(wVal);
      const normalizedH = h ? (heightUnit === 'in' ? h * 2.54 : h) : null;
      const normalizedW = w ? (weightUnit === 'lbs' ? w / 2.20462 : w) : null;

      let bmi = null;
      if (normalizedH && normalizedW) {
        bmi = parseFloat((normalizedW / ((normalizedH / 100) ** 2)).toFixed(1));
      }

      await saveVitals.mutateAsync({
        regid,
        visitId,
        heightCm: normalizedH,
        weightKg: normalizedW,
        bmi
      });
      setHVal('');
      setWVal('');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!vitals?.length || !phone) return;
    const latest = vitals[0];
    setSending(true);

    let heightStr = '-';
    if (latest.heightCm) {
      const inches = latest.heightCm / 2.54;
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);
      heightStr = `${latest.heightCm} cm (${feet}'${remainingInches}")`;
    }

    let weightStr = '-';
    if (latest.weightKg) {
      const lbs = (latest.weightKg * 2.20462).toFixed(1);
      weightStr = `${latest.weightKg} kg (${lbs} lbs)`;
    }

    const msg = `*📊 CLINICAL VITALS REPORT*\n\nHello ${name},\n\nYour latest height/weight recorded at *${clinicName}*:\n\n📏 *Height:* ${heightStr}\n⚖️ *Weight:* ${weightStr}\n📉 *BMI:* ${latest.bmi || '-'}\n\n*Recorded on:* ${new Date(latest.recordedAt).toLocaleDateString()}\n\nThank you!`;
    try {
      await sendSms.mutateAsync({ phone, message: msg, regid });
    } finally {
      setSending(false);
    }
  };

  const handleCopyToFollowup = () => {
    if (!vitals?.length || !onAppendNote) return;
    const latest = vitals[0];
    const parts = [];
    if (latest.heightCm) parts.push(`Height: ${latest.heightCm} cm`);
    if (latest.weightKg) parts.push(`Weight: ${latest.weightKg} kg`);
    if (latest.bmi) parts.push(`BMI: ${latest.bmi}`);
    onAppendNote(`VITALS - H/W (${new Date(latest.recordedAt).toLocaleDateString()}): ${parts.join(', ')}`);
  };

  const chartData = (vitals || []).slice().reverse().map(v => ({
    date: new Date(v.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    weight: v.weightKg,
    height: v.heightCm,
    systolic: v.systolicBp,
    diastolic: v.diastolicBp,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="pp-card" style={{ padding: '24px', border: '1px solid #eef2f6' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--pp-blue)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Quick Record Height/Weight</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)' }}>Height</label>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-blue)', cursor: 'pointer' }} onClick={() => setHeightUnit(h => h === 'cm' ? 'in' : 'cm')}>{heightUnit.toUpperCase()}</span>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%', borderRadius: '8px', padding: '10px 16px' }} value={hVal} onChange={e => setHVal(e.target.value)} placeholder={heightUnit} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pp-text-3)' }}>Weight</label>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-blue)', cursor: 'pointer' }} onClick={() => setWeightUnit(w => w === 'kg' ? 'lbs' : 'kg')}>{weightUnit.toUpperCase()}</span>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%', borderRadius: '8px', padding: '10px 16px' }} value={wVal} onChange={e => setWVal(e.target.value)} placeholder={weightUnit} />
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', height: '44px', borderRadius: '8px', fontWeight: 700, background: '#2563eb' }}>
            {saving ? 'Saving...' : 'Save H/W'}
          </button>
          <button className="btn-secondary" onClick={handleShare} disabled={sending} style={{ padding: '10px 20px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--pp-text-3)' }}>
            <Send size={14} /> {sending ? 'Sending...' : 'Share Latest'}
          </button>
          {onAppendNote && vitals?.length > 0 && (
            <button
              className="btn-secondary"
              onClick={handleCopyToFollowup}
              style={{ padding: '10px 20px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #dcfce7', background: 'white', color: '#16a34a' }}
              title="Copy Latest to Follow-up"
            >
              <Copy size={14} /> Copy Latest
            </button>
          )}
        </div>
      </div>

      <div className="mc-section-header">Growth & Clinical Analytics</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '20px' }}>
        <div className="pp-card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginBottom: '16px' }}>Weight Trend (kg)</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="weight" stroke="var(--pp-blue)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pp-card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginBottom: '16px' }}>Height Trend (cm)</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="height" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ regid, investigations }: { regid: number; investigations: any[] }) {
  const reports = investigations?.filter(inv => inv.type === 'X-ray - CT - MRI' || inv.type === 'USG Female' || inv.type === 'USG Male' || inv.type === 'Serology' || inv.type === 'Semen Analysis') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="mc-section-header">Clinical Reports Summary</div>

      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No clinical reports found"
          description="Detailed clinical reports, radiological assessments, and specialized findings will appear here once recorded."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map((report) => (
            <div key={report.id} className="pp-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pp-blue)', fontWeight: 700 }}>{report.type}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)' }}>{report.investDate ? new Date(report.investDate).toLocaleDateString() : ''}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-2)', background: 'var(--pp-warm-1)', padding: '12px', borderRadius: 'var(--pp-radius-sm)', border: '1px solid var(--pp-warm-2)' }}>
                {Object.entries(report.data).map(([key, value]) => value ? (
                  <div key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {value as string}</div>
                ) : null)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarIcon({ icon: Icon, active, onClick, title }: any) {
  return (
    <div className={`mc-legacy-sidebar-icon ${active ? 'active' : ''}`} onClick={onClick} title={title}>
      <Icon size={20} strokeWidth={1.5} />
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="mc-snapshot-row">
      <div className="mc-snapshot-row-label">{label}</div>
      <div className="mc-snapshot-row-value">{value}</div>
    </div>
  );
}




function VitalsView({ vitals, onRecord, phone, name, regid, clinicName, onAppendNote }: { vitals: any[]; onRecord: (v?: any) => void; phone: string; name: string; regid: number; clinicName: string; onAppendNote?: (text: string) => void }) {
  const latest = vitals && vitals.length > 0 ? vitals[0] : null;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sendSms = useSendSms();
  const [sending, setSending] = useState(false);
  const { deleteVitals } = useManageClinicalRecords();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCopyToFollowup = (v: any) => {
    if (!onAppendNote) return;
    const parts = [];
    if (v.systolicBp || v.diastolicBp) parts.push(`BP: ${v.systolicBp || '-'}/${v.diastolicBp || '-'}`);
    if (v.pulseRate) parts.push(`Pulse: ${v.pulseRate} bpm`);
    if (v.temperatureF) parts.push(`Temp: ${v.temperatureF}°F`);
    if (v.weightKg) parts.push(`Weight: ${v.weightKg}kg`);
    if (v.oxygenSaturation) parts.push(`SpO2: ${v.oxygenSaturation}%`);
    if (v.bmi) parts.push(`BMI: ${v.bmi}`);

    onAppendNote(`VITALS (${new Date(v.recordedAt).toLocaleDateString()}): ${parts.join(', ')}`);
  };

  const handleDelete = async (v: any) => {
    if (!window.confirm('Are you sure you want to delete this vitals record?')) return;
    setDeletingId(v.id);
    try {
      await deleteVitals.mutateAsync(v.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (!vitals) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  const totalPages = Math.ceil((vitals?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVitals = vitals?.slice(startIndex, startIndex + pageSize) || [];

  const { expandedDates, toggleDate, groupedData: groupedVitals } = useTableGrouping(currentVitals, 'recordedAt');

  const handleShareVitals = async () => {
    if (!latest || !phone) return;
    setSending(true);

    let heightStr = '-';
    if (latest.heightCm) {
      const inches = latest.heightCm / 2.54;
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);
      heightStr = `${latest.heightCm} cm (${feet}'${remainingInches}")`;
    }

    let weightStr = '-';
    if (latest.weightKg) {
      const lbs = (latest.weightKg * 2.20462).toFixed(1);
      weightStr = `${latest.weightKg} kg (${lbs} lbs)`;
    }

    const msg = `*📊 CLINICAL VITALS REPORT*\n\nHello ${name},\n\nYour latest clinical vitals have been recorded at *${clinicName}*:\n\n📏 *Height:* ${heightStr}\n⚖️ *Weight:* ${weightStr}\n📉 *BMI:* ${latest.bmi || '-'}\n💓 *Blood Pressure:* ${latest.systolicBp}/${latest.diastolicBp} mmHg\n🌡️ *Temperature:* ${latest.temperatureF}°F\n🫁 *Oxygen (SpO2):* ${latest.oxygenSaturation || '-'}%\n\n*Recorded on:* ${new Date(latest.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n\n_Note: Please consult your doctor for a detailed assessment of these values._\n\nThank you!`;
    try {
      await sendSms.mutateAsync({ phone, message: msg, regid });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mc-vitals-workspace animate-fade-in">
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Vitals & Clinical Examination</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {latest && phone && (
            <button onClick={handleShareVitals} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={sending}>
              <Send size={14} /> {sending ? 'Sending...' : 'Share on WhatsApp'}
            </button>
          )}
          <button onClick={onRecord} className="btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Record Vitals
          </button>
        </div>
      </div>

      <div className="mc-vitals-grid">
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolicBp}/${latest.diastolicBp}` : '-'} unit="mmHg" icon={Activity} color="var(--pp-danger-fg)" />
        <VitalCard label="Heart Rate" value={latest ? latest.pulseRate : '-'} unit="bpm" icon={History} color="#ec4899" />
        <VitalCard label="Temperature" value={latest ? latest.temperatureF : '-'} unit="°F" icon={Thermometer} color="#f59e0b" />
        <VitalCard label="Oxygen Level" value={latest ? latest.oxygenSaturation : '-'} unit="%" icon={Zap} color="#10b981" />
        <VitalCard label="Body Weight" value={latest ? latest.weightKg : '-'} unit="kg" icon={Scale} color="var(--pp-blue)" />
        <VitalCard label="Height" value={latest ? latest.heightCm : '-'} unit="cm" icon={MoveVertical} color="#0ea5e9" />
        <VitalCard label="BMI Index" value={latest ? latest.bmi : '-'} unit="" icon={Sparkles} color="#8b5cf6" />
      </div>

      {vitals.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No vitals recorded yet"
          description="Establish a clinical baseline by recording the patient's blood pressure, heart rate, temperature, and other key vitals."
          actionLabel="Record the first vitals"
          onAction={() => onRecord()}
        />
      ) : (
        <div style={{ marginTop: '32px' }}>
          <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ padding: '12px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={15} style={{ color: 'var(--pp-blue)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>Recent Vitals History</span>
              <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600, marginLeft: '4px' }}>({vitals.length})</span>
            </div>
            <table className="pp-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>Temp</th>
                  <th>Weight</th>
                  <th>BMI</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedVitals.map((group) => (
                  <React.Fragment key={group.date}>
                    {group.items.map((v, idx) => {
                      const isExpanded = expandedDates.has(group.date);
                      if (idx > 0 && !isExpanded) return null;

                      const dateVal = v.recordedAt || 0;

                      return (
                        <tr
                          key={v.id}
                          className="hover-row"
                          style={{
                            background: idx > 0 ? '#f8fafc' : 'white',
                            borderLeft: idx > 0 ? '3px solid #e2e8f0' : 'none'
                          }}
                        >
                          <td className="appt-cell-mono">
                            <DateGroupCell
                              dateVal={dateVal}
                              isFirst={idx === 0}
                              isExpanded={isExpanded}
                              itemsCount={group.items.length}
                              onToggle={() => toggleDate(group.date)}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{v.systolicBp}/{v.diastolicBp}</td>
                          <td>{v.pulseRate} bpm</td>
                          <td>{v.temperatureF}°F</td>
                          <td>{v.weightKg} kg</td>
                          <td>{v.bmi}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              {onAppendNote && (
                                <button
                                  title="Copy to Follow-up"
                                  onClick={() => handleCopyToFollowup(v)}
                                  style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dcfce7', borderRadius: '6px', background: 'var(--bg-card)', cursor: 'pointer', color: '#16a34a' }}
                                >
                                  <Copy size={13} />
                                </button>
                              )}
                              <button
                                title="Edit"
                                onClick={() => onRecord(v)}
                                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-main)', borderRadius: '6px', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--pp-blue)' }}
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                title="Delete"
                                onClick={() => handleDelete(v)}
                                disabled={deletingId === v.id}
                                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca', borderRadius: '6px', background: 'var(--bg-card)', cursor: 'pointer', color: '#ef4444', opacity: deletingId === v.id ? 0.5 : 1 }}
                              >
                                {deletingId === v.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={vitals?.length || 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>

  );
}

function VitalCard({ label, value, unit, icon: Icon, color }: any) {
  return (
    <div className="mc-vital-card">
      <div className="mc-vital-label">
        <div style={{ background: `${color}15`, color: color, padding: '6px', borderRadius: '8px', display: 'flex' }}>
          <Icon size={14} />
        </div>
        <span>{label}</span>
      </div>
      <div className="mc-vital-value">
        {value} <span className="mc-vital-unit">{unit}</span>
      </div>
      <div className="mc-vital-footer">
        <TrendingUp size={12} /> Normal Range
      </div>
    </div>
  );
}

const LAB_CONFIG: Record<string, any[]> = {
  'CBC': [
    { key: 'hb', label: 'Hemoglobin (HB)', range: '13.0 to 18.0 gm%' },
    { key: 'rbc', label: 'R.B.C', range: '4.5 to 5.6 mill/c.mm' },
    { key: 'wbc', label: 'W.B.C', range: '4000 to 11000 mill/cu.mm' },
    { key: 'platelets', label: 'Platelets', range: '1.5 to 4.5 Lacs/cu.mm' },
    { key: 'neutrophils', label: 'Neutrophils', range: '40 to 75 %' },
    { key: 'lymphocytes', label: 'Lymphocytes', range: '20 to 45 %' },
    { key: 'eosinophils', label: 'Eosinophils', range: '1 to 6 %' },
    { key: 'monocytes', label: 'Monocytes', range: '2 to 10 %' },
    { key: 'basophils', label: 'Basophils', range: '0 to 1 %' },
    { key: 'esr', label: 'E.S.R', range: '0-20 mm/hr' },
    { key: 'vitaminb', label: 'Vitamin B-12', range: '200 to 900' },
    { key: 'vitamind', label: 'Vitamin D', range: '30 to 100' },
    { key: 'abnor_rbc', label: 'Abnor R.B.C', type: 'full' },
    { key: 'parasites', label: 'Parasites', type: 'full' },
  ],
  'Urine': [
    { key: 'quantity', label: 'Quantity' },
    { key: 'color', label: 'Color' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'reaction', label: 'Reaction' },
    { key: 'protein', label: 'Protein' },
    { key: 'sugar', label: 'Sugar' },
    { key: 'pus_cells', label: 'Pus Cells' },
    { key: 'rbc', label: 'Red Blood Cells' },
    { key: 'other_findings', label: 'Other Findings', type: 'full' },
  ],
  'Stool': [
    { key: 'color', label: 'Color' },
    { key: 'consistency', label: 'Consistency' },
    { key: 'mucus', label: 'Mucus' },
    { key: 'frank_blood', label: 'Frank Blood' },
    { key: 'pus_cells', label: 'Pus Cells' },
    { key: 'rbc', label: 'R.B.C' },
    { key: 'ova', label: 'Ova' },
    { key: 'cysts', label: 'Cysts' },
    { key: 'other_findings', label: 'Other Findings', type: 'full' },
  ],
  'Arthritis': [
    { key: 'anti_o', label: 'Anti Strep O L' },
    { key: 'ra_factor', label: 'RA Factor' },
    { key: 'c_react', label: 'C Reactive Protein' },
    { key: 'ana', label: 'A.N.A' },
    { key: 'accp', label: 'A.C.C.P' },
  ],
  'Endocrine': [
    { key: 't3', label: 'T3', range: '0.8 to 2.0 ng/ml' },
    { key: 't4', label: 'T4', range: '4.8 to 12.7 ug/dl' },
    { key: 'tsh', label: 'TSH', range: '0.27 to 4.2 uIU/ml' },
    { key: 'prolactin', label: 'Prolactin' },
    { key: 'testosterone', label: 'Testosterone' },
    { key: 'insulin', label: 'Insulin' },
  ],
  'Renal Profile': [
    { key: 'urea', label: 'Urea', range: '15 to 45 mg%' },
    { key: 'bun', label: 'B.U.N', range: '07 to 20 mg/dl' },
    { key: 'phosphorus', label: 'Phosphorus', range: '2.5 to 4.5 mg/dl' },
    { key: 'urea', label: 'Urea', range: '10 to 50 mg/dl' },
    { key: 'sodium', label: 'Sodium', range: '136 to 145 mmol/L' },
    { key: 'creatinine', label: 'Creatinine', range: '0.6 to 1.2 mg/dl' },
    { key: 'potassium', label: 'Potassium', range: '3.5 to 5.1 mmol/L' },
    { key: 'uric_acid', label: 'Uric Acid', range: '3.4 to 7.0 mg/dl' },
    { key: 'chloride', label: 'Chloride', range: '98 to 107 mmol/L' },
    { key: 'calcium', label: 'Calcium', range: '8.6 to 10.0 mg/dl' },
  ],
  'X-ray - CT - MRI': [
    { key: 'radiological_report', label: 'Radiological Reports', type: 'full' },
  ],
  'USG Female': [
    { key: 'uterues_size', label: 'Uterues Size' },
    { key: 'thickness', label: 'Endometrial thickness' },
    { key: 'fibroids_no', label: 'Fibroids Number' },
    { key: 'description', label: 'Description', type: 'full' },
    { key: 'ovary_size_rt', label: 'Ovary Size (RT)' },
    { key: 'ovary_size_lt', label: 'Ovary Size (LT)' },
    { key: 'ovary_volume_rt', label: 'Ovary Volume (RT)' },
    { key: 'ovary_volume_lt', label: 'Ovary Volume (LT)' },
    { key: 'follicles_rt', label: 'Ovary Follicles (RT)' },
    { key: 'follicles_lt', label: 'Ovary Follicles (LT)' },
  ],
  'USG Male': [
    { key: 'size', label: 'Prostate Size' },
    { key: 'serum_psa', label: 'Serum PSA' },
    { key: 'volume', label: 'Prostate Volume' },
    { key: 'other_findings', label: 'Other Findings', type: 'full' },
  ],
  'Immunology': [
    { key: 'igg', label: 'IgG', range: '700 to 1600 mg/dl' },
    { key: 'ige', label: 'IgE', range: '>0.0002 to 0.2 mg/dl' },
    { key: 'igm', label: 'IgM', range: '45 to 250 mg/dl' },
    { key: 'iga', label: 'IgA', range: '80 to 350 mg/dl' },
    { key: 'itg', label: 'Itg' },
  ],
  'USG Pelvis (TVS)': [
    { key: 'uterus', label: 'Uterus', type: 'full' },
    { key: 'endometrial_cavity', label: 'Endometrial Cavity', type: 'full' },
    { key: 'vaginal_canal', label: 'Vaginal Canal', type: 'full' },
    { key: 'cervix', label: 'Cervix', type: 'full' },
    { key: 'ovaries_cul_de_sac', label: 'Ovaries & Cul-de-sac', type: 'full' },
    { key: 'final_impression', label: 'Final Impression', type: 'full' },
  ],
  'Specific': [
    { key: 'Summary', label: 'Summary', type: 'full' },
    { key: 'other_findings', label: 'Other Findings', type: 'full' },
    { key: 'define_field1', label: 'Define Field 1' },
    { key: 'define_field2', label: 'Define Field 2' },
    { key: 'define_field3', label: 'Define Field 3' },
    { key: 'define_field4', label: 'Define Field 4' },
  ],
  'Liver Profile': [
    { key: 'total_bil', label: 'Total Bilirubin', range: '0.3 to 1.3 mg%' },
    { key: 'albumin', label: 'Albumin', range: '3.7 to 5.3 gm%' },
    { key: 'dir_bilirubin', label: 'Dir.Bilirubin' },
    { key: 'globulin', label: 'Globulin' },
    { key: 'ind_bilirubin', label: 'Ind.Bilirubin' },
    { key: 'sgot', label: 'S.G.O.T', range: 'upto 35 IU/L' },
    { key: 'gamma_gt', label: 'Gamma G.T' },
    { key: 'sgpt', label: 'S.G.P.T', range: 'upto 40 IU/L' },
    { key: 'total_protein', label: 'Total Proteins', range: '6.3 to 7.9 gm%' },
    { key: 'alk_phos', label: 'Alk. Phos', range: '37 to 147 IU/L' },
    { key: 'aust_antigen', label: 'Aust.Antigen' },
    { key: 'amylase', label: 'Amylase' },
  ],
  'Lipid Profile': [
    { key: 'total_cholesterol', label: 'Total Cholesterol', range: '125 to 200 mg%' },
    { key: 'hdl_ratio', label: 'Chol/HDL ratio', range: 'upto 4.5' },
    { key: 'triglycerides', label: 'Triglycerides', range: '25 to 200 mg%' },
    { key: 'ldl_hdl', label: 'LDL/HDL' },
    { key: 'hdl_cholesterol', label: 'HDL Cholesterol', range: '35 to 80 mg%' },
    { key: 'lipoprotein', label: 'Lipoprotein' },
    { key: 'ldl_cholesterol', label: 'LDL Cholesterol', range: '85 to 130 mg%' },
    { key: 'apolipoprotein_a', label: 'Apolipoprotein-A' },
    { key: 'vldl', label: 'VLDL', range: '10 to 38 mg/dl' },
    { key: 'apolipoprotein_b', label: 'Apolipoprotein-B' },
  ],
  'Diabetes Profile': [
    { key: 'blood_fasting', label: 'Blood (Fasting)', range: '70 to 100 mg%' },
    { key: 'blood_prandial', label: 'Blood (Post Prandial)', range: '80 to 130 mg%' },
    { key: 'blood_random', label: 'Blood (Random)', range: 'upto 130 mg%' },
    { key: 'urine_fasting', label: 'Urine (Fasting)' },
    { key: 'urine_prandial', label: 'Urine (Post Prandial)' },
    { key: 'urine_random', label: 'Urine (Random)' },
    { key: 'glu_test', label: 'Glu.Tol.Test' },
    { key: 'glycosylated_hb', label: 'HbA1c', range: '4.0 to 6.0 %' },
  ],
  'Cardiac Profile': [
    { key: 'homocysteine', label: 'Homocysteine', range: '< 15 umol/L' },
    { key: 'ecg', label: 'ECG' },
    { key: 'decho', label: '2DECHO' },
  ],
  'Serology': [
    { key: 'serological_report', label: 'Serological Reports', type: 'full' },
  ],
  'Semen Analysis': [
    { key: 'semen_analysis', label: 'Semen Analysis', type: 'full' },
  ]
};

function LabsView({ investigations, regid, visitId, onAppendNote, isDateFiltered }: { investigations: any[]; regid: number; visitId: number; onAppendNote?: (text: string) => void; isDateFiltered?: boolean }) {
  const [activeType, setActiveType] = useState('CBC');
  const [labData, setLabData] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingInv, setEditingInv] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isScannedPreview, setIsScannedPreview] = useState(false);
  const [previewingInv, setPreviewingInv] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { saveInvestigation, saveNote, deleteRecord } = useManageClinicalRecords();

  const getLabValue = (fieldKey: string) => {
    if (!labData) return '';
    if (labData[fieldKey] !== undefined && labData[fieldKey] !== null) {
      return String(labData[fieldKey]);
    }
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = normalize(fieldKey);
    const foundKey = Object.keys(labData).find(k => normalize(k) === target);
    return foundKey ? String(labData[foundKey]) : '';
  };

  const handleLabValueChange = (fieldKey: string, val: string) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = normalize(fieldKey);
    const foundKey = Object.keys(labData).find(k => normalize(k) === target);
    const keyToUpdate = foundKey || fieldKey;
    setLabData({
      ...labData,
      [keyToUpdate]: val
    });
  };

  const handleCopyToFollowup = (inv: any) => {
    if (!onAppendNote) return;
    const summary = Object.entries(inv.data || {})
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
      .join(', ');
    onAppendNote(`INVESTIGATION (${inv.type} - ${new Date(inv.investDate).toLocaleDateString()}): ${summary}`);
  };

  const sortedInvs = investigations ? [...investigations].sort((a, b) => new Date(b.investDate).getTime() - new Date(a.investDate).getTime()) : [];
  const totalPages = Math.ceil(sortedInvs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentInvs = sortedInvs.slice(startIndex, startIndex + pageSize);

  const { expandedDates, toggleDate, groupedData: groupedInvs } = useTableGrouping(currentInvs, 'investDate');

  const handleSave = async (copyToFollowup = false) => {
    try {
      const investDate = new Date().toISOString().split('T')[0];
      await saveInvestigation.mutateAsync({
        id: editingInv?.id,
        regid, visitId, type: activeType, data: labData, investDate
      });

      if (copyToFollowup) {
        const summary = Object.entries(labData)
          .filter(([_, v]) => v)
          .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
          .join(', ');
        await saveNote.mutateAsync({
          regid,
          visitId,
          notesType: 'Followup',
          notes: `Investigation (${activeType}): ${summary}`
        });
      }

      setSaved(true);
      setLabData({});
      setEditingInv(null);
      setShowDrawer(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (inv: any) => {
    setActiveType(inv.type || 'CBC');
    setLabData(inv.data || {});
    setEditingInv(inv);
    setShowDrawer(true);
  };

  const handleAdd = () => {
    setActiveType('CBC');
    setLabData({});
    setEditingInv(null);
    setIsScannedPreview(false);
    setShowDrawer(true);
  };

  const handleDownload = () => {
    const content = `Investigation Report: ${activeType}\nDate: ${new Date().toLocaleDateString()}\n\n` + 
      Object.entries(labData).filter(([_, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation-${activeType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post('/medical-cases/records/investigations/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process report');
      }

      if (!data.data?.parsed) {
        // AI failed, but upload succeeded
        if (data.data?.error) {
          console.warn('AI Scan Error:', data.data.error);
          const raw = String(data.data.error);
          const isQuota = /quota|limit|429|exhausted|credit balance|too low/i.test(raw);
          const reason = isQuota
            ? 'AI providers are out of quota/credits right now.'
            : `AI scan error: ${raw.slice(0, 200)}`;
          alert(`${reason}\n\nThe file was uploaded successfully. You can enter the findings manually.`);
        }
        setActiveType('Specific');
        setLabData({
          investDate: new Date().toISOString().split('T')[0],
          attachmentUrl: data.data?.attachmentUrl || '',
          summary: ''
        });
      } else {
        // AI succeeded
        const { date, type, data: parsedData, summary } = data.data.parsed;
        
        setActiveType(type || 'Specific');
        setLabData({
          ...(parsedData || {}),
          investDate: date || new Date().toISOString().split('T')[0],
          attachmentUrl: data.data.attachmentUrl,
          summary: summary || ''
        });
      }
      setEditingInv(null);
      setIsScannedPreview(true);
      setShowDrawer(true);
      
    } catch (err: any) {
      alert(err.message || 'Error scanning report');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fields = LAB_CONFIG[activeType as keyof typeof LAB_CONFIG] || [
    { key: 'findings', label: 'Findings', type: 'full' }
  ];

  return (
    <div className="mc-labs-workspace animate-fade-in">
      {/* ─── Header (matching Vitals layout) ─── */}
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Clinical Investigations</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? 'var(--pp-blue)' : '#64748b', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('compare')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: viewMode === 'compare' ? 'white' : 'transparent', boxShadow: viewMode === 'compare' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'compare' ? 'var(--pp-blue)' : '#64748b', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Compare Reports
            </button>
          </div>
          <input type="file" accept="image/*,application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-secondary" 
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }} 
            disabled={isScanning}
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} /> : <Sparkles size={16} style={{ marginRight: '6px', color: '#8b5cf6' }} />}
            {isScanning ? 'Scanning...' : 'Scan Investigation'}
          </button>
          {/* <button onClick={handleAdd} className="btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Investigation
          </button> */}
        </div>
      </div>

      {/* ─── Investigation History Table / Comparison View ─── */}
      {viewMode === 'compare' ? (
        <InvestigationComparisonView investigations={sortedInvs} />
      ) : (
        <>
          {!investigations ? (
            <TableSkeleton rows={5} cols={5} />
          ) : investigations.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No investigations recorded yet"
              description="Record lab results, radiological findings, and specialized tests to build a complete clinical picture."
              actionLabel="Record the first investigation"
              onAction={handleAdd}
            />
          ) : (
            <>
              <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #ddd6fe', marginBottom: '20px' }}>
                <div style={{ padding: '12px 16px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={15} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#5b21b6' }}>Investigation History</span>
              <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 600, marginLeft: '4px' }}>({investigations.length})</span>
            </div>
            <table className="pp-table" style={{ marginBottom: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f4f3f1' }}>
                <tr>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '130px' }}>Category</th>
                  <th>Results</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedInvs.map((group) => (
                  <React.Fragment key={group.date}>
                    {group.items.map((inv, idx) => {
                      const isExpanded = isDateFiltered || expandedDates.has(group.date);
                      if (idx > 0 && !isExpanded) return null;

                      const dateVal = inv.investDate || 0;

                      return (
                        <tr
                          key={inv.id}
                          className="hover-row"
                          style={{
                            background: idx > 0 ? '#f8fafc' : 'white',
                            borderLeft: idx > 0 ? '3px solid #e2e8f0' : 'none'
                          }}
                        >
                          <td className="appt-cell-mono">
                            <DateGroupCell
                              dateVal={dateVal}
                              isFirst={idx === 0}
                              isExpanded={isExpanded}
                              itemsCount={group.items.length}
                              onToggle={() => toggleDate(group.date)}
                            />
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{inv.type}</td>
                          <td>
                            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
                              {inv.data?.summary || inv.summary || (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No summary available</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                              {onAppendNote && (
                                <button
                                  onClick={() => handleCopyToFollowup(inv)}
                                  className="btn-ghost"
                                  style={{ color: '#16a34a', padding: '4px 8px' }}
                                  title="Copy to Follow-up"
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => setPreviewingInv(inv)}
                                className="btn-ghost"
                                style={{ color: 'var(--pp-blue)', padding: '4px 8px' }}
                                title="View Report Details"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm('Delete this investigation?')) {
                                    deleteRecord.mutateAsync({ type: 'investigations', id: inv.id });
                                  }
                                }}
                                className="btn-ghost"
                                style={{ color: '#dc2626', padding: '4px 8px' }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedInvs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </>
  )}

      {previewingInv && (
        <InvestigationPreviewModal 
          inv={previewingInv} 
          onClose={() => setPreviewingInv(null)} 
        />
      )}

      {/* ─── Investigation Form Drawer (right-side popup) ─── */}
      {showDrawer && ReactDOM.createPortal(
        <>
          <div className="mc-drawer-backdrop" onClick={() => { setShowDrawer(false); setEditingInv(null); setIsScannedPreview(false); }} />
          <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px' }}>
            <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
              <div className="mc-drawer-header-title">
                <FlaskConical size={18} /> {isScannedPreview ? 'Scan Preview' : (editingInv ? 'Edit Investigation' : 'New Investigation')}
              </div>
              <button className="mc-drawer-close" onClick={() => { setShowDrawer(false); setEditingInv(null); setIsScannedPreview(false); }} style={{ color: 'white', opacity: 0.8 }}>
                <X size={16} />
              </button>
            </header>

            <div style={{ padding: '16px 24px', background: 'var(--pp-warm-1)', borderBottom: '1px solid var(--pp-warm-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--pp-text-2)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Investigation Type</label>
                <select
                  className="pp-select"
                  value={activeType}
                  onChange={(e) => { setActiveType(e.target.value); if (!editingInv) setLabData({}); }}
                  style={{ flex: 1 }}
                >
                  {Object.keys(LAB_CONFIG).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                {fields.map(field => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...(field.type === 'full' ? { gridColumn: '1 / -1' } : {}) }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                    {field.type === 'full' ? (
                      <textarea
                        className="pp-textarea"
                        placeholder={`Enter ${field.label}...`}
                        value={getLabValue(field.key)}
                        onChange={e => handleLabValueChange(field.key, e.target.value)}
                        style={{ minHeight: '100px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          className="pp-input"
                          placeholder="0.00"
                          value={getLabValue(field.key)}
                          onChange={e => handleLabValueChange(field.key, e.target.value)}
                          style={{ flex: 1 }}
                        />
                        {field.range && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--pp-text-3)', background: 'var(--pp-warm-2)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{field.range}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <footer style={{ padding: '16px 24px', background: 'var(--pp-warm-1)', borderTop: '1px solid var(--pp-warm-3)', display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowDrawer(false); setEditingInv(null); setIsScannedPreview(false); }}>Cancel</button>
              {isScannedPreview ? (
                <>
                  <button type="button" onClick={() => handleDownload()} className="btn-secondary" style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Download size={16} /> Download
                  </button>
                  <button onClick={() => handleSave(false)} className="btn-primary" style={{ flex: 1.5, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Save size={16} /> {saved ? 'Saved!' : 'Save Report'}
                  </button>
                </>
              ) : (
                <button onClick={() => handleSave(false)} className="btn-primary" style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={16} /> {saved ? 'Saved!' : (editingInv ? 'Update Report' : 'Save Report')}
                </button>
              )}
            </footer>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}





function CommunicationView({ regid, phone, name, onAppendNote }: { regid: number; phone: string; name: string; onAppendNote?: (text: string) => void }) {
  const { data: logs = [], isLoading } = useCommunicationLogs(regid);
  const [message, setMessage] = useState('');
  const sendSms = useSendSms();

  const handleCopyToFollowup = (log: any) => {
    if (!onAppendNote) return;
    onAppendNote(`COMMUNICATION (${new Date(log.createdAt).toLocaleString()}): ${log.message}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="pp-card" style={{ padding: '24px' }}>
        <div className="mc-section-header" style={{ marginBottom: '20px' }}>Message {name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-2)', marginBottom: '6px' }}>Select Template</label>
            <select className="pp-select" onChange={e => setMessage(e.target.value)} value="">
              <option value="">Choose...</option>
              <option value="Hello, Your medicine from Homeo-X is dispatched via courier. Tracking: ">Medicine Dispatched</option>
              <option value="Reminder: Your follow-up consultation is scheduled for tomorrow. Please confirm.">Follow-up Reminder</option>
              <option value="Hello, Your lab reports are ready. You can view them on the Homeo-X app.">Lab Reports Ready</option>
              <option value="Greeting from Homeo-X. How is your health today? Any improvements?">Health Check-in</option>
            </select>
          </div>
          <textarea
            className="pp-textarea"
            style={{ height: '100px' }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message here..."
          />
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={() => sendSms.mutateAsync({ phone, message, regid })}
          >
            <Send size={16} style={{ marginRight: '8px' }} /> Send WhatsApp
          </button>
        </div>
      </div>

      <div className="mc-section-header">Communication Logs</div>
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pp-text-3)' }}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pp-text-3)', background: 'white', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>No messages sent yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map((log: any) => (
            <div key={log.id} style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.status === 'sent' ? '#10b981' : '#f59e0b' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {onAppendNote && (
                  <button
                    onClick={() => handleCopyToFollowup(log)}
                    style={{ padding: '4px', background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700 }}
                  >
                    <Copy size={12} /> Copy to Follow-up
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--pp-ink)', margin: 0, lineHeight: 1.5 }}>{log.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Utility to extract media type from path ───
const getMediaType = (urlOrPath: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' => {
  if (!urlOrPath) return 'other';
  const pathParts = urlOrPath.toLowerCase().split('?');
  const firstPart = pathParts[0] || '';
  const hashParts = firstPart.split('#');
  const path = hashParts[0] || '';
  if (/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(path)) return 'image';
  if (/\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv)$/i.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(path)) return 'audio';
  if (/\.pdf$/i.test(path)) return 'pdf';
  return 'image'; // fallback
};

function MediaView({ regid, visitId, images, isDateFiltered }: { regid: number; visitId: number; images: any[]; isDateFiltered?: boolean }) {
  const { updateImage, deleteImage, saveImage } = useManageClinicalRecords();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);

  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (selected.type.startsWith('image/') || selected.type.startsWith('video/') || selected.type.startsWith('audio/')) {
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('regid', String(regid));
    if (visitId) {
      formData.append('visitId', String(visitId));
    }
    formData.append('description', description || 'Clinical Evidence');
    formData.append('files', file);

    try {
      await saveImage.mutateAsync(formData);
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadForm(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const sortedImages = images ? [...images].sort((a, b) =>
    new Date(b.createdAt || b.created_at || 0).getTime() -
    new Date(a.createdAt || a.created_at || 0).getTime()
  ) : [];

  const currentImages = sortedImages;

  const imageOnlyList = useMemo(() => {
    return currentImages.filter(img => {
      const imagePath = img.picture || img.picturePath || img.picture_path;
      return getMediaType(imagePath || '') === 'image';
    });
  }, [currentImages]);

  const { expandedDates, toggleDate, groupedData: groupedImages } = useTableGrouping(currentImages, 'createdAt');

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const envUrl = import.meta.env['VITE_API_URL'];
    if (envUrl) {
      const baseUrl = (envUrl as string).replace('/api', '');
      return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    }

    // Fallback to relative path which should be handled by Vite proxy
    return path.startsWith('/') ? path : '/' + path;
  };

  const handleEditDescription = async (img: any) => {
    const newDesc = prompt('Edit Clinical Note/Description:', img.description || '');
    if (newDesc === null || newDesc === img.description) return;
    try {
      await updateImage.mutateAsync({ id: img.id, description: newDesc });
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      await deleteImage.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .mc-image-clickable-container {
          overflow: hidden;
          cursor: pointer;
          position: relative;
          width: 100%;
          height: 100%;
        }
        .mc-image-clickable-container img {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mc-image-clickable-container:hover img {
          transform: scale(1.05);
        }
        .mc-image-hover-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.25);
          opacity: 0;
          transition: opacity 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          backdrop-filter: blur(1px);
        }
        .mc-image-clickable-container:hover .mc-image-hover-overlay {
          opacity: 1;
        }
        
        .lightbox-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
        }
        .lightbox-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.35);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        .lightbox-btn:active {
          transform: translateY(1px);
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Camera size={20} /> Clinical Evidence
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,application/pdf"
            disabled={uploading}
          />
          <button
            className="btn-primary"
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: showUploadForm ? 'var(--pp-ink)' : 'var(--pp-blue)'
            }}
            onClick={() => setShowUploadForm(prev => !prev)}
            disabled={uploading}
          >
            {showUploadForm ? <X size={14} /> : <Plus size={14} />}
            {uploading ? 'Processing...' : (showUploadForm ? 'Hide Form' : 'Add Media')}
          </button>

          <div style={{ display: 'flex', gap: '8px', background: 'var(--pp-warm-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--pp-warm-3)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === 'grid' ? 'white' : 'transparent',
                color: viewMode === 'grid' ? 'var(--pp-blue)' : 'var(--pp-text-3)',
                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === 'table' ? 'white' : 'transparent',
                color: viewMode === 'table' ? 'var(--pp-blue)' : 'var(--pp-text-3)',
                boxShadow: viewMode === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <LayoutList size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* ─── Premium Inline Add Media Form ─── */}
      {showUploadForm && (
        <div 
          className="animate-fade-in"
          style={{ 
            background: 'white',
            borderRadius: '16px',
            border: '1px solid var(--pp-warm-3)',
            padding: '24px',
            boxShadow: 'var(--pp-shadow-sm)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div 
            style={{ 
              background: 'var(--pp-warm-1)', 
              border: '1.5px dashed var(--border-main)', 
              borderRadius: '16px', 
              padding: file ? '24px' : '48px 24px', 
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--pp-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
          >
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pp-blue)' }} />
                <div style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>Processing...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                    {file.type.startsWith('image/') && previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        style={{ 
                          maxHeight: '180px', 
                          maxWidth: '100%', 
                          borderRadius: '12px', 
                          objectFit: 'contain', 
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)' 
                        }} 
                      />
                    )}
                    {file.type.startsWith('video/') && previewUrl && (
                      <video 
                        src={previewUrl} 
                        controls 
                        style={{ 
                          maxHeight: '180px', 
                          maxWidth: '100%', 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)' 
                        }} 
                      />
                    )}
                    {file.type.startsWith('audio/') && previewUrl && (
                      <div style={{ width: '100%', maxWidth: '320px', padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>🎵 Audio Recording</div>
                        <audio src={previewUrl} controls style={{ width: '100%' }} />
                      </div>
                    )}
                    {(!previewUrl || (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/'))) && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                        <span style={{ fontSize: '2.5rem' }}>📄</span>
                        <div style={{ color: 'var(--pp-ink)', fontWeight: 700 }}>{file.name}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                        {file.name}
                      </div>
                      <div style={{ color: 'var(--pp-blue)', fontSize: '0.8rem', fontWeight: 700 }}>
                        Click to select a different file
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'var(--pp-blue)' }}>
                      <Plus size={28} />
                    </div>
                    <div>
                      <div style={{ color: 'var(--pp-ink)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                        click to select media
                      </div>
                      <div style={{ color: 'var(--pp-text-3)', fontSize: '0.85rem', fontWeight: 500 }}>
                        Images, Audio, Video or PDF (Max 10MB)
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              className="pp-input"
              placeholder="add notes"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ flex: 1, padding: '12px 16px' }}
            />
            <button
              className="btn-primary"
              onClick={handleUploadSubmit}
              disabled={!file || uploading}
              style={{ padding: '0 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', opacity: !file ? 0.6 : 1 }}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              upload
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--pp-warm-2)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>
            <span style={{ fontSize: '1.1rem' }}>💡</span>
            <span>These files will appear as clinical evidence for the patient's record.</span>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: currentImages.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          {currentImages.map(img => {
            const imagePath = img.picture || img.picturePath || img.picture_path;
            const timestamp = img.createdAt || img.created_at || img.recordedAt || img.recorded_at;
            const resolvedUrl = imagePath ? getImageUrl(imagePath) : '';
            const mediaType = getMediaType(imagePath || '');

            return (
              <div
                key={img.id}
                className="mc-image-card"
                style={{
                  borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--pp-warm-3)',
                  background: 'white', position: 'relative', boxShadow: 'var(--pp-shadow-sm)',
                  display: 'flex', flexDirection: 'column'
                }}
              >
                <div style={{
                  aspectRatio: currentImages.length === 1 ? 'auto' : '4/3',
                  maxHeight: currentImages.length === 1 ? '600px' : '300px',
                  minHeight: mediaType === 'audio' ? '180px' : 'auto',
                  position: 'relative', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%'
                }}>
                  {resolvedUrl ? (
                    <>
                      {mediaType === 'image' && (
                        <div
                          className="mc-image-clickable-container"
                          onClick={() => {
                            const index = imageOnlyList.findIndex(x => x.id === img.id);
                            if (index !== -1) setActivePreviewIndex(index);
                          }}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <img
                            src={resolvedUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            alt={img.description || 'Clinical Evidence'}
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                              el.parentElement!.innerHTML = '<div style="text-align:center;color:#999;padding:20px"><div style="font-size:2rem;margin-bottom:8px">🖼️</div><div style="font-size:0.8rem">Image missing</div></div>';
                            }}
                          />
                          <div className="mc-image-hover-overlay">
                            <Eye size={24} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                          </div>
                        </div>
                      )}
                      {mediaType === 'video' && (
                        <video
                          src={resolvedUrl}
                          controls
                          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                          onError={(e) => {
                            const el = e.target as HTMLVideoElement;
                            el.style.display = 'none';
                            el.parentElement!.innerHTML = '<div style="text-align:center;color:#999;padding:20px"><div style="font-size:2rem;margin-bottom:8px">🎥</div><div style="font-size:0.8rem">Video format unsupported</div></div>';
                          }}
                        />
                      )}
                      {mediaType === 'audio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '24px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', minHeight: '180px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#7c3aed', marginBottom: '12px' }}>
                            <FileAudio size={24} />
                          </div>
                          <audio
                             src={resolvedUrl}
                             controls
                             style={{ width: '100%', maxWidth: '240px' }}
                          />
                        </div>
                      )}
                      {mediaType === 'pdf' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '24px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', minHeight: '180px' }}>
                          <span style={{ fontSize: '3rem', marginBottom: '8px' }}>📄</span>
                          <button
                            onClick={() => window.open(resolvedUrl, '_blank')}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            View PDF Document
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--pp-text-3)', padding: '20px' }}>
                      <Camera size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.75rem' }}>Corrupt record</div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 10 }}>
                    <button
                      onClick={() => handleEditDescription(img)}
                      style={{
                        padding: '6px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.9)', color: 'white',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                      title="Edit note"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      style={{
                        padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                      title="Delete media"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '12px', borderTop: '1px solid var(--pp-warm-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pp-text-3)', fontSize: '0.75rem' }}>
                    <Clock size={12} />
                    {timestamp ? new Date(timestamp).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    }) : '—'}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pp-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {img.description || 'Clinical Evidence'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #99f6e4' }}>
          <div style={{ padding: '12px 16px', background: '#f0fdfa', borderBottom: '1px solid #99f6e4', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={15} style={{ color: '#0d9488' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f766e' }}>Clinical Evidence List</span>
            <span style={{ fontSize: '0.72rem', color: '#5eead4', fontWeight: 600, marginLeft: '4px' }}>({images.length})</span>
          </div>
          <table className="pp-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Preview</th>
                <th style={{ width: '150px' }}>Date</th>
                <th>Description / Notes</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedImages.map((group) => (
                <React.Fragment key={group.date}>
                  {group.items.map((img: any, idx: number) => {
                    const isExpanded = isDateFiltered || expandedDates.has(group.date);
                    if (idx > 0 && !isExpanded) return null;

                    const dateVal = img.createdAt || img.created_at || img.recordedAt || img.recorded_at || 0;
                    const imagePath = img.picture || img.picturePath || img.picture_path;
                    const resolvedUrl = imagePath ? getImageUrl(imagePath) : '';
                    const mediaType = getMediaType(imagePath || '');

                    return (
                      <tr
                        key={img.id}
                        className="hover-row"
                        style={{
                          background: idx > 0 ? '#f8fafc' : 'white',
                          borderLeft: idx > 0 ? '3px solid #e2e8f0' : 'none'
                        }}
                      >
                        <td style={{ width: '80px' }}>
                          <div
                            style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            onClick={() => {
                              if (mediaType === 'image') {
                                const index = imageOnlyList.findIndex(x => x.id === img.id);
                                if (index !== -1) setActivePreviewIndex(index);
                              } else if (resolvedUrl) {
                                window.open(resolvedUrl, '_blank');
                              }
                            }}
                            title={mediaType === 'image' ? 'Click to preview image' : 'View original media'}
                          >
                            {resolvedUrl ? (
                              <>
                                {mediaType === 'image' && <img src={resolvedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                {mediaType === 'video' && <Video size={20} style={{ color: 'var(--pp-blue)' }} />}
                                {mediaType === 'audio' && <FileAudio size={20} style={{ color: '#7c3aed' }} />}
                                {mediaType === 'pdf' && <span style={{ fontSize: '1.5rem' }}>📄</span>}
                              </>
                            ) : <Camera size={20} style={{ opacity: 0.3 }} />}
                          </div>
                        </td>
                        <td className="appt-cell-mono">
                          <DateGroupCell
                            dateVal={dateVal}
                            isFirst={idx === 0}
                            isExpanded={isExpanded}
                            itemsCount={isDateFiltered ? 1 : group.items.length}
                            onToggle={() => toggleDate(group.date)}
                          />
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{img.description || 'Clinical Evidence'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className="btn-ghost" style={{ color: 'var(--pp-blue)' }} onClick={() => handleEditDescription(img)} title="Edit Notes">
                              <Edit size={16} />
                            </button>
                            <button
                              className="btn-ghost"
                              style={{ color: 'var(--pp-blue)' }}
                              onClick={() => {
                                if (mediaType === 'image') {
                                  const index = imageOnlyList.findIndex(x => x.id === img.id);
                                  if (index !== -1) setActivePreviewIndex(index);
                                } else if (resolvedUrl) {
                                  window.open(resolvedUrl, '_blank');
                                }
                              }}
                              title="View Full Media"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="btn-ghost" style={{ color: 'var(--pp-danger-fg)' }} onClick={() => handleDelete(img.id)} title="Delete Media">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!images || images.length === 0) && (
        <EmptyState
          icon={Camera}
          title="No clinical media has been uploaded yet"
          description="Capture and store clinical photographs, audio/video recordings, laboratory reports, and other media evidence for this patient's medical case."
        />
      )}

      {/* Lightbox Modal */}
      {activePreviewIndex !== null && imageOnlyList[activePreviewIndex] && (
        <ImageLightbox
          images={imageOnlyList}
          activeIndex={activePreviewIndex}
          onClose={() => setActivePreviewIndex(null)}
          onNext={() => setActivePreviewIndex((activePreviewIndex + 1) % imageOnlyList.length)}
          onPrev={() => setActivePreviewIndex((activePreviewIndex - 1 + imageOnlyList.length) % imageOnlyList.length)}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  );
}

// ─── Elegant Lightbox Helper Component ───
function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNext,
  onPrev,
  getImageUrl
}: {
  images: any[];
  activeIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  getImageUrl: (path: string) => string;
}) {
  const activeImage = images[activeIndex];
  const imagePath = activeImage.picture || activeImage.picturePath || activeImage.picture_path;
  const resolvedUrl = imagePath ? getImageUrl(imagePath) : '';
  const timestamp = activeImage.createdAt || activeImage.created_at || activeImage.recordedAt || activeImage.recorded_at;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  if (!activeImage) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(9, 11, 20, 0.94)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px',
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
          width: '100%',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
            {activeImage.description || 'Clinical Evidence'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            {timestamp ? new Date(timestamp).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '—'}
            {' • '}
            Image {activeIndex + 1} of {images.length}
          </span>
        </div>
        <button
          className="lightbox-btn"
          style={{ width: '40px', height: '40px' }}
          onClick={onClose}
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          padding: '0 32px',
          boxSizing: 'border-box'
        }}
      >
        {/* Prev Arrow */}
        <div onClick={(e) => e.stopPropagation()} style={{ zIndex: 10 }}>
          {images.length > 1 && (
            <button
              className="lightbox-btn"
              onClick={onPrev}
              title="Previous (Left Arrow)"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>

        {/* The Image */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            position: 'relative',
            padding: '20px 0'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={resolvedUrl}
            style={{
              maxHeight: '75vh',
              maxWidth: '75vw',
              borderRadius: '8px',
              objectFit: 'contain',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            alt={activeImage.description || 'Clinical Evidence'}
          />
        </div>

        {/* Next Arrow */}
        <div onClick={(e) => e.stopPropagation()} style={{ zIndex: 10 }}>
          {images.length > 1 && (
            <button
              className="lightbox-btn"
              onClick={onNext}
              title="Next (Right Arrow)"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
          width: '100%',
          boxSizing: 'border-box',
          gap: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="lightbox-btn"
          style={{ width: 'auto', height: '40px', padding: '0 24px', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => window.open(resolvedUrl, '_blank')}
          title="Open original image in new tab"
        >
          <Eye size={16} /> Open Original
        </button>
        <a
          href={resolvedUrl}
          download={activeImage.description || 'clinical-evidence'}
          className="lightbox-btn"
          style={{ textDecoration: 'none', width: 'auto', height: '40px', padding: '0 24px', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          target="_blank"
          rel="noopener noreferrer"
          title="Download Image"
        >
          <Download size={16} /> Download
        </a>
      </div>
    </div>,
    document.body
  );
}

interface MedicationRow {
  medicine: string;
  frequency: string;
  days: string;
  issue: string;
}

const renderMedicationTakingSnapshot = (objectiveVal: string | null | undefined) => {
  if (!objectiveVal || objectiveVal === '—') return '—';
  try {
    const trimmed = objectiveVal.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {arr.map((item: any, idx: number) => {
            return (
              <div 
                key={idx} 
                style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', padding: '4px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb' }}>
                    <Pill size={12} />
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                    {item.medicine}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.frequency && (
                    <span style={{ 
                      background: '#eff6ff', 
                      color: '#1e40af', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      border: '1px solid #dbeafe'
                    }}>
                      {item.frequency}
                    </span>
                  )}
                  {item.days && (
                    <span style={{ 
                      background: '#f1f5f9', 
                      color: '#334155', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      border: '1px solid #e2e8f0'
                    }}>
                      {item.days} days
                    </span>
                  )}
                  {item.issue && (
                    <span style={{ 
                      background: '#f0fdf4', 
                      color: '#166534', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      border: '1px solid #dcfce7'
                    }}>
                      {item.issue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  } catch (e) {}
  return objectiveVal;
};

const renderMedicationTakingHistory = (objectiveVal: string) => {
  try {
    const trimmed = objectiveVal.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
          <span style={{ fontWeight: 800, color: 'var(--pp-text-2)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Medication Taking:</span>
          {arr.map((item: any, idx: number) => {
            const parts = [];
            if (item.frequency) parts.push(item.frequency);
            if (item.days) parts.push(`${item.days} days`);
            if (item.issue) parts.push(item.issue);
            return (
              <div key={idx} style={{ paddingLeft: '8px', borderLeft: '2px solid #cbd5e1', fontSize: '0.75rem', color: '#475569' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.medicine}</span>
                {parts.length > 0 && ` (${parts.join(' - ')})`}
              </div>
            );
          })}
        </div>
      );
    }
  } catch (e) {}
  return (
    <div>
      <span style={{ fontWeight: 800, color: 'var(--pp-text-2)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Medication Taking:</span> {objectiveVal}
    </div>
  );
};

function DiagnosisView({
  regid,
  visitId,
  medicalCase,
  soapRecords,
  onAppendNote,
  onEditRecord,
  onAddRecord,
  isDateFiltered
}: {
  regid: number;
  visitId: number;
  medicalCase: any;
  soapRecords: any[];
  onAppendNote?: (text: string) => void;
  onEditRecord?: (record: any) => void;
  onAddRecord?: () => void;
  isDateFiltered?: boolean;
}) {
  const { deleteRecord } = useManageClinicalRecords();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortedSoap = soapRecords ? [...soapRecords].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  }) : [];

  const handleCopyToFollowup = (record: any) => {
    if (!onAppendNote) return;
    const parts = [];
    if (record.assessment) parts.push(`Diagnosis: ${record.assessment}`);
    if (record.subjective) parts.push(`S: ${record.subjective}`);
    if (record.objective) {
      try {
        const trimmed = record.objective.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const medsStr = arr.map((item: any) => {
            const detailParts = [];
            if (item.frequency) detailParts.push(item.frequency);
            if (item.days) detailParts.push(`${item.days}d`);
            if (item.issue) detailParts.push(item.issue);
            return `${item.medicine}${detailParts.length > 0 ? ` (${detailParts.join('/')})` : ''}`;
          }).join(', ');
          parts.push(`Medication Taking: ${medsStr}`);
        } else {
          parts.push(`Medication Taking: ${record.objective}`);
        }
      } catch (e) {
        parts.push(`Medication Taking: ${record.objective}`);
      }
    }
    if (record.plan) parts.push(`P: ${record.plan}`);

    onAppendNote(`DIAGNOSIS (${new Date(record.createdAt).toLocaleDateString()}): ${parts.join(' | ')}`);
  };

  const totalPages = Math.ceil(sortedSoap.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentSoap = sortedSoap.slice(startIndex, startIndex + pageSize);

  const { expandedDates, toggleDate, groupedData: groupedSoap } = useTableGrouping(currentSoap, 'createdAt');

  // Logic moved to parent component handleOpenDiagnosis

  const handleDelete = async (id: number) => {
    if (confirm('Delete this clinical assessment?')) {
      try {
        await deleteRecord.mutateAsync({ type: 'soap', id });
      } catch (err) {
        console.error('Failed to delete assessment:', err);
      }
    }
  };

  return (
    <div className="mc-diagnosis-workspace animate-fade-in">
      {/* ─── Header (matching Vitals layout) ─── */}
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Clinical Assessments</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Main tab 'Add Diagnosis' button removed as requested. User uses sidebar button instead. */}
        </div>
      </div>

      {/* ─── Assessment History Table (default view) ─── */}
      {!soapRecords ? (
        <TableSkeleton rows={5} cols={5} />
      ) : soapRecords.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI Follow up recorded yet"
          description="Use the AI Follow up button in the sidebar to start recording clinical findings for this patient."
        />
      ) : (
        <>
          <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '20px' }}>
            <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} style={{ color: '#d97706' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e' }}>Clinical Assessment History</span>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600, marginLeft: '4px' }}>({soapRecords.length})</span>
            </div>
            <table className="pp-table" style={{ marginBottom: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f4f3f1' }}>
                <tr>
                  <th style={{ width: '120px' }}>Date</th>
                  <th style={{ width: '220px' }}>Diagnosis</th>
                  <th>Complaints (S)</th>
                  <th>Plan (P)</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedSoap.map((group) => (
                  <React.Fragment key={group.date}>
                    {group.items.map((record, idx) => {
                      const isExpanded = isDateFiltered || expandedDates.has(group.date);
                      if (idx > 0 && !isExpanded) return null;

                      const dateVal = record.createdAt || record.created_at || record.dateval || record.visitDate || 0;

                      return (
                        <tr
                          key={record.id}
                          className="hover-row"
                          style={{
                            background: idx > 0 ? '#f8fafc' : 'white',
                            borderLeft: idx > 0 ? '3px solid #e2e8f0' : 'none'
                          }}
                        >
                          <td className="appt-cell-mono">
                            <DateGroupCell
                              dateVal={dateVal}
                              isFirst={idx === 0}
                              isExpanded={isExpanded}
                              itemsCount={isDateFiltered ? 1 : group.items.length}
                              onToggle={() => toggleDate(group.date)}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--pp-blue)', fontSize: '0.85rem', marginBottom: '2px' }}>{record.assessment || 'No Diagnosis'}</div>
                            {record.objective && renderMedicationTakingHistory(record.objective)}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', color: 'var(--pp-ink)', lineHeight: 1.5 }}>
                              {record.subjective || '—'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-2)' }}>{record.plan || record.advice || '—'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                              {onAppendNote && (
                                <button
                                  className="btn-ghost"
                                  style={{ color: '#16a34a', padding: '4px 8px' }}
                                  title="Copy to Follow-up"
                                  onClick={() => handleCopyToFollowup(record)}
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                              <button
                                className="btn-ghost"
                                style={{ color: 'var(--pp-blue)', padding: '4px 8px' }}
                                title="Edit"
                                onClick={() => onEditRecord?.(record)}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ color: '#dc2626', padding: '4px 8px' }}
                                title="Delete"
                                onClick={() => handleDelete(record.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedSoap.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

    </div>
  );
}

