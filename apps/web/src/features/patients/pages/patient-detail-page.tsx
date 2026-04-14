import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePatient, useDeletePatient, useFamilyMembers, useAddFamilyMember, useRemoveFamilyMember, usePatientLookup } from '../hooks/use-patients';
import { Edit2, Trash2, UserPlus, Users, X, MapPin, Phone, CheckCircle, Search } from 'lucide-react';
import type { PatientSummary, FamilyMember } from '@mmc/types';

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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--pp-warm-4)' }}>
      <span className="text-small" style={{ fontWeight: 600 }}>{label}</span>
      <span className="text-body" style={{ fontWeight: 500, color: 'var(--pp-ink)' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header */}
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600 }}>
            {(patient.firstName?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <h1 className="text-title" style={{ fontSize: '24px', marginBottom: '8px' }}>
              {patient.title} {patient.firstName} {patient.middleName} {patient.surname}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="pp-mono" style={{ fontSize: '13px', color: 'var(--pp-blue)', background: 'var(--pp-blue-tint)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--pp-blue-border)' }}>
                RegID: {patient.regid}
              </span>
              <span className="text-small">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
              {patient.dateOfBirth && <span className="text-small">DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to={`/patients/${regid}/edit`} className="btn-secondary" style={{ display: 'flex', alignItems: 'center' }}>
            <Edit2 size={14} /> Edit
          </Link>
          <button onClick={handleDelete} className="btn-secondary" style={{ color: 'var(--pp-danger-fg)', borderColor: '#fecaca', background: 'var(--pp-danger-bg)' }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="pp-detail-grid" style={{ marginBottom: '24px' }}>
        {/* Contact Info */}
        <div className="pp-card">
          <h3 className="text-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <Phone size={16} color="var(--pp-blue)"/> Contact Information
          </h3>
          <InfoRow label="Mobile" value={patient.phone} />
          <InfoRow label="Mobile 2" value={patient.mobile1} />
          <InfoRow label="Landline" value={patient.mobile2} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Consultation Fee" value={patient.consultationFee ? `₹${patient.consultationFee}` : null} />
        </div>

        {/* Address Info */}
        <div className="pp-card">
          <h3 className="text-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <MapPin size={16} color="var(--pp-blue)"/> Address & Personal
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

      {/* Family Group Management */}
      <div className="pp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pp-warm-1)' }}>
          <h3 className="text-title" style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--pp-blue)"/> Family Group
          </h3>
          <button 
            onClick={() => setShowFamilyForm(!showFamilyForm)} 
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', borderColor: showFamilyForm ? '#fecaca' : undefined, color: showFamilyForm ? 'var(--pp-danger-fg)' : undefined, background: showFamilyForm ? 'var(--pp-danger-bg)' : undefined }}
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
                  <div className="pp-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: 0, marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--pp-shadow-md)' }}>
                    {lookupResults.filter((p: PatientSummary) => p.regid !== numRegid).map((p: PatientSummary) => (
                      <div 
                        key={p.regid} 
                        onClick={() => { setFamilyForm(f => ({ ...f, memberRegid: String(p.regid) })); setSearchQuery(p.fullName); }} 
                        className="hover-row"
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--pp-warm-4)' }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--pp-ink)' }}>{p.fullName}</div>
                        <div className="text-small">RegID: {p.regid} • {p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}

                {familyForm.memberRegid && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="text-small" style={{ color: 'var(--pp-success-fg)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12}/> Selected: {searchQuery}</span>
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
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--pp-text-3)' }}>Loading family members...</div>
          ) : familyMembers.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--pp-text-3)' }}>
              <p style={{ fontWeight: 600, color: 'var(--pp-ink)', marginBottom: '8px' }}>No family members linked</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pp-warm-3)', color: 'var(--pp-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>
                          {(m.memberName?.[0] || '?').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--pp-ink)' }}>{m.memberName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/patients/${m.memberRegid}`} className="pp-link pp-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{m.memberRegid}</Link>
                    </td>
                    <td>
                      <span className="text-label" style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--pp-warm-2)', borderRadius: '12px', border: '1px solid var(--pp-warm-4)', fontSize: '10px' }}>
                        {m.relation}
                      </span>
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

      <div style={{ marginTop: '24px' }}>
        <Link to="/patients" className="pp-link" style={{ fontSize: '13px', fontWeight: 600 }}>← Back to Patient Registry</Link>
      </div>
    </div>
  );
}
