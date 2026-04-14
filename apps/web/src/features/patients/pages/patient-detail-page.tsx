import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePatient, useDeletePatient, useFamilyMembers, useAddFamilyMember, useRemoveFamilyMember, usePatientLookup } from '../hooks/use-patients';

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
    return <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 16 }}>Loading patient details...</div>;
  }
  if (!patient) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#ef4444', fontWeight: 600, fontSize: 16 }}>Patient not found</div>;
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</span>
    </div>
  );

  const relationColors: Record<string, { bg: string; tx: string }> = {
    Father: { bg: '#eff6ff', tx: '#1e40af' },
    Mother: { bg: '#fdf2f8', tx: '#9d174d' },
    Spouse: { bg: '#f0fdf4', tx: '#166534' },
    Son: { bg: '#fff7ed', tx: '#9a3412' },
    Daughter: { bg: '#fff7ed', tx: '#9a3412' },
    Sibling: { bg: '#faf5ff', tx: '#7e22ce' },
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>
            {(patient.firstName?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              {patient.title} {patient.firstName} {patient.middleName} {patient.surname}
            </h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', padding: '3px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>RegID: {patient.regid}</span>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
              {patient.dateOfBirth && <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/patients/${regid}/edit`} style={{ height: 38, padding: '0 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', textDecoration: 'none', background: 'white' }}>✏️ Edit</Link>
          <button onClick={handleDelete} style={{ height: 38, padding: '0 18px', borderRadius: 10, border: '1px solid #fecaca', fontSize: 13, fontWeight: 700, color: '#dc2626', cursor: 'pointer', background: '#fef2f2' }}>🗑 Delete</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {/* Contact Info */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>📇 Contact Information</h3>
          <InfoRow label="Mobile" value={patient.phone} />
          <InfoRow label="Mobile 2" value={patient.mobile1} />
          <InfoRow label="Landline" value={patient.mobile2} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Consultation Fee" value={patient.consultationFee ? `₹${patient.consultationFee}` : null} />
        </div>

        {/* Address Info */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>📍 Address & Personal</h3>
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
      <div style={{ marginTop: 28, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>👨‍👩‍👧‍👦 Family Group</h3>
          <button onClick={() => setShowFamilyForm(!showFamilyForm)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: showFamilyForm ? '#dc2626' : '#3b82f6', cursor: 'pointer', background: showFamilyForm ? '#fef2f2' : '#eff6ff' }}>
            {showFamilyForm ? '✕ Cancel' : '+ Link Member'}
          </button>
        </div>

        {showFamilyForm && (
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <form onSubmit={handleAddFamily} style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>SEARCH PATIENT</label>
                <input 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Search by name or mobile..." 
                  style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none' }} 
                />
                
                {searchQuery.length >= 2 && lookupResults.length > 0 && !familyForm.memberRegid && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                    {lookupResults.filter(p => p.regid !== numRegid).map(p => (
                      <div 
                        key={p.regid} 
                        onClick={() => { setFamilyForm(f => ({ ...f, memberRegid: String(p.regid) })); setSearchQuery(p.fullName); }} 
                        style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.fullName}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>RegID: {p.regid} • {p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}

                {familyForm.memberRegid && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>✓ Selected: {searchQuery}</span>
                    <button type="button" onClick={() => { setFamilyForm(f => ({ ...f, memberRegid: '' })); setSearchQuery(''); }} style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Change</button>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>RELATIONSHIP</label>
                <select value={familyForm.relation} onChange={e => setFamilyForm(f => ({ ...f, relation: e.target.value }))} style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none' }}>
                  {['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" disabled={addFamilyMutation.isPending || !familyForm.memberRegid} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: familyForm.memberRegid ? '#10b981' : '#94a3b8', color: 'white', fontWeight: 700, fontSize: 12, cursor: familyForm.memberRegid ? 'pointer' : 'not-allowed' }}>
                {addFamilyMutation.isPending ? 'Linking...' : 'Link'}
              </button>
            </form>
          </div>
        )}

        <div style={{ padding: familyMembers.length ? 0 : '40px 28px' }}>
          {familyLoading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading family members...</p>
          ) : familyMembers.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No family members linked</p>
              <p style={{ fontSize: 13 }}>Click "Link Member" to connect related patients</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 28px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Member</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RegID</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Relationship</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</th>
                  <th style={{ width: 80, padding: '12px 28px' }}></th>
                </tr>
              </thead>
              <tbody>
                {familyMembers.map(m => {
                  const colors = relationColors[m.relation] || { bg: '#f8fafc', tx: '#475569' };
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.bg, color: colors.tx, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                            {(m.memberName?.[0] || '?').toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{m.memberName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Link to={`/patients/${m.memberRegid}`} style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>{m.memberRegid}</Link>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: colors.bg, color: colors.tx, borderRadius: 8, fontSize: 11, fontWeight: 800, border: `1px solid ${colors.tx}20` }}>
                          {m.relation.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{m.memberMobile || '—'}</td>
                      <td style={{ padding: '14px 28px', textAlign: 'right' }}>
                        <button onClick={() => handleRemoveFamily(m.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Back */}
      <div style={{ marginTop: 28 }}>
        <Link to="/patients" style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>← Back to Patient Registry</Link>
      </div>
    </div>
  );
}
