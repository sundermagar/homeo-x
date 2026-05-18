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
  ChevronLeft,
  MoveVertical,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  Copy,
  Mail,
  ShieldCheck,
  Award
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
import { usePdfSettings } from '../../settings/hooks/use-settings';
import '../styles/medical-case.css';
import { useTableGrouping } from '../hooks/use-table-grouping';
import { DateGroupCell } from '../components/date-group-cell';

// ─── Static tab config ─ defined outside component to avoid recreation on every render ───
const TABS = [
  { id: 'summary', label: 'Followup History', icon: History },
  { id: 'diagnosis', label: 'Diagnosis', icon: Sparkles },
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
  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const medicalCase = fullData?.medicalCase;
  const visitId = medicalCase?.id;
  const { data: dayCharges = [] } = useDayCharges();

  const { data: lookups } = useRemedyLookups();
  const rxWorkflow = usePrescriptionWorkflow(Number(regid), visitId, selectedDate);

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
    investigationFindings: ''
  });

  // Consolidated with previous hook call above

  const handleOpenDiagnosis = (record?: any) => {
    // Priority: 1. Passed record (from table), 2. Current visit record (from sidebar context), 3. Existing record for the visit ID
    let activeRecord = record || currentVisitSoap;
    
    if (!activeRecord && currentVisitId) {
      activeRecord = (soap || []).find((s: any) => (s.visitId === currentVisitId || s.visit_id === currentVisitId));
    }

    if (activeRecord) {
      setDiagForm({
        diagnosis: activeRecord.assessment || '',
        complaint: activeRecord.subjective || '',
        medication: activeRecord.plan || (isToday ? (medicationTakingStr !== '—' ? medicationTakingStr : '') : ''),
        investigationFindings: activeRecord.objective || ''
      });
      setEditingDiagnosisRecord(activeRecord);
    } else {
      // New record for today
      setDiagForm({
        diagnosis: '',
        complaint: '',
        medication: isToday && medicationTakingStr !== '—' ? medicationTakingStr : '',
        investigationFindings: ''
      });
      setEditingDiagnosisRecord(null);
    }
    setShowDiagnosisDrawer(true);
  };

  const handleSaveDiagnosis = async () => {
    try {
      // Last-mile check for existing records for this specific visit ID 
      // (Avoids duplicate key violations if state is out of sync)
      let finalRecordId = editingDiagnosisRecord?.id;
      if (!finalRecordId && currentVisitId) {
        const existing = (soap || []).find((s: any) => (s.visitId === currentVisitId || s.visit_id === currentVisitId));
        if (existing) finalRecordId = existing.id;
      }

      if (diagForm.diagnosis.trim()) {
        await updateDiagnosis.mutateAsync({ regid: Number(regid), condition: diagForm.diagnosis.trim() });
      }
      await saveSoap.mutateAsync({
        id: finalRecordId,
        regid: Number(regid),
        visitId: currentVisitId,
        subjective: diagForm.complaint,
        objective: diagForm.investigationFindings,
        assessment: diagForm.diagnosis,
        plan: diagForm.medication
      });

      // If it's a new diagnosis, switch view to today so it shows up immediately
      if (!editingDiagnosisRecord) {
        setSelectedDate(new Date().toISOString());
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

  const filterByDate = useCallback((items: any[], date: Date | null) => {
    if (!date || !items) return [];
    const dateStr = date.toDateString();
    return items.filter(item => {
      const itemDate = parseSafeDate(item.createdAt || item.created_at || item.dateval || item.recordedAt || item.recorded_at || item.visitDate || item.visit_date || item.date_val);
      return itemDate && itemDate.toDateString() === dateStr;
    });
  }, [parseSafeDate]);

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
    return followupNotes.find((n: any) => {
      const d1 = parseSafeDate(n.createdAt || n.created_at || n.dateval);
      return d1 && d1.toDateString() === displayDate.toDateString();
    }) || null;
  }, [followupNotes, displayDate]);

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
    return summary.bills.find(b => {
      const d = parseSafeDate(b.billDate || b.createdAt);
      return d && d.toDateString() === displayDate.toDateString();
    });
  }, [displayDate, summary?.bills]);

  const billingValues = useMemo(() => {
    // 1. Calculate additional charges for the selected displayDate
    const additional = (() => {
      if (!displayDate || !fullData?.additionalCharges) return 0;
      return fullData.additionalCharges
        .filter((ac: any) => {
          const d = ac.createdAt ? new Date(ac.createdAt) : null;
          return d && d.toDateString() === displayDate.toDateString();
        })
        .reduce((sum: number, ac: any) => sum + (Number(ac.amount) || 0), 0);
    })();

    // 2. Fetch all bills for the selected displayDate to sum received amount
    const dayBills = (() => {
      if (!displayDate || !summary?.bills) return [];
      return summary.bills.filter(b => {
        const d = parseSafeDate(b.billDate || b.createdAt);
        return d && d.toDateString() === displayDate.toDateString();
      });
    })();

    // Sum of received amount for all bills on this date
    const currentPaid = dayBills.reduce((sum: number, b: any) => sum + (Number(b.received) || 0), 0);

    // Sum of all regular bills currently saved in the database for today
    const savedRegularBillsSum = dayBills
      .filter(b => b.billType !== 'Custom' && b.billType !== 'Additional')
      .reduce((sum, b) => sum + (Number(b.charges) || 0), 0);

    const isCompleted = medicalCase?.status === 'Completed';

    // 3. Dynamic Medicine Days Charge (e.g. 600 for 3 days of medicine)
    const effectiveDaysCharge = (() => {
      if (pendingCharge > 0) return pendingCharge;
      if (!displayDate) return 0;
      
      const allRx = [...(prescriptionsHistory || []), ...(prescriptionsFromFull || [])];
      const todayRx = allRx.filter((rx: any) => {
        const d = parseSafeDate(rx.created_at || rx.dateval);
        return d && d.toDateString() === displayDate.toDateString();
      });

      if (todayRx.length === 0) return 0;
      
      const savedDays = Number(todayRx[0].days) || 0;
      if (savedDays <= 0) return 0;

      const match = dayCharges.find((dc: any) => Number(dc.days) === savedDays);
      return match ? Number(match.regularCharges) || 0 : 0;
    })();

    // 4. Registration Charge (shown as "Registration Charge" row in UI)
    // It must strictly be the base consultation/registration fee without dynamic medicine day charges.
    const regular = (() => {
      if (isCompleted) {
        // If completed, the savedRegularBillsSum already includes the finalized day charge.
        // We subtract it to show only the base consultation/registration fee in this row.
        return Math.max(0, savedRegularBillsSum - effectiveDaysCharge);
      }
      // Otherwise (active session), it is the saved bills sum (like registration fee) + doctor fee.
      const baseFee = medicalCase?.consultationFee || 0;
      return savedRegularBillsSum + baseFee;
    })();

    // 5. Total Bill Amount = Registration Charge (regular) + Medicine Days Charge + Additional Charges
    const currentTotal = regular + effectiveDaysCharge + additional;
    const currentBalance = currentTotal - currentPaid;

    return {
      regular,
      additional,
      total: currentTotal,
      received: currentPaid,
      balance: currentBalance
    };
  }, [
    summary?.bills,
    medicalCase,
    pendingCharge,
    displayDate,
    fullData?.additionalCharges,
    prescriptionsHistory,
    prescriptionsFromFull,
    dayCharges
  ]);

  // ─── Derived from fullData (safe after query completes) ───
  const fullVitals = fullData?.vitals;
  const fullSoap = fullData?.soap;
  const fullImages = fullData?.images;
  const fullInvestigations = fullData?.investigations;
  const fullVaccines = fullData?.vaccines;

  const ageString = medicalCase?.dateOfBirth ? `${new Date().getFullYear() - new Date(medicalCase.dateOfBirth).getFullYear()} Years` : 'Unknown Age';
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

  const medicationTakingStr = useMemo(() => {
    if (!displayDate || (!prescriptionsHistory && !fullData?.prescriptions)) return '—';
    
    const all = [...(prescriptionsHistory || []), ...(fullData?.prescriptions || [])];
    
    // Get unique dates sorted descending to find the previous encounter
    const uniqueDates = Array.from(new Set(all.map(p => {
      const d = parseSafeDate(p.created_at || p.createdAt || p.dateval);
      return d ? d.toDateString() : null;
    }))).filter(Boolean).map(d => new Date(d!)).sort((a, b) => b.getTime() - a.getTime());
    
    // Find index of current displayDate
    const currentIdx = uniqueDates.findIndex(d => d.toDateString() === displayDate.toDateString());
    
    // The "Medication Taking" is what was prescribed in the PRIOR visit
    const prevDate = currentIdx !== -1 && uniqueDates[currentIdx + 1] ? uniqueDates[currentIdx + 1] : null;
    
    if (!prevDate) return '—';

    const prevPrescriptions = filterByDate(all, prevDate);
    
    // Deduplicate and format
    const uniqueMeds = Array.from(new Set(prevPrescriptions.map(p => {
      const name = p.remedy_name || p.remedyName || p.medicineName || p.medicine || '';
      const potency = p.potency_name || p.potencyName || p.potency || '';
      return `${name}${potency ? ` ${potency}` : ''}`.trim();
    }))).filter(Boolean);
    
    return uniqueMeds.length > 0 ? uniqueMeds.join(', ') : '—';
  }, [displayDate, prescriptionsHistory, fullData?.prescriptions, parseSafeDate, filterByDate]);

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
            <div className="profile-avatar">
              {medicalCase.patientName?.substring(0, 2).toUpperCase()}
            </div>
            <div className="profile-name-id">
              <h1 className="profile-name">{medicalCase.patientName}</h1>
              <span className="profile-id">Patient #{regid}</span>
            </div>
            <div className={`profile-status-chip ${activePackage?.status === 'Active' ? 'active' : ''}`}>
              {activePackage?.status === 'Active' ? <Award size={12} /> : <Clock size={12} />}
              {activePackage?.packageName ? `${activePackage.packageName} (${activePackage.status})` : 'No active plan'}
            </div>
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
                      name: medicalCase.patientName || `Patient ${regid}`,
                      age: ageString.replace(' Years', ''),
                      gender: medicalCase.gender || undefined,
                      mrn: String(regid),
                      phone: medicalCase.phone || medicalCase.mobile || undefined,
                    },
                    visit: {
                      visitNumber: String(regid),
                      date: medicalCase.createdAt || new Date().toISOString(),
                      followUp: followUpEntry?.notes || undefined,
                      diagnosis: diagnosisNote || undefined,
                      complaints: medicalCase.condition || undefined,
                    },
                    medications,
                    vitals: vitalsData,
                  };

                  printPrescription(printData);
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
              <Stethoscope size={14} /> {medicalCase.doctorName || '—'}
            </div>
          </div>
          <div className="profile-info-cell">
            <label>REGISTERED</label>
            <span>{medicalCase.createdAt ? new Date(medicalCase.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</span>
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

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
                  {[
                    { label: 'Registration Charge', value: billingValues.regular, color: '#1e293b', tab: 'regular' },
                    { label: 'Additional Charge', value: billingValues.additional, color: '#64748b', tab: 'custom' },
                    { label: 'Total Bill Amount', value: billingValues.total, color: '#2563eb', bold: true, tab: 'regular' },
                    { label: 'Amount Received', value: billingValues.received, color: '#059669', tab: 'payment' },
                    { label: 'Pending Balance', value: billingValues.balance, color: '#dc2626', bold: true, noEdit: true },
                  ].map((row, idx) => (
                    <div key={idx} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 140px 40px', 
                      padding: '10px 16px', 
                      borderBottom: idx === 4 ? 'none' : '1px solid #f1f5f9',
                      alignItems: 'center',
                      background: idx % 2 === 0 ? 'transparent' : '#f8fafc'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{row.label}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: row.bold ? 800 : 700, color: row.color, textAlign: 'right', paddingRight: '20px' }}>₹{row.value}</span>
                      {row.noEdit ? (
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
                {isToday && (
                  <div 
                    onClick={() => handleOpenDiagnosis(currentVisitSoap)}
                    style={{ color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                    title="Edit Today's Assessment"
                  >
                    <Edit size={14} />
                  </div>
                )}
                {!isToday && currentVisitSoaps.length > 1 && (
                  <div 
                    onClick={() => setActiveTab('diagnosis')}
                    style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                  >
                    See all ({currentVisitSoaps.length}) <ChevronRight size={14} />
                  </div>
                )}
              </div>
              <div className="mc-side-card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{medicationTakingStr}</div>
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
                      <Sparkles size={18} /> {editingDiagnosisRecord ? 'Edit Diagnosis' : 'New Diagnosis'}
                    </div>
                    <button className="mc-drawer-close" onClick={() => setShowDiagnosisDrawer(false)} style={{ color: 'white', opacity: 0.8 }}>
                      <X size={16} />
                    </button>
                  </header>

                  <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--pp-warm-1)', borderRadius: '8px', border: '1px solid var(--pp-warm-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--pp-blue)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-ink)' }}>
                        Record Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Diagnosis</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.diagnosis}
                        onChange={e => setDiagForm({ ...diagForm, diagnosis: e.target.value })}
                        placeholder="Final clinical assessment..."
                        style={{ minHeight: '60px', fontSize: '1rem', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjective (Complaints)</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.complaint}
                        onChange={e => setDiagForm({ ...diagForm, complaint: e.target.value })}
                        placeholder="Patient symptoms & intensity..."
                        style={{ minHeight: '100px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatment Plan</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.medication}
                        onChange={e => setDiagForm({ ...diagForm, medication: e.target.value })}
                        placeholder="Medications or next steps..."
                        style={{ minHeight: '80px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objective Findings</label>
                      <textarea
                        className="pp-textarea"
                        value={diagForm.investigationFindings}
                        onChange={e => setDiagForm({ ...diagForm, investigationFindings: e.target.value })}
                        placeholder="Physical exam or lab summaries..."
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

            <PaymentReceiptModal
              isOpen={showReceiptModal}
              onClose={() => setShowReceiptModal(false)}
              patientData={medicalCase}
              billingData={{
                regularCharges: billingValues.regular,
                additionalCharges: (fullData as any).additionalCharges || [],
                totalBill: billingValues.total,
                paidAmount: billingValues.received,
                balance: billingValues.balance
              }}
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
                  <button
                    onClick={() => { setMobileDrawer(null); setShowBillingModal(true); }}
                    style={{
                      width: '100%', padding: '14px', background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)',
                      border: '1px solid #BBF7D0', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Record Payment
                  </button>
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
          onSuccess={() => { }}
        />
      )}
      {showFinalizeModal && (
        <FinalizeConsultationModal
          regid={Number(regid)}
          visitId={medicalCase.id}
          prescriptions={prescriptionsHistory || []}
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
          onClose={() => setShowBillingModal(false)}
        />
      )}
    </div>
  );
}

function MedicalCasePageSkeleton() {
  return (
    <div className="mc-detail-container animate-fade-in" style={{ padding: '24px' }}>
      {/* ─── Redesigned Header Card Skeleton ─── */}
      <div className="patient-profile-card" style={{ minHeight: '160px', opacity: 0.7 }}>
        <div className="profile-top-row">
          <div className="profile-identity">
            <div className="skeleton-box skeleton-circle" style={{ width: '56px', height: '56px' }} />
            <div className="profile-name-id">
              <div className="skeleton-box skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '8px' }} />
              <div className="skeleton-box skeleton-text" style={{ width: '100px', height: '14px' }} />
            </div>
          </div>
          <div className="profile-actions">
            <div className="skeleton-box" style={{ width: '120px', height: '40px', borderRadius: '10px' }} />
            <div className="skeleton-box" style={{ width: '100px', height: '40px', borderRadius: '10px' }} />
          </div>
        </div>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '24px',
          marginTop: '24px', 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          paddingTop: '20px' 
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton-box" style={{ width: '60px', height: '10px', opacity: 0.2, borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '100px', height: '14px', opacity: 0.4, borderRadius: '4px' }} />
            </div>
          ))}
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
  'Specific': [
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

  const { saveInvestigation, saveNote, deleteRecord } = useManageClinicalRecords();

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
    setShowDrawer(true);
  };

  const fields = LAB_CONFIG[activeType as keyof typeof LAB_CONFIG] || [
    { key: 'findings', label: 'Findings', type: 'full' }
  ];

  return (
    <div className="mc-labs-workspace animate-fade-in">
      {/* ─── Header (matching Vitals layout) ─── */}
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Clinical Investigations</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAdd} className="btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Investigation
          </button>
        </div>
      </div>

      {/* ─── Investigation History Table (default view) ─── */}
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
                              itemsCount={isDateFiltered ? 1 : group.items.length}
                              onToggle={() => toggleDate(group.date)}
                            />
                          </td>
                          <td><span className="badge-primary">{inv.type}</span></td>
                          <td>
                            <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                              {Object.entries(inv.data || {}).filter(([_, v]) => v).map(([k, v]) => (
                                <span key={k} style={{ display: 'inline-flex', gap: '4px' }}>
                                  <strong style={{ color: 'var(--pp-ink)' }}>{k.toUpperCase()}:</strong> {String(v)}
                                </span>
                              ))}
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
                                onClick={() => handleEdit(inv)}
                                className="btn-ghost"
                                style={{ color: 'var(--pp-blue)', padding: '4px 8px' }}
                                title="Edit"
                              >
                                <Edit size={14} />
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

      {/* ─── Investigation Form Drawer (right-side popup) ─── */}
      {showDrawer && ReactDOM.createPortal(
        <>
          <div className="mc-drawer-backdrop" onClick={() => { setShowDrawer(false); setEditingInv(null); }} />
          <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px' }}>
            <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
              <div className="mc-drawer-header-title">
                <FlaskConical size={18} /> {editingInv ? 'Edit Investigation' : 'New Investigation'}
              </div>
              <button className="mc-drawer-close" onClick={() => { setShowDrawer(false); setEditingInv(null); }} style={{ color: 'white', opacity: 0.8 }}>
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
                        value={labData[field.key] || ''}
                        onChange={e => setLabData({ ...labData, [field.key]: e.target.value })}
                        style={{ minHeight: '100px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          className="pp-input"
                          placeholder="0.00"
                          value={labData[field.key] || ''}
                          onChange={e => setLabData({ ...labData, [field.key]: e.target.value })}
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
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowDrawer(false); setEditingInv(null); }}>Cancel</button>
              <button onClick={() => handleSave(false)} className="btn-primary" style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Save size={16} /> {saved ? 'Saved!' : (editingInv ? 'Update Report' : 'Save Report')}
              </button>
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

function MediaView({ regid, visitId, images, isDateFiltered }: { regid: number; visitId: number; images: any[]; isDateFiltered?: boolean }) {
  const { updateImage, deleteImage } = useManageClinicalRecords();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const sortedImages = images ? [...images].sort((a, b) =>
    new Date(b.createdAt || b.created_at || 0).getTime() -
    new Date(a.createdAt || a.created_at || 0).getTime()
  ) : [];

  const currentImages = sortedImages;

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
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await deleteImage.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Camera size={20} /> Clinical Evidence
        </div>
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
                  position: 'relative', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {resolvedUrl ? (
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
                      title="Delete image"
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
                          <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {resolvedUrl ? (
                              <img src={resolvedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(resolvedUrl, '_blank')} />
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
                            <button className="btn-ghost" style={{ color: 'var(--pp-blue)' }} onClick={() => resolvedUrl && window.open(resolvedUrl, '_blank')} title="View Full Image">
                              <Eye size={16} />
                            </button>
                            <button className="btn-ghost" style={{ color: 'var(--pp-danger-fg)' }} onClick={() => handleDelete(img.id)} title="Delete Image">
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
          title="No clinical images have been uploaded yet"
          description="Capture and store clinical photographs, laboratory reports, and other visual evidence for this patient's medical case."
        />
      )}


    </div>
  );
}

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
    if (record.objective) parts.push(`O: ${record.objective}`);
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
          title="No clinical assessments recorded yet"
          description="Use the Diagnosis button in the sidebar to start recording clinical findings for this patient."
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
                            {record.objective && <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>Obj: {record.objective}</div>}
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

