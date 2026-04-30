import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical,
  Printer, Paperclip, Upload, X, Eye, Loader2, Trash2, Thermometer,
  TrendingUp, Stethoscope, Scale, Syringe, BarChart3, Pill, Check,
  FileHeart, Wallet
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAutoSave } from '@/shared/hooks/use-auto-save';
import { useFullMedicalCase, useManageClinicalRecords, useExaminations, usePackageHistory, useAdditionalCharges } from '../hooks/use-medical-cases';
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
import { CodeAutocomplete } from '@/shared/components/code-autocomplete';
import { CaseDetailSkeleton } from '@/shared/components/CaseDetailSkeleton';
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
  
  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation, saveNote } = useManageClinicalRecords();
  const { data: summary } = usePatientBills(Number(regid));
  const { data: activePackage } = useActivePackage(Number(regid));

  if (isLoading) return <CaseDetailSkeleton />;
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

  return (
    <div className="mc-legacy-layout animate-fade-in">
      {/* ─── Header Section (Legacy PHP Style) ─── */}
      <div className="mc-legacy-top-bar">
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {regid} {medicalCase.patientName} {medicalCase.gender || 'Female'}/ {ageString}
        </div>
        <div className="mc-legacy-top-icons">
          <button title="Package History" onClick={() => setShowAssignModal(true)}><Package size={16}/></button>
          <button 
            title="WhatsApp/Communication" 
            style={{background: '#25D366', color: 'white'}}
            onClick={() => setActiveTab('communication')}
          >
            <MessageSquare size={16}/>
          </button>
          <button 
            title="Print Clinical Summary" 
            onClick={() => window.open(`/api/medical-cases/pdf/summary/${regid}`, '_blank')}
          >
            <Printer size={16}/>
          </button>
          <div className="mc-legacy-scheme-label">
             Scheme: {activePackage ? (activePackage.status === 'Active' ? 'Regular' : 'Expired') : '—'}
          </div>
        </div>
      </div>

      <div className="mc-legacy-sub-bar">
        <div className="mc-legacy-nav-icons" style={{ display: 'flex', gap: '8px' }}>
          <SidebarIcon icon={Pill} active={activeTab === 'homeo'} onClick={() => setActiveTab('homeo')} title="Remedy Chart" />
          <SidebarIcon icon={Stethoscope} active={activeTab === 'vitals'} onClick={() => setActiveTab('vitals')} title="Vitals / Examination" />
          <SidebarIcon icon={FlaskConical} active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} title="Lab Investigations" />
          <SidebarIcon icon={FileHeart} active={activeTab === 'examination'} onClick={() => setActiveTab('examination')} title="Physical Examination" />
          <SidebarIcon icon={Syringe} active={activeTab === 'vaccine'} onClick={() => setActiveTab('vaccine')} title="Vaccine Tracker" />
          <SidebarIcon icon={Package} active={activeTab === 'packages'} onClick={() => setActiveTab('packages')} title="Package History" />
          <SidebarIcon icon={Wallet} active={activeTab === 'charges'} onClick={() => setActiveTab('charges')} title="Additional Charges" />
          <SidebarIcon icon={Phone} active={activeTab === 'communication'} onClick={() => setActiveTab('communication')} title="Communication" />
          <SidebarIcon icon={Clock} active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} title="Follow-up History" />
          <SidebarIcon icon={BarChart3} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} title="Analytics" />
          <SidebarIcon icon={ClipboardList} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} title="Clinical Reports" />
          <SidebarIcon icon={Camera} active={activeTab === 'media'} onClick={() => setActiveTab('media')} title="Media Scans" />
          <SidebarIcon icon={BrainCircuit} active={activeTab === 'consultant'} onClick={() => setActiveTab('consultant')} title="AI Consultant" />
        </div>
      </div>

      <div className="mc-legacy-main">

        {/* ─── Main Content Area (4-Column Layout) ─── */}
        <div className="mc-legacy-content">
          <div className="mc-legacy-panes">
            
            {/* Column 1: Follow-up History (col-md-3) */}
            <div className="mc-legacy-pane" style={{ overflowY: 'auto' }}>
              <div className="mc-legacy-pane-title">Follow Up History</div>
              <div className="mc-followup-list">
                 {/* New Entry */}
                 <div className="mc-followup-entry new">
                    <label>
                      <History size={10} style={{ marginRight: '4px', opacity: 0.6 }} />
                      Add Follow Up on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </label>
                    <AutoSaveNoteArea 
                      initialValue={followUpNote}
                      onSave={async (val) => {
                        setFollowUpNote(val);
                        await handleSaveNote(val);
                      }}
                      placeholder="Type follow-up note..."
                    />
                 </div>
                 {/* Past Entries */}
                 {notes?.filter((n: any) => n.notesType === 'Followup').map((n: any) => (
                   <div key={n.id} className="mc-followup-entry">
                      <label>Follow Up on {n.dateval ? new Date(n.dateval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Past'}</label>
                      <AutoSaveNoteArea 
                        initialValue={n.notes}
                        onSave={async (val) => await handleSaveNote(val, n.id)}
                      />
                   </div>
                 ))}
              </div>
            </div>

            {/* Column 2: Remedy / Tabs Workspace (col-md-6) */}
            <div className="mc-legacy-pane" style={{ padding: 0 }}>
               {activeTab === 'summary' ? (
                 <RemedyChartSession regid={Number(regid)} />
               ) : (
                 <div style={{ padding: '20px' }}>
                    {activeTab === 'homeo' && <HomeoView regid={Number(regid)} initialData={homeo} />}
                    {activeTab === 'vitals' && <VitalsView vitals={vitals} onRecord={() => setShowVitalsModal(true)} />}
                    {activeTab === 'labs' && <LabsView investigations={investigations} regid={Number(regid)} visitId={medicalCase.id} />}
                    {activeTab === 'examination' && <ExaminationView regid={Number(regid)} />}
                    {activeTab === 'vaccine' && <VaccineView regid={Number(regid)} caseVaccines={vaccines || []} />}
                    {activeTab === 'packages' && <PackageHistoryView regid={Number(regid)} />}
                    {activeTab === 'charges' && <AdditionalChargesView regid={Number(regid)} />}
                    {activeTab === 'communication' && <CommunicationView regid={Number(regid)} phone={medicalCase.phone || ''} name={medicalCase.patientName || ''} />}
                    {activeTab === 'analytics' && <AnalyticsView vitals={vitals || []} />}
                    {activeTab === 'reports' && <ReportsView regid={Number(regid)} investigations={investigations || []} />}
                    {activeTab === 'consultant' && <AiConsultantView regid={Number(regid)} />}
                    {activeTab === 'media' && <MediaView images={images} regid={Number(regid)} />}
                 </div>
               )}
            </div>

            {/* Column 3: Homeo Snapshot (col-md-2) */}
            <div className="mc-legacy-pane">
              <div className="mc-legacy-pane-title">Clinical Snapshot</div>
              <div className="mc-snapshot-vertical">
                <SnapshotRow label="Diagnosis" value={medicalCase.condition || 'Pending'} />
                <div style={{ padding: '8px 0' }}>
                  <CodeAutocomplete
                    type="icd"
                    label="ICD Diagnosis Code"
                    placeholder="Search ICD code..."
                    value={null}
                    onSelect={(code) => {
                      if (code) {
                        console.log('Selected ICD:', code);
                        // Future: save to medical_case_diagnoses
                      }
                    }}
                  />
                </div>
                <SnapshotRow label="Thermal" value={homeo?.thermal || '—'} />
                <SnapshotRow label="Miasm" value={homeo?.miasm || '—'} />
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-main)', paddingTop: '12px' }}>
                  <button className="mc-finish-case-btn" onClick={() => setShowFinalizeModal(true)}>
                   <CheckCircle2 size={18} strokeWidth={2} /> Finish Case
                </button>
                </div>
              </div>
            </div>

          </div>

          {/* ─── Footer Section (Billing & Patient Info) ─── */}
          <div className="mc-legacy-footer">
            <div className="mc-legacy-footer-col">
              <div className="mc-legacy-footer-label">Patient Contact</div>
              <div className="mc-legacy-footer-row"><span>Address:</span> <span>{medicalCase.city || '—'}</span></div>
              <div className="mc-legacy-footer-row"><span>Mobile:</span> <span>{medicalCase.phone || '—'}</span></div>
            </div>
            <div className="mc-legacy-footer-col">
              <div className="mc-legacy-footer-label">Package Info</div>
              <div className="mc-legacy-footer-row">
                <span>Scheme:</span>
                <span>{(activePackage as any)?.packageName ?? 'No Package'}</span>
              </div>
              <div className="mc-legacy-footer-row">
                <span>Expiry:</span>
                <span>{activePackage?.expiryDate ? new Date(activePackage.expiryDate).toLocaleDateString() : '—'}</span>
              </div>
              <div className="mc-legacy-footer-row">
                <span>Status:</span>
                <span style={{
                  color: activePackage?.status === 'Active'
                    ? 'var(--pp-success-fg)'
                    : activePackage?.status === 'Expired'
                      ? 'var(--pp-danger-fg)'
                      : 'var(--pp-text-3)',
                  fontWeight: 700,
                  fontFamily: 'var(--pp-font-mono)',
                  fontSize: '0.75rem',
                }}>
                  {activePackage?.status ?? '—'}
                </span>
              </div>
            </div>
            <div className="mc-legacy-footer-col">
              <div className="mc-legacy-footer-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Billing Summary
                <button 
                  className="mc-legacy-mini-btn" 
                  title="Add Custom Charge"
                  onClick={() => setShowBillingModal(true)}
                  style={{ padding: '2px', background: 'transparent', border: 'none', color: 'var(--pp-blue)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="mc-legacy-footer-row">
                <span>Total:</span> 
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mc-legacy-badge">₹{summary?.totals?.totalCharges || 0}</span>
                  <button 
                    className="mc-legacy-mini-btn" 
                    title="Update Regular Charges"
                    onClick={() => setShowBillingModal(true)}
                    style={{ opacity: 0.6 }}
                  >
                    <Edit size={12} />
                  </button>
                </div>
              </div>
              <div className="mc-legacy-footer-row">
                <span>Received:</span> 
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mc-legacy-badge success">₹{summary?.totals?.totalReceived || 0}</span>
                  <button 
                    className="mc-legacy-mini-btn" 
                    title="Record Payment"
                    onClick={() => setShowBillingModal(true)}
                    style={{ opacity: 0.6 }}
                  >
                    <CreditCard size={12} />
                  </button>
                </div>
              </div>
              <div className="mc-legacy-footer-row"><span>Balance:</span> <span className="mc-legacy-badge danger">₹{summary?.totals?.totalBalance || 0}</span></div>
            </div>
          </div>
        </div>
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

/* ─── Internal Sub-Components ─── */

import { useMasterVaccines } from '../hooks/use-medical-cases';

function VaccineView({ regid, caseVaccines }: { regid: number; caseVaccines: any[] }) {
  const { data: masterVaccines, isLoading } = useMasterVaccines();
  const { saveVaccine } = useManageClinicalRecords();
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleMarkDone = async (vaccineId: number) => {
    setSavingId(vaccineId);
    try {
      await saveVaccine.mutateAsync({ regid, vaccineId, notes: 'Done' });
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <div className="mc-loading">Loading vaccines...</div>;

  return (
    <div className="mc-view-placeholder" style={{ animation: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Vaccine Tracker ({regid})</div>
      </div>
      <div className="mc-placeholder-table">
        {masterVaccines?.map(vaccine => {
          const isDone = caseVaccines.some(cv => cv.vaccineId === vaccine.id);
          const doneRecord = caseVaccines.find(cv => cv.vaccineId === vaccine.id);
          
          return (
            <div key={vaccine.id} className="mc-placeholder-row">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{vaccine.label}</span>
                {vaccine.months && <span style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>Recommended at {vaccine.months} months</span>}
                {isDone && <span style={{ fontSize: '0.75rem', color: 'var(--pp-success-fg)', marginTop: '4px' }}>Recorded on {new Date(doneRecord.createdAt).toLocaleDateString()}</span>}
              </div>
              <div>
                {isDone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pp-success-fg)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> Done
                  </div>
                ) : (
                  <button 
                    className="mc-legacy-mini-btn" 
                    onClick={() => handleMarkDone(vaccine.id)}
                    disabled={savingId === vaccine.id}
                  >
                    {savingId === vaccine.id ? 'Saving...' : 'Mark Done'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
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

  return (
    <div className="mc-vitals-workspace animate-fade-in">
      <div className="mc-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Vitals & Clinical Examination</div>
        <button onClick={onRecord} className="mc-legacy-btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Record Vitals
        </button>
      </div>

      <div className="mc-vitals-grid">
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolicBp}/${latest.diastolicBp}` : '-'} unit="mmHg" icon={Activity} color="#ef4444" />
        <VitalCard label="Heart Rate" value={latest ? latest.pulseRate : '-'} unit="bpm" icon={History} color="#ec4899" />
        <VitalCard label="Temperature" value={latest ? latest.temperatureF : '-'} unit="°F" icon={Thermometer} color="#f59e0b" />
        <VitalCard label="Oxygen Level" value={latest ? latest.oxygenSaturation : '-'} unit="%" icon={Zap} color="#10b981" />
        <VitalCard label="Body Weight" value={latest ? latest.weightKg : '-'} unit="kg" icon={Calendar} color="#3b82f6" />
        <VitalCard label="BMI Index" value={latest ? latest.bmi : '-'} unit="" icon={Sparkles} color="#8b5cf6" />
      </div>

      <div style={{ marginTop: '32px' }}>
        <div className="mc-section-header">Recent History</div>
        <table className="mc-legacy-table">
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
            {vitals?.map(v => (
              <tr key={v.id}>
                <td>{new Date(v.recordedAt).toLocaleDateString('en-GB')}</td>
                <td>{v.systolicBp}/{v.diastolicBp}</td>
                <td>{v.pulseRate}</td>
                <td>{v.temperatureF}</td>
                <td>{v.weightKg}</td>
                <td>{v.bmi}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const { saveInvestigation, saveNote, deleteRecord } = useManageClinicalRecords();

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
                        onChange={e => setLabData({...labData, [field.key]: e.target.value})}
                      />
                    ) : (
                      <div className="mc-lab-input-wrap">
                        <input 
                          type="text" 
                          className="mc-lab-input" 
                          placeholder="0.00"
                          value={labData[field.key] || ''} 
                          onChange={e => setLabData({...labData, [field.key]: e.target.value})}
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
            <table className="mc-legacy-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Date</th>
                  <th style={{ width: '150px' }}>Category</th>
                  <th>Results</th>
                  <th style={{ width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {investigations?.sort((a, b) => new Date(b.investDate).getTime() - new Date(a.investDate).getTime()).map(inv => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.investDate).toLocaleDateString('en-GB')}</td>
                    <td><span className="mc-condition-chip indigo" style={{ fontSize: '0.7rem' }}>{inv.type}</span></td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(inv.data || {}).map(([k, v]) => (
                          <span key={k}><strong>{k.toUpperCase()}:</strong> {String(v)}</span>
                        ))}
                      </div>
                    </td>
                    <td><button onClick={() => deleteRecord.mutateAsync({ type: 'investigations', id: inv.id })} className="mc-legacy-action-btn delete">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div className="mc-comparative-wrap" style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <table className="mc-legacy-table" style={{ margin: 0, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', position: 'sticky', left: 0, zIndex: 10 }}>Parameter</th>
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
            <tr key={param}>
              <td style={{ fontWeight: 700, color: '#334155', background: '#f8fafc', position: 'sticky', left: 0, zIndex: 5 }}>{param.toUpperCase().replace(/_/g, ' ')}</td>
              {sortedInvs.map(inv => (
                <td key={inv.id} style={{ textAlign: 'center', fontWeight: 600, color: inv.data[param] ? '#1e293b' : '#cbd5e1' }}>
                  {inv.data[param] || '-'}
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

function ExaminationView({ regid }: { regid: number }) {
  const { data: examinations, isLoading } = useExaminations(regid);
  const { saveExamination, deleteExamination } = useManageClinicalRecords();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ examinationDate: '', bpSystolic: '', bpDiastolic: '', findings: '' });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await saveExamination.mutateAsync({
        regid,
        examinationDate: form.examinationDate || new Date().toISOString().split('T')[0],
        bpSystolic: parseInt(form.bpSystolic) || undefined,
        bpDiastolic: parseInt(form.bpDiastolic) || undefined,
        findings: form.findings,
      });
      setSaved(true);
      setForm({ examinationDate: '', bpSystolic: '', bpDiastolic: '', findings: '' });
      setShowForm(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  if (isLoading) return <div className="mc-loading">Loading examinations...</div>;

  return (
    <div className="mc-examination-workspace animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Physical Examination History</div>
        <button onClick={() => setShowForm(!showForm)} className="mc-legacy-btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Record Examination
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
            <div className="mc-legacy-input-group">
              <label>Date</label>
              <input type="date" value={form.examinationDate} onChange={e => setForm({...form, examinationDate: e.target.value})} />
            </div>
            <div className="mc-legacy-input-group">
              <label>BP Systolic</label>
              <input type="number" placeholder="mmHg" value={form.bpSystolic} onChange={e => setForm({...form, bpSystolic: e.target.value})} />
            </div>
            <div className="mc-legacy-input-group">
              <label>BP Diastolic</label>
              <input type="number" placeholder="mmHg" value={form.bpDiastolic} onChange={e => setForm({...form, bpDiastolic: e.target.value})} />
            </div>
            <div className="mc-legacy-input-group">
              <label>Findings</label>
              <input type="text" placeholder="Clinical findings..." value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} className="mc-legacy-btn-primary">{saved ? 'Saved!' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="mc-legacy-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <table className="mc-legacy-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>BP (mmHg)</th>
            <th>Findings</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {examinations?.map(exam => (
            <tr key={exam.id}>
              <td>{exam.examinationDate ? new Date(exam.examinationDate).toLocaleDateString('en-GB') : '—'}</td>
              <td>{exam.bpSystolic && exam.bpDiastolic ? `${exam.bpSystolic}/${exam.bpDiastolic}` : '—'}</td>
              <td>{exam.findings || '—'}</td>
              <td>
                <button onClick={() => deleteExamination.mutate(exam.id)} className="mc-legacy-action-btn delete">Delete</button>
              </td>
            </tr>
          ))}
          {(!examinations || examinations.length === 0) && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No examination records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PackageHistoryView({ regid }: { regid: number }) {
  const { data: packages, isLoading } = usePackageHistory(regid);

  if (isLoading) return <div className="mc-loading">Loading package history...</div>;

  return (
    <div className="mc-package-workspace animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Package Subscription History</div>
      </div>

      <table className="mc-legacy-table">
        <thead>
          <tr>
            <th>Package</th>
            <th>Start Date</th>
            <th>Expiry Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {packages?.map(pkg => (
            <tr key={pkg.id}>
              <td style={{ fontWeight: 600 }}>{pkg.packageName || 'Unknown Package'}</td>
              <td>{pkg.startDate ? new Date(pkg.startDate).toLocaleDateString('en-GB') : '—'}</td>
              <td>{pkg.expiryDate ? new Date(pkg.expiryDate).toLocaleDateString('en-GB') : '—'}</td>
              <td>₹{pkg.amount || 0}</td>
              <td>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: pkg.status === 'Active' ? '#dcfce7' : '#fee2e2',
                  color: pkg.status === 'Active' ? '#166534' : '#dc2626'
                }}>
                  {pkg.status || 'Unknown'}
                </span>
              </td>
            </tr>
          ))}
          {(!packages || packages.length === 0) && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No package history found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdditionalChargesView({ regid }: { regid: number }) {
  const { data: charges, isLoading } = useAdditionalCharges(regid);
  const { saveAdditionalCharge, deleteAdditionalCharge } = useManageClinicalRecords();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '' });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    try {
      await saveAdditionalCharge.mutateAsync({
        regid,
        name: form.name,
        amount: parseFloat(form.amount),
      });
      setSaved(true);
      setForm({ name: '', amount: '' });
      setShowForm(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  const totalCharges = charges?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

  if (isLoading) return <div className="mc-loading">Loading charges...</div>;

  return (
    <div className="mc-charges-workspace animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="mc-legacy-pane-title" style={{ margin: 0 }}>Additional Charges</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#dc2626' }}>Total: ₹{totalCharges.toFixed(2)}</span>
          <button onClick={() => setShowForm(!showForm)} className="mc-legacy-btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Charge
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="mc-legacy-input-group">
              <label>Charge Name</label>
              <input type="text" placeholder="e.g., Injection, Procedure..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="mc-legacy-input-group">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} className="mc-legacy-btn-primary">{saved ? 'Saved!' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="mc-legacy-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <table className="mc-legacy-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {charges?.map(charge => (
            <tr key={charge.id}>
              <td>{charge.createdAt ? new Date(charge.createdAt).toLocaleDateString('en-GB') : '—'}</td>
              <td>{charge.name || '—'}</td>
              <td style={{ fontWeight: 600, color: '#dc2626' }}>₹{charge.amount || 0}</td>
              <td>
                <button onClick={() => deleteAdditionalCharge.mutate(charge.id)} className="mc-legacy-action-btn delete">Delete</button>
              </td>
            </tr>
          ))}
          {(!charges || charges.length === 0) && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No additional charges recorded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

