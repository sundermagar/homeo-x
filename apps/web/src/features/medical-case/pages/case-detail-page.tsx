import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Activity, Search, Edit,
  History, Camera, Zap, CreditCard, Clock,
  Phone, Calendar, MapPin, CheckCircle2, AlertCircle,
  Sparkles, MoreHorizontal, ChevronRight, Plus, Package,
  MessageSquare, Send, BrainCircuit
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
import '../styles/medical-case.css';

const TABS = [
  { id: 'summary',       label: 'Summary',       icon: History },
  { id: 'vitals',        label: 'Vitals',        icon: Activity },
  { id: 'soap',          label: 'SOAP',          icon: Edit },
  { id: 'prescription',  label: 'Prescription',  icon: FileText },
  { id: 'examination',   label: 'Examination',   icon: Search },
  { id: 'labs',          label: 'Labs',           icon: Zap },
  { id: 'images',        label: 'Media',          icon: Camera },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'followup',      label: 'Follow-up',      icon: Clock },
  { id: 'ai',            label: 'Repertory',      icon: Sparkles },
  { id: 'consultant',    label: 'AI Analysis',    icon: BrainCircuit },
  { id: 'communication', label: 'Communication',  icon: MessageSquare },
];

export default function MedicalCaseDetailPage() {
  const { regid } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  const { data: fullData, isLoading, error } = useFullMedicalCase(Number(regid));
  const { finalizeConsultation } = useManageClinicalRecords();

  if (isLoading) return <div className="mc-loading">Loading clinical records...</div>;
  if (error || !fullData) return <div className="mc-error">Failed to load clinical records.</div>;

  const { medicalCase, vitals, soap, prescriptions } = fullData;

  return (
    <div className="mc-detail-page">

      {/* Header */}
      <header className="mc-detail-header">
        <div className="mc-back-group">
          <button className="mc-back-btn" onClick={() => navigate('/medical-cases')}>
            <ArrowLeft size={16} strokeWidth={1.6} />
          </button>
          <div className="mc-divider-v" />
          <div>
            <div className="mc-page-title pp-text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Clinical Hub
              <span className="mc-active-badge">Active Case</span>
            </div>
            <p className="mc-page-sub">Patient PT-{regid} · Longitudinal record</p>
          </div>
        </div>

        <div className="mc-header-actions">
          <button className="mc-btn-ghost" onClick={() => setShowAssignModal(true)}>
            <Package size={15} strokeWidth={1.6} /> Membership
          </button>
          <button className="mc-btn-ghost">Print</button>
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
          onSuccess={() => {}}
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
              <SnapshotItem icon={Phone}    label="Mobile"   value={medicalCase.phone || '—'} />
              <SnapshotItem icon={Calendar} label="DOB"      value={(medicalCase as any).dateOfBirth || '—'} />
              <SnapshotItem icon={Clock}    label="Wait"     value="—" />
              <SnapshotItem icon={MapPin}   label="Location" value={(medicalCase as any).city || '—'} />
            </div>

            <button className="mc-snapshot-edit-btn">Edit Profile</button>
          </div>

          {/* AI Hub */}
          <div className="mc-ai-card">
            <Sparkles className="mc-ai-bg-icon" size={80} strokeWidth={1.6} />
            <div className="mc-ai-title">Clinical AI</div>
            <p className="mc-ai-sub">
              Analyze patient trajectory based on clinical history and recent findings.
            </p>
            <button className="mc-ai-btn" onClick={() => setActiveTab('consultant')}>
              Run Analysis <ChevronRight size={12} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {/* Workspace: Tab Panel */}
        <div className="mc-workspace">
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
            {activeTab === 'summary'      && <SummaryView data={fullData} />}
            {activeTab === 'vitals'       && <VitalsView vitals={vitals} onRecord={() => setShowVitalsModal(true)} />}
            {activeTab === 'soap'         && <SoapView soap={soap} />}
            {activeTab === 'prescription' && <RemedyChartSession regid={Number(regid)} />}
            {activeTab === 'ai'           && <AiRemedyView regid={Number(regid)} />}
            {activeTab === 'consultant'   && <AiConsultantView regid={Number(regid)} />}
            {activeTab === 'communication' && <CommunicationView regid={Number(regid)} phone={(medicalCase as any).phone || ''} name={(medicalCase as any).patientName || ''} />}

            {showVitalsModal && (
              <VitalsFormModal 
                visitId={medicalCase.id}
                regid={Number(regid)}
                onClose={() => setShowVitalsModal(false)}
              />
            )}

            {!['summary', 'vitals', 'soap', 'prescription', 'ai', 'consultant', 'communication'].includes(activeTab) && (
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
  return (
    <div className="mc-summary-grid">
      <div className="mc-summary-card">
        <div className="mc-summary-card-title">
          <AlertCircle size={14} strokeWidth={1.6} style={{ color: 'var(--warning)' }} />
          Active Conditions
        </div>
        <div className="mc-conditions">
          <span className="mc-condition-chip rose">Severe Gastritis</span>
          <span className="mc-condition-chip indigo">Chronic Sinusitis</span>
        </div>
      </div>
      <div className="mc-summary-card">
        <div className="mc-summary-card-title">
          <CheckCircle2 size={14} strokeWidth={1.6} style={{ color: 'var(--success)' }} />
          Treatment Status
        </div>
        <p className="mc-treatment-text">
          15-day course. Patient reports 40% improvement in primary symptoms.
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

function SoapView({ soap }: any) {
  return (
    <div className="mc-soap-wrap">
      <div className="mc-soap-topbar">
        <span className="mc-soap-topbar-title">Clinical Observation (SOAP)</span>
        <button className="mc-soap-ai-btn">
          <Sparkles size={12} strokeWidth={1.6} /> AI Assist
        </button>
      </div>
      <div className="mc-soap-body">
        <SoapSection label="Subjective" value={soap?.[0]?.subjective || 'Pending patient statement.'} />
        <SoapSection label="Objective"  value={soap?.[0]?.objective  || 'Pending clinical findings.'} />
        <SoapSection label="Assessment" value={soap?.[0]?.assessment || 'Provisional diagnosis pending.'} />
        <SoapSection label="Plan"       value={soap?.[0]?.plan       || 'Treatment plan pending configuration.'} />
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

function PrescriptionView({ prescriptions }: any) {
  return (
    <div className="mc-rx-list">
      {prescriptions?.map((p: any) => (
        <div key={p.id} className="mc-rx-item">
          <div className="mc-rx-left">
            <div className="mc-rx-icon">Rx</div>
            <div>
              <div className="mc-rx-name">{p.remedyName || 'Arnica Montana'}</div>
              <div className="mc-rx-detail">
                30C · 2 pills TDS · {p.days || 3} days
              </div>
            </div>
          </div>
          <button className="mc-rx-menu-btn">
            <MoreHorizontal size={16} strokeWidth={1.6} />
          </button>
        </div>
      ))}
      <button className="mc-add-rx-btn">+ Add to prescription</button>
    </div>
  );
}

/* ─── Communication Tab ──────────────────────────────────────────── */
function CommunicationView({ regid, phone, name }: { regid: number; phone: string; name: string }) {
  const { data: templates = [] } = useQuery({
    queryKey: ['communications', 'templates'],
    queryFn: () => apiClient.get('/communications/templates').then(r => r.data as any[]),
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
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Contact Info */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Patient Contact
          </div>
          <div style={{ background: '#FAFAF8', border: '1px solid #E3E2DF', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Phone size={14} strokeWidth={1.6} style={{ color: '#2563EB' }} />
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{phone || 'No phone'}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#4A4A47' }}>
              RegID: <strong>PT-{regid}</strong>
            </div>
            {name && <div style={{ fontSize: '0.82rem', color: '#4A4A47' }}>Name: {name}</div>}
          </div>
        </div>

        {/* SMS Composer */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Send SMS
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E2DF', borderRadius: 8, padding: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', color: '#888786', marginBottom: 6 }}>Templates</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {templates.slice(0, 6).map((t: any) => (
                  <button key={t.id} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #E3E2DF', fontSize: '0.72rem', cursor: 'pointer', background: '#fff' }}
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
              style={{ width: '100%', minHeight: 80, padding: '8px 10px', border: '1px solid #E3E2DF', borderRadius: 6, fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }}
            />
            {sent && <div style={{ fontSize: '0.78rem', color: '#16A34A', marginTop: 6 }}>✓ SMS sent successfully</div>}
            {error && <div style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: 6 }}>{error}</div>}
            <button
              style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
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
