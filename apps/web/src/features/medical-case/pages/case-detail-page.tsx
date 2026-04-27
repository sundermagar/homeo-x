import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit, ClipboardList, FlaskConical,
  Printer, Paperclip, Upload, X, Eye, Loader2
} from 'lucide-react';
import { useFullMedicalCase, useManageClinicalRecords } from '../hooks/use-medical-cases';
import { AssignPackageModal } from '../../packages/components/assign-package-modal';
import { VitalsFormModal } from '../components/vitals-form-modal';
import { useSendSms } from '../../communications/hooks/use-communications';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { RemedyChartSession } from '../components/remedy-chart-session';
import { AiRemedyView } from '../components/ai-remedy-view';
import { AiConsultantView } from '../components/ai-consultant-view';
import { usePatientBills } from '../../billing/hooks/use-billing';
import { useAppointments } from '../../appointments/hooks/use-appointments';
import { useAuthStore } from '@/shared/stores/auth-store';
import '../styles/medical-case.css';

const TABS = [
  { id: 'summary', label: 'Summary', icon: History },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'soap', label: 'SOAP', icon: Edit },
  { id: 'prescription', label: 'Prescription', icon: FileText },
  { id: 'examination', label: 'Examination', icon: Search },
  { id: 'labs', label: 'Labs', icon: Zap },
  { id: 'images', label: 'Media', icon: Camera },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'followup', label: 'Follow-up', icon: Clock },
  { id: 'ai', label: 'Repertory', icon: Sparkles },
  { id: 'consultant', label: 'AI Analysis', icon: BrainCircuit },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
];

export default function MedicalCaseDetailPage() {
  const { regid } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  
  const clinicName = useAuthStore(s => s.user?.clinicName || 'HomeoX Clinic');

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation } = useManageClinicalRecords();

  if (isLoading) return <div className="mc-loading">Loading clinical records...</div>;
  if (error || !fullData) return <div className="mc-error">Failed to load clinical records.</div>;

  const { medicalCase, vitals, soap, prescriptions } = fullData;

  return (
    <div className="mc-detail-page pp-page-container animate-fade-in">

      {/* Header */}
      <header className="mc-detail-header">
        <div className="mc-back-group">
          {/* <button className="mc-back-btn" onClick={() => navigate('/medical-cases')}>
            <ArrowLeft size={16} strokeWidth={1.6} />
          </button> */}
          <div className="mc-divider-v" />
          <div>
            <div className="mc-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pp-text-gradient">Clinical Hub</span>
              <span className="mc-active-badge">Active Case</span>
            </div>
            <p className="mc-page-sub">Patient PT-{regid} · Longitudinal record</p>
          </div>
        </div>

        <div className="mc-header-actions">
          <button className="mc-btn-ghost" onClick={() => setShowAssignModal(true)}>
            <Package size={15} strokeWidth={1.6} /> Membership
          </button>
          <button className="mc-btn-ghost" onClick={() => window.print()}>
            <Printer size={15} strokeWidth={1.6} /> Print
          </button>
          <button
            className="mc-btn-finalize"
            onClick={() =>
              finalizeConsultation.mutate({
                regid: Number(regid),
                visitId: medicalCase.id,
                prescriptions: [],
                consultationFee: 500,
              })
            }
          >
            <CheckCircle2 size={15} strokeWidth={1.6} /> Finalize Visit
          </button>
        </div>
      </header>

      {/* Package Assignment Modal */}
      {showAssignModal && (
        <AssignPackageModal
          regid={Number(regid)}
          patientId={medicalCase.patientId || 0}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => { }}
        />
      )}

      {/* Main Layout */}
      <div className="mc-detail-layout">

        {/* Sidebar: Patient Snapshot */}
        <div className="mc-snapshot-sidebar">
          <div className="mc-snapshot-card">
            <div className="mc-snapshot-topbar" />

            <div className="mc-snapshot-profile">
              <div className="mc-snapshot-avatar">
                {medicalCase.patientName?.[0] || 'P'}
              </div>
              <div className="mc-snapshot-name-row">
                <span className="mc-snapshot-label">PT-{regid}</span>
                <span style={{ color: 'var(--border-main)' }}>·</span>
                <span className="mc-snapshot-type">Active</span>
              </div>
            </div>

            <div className="mc-snapshot-items">
              <SnapshotItem icon={Phone} label="Mobile" value={medicalCase.phone || '—'} />
              <SnapshotItem icon={Calendar} label="DOB" value={medicalCase.dateOfBirth ? new Date(medicalCase.dateOfBirth).toLocaleDateString('en-GB') : '—'} />
              <SnapshotItem icon={Clock} label="Wait" value="Active" />
              <SnapshotItem icon={MapPin} label="Location" value={medicalCase.city || '—'} />
            </div>

            <button className="mc-snapshot-edit-btn" onClick={() => navigate(`/patients/${regid}/edit`)}>Edit Profile</button>
          </div>

          {/* AI Hub */}
          <div className="mc-ai-card pp-glass">
            <Sparkles className="mc-ai-bg-icon" size={80} strokeWidth={1.6} />
            <div className="mc-ai-title">Clinical AI</div>
            <p className="mc-ai-sub">
              Analyze patient trajectory based on clinical history and recent findings.
            </p>
            <button className="mc-ai-btn btn-primary" onClick={() => setActiveTab('consultant')}>
              Run Analysis <ChevronRight size={12} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {/* Workspace: Tab Panel */}
        <div className="mc-workspace">
          
          {/* Printable Letterhead (hidden on screen) */}
          <div className="mc-print-header">
            <div className="mc-print-clinic">{clinicName}</div>
            <div className="mc-print-doc">Clinical Record</div>
            <div className="mc-print-pat">
              <strong>Patient:</strong> {medicalCase.patientName} (PT-{regid}) &nbsp;|&nbsp;
              <strong>Phone:</strong> {medicalCase.phone || 'N/A'} &nbsp;|&nbsp;
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </div>
            <hr />
          </div>

          <nav className="mc-tab-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`mc-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={14} strokeWidth={1.6} />
                {tab.label}
                {activeTab === tab.id && <span className="mc-tab-indicator" />}
              </button>
            ))}
          </nav>

          <div className="mc-workspace-body">
            {activeTab === 'summary' && <SummaryView data={fullData} />}
            {activeTab === 'vitals' && <VitalsView vitals={vitals} onRecord={() => setShowVitalsModal(true)} />}
            {activeTab === 'soap' && <SoapView soap={soap} onAiAssist={() => setActiveTab('consultant')} />}
            {activeTab === 'prescription' && <RemedyChartSession regid={Number(regid)} />}
            {activeTab === 'ai' && <AiRemedyView regid={Number(regid)} />}
            {activeTab === 'consultant' && <AiConsultantView regid={Number(regid)} />}
            {activeTab === 'examination' && <ExaminationView examination={fullData.examination} />}
            {activeTab === 'labs' && <LabsView investigations={fullData.investigations} regid={Number(regid)} />}
            {activeTab === 'billing' && <BillingView regid={Number(regid)} />}
            {activeTab === 'follow-up' && <FollowUpView patientId={medicalCase.patientId} />}
            {activeTab === 'media' && <MediaView images={fullData.images} />}
            {activeTab === 'communication' && <CommunicationView regid={Number(regid)} phone={(medicalCase as any).phone || ''} name={(medicalCase as any).patientName || ''} />}

            {showVitalsModal && (
              <VitalsFormModal
                visitId={medicalCase.id}
                regid={Number(regid)}
                onClose={() => setShowVitalsModal(false)}
              />
            )}

            {!['summary', 'vitals', 'soap', 'prescription', 'ai', 'consultant', 'communication', 'billing', 'follow-up', 'media', 'examination', 'labs'].includes(activeTab) && (
              <div className="mc-wip">
                <Zap size={40} strokeWidth={1.6} style={{ color: 'var(--border-main)' }} />
                <div className="mc-wip-title">Module pending</div>
                <p className="mc-wip-text">
                  Integrating from the MMC legacy system.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-Components ─── */

function SnapshotItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="mc-snapshot-item">
      <div className="mc-snapshot-item-icon">
        <Icon size={13} strokeWidth={1.6} />
      </div>
      <div>
        <div className="mc-snapshot-item-label">{label}</div>
        <div className="mc-snapshot-item-value">{value}</div>
      </div>
    </div>
  );
}

function SummaryView({ data }: any) {
  const { medicalCase, soap } = data;
  const conditions = medicalCase.condition?.split(',').map((c: string) => c.trim()) ||
    soap?.[0]?.assessment?.split('\n').filter((l: string) => l.trim()).slice(0, 2) ||
    ['No active conditions noted'];

  const daysSinceCreated = medicalCase.createdAt ?
    Math.floor((new Date().getTime() - new Date(medicalCase.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="mc-summary-grid">
      <div className="mc-summary-card pp-card">
        <div className="mc-summary-card-title text-label">
          <AlertCircle size={14} strokeWidth={1.6} style={{ color: 'var(--pp-warning-fg)' }} />
          Active Conditions
        </div>
        <div className="mc-conditions">
          {conditions.map((c: string, i: number) => (
            <span key={i} className={`mc-condition-chip ${i % 2 === 0 ? 'rose' : 'indigo'}`}>
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="mc-summary-card pp-card">
        <div className="mc-summary-card-title text-label">
          <CheckCircle2 size={14} strokeWidth={1.6} style={{ color: 'var(--pp-success-fg)' }} />
          Treatment Status
        </div>
        <p className="mc-treatment-text text-body">
          {daysSinceCreated > 0 ? `${daysSinceCreated}-day trajectory.` : 'New clinical case.'}
          {soap?.[0]?.plan ? ` ${soap[0].plan.slice(0, 100)}${soap[0].plan.length > 100 ? '...' : ''}` : ' Follow-up plan pending clinical evaluation.'}
        </p>
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit, date, status }: any) {
  return (
    <div className="mc-vital-card">
      <div className="mc-vital-header">
        <span className="mc-vital-label">{label}</span>
        {date && <span className="mc-vital-date">{new Date(date).toLocaleDateString()}</span>}
      </div>
      <div className="mc-vital-value">
        {value || '--'}
        {unit && <span className="mc-vital-unit">{unit}</span>}
      </div>
      <div className="mc-vital-footer">
        <Activity size={10} strokeWidth={2} /> {status || 'Normal'}
      </div>
    </div>
  );
}

function VitalsView({ vitals, onRecord }: { vitals: any[]; onRecord: () => void }) {
  const latest = vitals?.[0];

  return (
    <div className="mc-vitals-workspace">
      <div className="mc-vitals-grid">
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolicBp}/${latest.diastolicBp}` : null} unit="mmHg" date={latest?.recordedAt} />
        <VitalCard label="Pulse Rate" value={latest?.pulseRate} unit="bpm" date={latest?.recordedAt} />
        <VitalCard label="Weight" value={latest?.weightKg} unit="kg" date={latest?.recordedAt} />
        <VitalCard label="Height" value={latest?.heightCm} unit="cm" date={latest?.recordedAt} />
        <VitalCard label="Body Mass Index" value={latest?.bmi} unit="" date={latest?.recordedAt} />
        <VitalCard label="Temperature" value={latest?.temperatureF} unit="°F" date={latest?.recordedAt} />
        <VitalCard label="Oxygen (SpO2)" value={latest?.oxygenSaturation} unit="%" date={latest?.recordedAt} />
        <VitalCard label="Resp. Rate" value={latest?.respiratoryRate} unit="/min" date={latest?.recordedAt} />

        <button className="mc-add-reading-btn" onClick={onRecord}>
          <Plus size={16} strokeWidth={2} /> Record New Reading
        </button>
      </div>

      {vitals && vitals.length > 1 && (
        <div style={{ marginTop: 32 }}>
          <div className="mc-section-header">Historical Records</div>
          <div className="mc-table-wrap" style={{ marginTop: 16 }}>
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>BMI</th>
                </tr>
              </thead>
              <tbody>
                {vitals.slice(1).map(v => (
                  <tr key={v.id}>
                    <td className="mc-vital-date">{new Date(v.recordedAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{v.weightKg} kg</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{v.systolicBp}/{v.diastolicBp}</td>
                    <td>{v.pulseRate} bpm</td>
                    <td>{v.bmi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SoapView({ soap, onAiAssist }: any) {
  return (
    <div className="mc-soap-wrap">
      <div className="mc-soap-topbar">
        <span className="mc-soap-topbar-title">Clinical Observation (SOAP)</span>
        <button className="mc-soap-ai-btn" onClick={onAiAssist}>
          <Sparkles size={12} strokeWidth={1.6} /> AI Assist
        </button>
      </div>
      <div className="mc-soap-body">
        <SoapSection label="Subjective" value={soap?.[0]?.subjective || 'Pending patient statement.'} />
        <SoapSection label="Objective" value={soap?.[0]?.objective || 'Pending clinical findings.'} />
        <SoapSection label="Assessment" value={soap?.[0]?.assessment || 'Provisional diagnosis pending.'} />
        <SoapSection label="Plan" value={soap?.[0]?.plan || 'Treatment plan pending configuration.'} />
      </div>
    </div>
  );
}

function SoapSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="mc-soap-section">
      <div className="mc-soap-section-label">
        <span className="mc-soap-dot" />
        {label}
      </div>
      <p className="mc-soap-text">{value}</p>
    </div>
  );
}



/* ─── Communication Tab ──────────────────────────────────────────── */
function CommunicationView({ regid, phone, name }: { regid: number; phone: string; name: string }) {
  const { data: templates = [] } = useQuery({
    queryKey: ['communications', 'templates'],
    queryFn: () => apiClient.get('/communications/templates').then(r => r.data.data as any[]),
  });
  const sendSms = useSendSms();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const applyTemplate = (tpl: any) => setMessage(tpl.message);

  const handleSend = async () => {
    if (!message.trim()) return;
    setError(''); setSent(false);
    try {
      await sendSms.mutateAsync({ phone, message, smsType: 'General', regid });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to send');
    }
  };

  return (
    <div className="mc-communication-wrap" style={{ padding: '0 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Contact Info */}
        <div>
          <div className="text-label" style={{ marginBottom: 12 }}>
            Patient Contact
          </div>
          <div className="pp-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Phone size={14} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{phone || 'No phone'}</span>
            </div>
            <div className="text-body" style={{ color: 'var(--text-main)' }}>
              RegID: <strong style={{ color: 'var(--text-main)' }}>PT-{regid}</strong>
            </div>
            {name && <div className="text-body" style={{ color: 'var(--text-main)' }}>Name: {name}</div>}
          </div>
        </div>

        {/* SMS Composer */}
        <div>
          <div className="text-label" style={{ marginBottom: 12 }}>
            Send SMS
          </div>
          <div className="pp-card">
            <div style={{ marginBottom: 10 }}>
              <div className="text-label" style={{ marginBottom: 6, fontSize: '0.72rem' }}>Templates</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.isArray(templates) && templates.slice(0, 6).map((t: any) => (
                  <button key={t.id} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-main)', fontSize: '0.72rem', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'background 0.2s' }}
                    onClick={() => applyTemplate(t)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Type message or select a template…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: '10px', border: '1px solid var(--border-main)', borderRadius: 'var(--radius-card)', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-surface-1)', color: 'var(--text-main)' }}
            />
            {sent && <div style={{ fontSize: '0.78rem', color: 'var(--pp-success-fg)', marginTop: 8 }}>✓ SMS sent successfully</div>}
            {error && <div style={{ fontSize: '0.78rem', color: 'var(--pp-danger-fg)', marginTop: 8 }}>{error}</div>}
            <button
              className="mc-btn-primary"
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleSend}
              disabled={!phone || sendSms.isPending}
            >
              <Send size={13} /> Send SMS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─── Media Tab ─────────────────────────────────────────────────── */
function MediaView({ images }: { images: any[] }) {
  if (!images || images.length === 0) {
    return (
      <div className="mc-empty-state">
        <FileText size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <p>No clinical images or documents uploaded yet.</p>
        <button className="mc-btn-primary" style={{ marginTop: 12 }} onClick={() => alert('Media upload functionality coming soon')}>+ Upload Media</button>
      </div>
    );
  }

  return (
    <div className="mc-media-grid">
      {images.map((img: any) => (
        <div key={img.id} className="mc-media-card">
          <div className="mc-media-preview">
            {img.picture?.endsWith('.pdf') ? (
              <FileText size={32} />
            ) : (
              <img src={img.picture} alt={img.description} />
            )}
          </div>
          <div className="mc-media-info">
            <div className="mc-media-desc">{img.description || 'Clinical Image'}</div>
            <div className="mc-media-date">{new Date(img.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Billing Tab ───────────────────────────────────────────────── */
function BillingView({ regid }: { regid: number }) {
  const { data: summary, isLoading } = usePatientBills(regid);

  if (isLoading) return <div>Loading billing records...</div>;

  return (
    <div className="mc-billing-workspace">
      <div className="mc-billing-summary">
        <div className="mc-bill-stat">
          <span className="label">Total Charges</span>
          <span className="value">₹{summary?.totals.totalCharges.toLocaleString()}</span>
        </div>
        <div className="mc-bill-stat">
          <span className="label">Received</span>
          <span className="value success">₹{summary?.totals.totalReceived.toLocaleString()}</span>
        </div>
        <div className="mc-bill-stat">
          <span className="label">Balance</span>
          <span className="value danger">₹{summary?.totals.totalBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="mc-table-wrap" style={{ marginTop: 24 }}>
        <table className="mc-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill #</th>
              <th>Treatment</th>
              <th>Charges</th>
              <th>Received</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {summary?.bills.map(bill => (
              <tr key={bill.id}>
                <td>{bill.billDate}</td>
                <td style={{ fontWeight: 700 }}>#{bill.billNo}</td>
                <td>{bill.treatment || 'Consultation'}</td>
                <td>₹{bill.charges}</td>
                <td className="pp-text-success">₹{bill.received}</td>
                <td>
                  <span className={`pp-status-badge ${bill.balance === 0 ? 'success' : 'warning'}`}>
                    {bill.balance === 0 ? 'Paid' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Follow-up Tab ─────────────────────────────────────────────── */
function FollowUpView({ patientId }: { patientId: number }) {
  // Hack: passing patientId as search to get correct results if patient_id filter is not in type
  const { data: appointments = [], isLoading } = useAppointments({ page: 1, limit: 10 } as any);

  // Filter manually if the API filter isn't strict enough
  const filtered = Array.isArray(appointments) ? appointments.filter(a => a.patientId === patientId) : [];

  if (isLoading) return <div>Loading history...</div>;

  const navigate = useNavigate();
  return (
    <div className="mc-followup-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Appointment History</h3>
        <button className="mc-btn-primary" onClick={() => navigate('/appointments')}>+ Schedule Follow-up</button>
      </div>

      <div className="mc-timeline">
        {filtered.map((appt: any) => (
          <div key={appt.id} className="mc-timeline-item">
            <div className="mc-timeline-date">
              <div className="day">{new Date(appt.bookingDate).getDate()}</div>
              <div className="month">{new Date(appt.bookingDate).toLocaleString('default', { month: 'short' })}</div>
            </div>
            <div className="mc-timeline-content">
              <div className="mc-timeline-header">
                <span className="type">{appt.visitType}</span>
                <span className={`status ${appt.status.toLowerCase()}`}>{appt.status}</span>
              </div>
              <div className="mc-timeline-body">
                With <strong>{appt.doctorName}</strong> at {appt.bookingTime}
                {appt.notes && <p className="notes">{appt.notes}</p>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="mc-empty-state">
            <Calendar size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <p>No previous or upcoming appointments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
/* ─── Examination Tab ───────────────────────────────────────────── */
function ExaminationView({ examination }: { examination: any[] }) {
  if (!examination || examination.length === 0) {
    return (
      <div className="mc-empty-state">
        <ClipboardList size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <p>No physical examination records found for this patient.</p>
        <button className="mc-btn-primary" style={{ marginTop: 12 }} onClick={() => alert('Examination form coming soon')}>+ Record Examination</button>
      </div>
    );
  }

  return (
    <div className="mc-exam-wrap">
      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>BP (Systolic/Diastolic)</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            {examination.map((ex: any) => (
              <tr key={ex.id}>
                <td className="mc-vital-date">{ex.examinationDate || new Date(ex.createdAt).toLocaleDateString()}</td>
                <td style={{ fontWeight: 700 }}>{ex.bpSystolic}/{ex.bpDiastolic} mmHg</td>
                <td style={{ fontSize: '0.85rem' }}>{ex.findings || 'No notes.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Labs Tab ──────────────────────────────────────────────────── */
function LabsView({ investigations, regid }: { investigations: any[]; regid: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string; desc: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploaded, setUploaded] = useState<{ name: string; path: string; desc: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const newEntries = Array.from(files)
      .filter(f => allowed.includes(f.type))
      .map(f => ({
        file: f,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
        desc: f.name.replace(/\.[^/.]+$/, ''),
      }));
    setPendingFiles(prev => [...prev, ...newEntries]);
    setUploadError('');
  };

  const removeFile = (idx: number) => {
    setPendingFiles(prev => {
      const copy = [...prev];
      if (copy[idx]?.preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const updateDesc = (idx: number, desc: string) => {
    setPendingFiles(prev => prev.map((f, i) => i === idx ? { ...f, desc } : f));
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    setUploadError('');
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';

    const results: { name: string; path: string; desc: string }[] = [];
    for (const entry of pendingFiles) {
      const formData = new FormData();
      formData.append('files', entry.file);
      formData.append('regid', String(regid));
      formData.append('description', entry.desc || entry.file.name);
      try {
        const res = await fetch('/api/medical-cases/records/images', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Upload failed');
        results.push({ name: entry.file.name, path: json?.data?.picture || '', desc: entry.desc });
      } catch (err: any) {
        setUploadError(err.message || 'One or more files failed to upload');
      }
    }

    setUploaded(prev => [...prev, ...results]);
    setPendingFiles([]);
    setUploading(false);
  };

  const hasContent = (investigations && investigations.length > 0) || uploaded.length > 0;

  return (
    <div className="mc-labs-workspace">

      {/* ─── Upload Zone ─────────────────────────────── */}
      <div className="mc-labs-section">
        <div className="mc-section-header" style={{ marginBottom: 14 }}>
          <Paperclip size={14} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
          Attach Lab Reports
        </div>

        {/* Drop Zone */}
        <div
          className={`mc-labs-dropzone${dragOver ? ' drag-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: 'none' }}
            onChange={e => addFiles(e.target.files)}
          />
          <Upload size={28} strokeWidth={1.2} style={{ color: dragOver ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 8 }} />
          <div className="mc-labs-drop-title">
            {dragOver ? 'Drop files here' : 'Click or drag files to attach'}
          </div>
          <div className="mc-labs-drop-sub">
            Supports: JPG, PNG, WebP, PDF · Max 5 MB each
          </div>
        </div>

        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div className="mc-labs-pending">
            {pendingFiles.map((entry, idx) => (
              <div key={idx} className="mc-labs-pending-item">
                {entry.preview ? (
                  <img src={entry.preview} alt={entry.file.name} className="mc-labs-pending-thumb" />
                ) : (
                  <div className="mc-labs-pending-pdf">
                    <FileText size={22} strokeWidth={1.2} />
                  </div>
                )}
                <div className="mc-labs-pending-meta">
                  <input
                    className="mc-labs-desc-input"
                    value={entry.desc}
                    onChange={e => updateDesc(idx, e.target.value)}
                    placeholder="Description (e.g. CBC Report)"
                  />
                  <div className="mc-labs-filename">{entry.file.name}</div>
                </div>
                <button
                  className="mc-labs-remove-btn"
                  onClick={() => removeFile(idx)}
                  title="Remove"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button
                className="mc-btn-primary"
                onClick={handleUploadAll}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {uploading ? <Loader2 size={13} className="mc-spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
              </button>
              <button
                className="mc-btn-ghost"
                onClick={() => setPendingFiles([])}
                disabled={uploading}
              >
                Clear all
              </button>
            </div>

            {uploadError && (
              <div className="mc-labs-error">
                <AlertCircle size={13} strokeWidth={1.6} /> {uploadError}
              </div>
            )}
          </div>
        )}

        {/* Newly Uploaded This Session */}
        {uploaded.length > 0 && (
          <div className="mc-labs-uploaded">
            {uploaded.map((u, i) => (
              <div key={i} className="mc-labs-uploaded-item">
                <CheckCircle2 size={14} style={{ color: 'var(--pp-success-fg)', flexShrink: 0 }} />
                <span className="mc-labs-uploaded-name">{u.desc || u.name}</span>
                {u.path && (
                  <a
                    href={u.path}
                    target="_blank"
                    rel="noreferrer"
                    className="mc-labs-view-btn"
                    title="View"
                  >
                    <Eye size={13} strokeWidth={1.6} /> View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Investigations List ─────────────────────── */}
      {!hasContent ? (
        <div className="mc-empty-state" style={{ marginTop: 24 }}>
          <FlaskConical size={36} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p>No lab investigations or test results recorded yet.</p>
        </div>
      ) : investigations && investigations.length > 0 ? (
        <div className="mc-labs-section" style={{ marginTop: 24 }}>
          <div className="mc-section-header" style={{ marginBottom: 14 }}>
            <FlaskConical size={14} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Investigations
          </div>
          <div className="mc-labs-grid">
            {investigations.map((lab: any) => (
              <div key={lab.id} className="mc-lab-card">
                <div className="mc-lab-header">
                  <span className="mc-lab-type">{lab.type}</span>
                  <span className="mc-lab-date">{lab.investDate || new Date(lab.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mc-lab-body">
                  {lab.data ? (
                    <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(lab.data, null, 2)}
                    </pre>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Pending results...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
