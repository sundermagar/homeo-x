import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit, Save,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical, Microscope,
  Printer, Paperclip, Upload, X, Eye, Loader2, Trash2, Thermometer,
  TrendingUp, Stethoscope, Scale, Syringe, BarChart3, Pill, Check, User,
  ChevronLeft,
  MoveVertical,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAutoSave } from '@/shared/hooks/use-auto-save';
import { useFullMedicalCase, useManageClinicalRecords, useMasterVaccines } from '../hooks/use-medical-cases';
import { useDayCharges } from '../../billing/hooks/use-accounts';
import { AssignPackageModal } from '../../packages/components/assign-package-modal';
import { VitalsFormModal } from '../components/vitals-form-modal';
import { FinalizeConsultationModal } from '../components/finalize-consultation-modal';
import { FollowupScheduler } from '../components/followup-scheduler';
import { useSendSms } from '../../communications/hooks/use-communications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { RemedyChartSession } from '../components/remedy-chart-session';
import { AiRemedyView } from '../components/ai-remedy-view';
import { AiConsultantView } from '../components/ai-consultant-view';
import { usePatientBills } from '../../billing/hooks/use-billing';
import { useActivePackage } from '../../packages/hooks/use-packages';
import { BillingUpdateModal } from '../components/billing-update-modal';
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

export function AutoSaveNoteArea({ initialValue = '', onSave, placeholder = '' }: { initialValue?: string, onSave: (val: string) => Promise<void>, placeholder?: string }) {
  const [val, setVal] = useState(initialValue);
  const { status, forceSave } = useAutoSave({ value: val, onSave, delay: 1500 });

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        className="mc-legacy-textarea"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={forceSave}
      />
      {status !== 'idle' && (
        <div style={{
          position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.75rem', fontWeight: 600,
          color: status === 'saving' ? 'var(--pp-blue)' : status === 'error' ? 'var(--pp-danger-fg)' : '#10b981'
        }}>
          {status === 'saving' ? 'Saving...' : status === 'error' ? 'Failed' : 'Saved'}
        </div>
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
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [showDiagnosisInput, setShowDiagnosisInput] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [pendingCharge, setPendingCharge] = useState(0);
  const [mobileDrawer, setMobileDrawer] = useState<'followup' | 'billing' | 'contact' | 'package' | null>(null);
  const [shortcutOpen, setShortcutOpen] = useState(false);

  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation, saveNote, updateDiagnosis } = useManageClinicalRecords();
  const { data: summary } = usePatientBills(Number(regid));
  const { data: activePackage } = useActivePackage(Number(regid));
  const { data: dayCharges = [] } = useDayCharges();
  const { data: orgs = [] } = useOrganizations();
  const { data: pdfSettings = [] } = usePdfSettings();
  const user = useAuthStore(s => s.user);

  if (isLoading) {
    return <MedicalCasePageSkeleton />;
  }

  if (error || !fullData) return <div className="mc-error">Failed to load clinical records.</div>;

  const { medicalCase, vitals, soap, notes, examination, images, investigations, prescriptions, homeo, vaccines, reminders } = fullData;
  const ageString = medicalCase.dateOfBirth ? `${new Date().getFullYear() - new Date(medicalCase.dateOfBirth).getFullYear()} Yrs` : 'Unknown Age';

  const handleSaveNote = async (content: string) => {
    if (!content.trim()) return;
    try {
      await saveNote.mutateAsync({
        regid: Number(regid),
        notesType: 'Followup',
        notes: content.trim()
      });
    } catch (err) {
      console.error('Failed to save follow-up note', err);
    }
  };

  const latestRx = fullData?.prescriptions?.[0];
  const savedCharge = latestRx ?
    (dayCharges.find((dc: any) => String(dc.days) === String(latestRx.days))?.regularCharges || 0)
    : 0;

  const displayTotal = pendingCharge > 0 ? pendingCharge : (savedCharge > 0 ? savedCharge : (medicalCase.totalBill || 0));
  const paidAmount = medicalCase.paidAmount || 0;
  const balance = displayTotal - paidAmount;

  // const TABS = [
  //   { id: 'summary', label: 'Examination Report', icon: Pill },
  //   { id: 'diagnosis', label: 'Diagnosis', icon: Sparkles },
  //   { id: 'media', label: 'Media', icon: Camera },
  //   { id: 'matrix', label: 'Clinical Matrix', icon: Microscope },
  //   { id: 'homeo', label: 'Homeopathic', icon: Zap },
  //   { id: 'vitals', label: 'Vitals & Exam', icon: Stethoscope },
  //   { id: 'labs', label: 'Investigations', icon: FlaskConical },
  //   { id: 'vaccine', label: 'Vaccines', icon: Syringe },
  //   { id: 'communication', label: 'Communication', icon: MessageSquare },
  //   { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  //   { id: 'reports', label: 'Reports', icon: ClipboardList },
  // ];

  const TABS = [
    { id: 'summary', label: 'Examination Report', icon: Pill },
    { id: 'diagnosis', label: 'Diagnosis', icon: Sparkles },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'labs', label: 'Investigation Report', icon: FlaskConical },
    { id: 'vitals', label: 'Vitals', icon: Stethoscope },
    { id: 'vaccine', label: 'Vaccines', icon: Syringe },
    { id: 'homeo', label: 'Add Clinic Activity', icon: Zap },
    { id: 'analytics', label: 'Graph (H/W)', icon: BarChart3 },
  ];


  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'summary': return <RemedyChartSession regid={Number(regid)} onDayChargeChange={setPendingCharge} />;
      case 'diagnosis': return <div style={{ padding: 20 }}><DiagnosisView regid={Number(regid)} visitId={medicalCase.id} medicalCase={medicalCase} soapRecords={soap} /></div>;
      case 'media': return <div style={{ padding: 20 }}><MediaView regid={Number(regid)} visitId={medicalCase.id} images={images} /></div>;
      case 'labs': return <div style={{ padding: 20 }}><LabsView investigations={investigations} regid={Number(regid)} visitId={medicalCase.id} /></div>;
      case 'vitals': return <div style={{ padding: 20 }}><VitalsView vitals={vitals} onRecord={() => setShowVitalsModal(true)} phone={medicalCase.phone || medicalCase.mobile || ''} name={medicalCase.patientName || ''} regid={Number(regid)} clinicName={clinicName} /></div>;
      case 'communication': return <div style={{ padding: 20 }}><CommunicationView regid={Number(regid)} phone={medicalCase.phone || ''} name={medicalCase.patientName || ''} /></div>;
      case 'vaccine': return <div style={{ padding: 20 }}><VaccineView regid={Number(regid)} caseVaccines={vaccines || []} /></div>;
      case 'homeo': return <div style={{ padding: 20 }}><HomeoView regid={Number(regid)} initialData={homeo} reminders={reminders} medicalCase={medicalCase} /></div>;
      case 'analytics': return <div style={{ padding: 20 }}><AnalyticsView vitals={vitals || []} regid={Number(regid)} visitId={medicalCase.id} name={medicalCase.patientName || ''} phone={medicalCase.phone || medicalCase.mobile || ''} clinicName={clinicName} /></div>;
      case 'reports': return <div style={{ padding: 20 }}><ReportsView regid={Number(regid)} investigations={investigations || []} /></div>;
      case 'ai-assist': return <div style={{ padding: 20 }}><AiConsultantView regid={Number(regid)} /></div>;
      default: return <RemedyChartSession regid={Number(regid)} onDayChargeChange={setPendingCharge} />;
    }
  };

  return (
    <div className="mc-detail-container animate-fade-in">

      {/* ─── Clinic Branding (Letterhead Format) ─── */}
      <ClinicBrandingHeader />

      {/* ─── Redesigned Header Section ─── */}
      <div className="patient-banner">
        <div className="banner-inner">
          <div className="banner-left">
            <div className="pat-av">
              {medicalCase.patientName?.charAt(0).toUpperCase()}
            </div>

            <div className="mc-header-info">
              <span className="pat-id">PATIENT #{regid}</span>
              <h1 className="pat-name">
                {medicalCase.patientName}
              </h1>
              <div className="pat-meta">
                <span className="pat-chip"><User size={12} /> {medicalCase.gender || 'Unknown'}</span>
                <span className="pat-chip"><Clock size={12} /> {ageString}</span>
                <span className="pat-chip" style={{ background: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.35)' }}>
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>
            </div>
          </div>

          <div className="banner-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="banner-btn"
              style={{ background: '#1e3a8a', color: 'white' }}
              onClick={() => {
                // Build clinic branding from Organization entity (same as AI consultation print)
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

                // Map prescriptions from medical case data into the print format
                const medications = (prescriptions || []).map((p: any) => ({
                  name: p.remedy_name || p.remedyName || p.medicine || '—',
                  genericName: undefined,
                  dosage: p.potency_name || p.potencyName || p.potency || '—',
                  frequency: p.frequency_name || p.frequencyName || p.frequency || '—',
                  duration: p.days ? `${p.days} days` : '—',
                  route: undefined,
                  instructions: p.prescription || p.notes || undefined,
                  quantity: undefined,
                }));

                // Get follow-up note and diagnosis
                const followUpEntry = notes?.find((n: any) => n.notesType === 'Followup');
                const diagnosisNote = medicalCase.condition || soap?.find((s: any) => s.notesType === 'assessment')?.notes || '';

                // Build vitals from latest data
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
                    age: ageString.replace(' Yrs', ''),
                    gender: medicalCase.gender || undefined,
                    mrn: String(regid),
                    phone: medicalCase.phone || medicalCase.mobile || undefined,
                  },
                  visit: {
                    visitNumber: String(regid),
                    date: medicalCase.createdAt || new Date().toISOString(),
                    chiefComplaint: medicalCase.condition || undefined,
                  },
                  vitals: vitalsData,
                  diagnosis: diagnosisNote ? { assessment: diagnosisNote } : undefined,
                  medications,
                  advice: followUpEntry?.notes || undefined,
                  followUp: followUpEntry?.notes ? undefined : undefined,
                  prescriptionStrategy: 'REMEDY',
                };

                const html = generatePrescriptionHtml(printData);
                printHtml(html, { title: `Prescription - ${medicalCase.patientName || regid}` });
              }}
            >
              <Printer size={14} /> Print Prescription
            </button>
            <button className={`banner-btn ${activeTab === 'communication' ? 'bb-active' : 'bb-outline'}`} onClick={() => setActiveTab('communication')}>
              <MessageSquare size={14} /> Message
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="mc-top-tabs-container">
        <button
          className="mc-scroll-btn left"
          onClick={() => {
            const el = document.querySelector('.mc-top-tabs');
            if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="mc-top-tabs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`mc-top-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <button
          className="mc-scroll-btn right"
          onClick={() => {
            const el = document.querySelector('.mc-top-tabs');
            if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ─── Main Content & Sidebar Grid ─── */}
      <div className="mc-body-grid">
        <div className="mc-body-main">
          {renderActiveTabContent()}

          {/* Patient Details Cards (Below Tab Content) */}
          <div className="mc-details-footer-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="mc-info-card">
              <div className="mc-info-card-header">
                <div className="mc-info-card-title"><User size={16} /> Patient Details</div>
              </div>
              <div className="mc-info-card-body mc-info-card-grid-body">
                <div className="mc-info-col">
                  <div className="mc-info-row"><span>Address</span> <strong>{medicalCase.address || '—'}</strong></div>
                  <div className="mc-info-row"><span>Mobile</span> <strong>{medicalCase.mobile || '—'}</strong></div>
                  <div className="mc-info-row"><span>Email</span> <strong>{medicalCase.email || '—'}</strong></div>
                  <div className="mc-info-row"><span>Referred By</span> <strong>{medicalCase.referedBy || '—'}</strong></div>
                </div>
                <div className="mc-info-col">
                  <div className="mc-info-row"><span>Case Taken By</span> <strong>{medicalCase.doctorName || '—'}</strong></div>
                  <div className="mc-info-row"><span>Package</span> <strong>{activePackage?.packageName || 'REGULAR'}</strong></div>
                  <div className="mc-info-row"><span>Expiry</span> <strong>{activePackage?.expiryDate ? new Date(activePackage.expiryDate).toLocaleDateString() : '—'}</strong></div>
                  <div className="mc-info-row"><span>Package Status</span> <strong style={{ color: activePackage?.status === 'Active' ? 'var(--pp-blue)' : 'inherit' }}>{activePackage?.status || 'Active'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="mc-body-side">

          {/* ─── Clinical History / Follow-up Timeline ─── */}
          <div className="mc-side-card">
            <div className="mc-side-card-header">
              <div className="mc-side-card-title"><History size={16} /> Clinical History</div>
            </div>
            <div className="mc-side-card-body" style={{ padding: '16px' }}>
              {/* Input Area */}
              <div style={{  paddingBottom: '16px', borderBottom: '1px solid var(--pp-warm-2)' }}>
                <textarea
                  className="pp-textarea"
                  placeholder="Record patient follow-up or status..."
                  value={followUpNote}
                  onChange={e => setFollowUpNote(e.target.value)}
                  style={{ minHeight: '80px', fontSize: '0.8rem', background: 'var(--pp-warm-1)' }}
                />
                <button
                  className="btn-primary"
                  onClick={async () => {
                    if (!followUpNote.trim()) return;
                    await handleSaveNote(followUpNote);
                    setFollowUpNote('');
                  }}
                  disabled={saveNote.isPending}
                  style={{ width: '100%', marginTop: '12px', padding: '10px' }}
                >
                  {saveNote.isPending ? 'Saving Note...' : 'Add Follow-up Note'}
                </button>
              </div>

              {/* Timeline Area */}
              <div className="pp-custom-scrollbar" style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                {(notes || []).filter((n: any) =>
                  n.notesType === 'Followup' ||
                  n.noteType === 'Followup' ||
                  n.notes_type === 'Followup'
                ).length > 0 ? (
                  (notes || []).filter((n: any) =>
                    n.notesType === 'Followup' ||
                    n.noteType === 'Followup' ||
                    n.notes_type === 'Followup'
                  )
                    .sort((a: any, b: any) => new Date(b.dateval || 0).getTime() - new Date(a.dateval || 0).getTime())
                    .map((note: any) => (
                      <div key={note.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--pp-warm-1)', position: 'relative', paddingLeft: '16px' }}>
                        <div style={{ position: 'absolute', left: 0, top: '16px', bottom: 0, width: '2px', background: 'var(--pp-blue)', opacity: 0.3, borderRadius: '2px' }} />
                        <div style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {(note.dateval || note.createdAt || note.created_at) ? new Date(note.dateval || note.createdAt || note.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          }) : '—'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--pp-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.notes}</div>
                      </div>
                    ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ background: 'var(--pp-warm-1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <History size={20} style={{ color: 'var(--pp-text-3)', opacity: 0.5 }} />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>No clinical history found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Billing Summary ─── */}
          <div className="mc-side-card">
            <div className="mc-side-card-header">
              <div className="mc-side-card-title"><CreditCard size={16} /> Billing Summary</div>
            </div>
            <div className="mc-side-card-body">
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Total</span> <strong>₹{displayTotal}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Received</span> <strong className="text-green">₹{paidAmount}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Balance</span> <strong className="text-red">₹{balance}</strong></div>
              <div className="mc-bill-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--pp-blue)', borderTop: '1px solid var(--pp-warm-2)', paddingTop: '12px', marginTop: '8px' }}>
                <span>Outstanding</span>
                <strong>₹{balance}</strong>
              </div>
              <button className="mc-pay-btn" onClick={() => setShowBillingModal(true)} style={{ width: '100%', padding: '10px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}>Update Payment</button>
            </div>
          </div>

        </aside>
      </div>

      {/* ─── Mobile Floating Action Bar (Collapsible) ─── */}
      <div className={`mc-mobile-fab-bar ${shortcutOpen ? 'expanded' : 'collapsed'}`}>
        <button
          className="mc-fab-toggle"
          onClick={() => setShortcutOpen(!shortcutOpen)}
          title={shortcutOpen ? "Collapse shortcuts" : "Expand shortcuts"}
        >
          {shortcutOpen ? <X size={20} /> : <Zap size={20} className="animate-pulse" />}
        </button>

        <div className="mc-fab-actions">
          <button
            className={`mc-fab-btn ${mobileDrawer === 'followup' ? 'active' : ''}`}
            onClick={() => { setMobileDrawer('followup'); setShortcutOpen(false); }}
          >
            <FileText size={20} />
            <span className="mc-fab-btn-label">Notes</span>
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'billing' ? 'active' : ''}`}
            onClick={() => { setMobileDrawer('billing'); setShortcutOpen(false); }}
          >
            <CreditCard size={20} />
            <span className="mc-fab-btn-label">Billing</span>
            {balance > 0 && <span className="mc-fab-badge" />}
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'contact' ? 'active' : ''}`}
            onClick={() => { setMobileDrawer('contact'); setShortcutOpen(false); }}
          >
            <Phone size={20} />
            <span className="mc-fab-btn-label">Contact</span>
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'package' ? 'active' : ''}`}
            onClick={() => { setMobileDrawer('package'); setShortcutOpen(false); }}
          >
            <Package size={20} />
            <span className="mc-fab-btn-label">Package</span>
          </button>
        </div>
      </div>

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
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(notes || []).filter((n: any) => n.notesType === 'Followup' || n.noteType === 'Followup').length > 0 ? (
                      (notes || []).filter((n: any) => n.notesType === 'Followup' || n.noteType === 'Followup')
                        .sort((a: any, b: any) => new Date(b.dateval || 0).getTime() - new Date(a.dateval || 0).getTime())
                        .map((note: any) => (
                          <div key={note.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '4px' }}>
                              {(note.dateval || note.createdAt || note.created_at) ? new Date(note.dateval || note.createdAt || note.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              }) : '—'}
                            </div>
                            <div style={{ color: '#334155', lineHeight: 1.5 }}>{note.notes}</div>
                          </div>
                        ))
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                        No follow-up notes yet. Add one below.
                      </div>
                    )}
                  </div>
                  <textarea
                    placeholder="Add follow-up notes here..."
                    value={followUpNote}
                    onChange={e => setFollowUpNote(e.target.value)}
                    style={{
                      width: '100%', minHeight: '100px', maxHeight: '200px', padding: '12px',
                      border: '1px solid var(--pp-warm-4)', borderRadius: '10px', fontSize: '0.85rem',
                      resize: 'vertical', fontFamily: 'inherit', color: '#334155',
                      background: '#fafaf9', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!followUpNote.trim()) return;
                      await handleSaveNote(followUpNote);
                      setFollowUpNote('');
                    }}
                    style={{
                      width: '100%', padding: '12px', background: '#2563eb', color: 'white',
                      border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Save Note
                  </button>
                </>
              )}

              {mobileDrawer === 'billing' && (
                <>
                  <div className="mc-side-card" style={{ background: 'white' }}>
                    <div className="mc-side-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: '#64748b' }}>Total</span>
                        <strong>₹{displayTotal}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: '#64748b' }}>Received</span>
                        <strong className="text-green">₹{paidAmount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0' }}>
                        <span style={{ color: '#64748b' }}>Balance</span>
                        <strong className="text-red">₹{balance}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--pp-blue)', borderTop: '2px solid var(--pp-warm-2)', paddingTop: '14px', marginTop: '8px' }}>
                        <span>Outstanding</span>
                        <strong>₹{balance}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileDrawer(null); setShowBillingModal(true); }}
                    style={{
                      width: '100%', padding: '14px', background: '#F0FDF4', color: '#15803D',
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
                      <span style={{ color: '#64748b' }}>Name</span>
                      <strong>{medicalCase.patientName || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#64748b' }}>Mobile</span>
                      <strong>{medicalCase.mobile || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#64748b' }}>Email</span>
                      <strong>{medicalCase.email || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#64748b' }}>Address</span>
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
                        <span style={{ color: '#64748b' }}>Scheme</span>
                        <strong>{activePackage?.packageName || 'REGULAR'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Status</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                          background: activePackage?.status === 'Active' ? '#dcfce7' : '#fef3c7',
                          color: activePackage?.status === 'Active' ? '#166534' : '#92400e'
                        }}>
                          {activePackage?.status || 'Active'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Expiry</span>
                        <strong>{activePackage?.expiryDate ? new Date(activePackage.expiryDate).toLocaleDateString() : '—'}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileDrawer(null); setShowAssignModal(true); }}
                    style={{
                      width: '100%', padding: '14px', background: '#EEF2FF', color: '#4338CA',
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

      {showVitalsModal && <VitalsFormModal visitId={medicalCase.id} regid={Number(regid)} onClose={() => setShowVitalsModal(false)} />}
      {showAssignModal && <AssignPackageModal regid={Number(regid)} patientId={medicalCase.patientId || 0} onClose={() => setShowAssignModal(false)} onSuccess={() => { }} />}
      {showFinalizeModal && (
        <FinalizeConsultationModal
          regid={Number(regid)}
          visitId={medicalCase.id}
          prescriptions={prescriptions}
          onClose={() => setShowFinalizeModal(false)}
        />
      )}
      {showBillingModal && (
        <BillingUpdateModal
          regid={Number(regid)}
          patientName={medicalCase.patientName || ''}
          currentConsultationFee={medicalCase.consultationFee || 0}
          onClose={() => setShowBillingModal(false)}
        />
      )}
    </div>
  );
}

function MedicalCasePageSkeleton() {
  return (
    <div className="mc-detail-container animate-fade-in">
      {/* Banner Skeleton */}
      <div className="patient-banner" style={{ borderBottom: '1px solid var(--pp-warm-4)', position: 'relative', zIndex: 1 }}>
        <div className="banner-inner">
          <div className="banner-left">
            <div style={{ marginRight: '4px' }}>
              <div className="skeleton-box" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            </div>
            <div className="skeleton-box skeleton-circle pat-av" style={{ width: '56px', height: '56px', flexShrink: 0, margin: 0, border: 'none' }} />
            <div className="mc-header-info">
              <div className="skeleton-box skeleton-text" style={{ width: '80px', height: '12px', margin: 0 }} />
              {/* <div className="skeleton-box skeleton-text title" style={{ width: '240px', height: '28px', margin: '4px 0 0 0' }} /> */}
              <div className="pat-meta" style={{ marginTop: '8px' }}>
                <div className="skeleton-box" style={{ width: '70px', height: '24px', borderRadius: '12px' }} />
                <div className="skeleton-box" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
                <div className="skeleton-box" style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
              </div>
            </div>
          </div>
          <div className="banner-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '110px', height: '38px', borderRadius: '10px' }} />
            <div className="skeleton-box" style={{ width: '110px', height: '38px', borderRadius: '10px' }} />
            <div className="skeleton-box" style={{ width: '130px', height: '38px', borderRadius: '10px' }} />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mc-top-tabs-container">
        <div className="mc-top-tabs" style={{ gap: '12px', padding: '16px 32px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-box" style={{ width: '140px', height: '42px', borderRadius: '10px', flexShrink: 0 }} />
          ))}
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="mc-body-grid">
        <div className="mc-body-main">
          {/* Main Tab Content Skeleton */}
          <div className="pp-card" style={{ padding: '32px', marginBottom: '24px' }}>
            <div className="skeleton-box skeleton-text title" style={{ width: '30%', marginBottom: '32px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />)}
            </div>
            <div className="skeleton-box" style={{ width: '100%', height: '240px', borderRadius: '16px' }} />
          </div>

          {/* Footer Grid Skeleton */}
          <div className="mc-details-footer-grid">
            <div className="mc-info-card">
              <div className="mc-info-card-header">
                <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: 0, height: '18px' }} />
              </div>
              <div className="mc-info-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton-box skeleton-text" style={{ width: '100%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '90%' }} />
              </div>
            </div>
            <div className="mc-info-card">
              <div className="mc-info-card-header">
                <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: 0, height: '18px' }} />
              </div>
              <div className="mc-info-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton-box skeleton-text" style={{ width: '100%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '90%' }} />
              </div>
            </div>
          </div>
        </div>

        <aside className="mc-body-side">
          {[1, 2, 3].map(i => (
            <div key={i} className="mc-side-card" style={{ background: 'white' }}>
              <div className="mc-side-card-title">
                <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: 0, height: '18px' }} />
              </div>
              <div className="mc-side-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton-box skeleton-text" style={{ width: '100%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '90%' }} />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

/* ─── Internal Sub-Components ─── */

function VaccineView({ regid, caseVaccines }: { regid: number; caseVaccines: any[] }) {
  const { data: masterVaccines = [], isLoading } = useMasterVaccines();
  const { saveVaccine, deleteVaccine } = useManageClinicalRecords();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null); // null = add mode, object = edit mode
  const [formVaccineId, setFormVaccineId] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [givenPage, setGivenPage] = useState(1);
  const [givenPageSize, setGivenPageSize] = useState(5);

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

    if (!search) return list;
    return list.filter((v: any) => v.label?.toLowerCase().includes(search.toLowerCase()));
  }, [masterVaccines, search]);

  const totalPages = Math.ceil(flatGrouped.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVaccines = flatGrouped.slice(startIndex, startIndex + pageSize);

  // Only non-header vaccines for the dropdown
  const vaccineOptions = masterVaccines.filter((v: any) => v.parentId !== 0);

  const handleMarkDone = async (vaccineId: number) => {
    setSavingId(vaccineId);
    try {
      await saveVaccine.mutateAsync({ regid, vaccineId, notes: 'Administered' });
    } finally { setSavingId(null); }
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormVaccineId('');
    setFormNotes('');
    setDrawerOpen(true);
  };

  const handleOpenEdit = (cv: any) => {
    setEditingRecord(cv);
    setFormVaccineId(cv.vaccineId);
    setFormNotes(cv.notes || '');
    setDrawerOpen(true);
  };

  const handleDelete = async (cv: any) => {
    if (!window.confirm(`Delete vaccine record "${cv.vaccineName || 'Vaccine #' + cv.vaccineId}"?`)) return;
    setDeletingId(cv.id);
    try {
      await deleteVaccine.mutateAsync(cv.id);
    } finally { setDeletingId(null); }
  };

  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVaccineId) return;
    setSavingId(Number(formVaccineId));
    try {
      const payload: any = { regid, vaccineId: Number(formVaccineId), notes: formNotes || 'Administered' };
      if (editingRecord) payload.id = editingRecord.id;
      await saveVaccine.mutateAsync(payload);
      setFormVaccineId('');
      setFormNotes('');
      setEditingRecord(null);
      setDrawerOpen(false);
    } finally { setSavingId(null); }
  };

  if (isLoading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <div style={{ animation: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Syringe size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Immunization Record</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Track patient vaccination schedule and administered doses</p>
        </div>
        <button
          onClick={handleOpenAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.18)' }}
        >
          <Plus size={15} /> Add Vaccine
        </button>
      </div>

      {/* ── Previously Administered Vaccines ── */}
      {caseVaccines.length > 0 && (
        <div className="pp-card" style={{ padding: 0, marginBottom: '20px', border: '1px solid #bbf7d0' }}>
          <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>Previously Given Vaccines</span>
            <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, marginLeft: '4px' }}>({caseVaccines.length})</span>
          </div>
          <table className="pp-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '36px' }}>#</th>
                <th>Vaccine Name</th>
                <th style={{ width: '150px' }}>Date Given</th>
                <th>Notes</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {caseVaccines
                .slice((givenPage - 1) * givenPageSize, givenPage * givenPageSize)
                .map((cv: any, i: number) => (
                <tr key={cv.id} className="hover-row">
                  <td style={{ color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'monospace' }}>{(givenPage - 1) * givenPageSize + i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{cv.vaccineName || `Vaccine #${cv.vaccineId}`}</div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: '#16a34a' }}>
                      <Calendar size={12} />
                      {cv.createdAt ? new Date(cv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {cv.notes || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        title="Edit"
                        onClick={() => handleOpenEdit(cv)}
                        style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#3b82f6' }}
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDelete(cv)}
                        disabled={deletingId === cv.id}
                        style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#ef4444', opacity: deletingId === cv.id ? 0.5 : 1 }}
                      >
                        {deletingId === cv.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={givenPage}
            totalPages={Math.ceil(caseVaccines.length / givenPageSize)}
            pageSize={givenPageSize}
            totalItems={caseVaccines.length}
            onPageChange={setGivenPage}
            onPageSizeChange={setGivenPageSize}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '360px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search vaccine..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
        <table className="pp-table">
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
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
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
                        <Calendar size={13} style={{ color: '#3b82f6' }} />
                        <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e40af' }}>
                          {vac.label}
                        </span>
                        {vac.months !== undefined && vac.months !== 999 && (
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>(At {vac.months} Months)</span>
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
                  <td style={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    {idx + 1 + startIndex}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{vac.label}</div>
                    {vac.description && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{vac.description}</div>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={flatGrouped.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* ── Right-Side Drawer: Add Vaccine ── */}
      {drawerOpen && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          {/* Panel */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s ease-out' }}>
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{editingRecord ? 'Edit Vaccine Record' : 'Add Vaccine to Patient'}</h3>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0' }}>{editingRecord ? 'Update notes for this vaccine record' : 'Select from master immunization list'}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <form onSubmit={handleDrawerSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Vaccine Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Vaccine *</label>
                  <select
                    required
                    value={formVaccineId}
                    onChange={e => setFormVaccineId(Number(e.target.value))}
                    disabled={!!editingRecord}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', background: editingRecord ? '#f1f5f9' : '#fff', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">— Select a vaccine —</option>
                    {vaccineOptions.map((v: any) => {
                      const alreadyDone = caseVaccines.some((cv: any) => cv.vaccineId === v.id);
                      return (
                        <option key={v.id} value={v.id} disabled={alreadyDone}>
                          {v.label}{v.months !== null && v.months !== undefined ? ` (${v.months === 0 ? 'Birth' : v.months + 'mo'})` : ''}{alreadyDone ? ' ✓' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Clinical Notes</label>
                  <textarea
                    placeholder="e.g. Batch #1234, administered by Dr. X..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* Info tip */}
                <div style={{ display: 'flex', gap: '8px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <AlertCircle size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                    The vaccine will be recorded for <strong>Patient #{regid}</strong> with today's date. You can mark additional vaccines directly from the table.
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button type="button" onClick={() => setDrawerOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formVaccineId || savingId !== null}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: !formVaccineId ? 0.5 : 1, boxShadow: '0 2px 8px rgba(37,99,235,0.18)' }}
                >
                  {savingId !== null ? 'Saving...' : editingRecord ? 'Update Vaccine' : 'Save Vaccine'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AnalyticsView({ vitals, regid, visitId, name, phone, clinicName }: { vitals: any[]; regid: number; visitId: number; name: string; phone: string; clinicName: string }) {
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
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Quick Record Height/Weight</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Height</label>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', cursor: 'pointer' }} onClick={() => setHeightUnit(h => h === 'cm' ? 'in' : 'cm')}>{heightUnit.toUpperCase()}</span>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%', borderRadius: '8px', padding: '10px 16px' }} value={hVal} onChange={e => setHVal(e.target.value)} placeholder={heightUnit} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Weight</label>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', cursor: 'pointer' }} onClick={() => setWeightUnit(w => w === 'kg' ? 'lbs' : 'kg')}>{weightUnit.toUpperCase()}</span>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%', borderRadius: '8px', padding: '10px 16px' }} value={wVal} onChange={e => setWVal(e.target.value)} placeholder={weightUnit} />
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', height: '44px', borderRadius: '8px', fontWeight: 700, background: '#2563eb' }}>
            {saving ? 'Saving...' : 'Save H/W'}
          </button>
          <button className="btn-secondary" onClick={handleShare} disabled={sending} style={{ padding: '10px 20px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b' }}>
            <Send size={14} /> {sending ? 'Sending...' : 'Share Latest'}
          </button>
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
          <h4 style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginBottom: '16px' }}>Blood Pressure Trend</h4>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <RechartsTooltip />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke="var(--pp-danger-fg)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
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
        <div className="pp-card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--pp-text-3)' }}>No radiological or specialized reports found.</p>
        </div>
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

function HomeoView({ regid, initialData, reminders, medicalCase }: { regid: number; initialData?: any; reminders?: any[]; medicalCase: any }) {
  const { saveReminder, deleteReminder } = useManageClinicalRecords();

  // Reminder / Activity State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [remindDate, setRemindDate] = useState(new Date().toISOString().split('T')[0]);
  const [remindTime, setRemindTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [purpose, setPurpose] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);


  const handleSaveActivity = async () => {
    if (!remindDate || !purpose) return;
    try {
      // Combine date and time
      const dateTime = new Date(`${remindDate}T${remindTime || '00:00'}:00`);

      await saveReminder.mutateAsync({
        id: editingId,
        regid,
        reminderDate: dateTime.toISOString(),
        message: purpose,
        status: 'Pending'
      });

      setShowDrawer(false);
      resetActivityForm();
    } catch (err) { console.error(err); }
  };

  const handleEditActivity = (reminder: any) => {
    setEditingId(reminder.id);
    const date = new Date(reminder.reminderDate);
    setRemindDate(date.toISOString().split('T')[0]);
    setRemindTime(date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setPurpose(reminder.message || '');
    setShowDrawer(true);
  };

  const handleDeleteActivity = async (id: number) => {
    if (confirm('Delete this activity?')) {
      try {
        await deleteReminder.mutateAsync(id);
      } catch (err) { console.error(err); }
    }
  };

  const resetActivityForm = () => {
    setEditingId(null);
    setRemindDate(new Date().toISOString().split('T')[0]);
    setRemindTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setPurpose('');
  };

  const sortedReminders = reminders ? [...reminders].sort((a, b) =>
    new Date(b.reminderDate).getTime() - new Date(a.reminderDate).getTime()
  ) : [];

  const totalPages = Math.ceil(sortedReminders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentReminders = sortedReminders.slice(startIndex, startIndex + pageSize);

  return (
    <div className="animate-fade-in">
      {/* ─── Header Row: Title + Add Button ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Clinic Activities</div>
        <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={() => { resetActivityForm(); setShowDrawer(true); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Clinic Activity
        </button>
      </div>

      {/* ─── Table (default view) ─── */}
      {!reminders ? (
        <TableSkeleton rows={5} cols={5} />
      ) : reminders.length === 0 ? (
        <div className="pp-card" style={{ padding: '80px 48px', textAlign: 'center', background: 'white', border: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '50%', marginBottom: '20px' }}>
            <History size={48} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ color: '#1e293b', fontWeight: 700, fontSize: '1.25rem', marginBottom: '8px' }}>No clinic activities recorded yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>
            Keep track of patient follow-ups, clinical attributes, and scheduled activities. Click the button above to add your first activity.
          </p>
        </div>
      ) : (
        <>
          <div className="pp-card pp-table-scroll" style={{ padding: 0, marginBottom: '20px', border: '1px solid #c7d2fe' }}>
            <div style={{ padding: '12px 16px', background: '#eef2ff', borderBottom: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={15} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3730a3' }}>Activity History</span>
              <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600, marginLeft: '4px' }}>({reminders.length})</span>
            </div>
            <table className="pp-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Scheduled For</th>
                  <th>Purpose / Message</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReminders.map((rem) => (
                  <tr key={rem.id} className="hover-row">
                    <td className="appt-cell-mono">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700 }}>{new Date(rem.reminderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{new Date(rem.reminderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{rem.message}</td>
                    <td>
                      <span className={`mc-badge-solid-${rem.status === 'Done' ? 'green' : 'blue'}`} style={{ fontSize: '0.7rem' }}>
                        {rem.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <button className="btn-ghost" style={{ color: 'var(--pp-blue)', padding: '4px' }} onClick={() => handleEditActivity(rem)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn-ghost" style={{ color: '#dc2626', padding: '4px' }} onClick={() => handleDeleteActivity(rem.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={sortedReminders.length} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}

      {/* ─── Drawer: Add/Edit Activity ─── */}
      {showDrawer && ReactDOM.createPortal(
        <>
          <div className="mc-drawer-backdrop" onClick={() => setShowDrawer(false)} />
          <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '480px' }}>
            <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
              <div className="mc-drawer-header-title">
                <Zap size={18} /> {editingId ? 'Edit Activity' : 'Add Clinic Activity'}
              </div>
              <button className="mc-drawer-close" onClick={() => setShowDrawer(false)} style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </header>

            <div className="mc-drawer-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

              {/* Patient Info (Read-only) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Id</label>
                  <div className="pp-input" style={{ background: 'var(--pp-warm-1)', color: 'var(--pp-text-3)', fontWeight: 600 }}>{regid}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Name</label>
                  <div className="pp-input" style={{ background: 'var(--pp-warm-1)', color: 'var(--pp-text-3)', fontWeight: 600 }}>{medicalCase.patientName}</div>
                </div>
              </div>

              {/* Remind On */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remind On</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="pp-input"
                      style={{ width: '100%', paddingRight: '40px' }}
                      value={remindDate}
                      onChange={e => setRemindDate(e.target.value)}
                    />
                    <Calendar size={16} style={{ position: 'absolute', right: '12px', color: 'var(--pp-text-3)' }} />
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="time"
                      className="pp-input"
                      style={{ width: '100%', paddingRight: '40px' }}
                      value={remindTime}
                      onChange={e => setRemindTime(e.target.value)}
                    />
                    <Clock size={16} style={{ position: 'absolute', right: '12px', color: 'var(--pp-text-3)' }} />
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purpose / Message</label>
                <textarea
                  className="pp-textarea"
                  style={{ minHeight: '100px' }}
                  placeholder="Enter purpose or message for this activity..."
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                />
              </div>
            </div>

            <footer className="mc-drawer-footer" style={{ padding: '16px 24px', background: 'var(--pp-warm-1)', borderTop: '1px solid var(--pp-warm-3)', display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowDrawer(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleSaveActivity}
                disabled={saveReminder.isPending}
              >
                {saveReminder.isPending ? 'Submitting...' : (editingId ? 'Update Activity' : 'Save Activity')}
              </button>
            </footer>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


function VitalsView({ vitals, onRecord, phone, name, regid, clinicName }: { vitals: any[]; onRecord: () => void; phone: string; name: string; regid: number; clinicName: string }) {
  const latest = vitals && vitals.length > 0 ? vitals[0] : null;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sendSms = useSendSms();
  const [sending, setSending] = useState(false);

  if (!vitals) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  const totalPages = Math.ceil((vitals?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVitals = vitals?.slice(startIndex, startIndex + pageSize) || [];

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

      <div style={{ marginTop: '32px' }}>
        <div className="pp-card pp-table-scroll" style={{ padding: 0, borderRadius: '12px', border: '1px solid #bfdbfe' }}>
          <div style={{ padding: '12px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={15} style={{ color: '#3b82f6' }} />
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
              </tr>
            </thead>
            <tbody>
              {currentVitals.map(v => (
                <tr key={v.id} className="hover-row">
                  <td>{new Date(v.recordedAt).toLocaleDateString('en-GB')}</td>
                  <td style={{ fontWeight: 600 }}>{v.systolicBp}/{v.diastolicBp}</td>
                  <td>{v.pulseRate} bpm</td>
                  <td>{v.temperatureF}°F</td>
                  <td>{v.weightKg} kg</td>
                  <td>{v.bmi}</td>
                </tr>
              ))}
              {vitals?.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--pp-text-3)' }}>No vitals recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={vitals?.length || 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
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

function LabsView({ investigations, regid, visitId }: { investigations: any[]; regid: number; visitId: number }) {
  const [activeType, setActiveType] = useState('CBC');
  const [labData, setLabData] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingInv, setEditingInv] = useState<any>(null);

  const { saveInvestigation, saveNote, deleteRecord } = useManageClinicalRecords();

  const sortedInvs = investigations ? [...investigations].sort((a, b) => new Date(b.investDate).getTime() - new Date(a.investDate).getTime()) : [];
  const totalPages = Math.ceil(sortedInvs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentInvs = sortedInvs.slice(startIndex, startIndex + pageSize);

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
        <div className="pp-card" style={{ padding: '80px 48px', textAlign: 'center', background: 'white', border: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '50%', marginBottom: '20px' }}>
            <FlaskConical size={48} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ color: '#1e293b', fontWeight: 700, fontSize: '1.25rem', marginBottom: '8px' }}>No investigations recorded yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>
            Record lab results, radiological findings, and specialized tests to build a complete clinical picture.
          </p>
          <button className="pp-link" style={{ marginTop: '16px', fontWeight: 700 }} onClick={handleAdd}>Record the first investigation</button>
        </div>
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
                {currentInvs.map(inv => (
                  <tr key={inv.id} className="hover-row">
                    <td>{new Date(inv.investDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
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
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedInvs.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
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





function CommunicationView({ regid, phone, name }: { regid: number; phone: string; name: string }) {
  const [message, setMessage] = useState('');
  const sendSms = useSendSms();
  return (
    <div className="pp-card" style={{ padding: '24px' }}>
      <div className="mc-section-header" style={{ marginBottom: '20px' }}>Communication with {name}</div>
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
  );
}

function MediaView({ regid, visitId, images }: { regid: number; visitId: number; images: any[] }) {
  const { saveImage, updateImage, deleteImage } = useManageClinicalRecords();
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const sortedImages = images ? [...images].sort((a, b) =>
    new Date(b.createdAt || b.created_at || 0).getTime() -
    new Date(a.createdAt || a.created_at || 0).getTime()
  ) : [];

  const totalPages = Math.ceil(sortedImages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentImages = sortedImages.slice(startIndex, startIndex + pageSize);

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

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('files', file as Blob);
      formData.append('regid', String(regid));
      formData.append('visitId', String(visitId));
      formData.append('description', 'Clinical Evidence');
      await saveImage.mutateAsync(formData);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
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

      <div
        style={{
          border: '2px dashed var(--pp-warm-4)', borderRadius: '16px', padding: '30px', textAlign: 'center',
          background: 'white', position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
          marginBottom: '24px', boxShadow: 'var(--pp-shadow-sm)'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--pp-blue)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--pp-warm-4)'}
      >
        <input
          type="file"
          onChange={onFileUpload}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          disabled={uploading}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pp-blue)' }} />
            <div style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>Uploading...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--pp-warm-1)', padding: '10px', borderRadius: '50%' }}>
              <Upload size={20} style={{ color: 'var(--pp-blue)' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: 'var(--pp-text-2)', fontSize: '0.95rem' }}>Upload Clinical Images</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>JPG, PNG, WEBP up to 5MB</div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
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
                <div style={{ aspectRatio: '4/3', position: 'relative', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              {currentImages.map(img => {
                const imagePath = img.picture || img.picturePath || img.picture_path;
                const timestamp = img.createdAt || img.created_at || img.recordedAt || img.recorded_at;
                const resolvedUrl = imagePath ? getImageUrl(imagePath) : '';
                return (
                  <tr key={img.id} className="hover-row">
                    <td>
                      <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'var(--pp-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {resolvedUrl ? (
                          <img src={resolvedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(resolvedUrl, '_blank')} />
                        ) : <Camera size={20} style={{ opacity: 0.3 }} />}
                      </div>
                    </td>
                    <td className="appt-cell-mono">
                      {timestamp ? new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
            </tbody>
          </table>
        </div>
      )}

      {(!images || images.length === 0) && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pp-text-3)', background: 'white', borderRadius: '16px', border: '1px dashed var(--pp-warm-4)' }}>
          <div style={{ marginBottom: '12px' }}><Camera size={32} style={{ opacity: 0.3 }} /></div>
          No clinical images have been uploaded yet.
        </div>
      )}

      {sortedImages.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedImages.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}

function DiagnosisView({ regid, visitId, medicalCase, soapRecords }: { regid: number; visitId: number; medicalCase: any; soapRecords: any[] }) {
  const { updateDiagnosis, saveSoap, deleteRecord } = useManageClinicalRecords();
  const [diagnosis, setDiagnosis] = useState(medicalCase?.condition || '');
  const [complaint, setComplaint] = useState('');
  const [medication, setMedication] = useState('');
  const [investigationFindings, setInvestigationFindings] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const sortedSoap = soapRecords ? [...soapRecords].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  }) : [];

  const totalPages = Math.ceil(sortedSoap.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentSoap = sortedSoap.slice(startIndex, startIndex + pageSize);

  const handleUpdate = async () => {
    try {
      if (diagnosis.trim()) {
        await updateDiagnosis.mutateAsync({ regid, condition: diagnosis.trim() });
      }
      if (complaint || medication || investigationFindings || diagnosis) {
        await saveSoap.mutateAsync({
          regid,
          visitId,
          subjective: complaint,
          objective: investigationFindings,
          assessment: diagnosis,
          plan: medication
        });
      }
      setShowDrawer(false);
      setEditingRecord(null);
      setComplaint('');
      setMedication('');
      setInvestigationFindings('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (record: any) => {
    setDiagnosis(record.assessment || '');
    setComplaint(record.subjective || '');
    setMedication(record.plan || '');
    setInvestigationFindings(record.objective || '');
    setEditingRecord(record);
    setShowDrawer(true);
  };

  const handleAdd = () => {
    setDiagnosis(medicalCase?.condition || '');
    setComplaint('');
    setMedication('');
    setInvestigationFindings('');
    setEditingRecord(null);
    setShowDrawer(true);
  };

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
          <button onClick={handleAdd} className="btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Diagnosis
          </button>
        </div>
      </div>

      {/* ─── Assessment History Table (default view) ─── */}
      {!soapRecords ? (
        <TableSkeleton rows={5} cols={5} />
      ) : soapRecords.length === 0 ? (
        <div className="pp-card" style={{ padding: '80px 48px', textAlign: 'center', background: 'white', border: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '50%', marginBottom: '20px' }}>
            <Sparkles size={48} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ color: '#1e293b', fontWeight: 700, fontSize: '1.25rem', marginBottom: '8px' }}>No clinical assessments recorded yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>
            Start recording clinical findings, symptoms, and treatment plans for this patient to track their progress.
          </p>
          <button className="pp-link" style={{ marginTop: '16px', fontWeight: 700 }} onClick={handleAdd}>Create the first diagnosis</button>
        </div>
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
                {currentSoap.map((record) => (
                  <tr key={record.id} className="hover-row">
                    <td className="appt-cell-mono">
                      {(record.createdAt || record.created_at || record.dateval || record.date_val)
                        ? new Date(record.createdAt || record.created_at || record.dateval || record.date_val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
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
                      <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-2)' }}>{record.plan || '—'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <button
                          className="btn-ghost"
                          style={{ color: 'var(--pp-blue)', padding: '4px 8px' }}
                          title="Edit"
                          onClick={() => handleEdit(record)}
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
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedSoap.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}

      {/* ─── Diagnosis Form Drawer (right-side popup) ─── */}
      {showDrawer && ReactDOM.createPortal(
        <>
          <div className="mc-drawer-backdrop" onClick={() => { setShowDrawer(false); setEditingRecord(null); }} />
          <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px' }}>
            <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
              <div className="mc-drawer-header-title">
                <Sparkles size={18} /> {editingRecord ? 'Edit Assessment' : 'New Assessment'}
              </div>
              <button className="mc-drawer-close" onClick={() => { setShowDrawer(false); setEditingRecord(null); }} style={{ color: 'white', opacity: 0.8 }}>
                <X size={16} />
              </button>
            </header>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Diagnosis</label>
                <textarea
                  className="pp-textarea"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Final clinical assessment..."
                  style={{ minHeight: '60px', fontSize: '1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjective (Complaints)</label>
                <textarea
                  className="pp-textarea"
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  placeholder="Patient symptoms & intensity..."
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatment Plan</label>
                <textarea
                  className="pp-textarea"
                  value={medication}
                  onChange={e => setMedication(e.target.value)}
                  placeholder="Medications or next steps..."
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objective Findings</label>
                <textarea
                  className="pp-textarea"
                  value={investigationFindings}
                  onChange={e => setInvestigationFindings(e.target.value)}
                  placeholder="Physical exam or lab summaries..."
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>

            <footer style={{ padding: '16px 24px', background: 'var(--pp-warm-1)', borderTop: '1px solid var(--pp-warm-3)', display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowDrawer(false); setEditingRecord(null); }}>Cancel</button>
              <button
                onClick={handleUpdate}
                className="btn-primary"
                style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={updateDiagnosis.isPending}
              >
                {updateDiagnosis.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Save size={16} />
                } {editingRecord ? 'Update Assessment' : 'Save Assessment'}
              </button>
            </footer>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

