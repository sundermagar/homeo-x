import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical, Microscope,
  Printer, Paperclip, Upload, X, Eye, Loader2, Trash2, Thermometer,
  TrendingUp, Stethoscope, Scale, Syringe, BarChart3, Pill, Check, User,
  ChevronLeft
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAutoSave } from '@/shared/hooks/use-auto-save';
import { useFullMedicalCase, useManageClinicalRecords, useMasterVaccines } from '../hooks/use-medical-cases';
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
  const [printMode, setPrintMode] = useState<'Manual' | 'AI'>('Manual');

  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation, saveNote } = useManageClinicalRecords();
  const { data: summary } = usePatientBills(Number(regid));
  const { data: activePackage } = useActivePackage(Number(regid));

  if (isLoading) {
    return <MedicalCasePageSkeleton />;
  }

  if (error || !fullData) return <div className="mc-error">Failed to load clinical records.</div>;

  const { medicalCase, vitals, soap, notes, examination, images, investigations, prescriptions, homeo, vaccines, reminders } = fullData;
  const ageString = medicalCase.dateOfBirth ? `${new Date().getFullYear() - new Date(medicalCase.dateOfBirth).getFullYear()} Yrs` : 'Unknown Age';

  const handleSaveNote = async (text: string, noteId?: number) => {
    if (!text.trim()) return;
    try {
      await saveNote.mutateAsync({
        id: noteId,
        regid: Number(regid),
        notes: text,
        notesType: 'Followup',
        dateval: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const TABS = [
    { id: 'summary', label: 'Prescription (Rx)', icon: Pill },
    { id: 'matrix', label: 'Clinical Matrix', icon: Microscope },
    { id: 'homeo', label: 'Homeopathic', icon: Zap },
    { id: 'vitals', label: 'Vitals & Exam', icon: Stethoscope },
    { id: 'labs', label: 'Investigations', icon: FlaskConical },
    { id: 'vaccine', label: 'Vaccines', icon: Syringe },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'consultant', label: 'AI Consultant', icon: BrainCircuit },
  ];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'summary': return <RemedyChartSession regid={Number(regid)} />;
      case 'matrix': return <div style={{ padding: 0 }}><AiRemedyView regid={Number(regid)} /></div>;
      case 'homeo': return <div style={{ padding: 20 }}><HomeoView regid={Number(regid)} initialData={homeo} /></div>;
      case 'vitals': return <div style={{ padding: 20 }}><VitalsView vitals={vitals} onRecord={() => setShowVitalsModal(true)} /></div>;
      case 'labs': return <div style={{ padding: 20 }}><LabsView investigations={investigations} regid={Number(regid)} visitId={medicalCase.id} /></div>;
      case 'vaccine': return <div style={{ padding: 20 }}><VaccineView regid={Number(regid)} caseVaccines={vaccines || []} /></div>;
      case 'communication': return <div style={{ padding: 20 }}><CommunicationView regid={Number(regid)} phone={medicalCase.phone || ''} name={medicalCase.patientName || ''} /></div>;
      case 'analytics': return <div style={{ padding: 20 }}><AnalyticsView vitals={vitals || []} /></div>;
      case 'reports': return <div style={{ padding: 20 }}><ReportsView regid={Number(regid)} investigations={investigations || []} /></div>;
      case 'consultant': return <div style={{ padding: 20 }}><AiConsultantView regid={Number(regid)} /></div>;
      case 'media': return <div style={{ padding: 20 }}><MediaView images={images} regid={Number(regid)} /></div>;
      default: return null;
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
                {medicalCase.patientName} <span style={{ opacity: 0.5 }}>.</span> {medicalCase.gender || 'Unknown'}
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

          <div className="banner-right">
            <span className="scheme-badge">
              <Package size={14} /> SCHEME: {activePackage ? (activePackage.status === 'Active' ? 'REGULAR' : 'EXPIRED') : 'NONE'}
            </span>
            <button className="banner-btn bb-outline" onClick={() => setActiveTab('communication')}>
              <MessageSquare size={14} /> Message
            </button>
            <button 
              className="banner-btn bb-outline" 
              onClick={() => {
                const authStorage = localStorage.getItem('auth-storage');
                const token = authStorage ? JSON.parse(authStorage).state.token : '';
                window.open(`/api/medical-cases/remedy-chart/pdf/${regid}?token=${token}`, '_blank');
              }}
            >
              <Printer size={14} /> Print
            </button>
            <button className="banner-btn bb-green" onClick={() => setShowFinalizeModal(true)}>
              <CheckCircle2 size={14} strokeWidth={2.5} /> Finish Case
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
          <div className="mc-followup-box">
            <div className="mc-fu-label">Next Follow Up</div>
            <div className="mc-fu-date">{medicalCase.nextFollowUp ? new Date(medicalCase.nextFollowUp).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}</div>
            <button className="mc-fu-btn" onClick={() => setActiveTab('communication')}>Add Follow Up</button>
          </div>

          <div className="mc-side-card">
            <div className="mc-side-card-header">
              <div className="mc-side-card-title"><Activity size={16} /> Diagnosis</div>
              <span className="badge-warn" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>Pending</span>
            </div>
            <div className="mc-side-card-body">
              <div className="mc-dx-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="mc-dx-info">
                  <div className="mc-dx-name" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Thermal</div>
                  <div className="mc-dx-sub" style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>Constitutional · Miasm</div>
                </div>
                <div className="mc-dx-status" style={{ fontSize: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span> Reviewing
                </div>
              </div>
              <button className="mc-add-btn" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px dashed var(--pp-warm-2)', background: 'transparent', color: 'var(--pp-text-3)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '8px' }}>+ Add Diagnosis</button>
            </div>
          </div>

          <div className="mc-side-card">
            <div className="mc-side-card-header">
              <div className="mc-side-card-title"><CreditCard size={16} /> Billing Summary</div>
              <button className="mc-link-btn" onClick={() => setShowBillingModal(true)} style={{ fontSize: '0.8rem', color: 'var(--pp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
            </div>
            <div className="mc-side-card-body">
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Total</span> <strong>₹{medicalCase.totalBill || 0}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Received</span> <strong className="text-green">₹{medicalCase.paidAmount || 0}</strong></div>
              <div className="mc-bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>Balance</span> <strong className="text-red">₹{(medicalCase.totalBill || 0) - (medicalCase.paidAmount || 0)}</strong></div>
              <div className="mc-bill-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--pp-blue)', borderTop: '1px solid var(--pp-warm-2)', paddingTop: '12px', marginTop: '8px' }}>
                <span>Outstanding</span>
                <strong>₹{(medicalCase.totalBill || 0) - (medicalCase.paidAmount || 0)}</strong>
              </div>
              <button className="mc-pay-btn" onClick={() => setShowBillingModal(true)} style={{ width: '100%', padding: '10px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}>Record Payment</button>
            </div>
          </div>

          <button className="mc-finish-case-btn" onClick={() => setShowFinalizeModal(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)', marginTop: '8px' }}>
            <CheckCircle2 size={18} /> Finish Case
          </button>
        </aside>
      </div>


      {/* Modals */}
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
      <div className="patient-banner" style={{ background: 'white', borderBottom: '1px solid var(--pp-warm-2)', color: 'transparent' }}>
        <div className="banner-inner">
          <div className="banner-left">
            <div className="skeleton-box skeleton-circle" style={{ width: '56px', height: '56px' }} />
            <div className="mc-header-info">
               <div className="skeleton-box skeleton-text" style={{ width: '80px', height: '10px' }} />
               <div className="skeleton-box skeleton-text title" style={{ width: '200px', height: '24px', margin: '8px 0' }} />
               <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="skeleton-box" style={{ width: '60px', height: '20px', borderRadius: '10px' }} />
                  <div className="skeleton-box" style={{ width: '60px', height: '20px', borderRadius: '10px' }} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mc-top-tabs-container" style={{ background: 'white', borderBottom: '1px solid #f1f5f9' }}>
         <div style={{ display: 'flex', gap: '24px', padding: '0 32px' }}>
            {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="skeleton-box" style={{ width: '100px', height: '44px', borderRadius: '0' }} />
            ))}
         </div>
      </div>

      <div className="mc-detail-grid" style={{ padding: '24px' }}>
        <div className="mc-main-column">
           <div className="pp-card" style={{ height: '500px', padding: '32px' }}>
              <div className="skeleton-box skeleton-text title" style={{ width: '30%', marginBottom: '32px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                 {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />)}
              </div>
              <div className="skeleton-box" style={{ width: '100%', height: '200px', borderRadius: '16px' }} />
           </div>
        </div>
        <aside className="mc-sidebar">
           {[1, 2, 3].map(i => (
              <div key={i} className="pp-card" style={{ padding: '24px', marginBottom: '20px' }}>
                 <div className="skeleton-box skeleton-text" style={{ width: '60%', marginBottom: '20px' }} />
                 <div className="skeleton-box" style={{ width: '100%', height: '80px', borderRadius: '12px' }} />
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
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Immunization Record</div>
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

function AnalyticsView({ vitals }: { vitals: any[] }) {
  if (!vitals || vitals.length === 0) {
    return (
      <div className="mc-view-placeholder" style={{ animation: 'none' }}>
        <div className="mc-legacy-pane-title">Growth & Clinical Analytics</div>
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
          <span style={{ color: '#999' }}>No vital records available to plot.</span>
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
    <div className="mc-view-placeholder" style={{ animation: 'none' }}>
      <div className="mc-legacy-pane-title">Growth & Clinical Analytics</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--pp-warm-2)' }}>
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

        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--pp-warm-2)' }}>
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
    <div className="mc-view-placeholder" style={{ animation: 'none' }}>
      <div className="mc-legacy-pane-title">Clinical Reports Summary</div>

      {reports.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b' }}>No radiological or specialized reports found.</p>
        </div>
      ) : (
        <div className="mc-placeholder-list">
          {reports.map((report) => (
            <div key={report.id} className="mc-placeholder-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pp-blue)' }}>{report.type}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)' }}>{report.investDate ? new Date(report.investDate).toLocaleDateString() : ''}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-2)', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--pp-warm-2)' }}>
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
    <div className="mc-soap-wrap">
      <div className="mc-soap-topbar"><span className="mc-soap-topbar-title">Homeopathic Evaluation</span></div>
      <div className="mc-soap-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="mc-legacy-input-group">
          <label>Thermal State</label>
          <select value={thermal} onChange={e => setThermal(e.target.value)}>
            <option value="">Select...</option><option value="Hot">Hot</option><option value="Chilly">Chilly</option><option value="Ambithermal">Ambithermal</option>
          </select>
        </div>
        <div className="mc-legacy-input-group">
          <label>Miasm</label>
          <select value={miasm} onChange={e => setMiasm(e.target.value)}>
            <option value="">Select...</option><option value="Psoric">Psoric</option><option value="Syphilitic">Syphilitic</option><option value="Sycotic">Sycotic</option>
          </select>
        </div>
        <div className="mc-legacy-input-group">
          <label>Constitutional Assessment</label>
          <textarea className="mc-legacy-textarea" style={{ height: '120px' }} value={constitutional} onChange={e => setConstitutional(e.target.value)} />
        </div>
        <button onClick={handleSave} className="mc-legacy-btn-primary">
          {saveHomeoDetails.isPending ? 'Saving...' : (saved ? 'Saved!' : 'Save Evaluation')}
        </button>
      </div>
    </div>
  );
}

function VitalsView({ vitals, onRecord }: { vitals: any[]; onRecord: () => void }) {
  const latest = vitals && vitals.length > 0 ? vitals[0] : null;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (!vitals) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  const totalPages = Math.ceil((vitals?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentVitals = vitals?.slice(startIndex, startIndex + pageSize) || [];

  return (
    <div className="mc-vitals-workspace animate-fade-in">
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Vitals & Clinical Examination</div>
        <button onClick={onRecord} className="mc-legacy-btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Record Vitals
        </button>
      </div>

      <div className="mc-vitals-grid">
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolicBp}/${latest.diastolicBp}` : '-'} unit="mmHg" icon={Activity} color="var(--pp-danger-fg)" />
        <VitalCard label="Heart Rate" value={latest ? latest.pulseRate : '-'} unit="bpm" icon={History} color="#ec4899" />
        <VitalCard label="Temperature" value={latest ? latest.temperatureF : '-'} unit="°F" icon={Thermometer} color="#f59e0b" />
        <VitalCard label="Oxygen Level" value={latest ? latest.oxygenSaturation : '-'} unit="%" icon={Zap} color="#10b981" />
        <VitalCard label="Body Weight" value={latest ? latest.weightKg : '-'} unit="kg" icon={Calendar} color="var(--pp-blue)" />
        <VitalCard label="BMI Index" value={latest ? latest.bmi : '-'} unit="" icon={Sparkles} color="#8b5cf6" />
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
  const [comparativeMode, setComparativeMode] = useState(false);
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
          noteType: 'Followup',
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
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Clinical Investigations</div>
        <button
          onClick={() => setComparativeMode(!comparativeMode)}
          className="mc-legacy-btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          {comparativeMode ? 'Back to Entry' : 'Comparative View'}
        </button>
      </div>

      {comparativeMode ? (
        <ComparativeInvestigationView investigations={investigations} />
      ) : (
        <>
          <div className="mc-investigation-tabs">
            {Object.keys(LAB_CONFIG).map((cat) => (
              <button
                key={cat}
                className={`mc-investigation-tab ${activeType === cat ? 'active' : ''}`}
                onClick={() => { setActiveType(cat); setLabData({}); }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mc-lab-form-container">
            <div className="mc-lab-grid">
              {fields.map(field => (
                <div key={field.key} className={`mc-lab-field ${field.type === 'full' ? 'full-width' : ''}`}>
                  <label>{field.label}</label>
                  <div className="mc-lab-field-row">
                    {field.type === 'full' ? (
                      <textarea
                        className="mc-lab-textarea"
                        placeholder={`Enter ${field.label}...`}
                        value={labData[field.key] || ''}
                        onChange={e => setLabData({ ...labData, [field.key]: e.target.value })}
                      />
                    ) : (
                      <div className="mc-lab-input-wrap">
                        <input
                          type="text"
                          className="mc-lab-input"
                          placeholder="0.00"
                          value={labData[field.key] || ''}
                          onChange={e => setLabData({ ...labData, [field.key]: e.target.value })}
                        />
                        {field.range && <span className="mc-lab-range">{field.range}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mc-lab-actions">
              <button onClick={() => handleSave(false)} className="mc-legacy-btn-primary">
                {saved ? 'Saved!' : 'Save Report'}
              </button>
              <button onClick={() => handleSave(true)} className="mc-legacy-btn-secondary" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                Save Copy To Followup
              </button>
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="mc-section-header">Investigation History</div>
            
            {!investigations ? (
              <TableSkeleton rows={3} cols={4} />
            ) : investigations.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', marginTop: '16px' }}>
                <p style={{ color: '#64748b' }}>No investigations recorded.</p>
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
                            <button onClick={() => deleteRecord.mutateAsync({ type: 'investigations', id: inv.id })} className="btn-ghost" style={{ color: 'var(--pp-danger-fg)', padding: '4px 8px' }}>
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
        </>
      )}
    </div>
  );
}

function ComparativeInvestigationView({ investigations }: { investigations: any[] }) {
  // Extract all unique parameter keys across all investigations
  const allParams = Array.from(new Set(
    investigations.flatMap(inv => Object.keys(inv.data || {}))
  )).sort();

  // Sort investigations by date
  const sortedInvs = investigations.sort((a, b) => new Date(a.investDate).getTime() - new Date(b.investDate).getTime());

  if (investigations.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px' }}>
        <AlertCircle size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
        <div style={{ color: '#64748b', fontWeight: 600 }}>No investigation data found for comparison.</div>
      </div>
    );
  }

  return (
    <div className="pp-card pp-table-scroll" style={{ margin: 0, padding: 0 }}>
      <table className="pp-table">
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--pp-warm-2)' }}>Parameter</th>
            {sortedInvs.map(inv => (
              <th key={inv.id} style={{ textAlign: 'center' }}>
                {new Date(inv.investDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                <div style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.8 }}>{inv.type.toUpperCase()}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allParams.map(param => (
            <tr key={param} className="hover-row">
              <td style={{ fontWeight: 700, color: 'var(--pp-ink)', position: 'sticky', left: 0, zIndex: 5, background: 'white' }}>{param.toUpperCase().replace(/_/g, ' ')}</td>
              {sortedInvs.map(inv => (
                <td key={inv.id} style={{ textAlign: 'center', fontWeight: 500, color: inv.data[param] ? 'var(--pp-ink)' : 'var(--pp-text-3)' }}>
                  {inv.data[param] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function CommunicationView({ regid, phone, name }: { regid: number; phone: string; name: string }) {
  const [message, setMessage] = useState('');
  const sendSms = useSendSms();
  return (
    <div className="mc-communication-wrap">
      <div className="mc-legacy-pane-title">Communication with {name}</div>
      <div className="mc-legacy-input-group">
        <label>Select Template</label>
        <select onChange={e => setMessage(e.target.value)}>
          <option value="">Choose...</option>
          <option value="Hello, Your medicine from Homeo-X is dispatched via courier. Tracking: ">Medicine Dispatched</option>
          <option value="Reminder: Your follow-up consultation is scheduled for tomorrow. Please confirm.">Follow-up Reminder</option>
          <option value="Hello, Your lab reports are ready. You can view them on the Homeo-X app.">Lab Reports Ready</option>
          <option value="Greeting from Homeo-X. How is your health today? Any improvements?">Health Check-in</option>
        </select>
      </div>
      <textarea className="mc-legacy-textarea" style={{ height: '100px', marginTop: '12px' }} value={message} onChange={e => setMessage(e.target.value)} />
      <button className="mc-legacy-btn-primary" style={{ marginTop: '12px' }} onClick={() => sendSms.mutateAsync({ phone, message, regid })}>Send WhatsApp</button>
    </div>
  );
}

function MediaView({ images, regid }: { images: any[], regid: number }) {
  return (
    <div className="mc-media-workspace">
      <div className="mc-section-header">Clinical Media</div>
      <div className="mc-media-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {images?.map(img => (
          <div key={img.id} className="mc-media-card"><img src={img.picture} style={{ width: '100%', borderRadius: '8px' }} /></div>
        ))}
      </div>
    </div>
  );
}


