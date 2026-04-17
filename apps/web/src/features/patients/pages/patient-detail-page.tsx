import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePatient, useDeletePatient, useFamilyMembers, useAddFamilyMember, useRemoveFamilyMember, usePatientLookup, usePatientClinicalRecord } from '../hooks/use-patients';
import { Edit2, Trash2, UserPlus, Users, X, MapPin, Phone, CheckCircle, Search, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PatientSummary, FamilyMember } from '@mmc/types';
import '../styles/patients.css';

export default function PatientDetailPage() {
  const { regid } = useParams();
  const navigate = useNavigate();
  const numRegid = Number(regid);

  const { data: patient, isLoading } = usePatient(numRegid);
  const { data: familyMembers = [], isLoading: familyLoading } = useFamilyMembers(numRegid);
  const deleteMutation = useDeletePatient();
  const addFamilyMutation = useAddFamilyMember();
  const removeFamilyMutation = useRemoveFamilyMember();

  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyForm, setFamilyForm] = useState({ memberRegid: '', relation: 'Spouse' });
  const [searchQuery, setSearchQuery] = useState('');
  const { data: lookupResults = [] } = usePatientLookup(searchQuery);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    await deleteMutation.mutateAsync(numRegid);
    navigate('/patients');
  };

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyForm.memberRegid) return;
    await addFamilyMutation.mutateAsync({
      regid: numRegid,
      memberRegid: Number(familyForm.memberRegid),
      relation: familyForm.relation,
    });
    setFamilyForm({ memberRegid: '', relation: 'Spouse' });
    setSearchQuery('');
    setShowFamilyForm(false);
  };

  const handleRemoveFamily = async (id: number) => {
    if (!confirm('Remove this family member link?')) return;
    await removeFamilyMutation.mutateAsync({ regid: numRegid, id });
  };

  if (isLoading) {
    return <div className="app-container" style={{ textAlign: 'center', padding: '80px', color: 'var(--pp-text-3)' }}>Loading patient details...</div>;
  }
  if (!patient) {
    return <div className="app-container" style={{ textAlign: 'center', padding: '80px', color: 'var(--pp-danger-fg)' }}>Patient not found</div>;
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="pat-info-row">
      <span className="pat-info-label">{label}</span>
      <span className="pat-info-value">{value || '—'}</span>
    </div>
  );

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header */}
      <div className="pat-header">
        <div className="pat-avatar pat-avatar--lg">
          {(patient.firstName?.[0] || '?').toUpperCase()}
        </div>
        <div className="pat-header-info">
          <h1 className="pat-header-name">
            {patient.title} {patient.firstName} {patient.middleName} {patient.surname}
          </h1>
          <div className="pat-header-meta">
            <span className="pat-reg-badge">RegID: {patient.regid}</span>
            <span className="text-small">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
            {patient.dateOfBirth && <span className="text-small">DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}</span>}
          </div>
        </div>
        <div className="pat-header-actions">
          <Link to={`/patients/${regid}/edit`} className="btn-secondary" style={{ display: 'flex', alignItems: 'center' }}>
            <Edit2 size={14} /> Edit
          </Link>
          <button onClick={handleDelete} className="btn-secondary pat-btn-danger">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="pp-detail-grid" style={{ marginBottom: '24px' }}>
        {/* Contact Info */}
        <div className="pp-card">
          <h3 className="pat-chart-title">
            <Phone size={16} className="pat-chart-title-icon"/> Contact Information
          </h3>
          <InfoRow label="Mobile" value={patient.phone} />
          <InfoRow label="Mobile 2" value={patient.mobile1} />
          <InfoRow label="Landline" value={patient.mobile2} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Consultation Fee" value={patient.consultationFee ? `₹${patient.consultationFee}` : null} />
        </div>

        {/* Address Info */}
        <div className="pp-card">
          <h3 className="pat-chart-title">
            <MapPin size={16} className="pat-chart-title-icon"/> Address & Personal
          </h3>
          <InfoRow label="Address" value={[patient.address, patient.road, patient.area].filter(Boolean).join(', ')} />
          <InfoRow label="City" value={patient.city} />
          <InfoRow label="State" value={patient.state} />
          <InfoRow label="PIN" value={patient.pin} />
          <InfoRow label="Religion" value={patient.religion} />
          <InfoRow label="Occupation" value={patient.occupation} />
          <InfoRow label="Marital Status" value={patient.maritalStatus} />
        </div>
      </div>

      <ClinicalTrends regid={numRegid} />

      {/* Family Group Management */}
      <div className="pp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pat-section-header">
          <h3 className="pat-section-title">
            <Users size={16} className="pat-section-title-icon"/> Family Group
          </h3>
          <button
            onClick={() => setShowFamilyForm(!showFamilyForm)}
            className={`btn-secondary${showFamilyForm ? ' pat-btn-danger' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {showFamilyForm ? <><X size={14}/> Cancel</> : <><UserPlus size={14}/> Link Member</>}
          </button>
        </div>

        {showFamilyForm && (
          <div style={{ padding: '20px', borderBottom: '1px solid var(--pp-warm-4)', background: 'white' }}>
            <form onSubmit={handleAddFamily} className="pp-filter-bar" style={{ alignItems: 'flex-end' }}>
              <div style={{ position: 'relative' }}>
                <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>SEARCH PATIENT</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)' }} />
                  <input
                    className="pp-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or mobile..."
                    style={{ paddingLeft: '36px' }}
                  />
                </div>

                {searchQuery.length >= 2 && lookupResults.length > 0 && !familyForm.memberRegid && (
                  <div className="pp-card pat-lookup-dropdown">
                    {lookupResults.filter((p: PatientSummary) => p.regid !== numRegid).map((p: PatientSummary) => (
                      <div
                        key={p.regid}
                        onClick={() => { setFamilyForm(f => ({ ...f, memberRegid: String(p.regid) })); setSearchQuery(p.fullName); }}
                        className="hover-row pat-lookup-item"
                      >
                        <div className="pat-lookup-name">{p.fullName}</div>
                        <div className="pat-lookup-sub">RegID: {p.regid} • {p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}

                {familyForm.memberRegid && (
                  <div className="pat-lookup-selected">
                    <span className="pat-lookup-check"><CheckCircle size={12}/> Selected: {searchQuery}</span>
                    <button type="button" onClick={() => { setFamilyForm(f => ({ ...f, memberRegid: '' })); setSearchQuery(''); }} style={{ border: 'none', background: 'transparent', color: 'var(--pp-danger-fg)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>RELATIONSHIP</label>
                <select className="pp-select" value={familyForm.relation} onChange={e => setFamilyForm(f => ({ ...f, relation: e.target.value }))}>
                  {['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" disabled={addFamilyMutation.isPending || !familyForm.memberRegid} className="btn-primary" style={{ padding: '10px 24px', opacity: !familyForm.memberRegid ? 0.5 : 1 }}>
                {addFamilyMutation.isPending ? 'Linking...' : 'Link Member'}
              </button>
            </form>
          </div>
        )}

        <div className="pp-table-scroll">
          {familyLoading ? (
            <div className="pat-loading-state">Loading family members...</div>
          ) : familyMembers.length === 0 ? (
            <div className="pat-empty-state">
              <p className="pat-empty-state-title">No family members linked</p>
              <p className="text-small">Click "Link Member" to connect related patients</p>
            </div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>RegID</th>
                  <th>Relationship</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {familyMembers.map((m: FamilyMember) => (
                  <tr key={m.id} className="hover-row">
                    <td>
                      <div className="pat-member-row">
                        <div className="pat-avatar pat-avatar--sm pat-avatar--warm">
                          {(m.memberName?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="pat-member-name">{m.memberName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/patients/${m.memberRegid}`} className="pp-link pp-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{m.memberRegid}</Link>
                    </td>
                    <td>
                      <span className="pat-relation-badge">{m.relation}</span>
                    </td>
                    <td className="text-body" style={{ fontSize: '13px' }}>{m.memberMobile || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleRemoveFamily(m.id)} className="btn-secondary" style={{ padding: '6px', color: 'var(--pp-danger-fg)', borderColor: 'var(--pp-warm-4)', background: 'white' }} title="Remove link">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="pat-back-link">
        <Link to="/patients" className="pp-link" style={{ fontSize: '13px', fontWeight: 600 }}>← Back to Patient Registry</Link>
      </div>
    </div>
  );
}

function ClinicalTrends({ regid }: { regid: number }) {
  const { data: record, isLoading } = usePatientClinicalRecord(regid);

  if (isLoading || !record || !record.vitals || record.vitals.length === 0) return null;

  const chartData = record.vitals
    .map((v: any) => ({
      date: new Date(v.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      weight: v.weightKg,
      systolic: v.systolicBp,
      diastolic: v.diastolicBp,
      fullDate: new Date(v.recordedAt).toLocaleDateString(),
    }))
    .reverse();

  return (
    <div className="pp-detail-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
      <div className="pp-card">
        <h3 className="pat-chart-title">
          <TrendingUp size={16} className="pat-chart-title-icon"/> Weight Trend (Kg)
        </h3>
        <div className="pat-chart-wrap">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--pp-warm-4)" />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--pp-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} tick={{ fill: 'var(--pp-text-3)' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--pp-warm-4)', boxShadow: 'var(--pp-shadow-sm)' }}
                labelStyle={{ fontWeight: 600, color: 'var(--pp-ink)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--pp-blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--pp-blue)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pp-card">
        <h3 className="pat-chart-title">
          <Activity size={16} className="pat-chart-title-icon"/> Blood Pressure Trend
        </h3>
        <div className="pat-chart-wrap">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--pp-warm-4)" />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--pp-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} tick={{ fill: 'var(--pp-text-3)' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--pp-warm-4)', boxShadow: 'var(--pp-shadow-sm)' }}
                labelStyle={{ fontWeight: 600, color: 'var(--pp-ink)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" name="Systolic" dataKey="systolic" stroke="var(--pp-danger-fg)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" name="Diastolic" dataKey="diastolic" stroke="var(--pp-success-fg)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
