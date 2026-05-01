import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit, Save,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical,
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
          color: status === 'saving' ? '#3b82f6' : status === 'error' ? '#ef4444' : '#10b981'
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

  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation, saveNote, updateDiagnosis } = useManageClinicalRecords();
  const { data: summary } = usePatientBills(Number(regid));
  const { data: activePackage } = useActivePackage(Number(regid));
  const { data: dayCharges = [] } = useDayCharges();

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

  const TABS = [
    { id: 'summary', label: 'Examination Report', icon: Pill },
    { id: 'diagnosis', label: 'Diagnosis', icon: Sparkles },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'labs', label: 'Investigation Report', icon: FlaskConical },
    { id: 'vitals', label: 'Vitals', icon: Stethoscope },
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
      case 'homeo': return <div style={{ padding: 20 }}><HomeoView regid={Number(regid)} initialData={homeo} /></div>;
      case 'analytics': return <div style={{ padding: 20 }}><AnalyticsView vitals={vitals || []} regid={Number(regid)} visitId={medicalCase.id} name={medicalCase.patientName || ''} phone={medicalCase.phone || medicalCase.mobile || ''} clinicName={clinicName} /></div>;
      case 'reports': return <div style={{ padding: 20 }}><ReportsView regid={Number(regid)} investigations={investigations || []} /></div>;
      case 'ai-assist': return <div style={{ padding: 20 }}><AiConsultantView regid={Number(regid)} /></div>;
      default: return <RemedyChartSession regid={Number(regid)} onDayChargeChange={setPendingCharge} />;
    }
  };

  return (
    <div className="mc-detail-container animate-fade-in">

      {/* ─── Redesigned Header Section ─── */}
      <div className="patient-banner">
        <div className="banner-inner">
          <div className="banner-left">
            <div style={{ marginRight: '4px' }}>
              <button
                className="back-btn"
                onClick={() => navigate('/dashboard/doctor')}
                title="Go back"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

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
              onClick={() => window.open(`http://localhost:5174/consultation/${regid}`, '_blank')}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <BrainCircuit size={16} /> AI Assist
            </button>
            <button className={`banner-btn ${activeTab === 'communication' ? 'bb-active' : 'bb-outline'}`} onClick={() => setActiveTab('communication')}>
              <MessageSquare size={14} /> Message
            </button>
            <button className={`banner-btn ${activeTab === 'reports' ? 'bb-active' : 'bb-outline'}`} onClick={() => setActiveTab('reports')}>
              <ClipboardList size={14} /> Downloads
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
          <div className="mc-details-footer-grid">
            <div className="mc-info-card">
              <div className="mc-info-card-header">
                <div className="mc-info-card-title"><User size={16} /> Patient Contact</div>
                <button className="mc-link-btn" style={{ fontSize: '0.8rem', color: 'var(--pp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
              </div>
              <div className="mc-info-card-body">
                <div className="mc-info-row"><span>Address</span> <strong>{medicalCase.address || '—'}</strong></div>
                <div className="mc-info-row"><span>Mobile</span> <strong>{medicalCase.mobile || '—'}</strong></div>
                <div className="mc-info-row"><span>Email</span> <strong>{medicalCase.email || '—'}</strong></div>
              </div>
            </div>

            <div className="mc-info-card">
              <div className="mc-info-card-header">
                <div className="mc-info-card-title"><Package size={16} /> Package Info</div>
                <span className="mc-badge-solid-green">Active</span>
              </div>
              <div className="mc-info-card-body">
                <div className="mc-info-row"><span>Scheme</span> <strong>{activePackage?.packageName || 'REGULAR'}</strong></div>
                <div className="mc-info-row"><span>Expiry</span> <strong>{activePackage?.expiryDate ? new Date(activePackage.expiryDate).toLocaleDateString() : '—'}</strong></div>
                <div className="mc-info-row"><span>Status</span> <strong>{activePackage?.status || 'Active'}</strong></div>
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
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--pp-warm-2)' }}>
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
                          {note.dateval ? new Date(note.dateval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
              <button className="mc-link-btn" onClick={() => setShowBillingModal(true)} style={{ fontSize: '0.8rem', color: 'var(--pp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
            </div>
            <div className="mc-side-card-body">
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Total</span> <strong>₹{displayTotal}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Received</span> <strong className="text-green">₹{paidAmount}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Balance</span> <strong className="text-red">₹{balance}</strong></div>
              <div className="mc-bill-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--pp-blue)', borderTop: '1px solid var(--pp-warm-2)', paddingTop: '12px', marginTop: '8px' }}>
                <span>Outstanding</span>
                <strong>₹{balance}</strong>
              </div>
              <button className="mc-pay-btn" onClick={() => setShowBillingModal(true)} style={{ width: '100%', padding: '10px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}>Record Payment</button>
            </div>
          </div>

        </aside>

        {/* ─── Mobile Floating Action Bar ─── */}
        <div className="mc-mobile-fab-bar">
          <button
            className={`mc-fab-btn ${mobileDrawer === 'followup' ? 'active' : ''}`}
            onClick={() => setMobileDrawer(mobileDrawer === 'followup' ? null : 'followup')}
          >
            <FileText size={20} />
            <span className="mc-fab-btn-label">Notes</span>
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'billing' ? 'active' : ''}`}
            onClick={() => setMobileDrawer(mobileDrawer === 'billing' ? null : 'billing')}
          >
            <CreditCard size={20} />
            <span className="mc-fab-btn-label">Billing</span>
            {balance > 0 && <span className="mc-fab-badge" />}
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'contact' ? 'active' : ''}`}
            onClick={() => setMobileDrawer(mobileDrawer === 'contact' ? null : 'contact')}
          >
            <Phone size={20} />
            <span className="mc-fab-btn-label">Contact</span>
          </button>
          <button
            className={`mc-fab-btn ${mobileDrawer === 'package' ? 'active' : ''}`}
            onClick={() => setMobileDrawer(mobileDrawer === 'package' ? null : 'package')}
          >
            <Package size={20} />
            <span className="mc-fab-btn-label">Package</span>
          </button>
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
                              {note.dateval ? new Date(note.dateval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
      </div>
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
  const { data: masterVaccines, isLoading } = useMasterVaccines();
  const { saveVaccine } = useManageClinicalRecords();
  const [savingId, setSavingId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleMarkDone = async (vaccineId: number) => {
    setSavingId(vaccineId);
    try {
      await saveVaccine.mutateAsync({ regid, vaccineId, notes: 'Done' });
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={5} cols={4} />;
  }
  const totalPages = Math.ceil((masterVaccines?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVaccines = masterVaccines?.slice(startIndex, startIndex + pageSize) || [];

  return (
    <div className="mc-view-placeholder" style={{ animation: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Immunization Record</div>
      </div>

      <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
        <table className="pp-table">
          <thead>
            <tr>
              <th>Vaccine Name</th>
              <th>Recommended Age</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentVaccines.map(vaccine => {
              const isDone = caseVaccines.some(cv => cv.vaccineId === vaccine.id);
              const doneRecord = caseVaccines.find(cv => cv.vaccineId === vaccine.id);

              return (
                <tr key={vaccine.id} className="hover-row">
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{vaccine.label}</div>
                    {isDone && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--pp-success-fg)', marginTop: '2px' }}>
                        Recorded: {new Date(doneRecord.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--pp-text-3)', fontSize: '0.8rem' }}>
                    {vaccine.months ? `${vaccine.months} months` : '—'}
                  </td>
                  <td>
                    {isDone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pp-success-fg)', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Check size={14} /> Administered
                      </span>
                    ) : (
                      <span style={{ color: 'var(--pp-text-3)', fontSize: '0.8rem' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {!isDone && (
                      <button
                        className="mc-legacy-mini-btn"
                        style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        onClick={() => handleMarkDone(vaccine.id)}
                        disabled={savingId === vaccine.id}
                      >
                        {savingId === vaccine.id ? '...' : 'Mark Done'}
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
        totalItems={masterVaccines?.length || 0}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
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

  if (!vitals || vitals.length === 0) {
    return (
      <div className="pp-card" style={{ padding: '24px' }}>
        <div className="mc-section-header" style={{ marginBottom: '20px' }}>Growth & Clinical Analytics</div>
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pp-warm-1)', borderRadius: 'var(--pp-radius-card)', border: '1px dashed var(--pp-warm-4)' }}>
          <span style={{ color: 'var(--pp-text-3)' }}>No vital records available to plot.</span>
        </div>
      </div>
    );
  }

  const chartData = [...vitals].reverse().map(v => ({
    date: new Date(v.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    weight: v.weightKg,
    height: v.heightCm,
    systolic: v.systolicBp,
    diastolic: v.diastolicBp,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="pp-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--pp-blue)', marginBottom: '16px', textTransform: 'uppercase' }}>Quick Record Height/Weight</div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Height</label>
              <button onClick={() => setHeightUnit(h => h === 'cm' ? 'in' : 'cm')} style={{ fontSize: '0.6rem', border: 'none', background: 'none', color: 'var(--pp-blue)', cursor: 'pointer', fontWeight: 800 }}>{heightUnit.toUpperCase()}</button>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%' }} value={hVal} onChange={e => setHVal(e.target.value)} placeholder={heightUnit} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Weight</label>
              <button onClick={() => setWeightUnit(w => w === 'kg' ? 'lbs' : 'kg')} style={{ fontSize: '0.6rem', border: 'none', background: 'none', color: 'var(--pp-blue)', cursor: 'pointer', fontWeight: 800 }}>{weightUnit.toUpperCase()}</button>
            </div>
            <input type="number" className="pp-input" style={{ width: '100%' }} value={wVal} onChange={e => setWVal(e.target.value)} placeholder={weightUnit} />
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', height: '42px' }}>
            {saving ? '...' : 'Save H/W'}
          </button>
          <button className="btn-secondary" onClick={handleShare} disabled={sending} style={{ padding: '10px 20px', height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={14} /> {sending ? '...' : 'Share Latest'}
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
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
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

function HomeoView({ regid, initialData }: { regid: number; initialData?: any }) {
  const [thermal, setThermal] = useState(initialData?.thermal || '');
  const [constitutional, setConstitutional] = useState(initialData?.constitutional || '');
  const [miasm, setMiasm] = useState(initialData?.miasm || '');
  const [saved, setSaved] = useState(false);
  const { saveHomeoDetails } = useManageClinicalRecords();

  useEffect(() => {
    if (initialData) {
      setThermal(initialData.thermal || '');
      setConstitutional(initialData.constitutional || '');
      setMiasm(initialData.miasm || '');
    }
  }, [initialData]);

  const handleSave = async () => {
    try {
      await saveHomeoDetails.mutateAsync({ regid, thermal, constitutional, miasm });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="pp-card animate-fade-in" style={{ padding: '24px' }}>
      <div className="mc-section-header" style={{ marginBottom: '24px' }}>Clinical Activity Details</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Thermal State</label>
          <select className="pp-select" value={thermal} onChange={e => setThermal(e.target.value)}>
            <option value="">Select Thermal...</option>
            <option value="Hot">Hot</option>
            <option value="Chilly">Chilly</option>
            <option value="Ambithermal">Ambithermal</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Miasm</label>
          <select className="pp-select" value={miasm} onChange={e => setMiasm(e.target.value)}>
            <option value="">Select Miasm...</option>
            <option value="Psoric">Psoric</option>
            <option value="Syphilitic">Syphilitic</option>
            <option value="Sycotic">Sycotic</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Constitutional Assessment</label>
          <textarea className="pp-textarea" style={{ height: '100px' }} value={constitutional} onChange={e => setConstitutional(e.target.value)} placeholder="Describe physical and mental constitution..." />
        </div>
      </div>

      <button 
        className="btn-primary" 
        style={{ marginTop: '24px', width: '100%', padding: '12px' }}
        onClick={handleSave}
      >
        {saveHomeoDetails.isPending ? 'Saving...' : (saved ? 'Changes Saved!' : 'Update Activity Details')}
      </button>
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
        <VitalCard label="Height" value={latest ? latest.heightCm : '-'} unit="cm" icon={MoveVertical} color="#0ea5e9" />
        <VitalCard label="Body Weight" value={latest ? latest.weightKg : '-'} unit="kg" icon={Scale} color="#3b82f6" />
        <VitalCard label="BMI Index" value={latest ? latest.bmi : '-'} unit="" icon={Sparkles} color="#8b5cf6" />
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolicBp}/${latest.diastolicBp}` : '-'} unit="mmHg" icon={Activity} color="#ef4444" />
        <VitalCard label="Heart Rate" value={latest ? latest.pulseRate : '-'} unit="bpm" icon={History} color="#ec4899" />
        <VitalCard label="Temperature" value={latest ? latest.temperatureF : '-'} unit="°F" icon={Thermometer} color="#f59e0b" />
      </div>

      <div style={{ marginTop: '32px' }}>
        <div className="mc-section-header">Recent History</div>
        <div className="pp-card pp-table-scroll" style={{ marginTop: '16px', padding: 0, borderRadius: '12px' }}>
          <table className="pp-table">
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

  const { saveInvestigation, saveNote, deleteRecord } = useManageClinicalRecords();

  const sortedInvs = investigations ? [...investigations].sort((a, b) => new Date(b.investDate).getTime() - new Date(a.investDate).getTime()) : [];
  const totalPages = Math.ceil(sortedInvs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentInvs = sortedInvs.slice(startIndex, startIndex + pageSize);

  const handleSave = async (copyToFollowup = false) => {
    try {
      const investDate = new Date().toISOString().split('T')[0];
      await saveInvestigation.mutateAsync({ regid, visitId, type: activeType, data: labData, investDate });

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
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  const fields = LAB_CONFIG[activeType as keyof typeof LAB_CONFIG] || [
    { key: 'findings', label: 'Findings', type: 'full' }
  ];

  return (
    <div className="mc-labs-workspace animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-section-header" style={{ margin: 0 }}>Clinical Investigations</div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pp-text-2)', whiteSpace: 'nowrap' }}>Investigation Type :</label>
            <select 
              className="pp-select" 
              value={activeType} 
              onChange={(e) => { setActiveType(e.target.value); setLabData({}); }}
              style={{ maxWidth: '300px' }}
            >
              {Object.keys(LAB_CONFIG).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="pp-card" style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="pp-input"
                        placeholder="0.00"
                        value={labData[field.key] || ''}
                        onChange={e => setLabData({ ...labData, [field.key]: e.target.value })}
                        style={{ flex: '1 1 120px' }}
                      />
                      {field.range && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--pp-text-3)', background: 'var(--pp-warm-2)', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{field.range}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--pp-warm-3)' }}>
              <button onClick={() => handleSave(false)} className="btn-primary">
                {saved ? 'Saved!' : 'Save Report'}
              </button>
              <button onClick={() => handleSave(true)} className="btn-secondary" style={{ background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', borderColor: '#a7f3d0' }}>
                Save Copy To Followup
              </button>
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="mc-section-header">Investigation History</div>

            {!investigations ? (
              <TableSkeleton rows={3} cols={4} />
            ) : investigations.length === 0 ? (
              <div className="pp-card" style={{ padding: '32px', textAlign: 'center', marginTop: '16px' }}>
                <p style={{ color: 'var(--pp-text-3)' }}>No investigations recorded.</p>
              </div>
            ) : (
              <>
                <div className="pp-card pp-table-scroll" style={{ marginTop: '16px', maxHeight: '400px', overflowY: 'auto', padding: 0 }}>
                  <table className="pp-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f4f3f1' }}>
                      <tr>
                        <th style={{ width: '100px' }}>Date</th>
                        <th style={{ width: '120px' }}>Category</th>
                        <th>Results</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInvs.map(inv => (
                        <tr key={inv.id} className="hover-row">
                          <td>{new Date(inv.investDate).toLocaleDateString('en-GB')}</td>
                          <td><span className="badge-primary">{inv.type}</span></td>
                          <td>
                            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {Object.entries(inv.data || {}).map(([k, v]) => (
                                <span key={k}><strong>{k.toUpperCase()}:</strong> {String(v)}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => deleteRecord.mutateAsync({ type: 'investigations', id: inv.id })} className="btn-ghost" style={{ color: '#dc2626', padding: '4px 8px' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
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
        </div>
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
  const { saveImage } = useManageClinicalRecords();
  const [uploading, setUploading] = useState(false);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);
      formData.append('regid', String(regid));
      formData.append('visitId', String(visitId));
      formData.append('title', 'Clinical Evidence');
      await saveImage.mutateAsync(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pp-card animate-fade-in" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="mc-section-header" style={{ marginBottom: '24px' }}>Clinical Evidence (Images)</div>
      
      <div 
        style={{ 
          border: '2px dashed var(--pp-warm-4)', borderRadius: '12px', padding: '48px', textAlign: 'center', 
          background: 'var(--pp-warm-1)', position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
          marginBottom: '32px'
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
        {uploading ? <Loader2 size={40} className="animate-spin" style={{ color: 'var(--pp-blue)', margin: '0 auto' }} /> : <Camera size={40} style={{ color: 'var(--pp-text-3)', margin: '0 auto' }} />}
        <div style={{ marginTop: '16px', fontWeight: 700, color: 'var(--pp-text-2)', fontSize: '1.1rem' }}>
          {uploading ? 'Uploading Evidence...' : 'Click or Drag to Upload Image'}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginTop: '8px' }}>Supported Formats: JPG, PNG, WEBP (Max 5MB)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
        {images?.map(img => (
          <div key={img.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--pp-warm-2)', aspectRatio: '1/1', background: 'var(--pp-warm-1)', position: 'relative' }}>
            <img src={img.picture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Clinical Evidence" />
          </div>
        ))}
        {(!images || images.length === 0) && (
          <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--pp-text-3)', fontSize: '0.9rem', background: 'var(--pp-warm-1)', borderRadius: '10px' }}>
            No clinical images have been uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosisView({ regid, visitId, medicalCase, soapRecords }: { regid: number; visitId: number; medicalCase: any; soapRecords: any[] }) {
  const { updateDiagnosis, saveSoap } = useManageClinicalRecords();
  const [diagnosis, setDiagnosis] = useState(medicalCase?.condition || '');
  const [complaint, setComplaint] = useState('');
  const [medication, setMedication] = useState('');
  const [investigationFindings, setInvestigationFindings] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showDrawer, setShowDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedSoap = soapRecords ? [...soapRecords].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  }) : [];
  
  const totalPages = Math.ceil(sortedSoap.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentSoap = sortedSoap.slice(startIndex, startIndex + pageSize);

  const handleUpdate = async () => {
    try {
      if (diagnosis.trim()) {
        await updateDiagnosis.mutateAsync({ regid, condition: diagnosis.trim() });
      }
      if (complaint || medication || investigationFindings) {
        await saveSoap.mutateAsync({
          regid,
          visitId,
          subjective: complaint,
          objective: investigationFindings,
          assessment: diagnosis,
          plan: medication
        });
      }
      alert('Clinical records updated successfully.');
      setShowDrawer(false);
      // Clear form
      setComplaint('');
      setMedication('');
      setInvestigationFindings('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mc-diagnosis-workspace animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Assessment History Header & Controls ─── */}
      <div className="appt-header" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div>
          <h2 className="appt-header-title">Clinical Assessments</h2>
          <p className="appt-header-sub">Previous diagnoses and clinical notes for this patient</p>
        </div>
        
        <div className="appt-header-actions">
          <div className="appt-segmented-toggle">
            <button 
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')} 
            >
              <LayoutList size={16} /> <span className="hide-mobile">List</span>
            </button>
            <button 
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')} 
            >
              <LayoutGrid size={16} /> <span className="hide-mobile">Grid</span>
            </button>
          </div>

          <button 
            className="appt-btn" 
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            title={`Sort by Date (${sortOrder === 'desc' ? 'Newest' : 'Oldest'})`}
          >
            <TrendingUp size={16} style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          <button 
            className="appt-btn appt-btn-primary" 
            onClick={() => setShowDrawer(true)}
          >
            <Plus size={16} /> <span className="hide-mobile">Add Diagnosis</span>
            <span className="show-mobile">Add</span>
          </button>
        </div>
      </div>

      {/* ─── History Content (Table or Grid) ─── */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {!soapRecords || soapRecords.length === 0 ? (
          <div className="pp-card" style={{ padding: '48px', textAlign: 'center', background: 'var(--pp-warm-1)' }}>
            <History size={32} style={{ color: 'var(--pp-text-3)', marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ color: 'var(--pp-text-3)', fontWeight: 500 }}>No clinical assessments recorded yet.</p>
            <button className="pp-link" style={{ marginTop: '12px' }} onClick={() => setShowDrawer(true)}>Create the first diagnosis</button>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="appt-card" style={{ padding: 0 }}>
                <div className="pp-table-scroll">
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Date</th>
                        <th style={{ width: '250px' }}>Diagnosis & Findings</th>
                        <th>Complaints (S)</th>
                        <th>Plan (P)</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSoap.map((record) => (
                        <tr key={record.id} className="hover-row">
                          <td className="appt-cell-mono">
                            {(record.createdAt || record.dateval) ? new Date(record.createdAt || record.dateval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td>
                            <div className="appt-cell-name" style={{ color: 'var(--pp-blue)', marginBottom: '4px' }}>{record.assessment || 'No Diagnosis'}</div>
                            {record.objective && <div className="appt-cell-phone">Obj: {record.objective}</div>}
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
                            <button className="pp-icon-btn" style={{ color: 'var(--pp-blue)' }} onClick={() => {
                              setDiagnosis(record.assessment || '');
                              setComplaint(record.subjective || '');
                              setMedication(record.plan || '');
                              setInvestigationFindings(record.objective || '');
                              setShowDrawer(true);
                            }}>
                              <Edit size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="appt-card-grid">
                {currentSoap.map((record) => (
                  <div key={record.id} className="appt-card appt-grid-card animate-scale-in" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                      <button className="pp-icon-btn" onClick={() => {
                        setDiagnosis(record.assessment || '');
                        setComplaint(record.subjective || '');
                        setMedication(record.plan || '');
                        setInvestigationFindings(record.objective || '');
                        setShowDrawer(true);
                      }}>
                        <Edit size={14} />
                      </button>
                    </div>
                    <div className="appt-grid-card-status" style={{ width: 'fit-content', marginBottom: '12px' }}>
                      {(record.createdAt || record.dateval) ? new Date(record.createdAt || record.dateval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                    </div>
                    <div className="appt-grid-card-patient" style={{ color: 'var(--pp-blue)', marginBottom: '16px', lineHeight: 1.3 }}>
                      {record.assessment || 'Diagnosis Not Specified'}
                    </div>
                    
                    <div className="appt-grid-card-detail">
                      {record.subjective && (
                        <div>
                          <div className="appt-section-label" style={{ marginBottom: '4px' }}>Subjective</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--pp-ink)', lineHeight: 1.4 }}>{record.subjective}</div>
                        </div>
                      )}
                      {record.plan && (
                        <div>
                          <div className="appt-section-label" style={{ marginBottom: '4px' }}>Plan</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--pp-ink)', lineHeight: 1.4 }}>{record.plan}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
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
      </div>

      {/* ─── Diagnosis Form Side Drawer ─── */}
      {showDrawer && (
        <>
          <div className="appt-drawer-overlay" onClick={() => setShowDrawer(false)} style={{ zIndex: 10001 }} />
          <div className="appt-drawer-panel animate-slide-right" style={{ zIndex: 10002 }}>
            <div className="appt-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--pp-blue-bg)', color: 'var(--pp-blue)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="appt-drawer-title">Record Assessment</h3>
                  <p className="appt-header-sub" style={{ margin: 0 }}>Add clinical findings & diagnosis</p>
                </div>
              </div>
              <button className="appt-drawer-close" onClick={() => setShowDrawer(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="appt-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="appt-section-label">Main Diagnosis</label>
                <textarea 
                  className="pp-textarea" 
                  value={diagnosis} 
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Final clinical assessment..."
                  style={{ minHeight: '60px', fontSize: '1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="appt-section-label">Subjective (Complaints)</label>
                <textarea 
                  className="pp-textarea" 
                  value={complaint} 
                  onChange={e => setComplaint(e.target.value)}
                  placeholder="Patient symptoms & intensity..."
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="appt-section-label">Treatment Plan</label>
                <textarea 
                  className="pp-textarea" 
                  value={medication} 
                  onChange={e => setMedication(e.target.value)}
                  placeholder="Medications or next steps..."
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="appt-section-label">Objective Findings</label>
                <textarea 
                  className="pp-textarea" 
                  value={investigationFindings} 
                  onChange={e => setInvestigationFindings(e.target.value)}
                  placeholder="Physical exam or lab summaries..."
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>

            <div className="appt-drawer-footer">
              <button 
                className="appt-btn" 
                style={{ flex: 1 }}
                onClick={() => setShowDrawer(false)}
              >
                Cancel
              </button>
              <button 
                className="appt-btn appt-btn-primary" 
                style={{ flex: 2 }}
                onClick={handleUpdate}
                disabled={updateDiagnosis.isPending}
              >
                {updateDiagnosis.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Save Clinical Assessment'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
