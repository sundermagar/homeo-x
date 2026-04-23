import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, GraduationCap, Building2,
  User, Calendar, Briefcase, FileText, CheckCircle2,
  ExternalLink, CreditCard, ShieldCheck, Camera, Sparkles,
  Award, Globe, Landmark, Fingerprint, Files
} from 'lucide-react';
import { useStaffMember } from '@/features/staff/hooks/use-staff';
import '../styles/platform.css';

const CATEGORY = 'doctor';

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: staff, isLoading, error } = useStaffMember(CATEGORY, Number(id));

  if (isLoading) {
    return (
      <div className="plat-profile-page flex items-center justify-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--pp-blue-tint)', borderTopColor: 'var(--pp-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Digital Credential Access...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="plat-profile-page flex items-center justify-center" style={{ padding: '32px' }}>
        <div className="plat-profile-card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '48px' }}>
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--pp-ink)', marginBottom: 12 }}>Record Restricted</h2>
          <p style={{ color: 'var(--pp-text-2)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            The requested practitioner profile is currently unavailable or has been archived.
          </p>
          <button className="btn-primary" onClick={() => navigate('/platform/doctors')}>
            <ArrowLeft size={14} /> Return to Registry
          </button>
        </div>
      </div>
    );
  }

  const renderDocument = (label: string, value: string | null) => {
    if (!value) return null;
    return (
      <div className="plat-doc-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="plat-doc-icon">
            <Files size={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="plat-profile-label" style={{ marginBottom: 0 }}>Verified Record</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pp-ink)', textTransform: 'uppercase' }}>{label}</span>
          </div>
        </div>
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pp-blue)', transition: 'background 0.2s', backgroundColor: 'var(--pp-blue-tint)' }}>
          <ExternalLink size={14} />
        </a>
      </div>
    );
  };

  return (
    <div className="plat-profile-page animate-fade-in">
      {/* ─── Premium Profile Header ─── */}
      <div className="plat-profile-header">
        <div className="plat-profile-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 4 }}>Electronic Clinical Record</span>
              <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--pp-ink)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                Practitioner <span style={{ color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}># {String(id).padStart(4, '0')}</span>
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--pp-warm-2)', border: '1px solid var(--pp-warm-4)', borderRadius: 999 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: staff.isActive ? 'var(--pp-success-fg)' : 'var(--pp-text-4)', boxShadow: staff.isActive ? '0 0 8px var(--pp-success-fg)' : 'none' }} />
              <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--pp-ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{staff.isActive ? 'Active' : 'Archived'}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="plat-profile-container">
        <div className="plat-grid">
          
          {/* Sidebar - Demographics */}
          <aside className="plat-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="plat-profile-card text-center" style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, var(--pp-blue-tint), transparent)' }} />
              
              <div style={{ display: 'inline-block', position: 'relative', marginBottom: 24 }}>
                <div className="anim-float-avatar" style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--pp-warm-2)', border: '4px solid white', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {staff.profilepic ? (
                    <img src={staff.profilepic} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--pp-text-4)' }}>
                      <User size={48} />
                    </div>
                  )}
                </div>
                {staff.isActive && (
                  <div style={{ position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, background: 'white', border: '1px solid var(--pp-warm-4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--pp-shadow-sm)' }}>
                    <CheckCircle2 size={18} fill="var(--pp-success-fg)" color="white" />
                  </div>
                )}
              </div>

              <h1 className="plat-profile-title plat-capitalize" style={{ marginBottom: 8, position: 'relative', zIndex: 10 }}>
                {staff.title} {staff.firstname} {staff.surname}
              </h1>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', borderRadius: 8, border: '1px solid var(--pp-blue-border)', position: 'relative', zIndex: 10 }}>
                <Award size={12} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="plat-capitalize">{staff.designation || 'Practitioner'}</span>
              </div>

              <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--pp-warm-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--pp-warm-1)', padding: 12, borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                  <span className="plat-profile-label">Visit Fee</span>
                  <p className="plat-profile-value plat-profile-mono text-title" style={{ color: 'var(--pp-blue-deep)' }}>₹{staff.consultationFee || '0'}</p>
                </div>
                <div style={{ background: 'var(--pp-warm-1)', padding: 12, borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                  <span className="plat-profile-label">Tenure</span>
                  <p className="plat-profile-value text-title" style={{ color: 'var(--pp-blue-deep)' }}>{staff.joiningdate ? new Date(staff.joiningdate).getFullYear() : 'New'}</p>
                </div>
              </div>
            </div>

            <div className="plat-profile-card">
              <h3 className="plat-profile-section-title" style={{ marginBottom: 24 }}>
                <div style={{ width: 28, height: 28, background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={14} /></div>
                Contact Gateway
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 12, background: 'var(--pp-warm-1)', borderRadius: 8, borderLeft: '3px solid var(--pp-blue)' }}>
                  <span className="plat-profile-label">Verified Mobile</span>
                  <p className="plat-profile-value plat-profile-mono">{staff.mobile}</p>
                </div>
                <div style={{ padding: '0 4px' }}>
                  <span className="plat-profile-label">Clinical Email</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-ink)' }}>{staff.email}</p>
                </div>
                <div style={{ padding: '0 4px' }}>
                  <span className="plat-profile-label">Assigned Station</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-ink)', display: 'flex', alignItems: 'center', gap: 6 }} className="plat-capitalize">
                    <MapPin size={12} fill="var(--pp-danger-bg)" color="var(--pp-danger-fg)" /> {staff.city || 'Regional Hub'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="plat-main" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }} className="hide-mobile show-desktop">
              
              <div className="plat-profile-card">
                <h3 className="plat-profile-section-title">
                  <div style={{ width: 28, height: 28, background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={14} /></div>
                  Academic Record
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 16, background: 'var(--pp-warm-1)', borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                    <span className="plat-profile-label">Primary Qualification</span>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--pp-ink)' }} className="plat-capitalize">{staff.qualification || 'Medical Graduate'}</p>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <span className="plat-profile-label">Alma Mater / University</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-ink)' }} className="plat-capitalize">{staff.institute || 'Verified Institution'}</p>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--pp-blue-tint)', border: '1px solid var(--pp-blue-border)', borderRadius: 8, width: 'max-content' }}>
                    <Landmark size={14} color="var(--pp-blue)" />
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--pp-blue-deep)', fontFamily: 'var(--pp-font-mono)' }}>REG: {staff.registrationId || 'PENDING'}</span>
                  </div>
                </div>
              </div>

              <div className="plat-profile-card">
                <h3 className="plat-profile-section-title">
                  <div style={{ width: 28, height: 28, background: 'var(--pp-warning-bg)', color: 'var(--pp-warning-fg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Fingerprint size={14} /></div>
                  Identity & Compliance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 16, background: 'var(--pp-warm-1)', borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                    <span className="plat-profile-label">Aadhar UIDAI</span>
                    <p style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--pp-font-mono)', letterSpacing: '0.15em', color: 'var(--pp-ink)' }}>{staff.aadharnumber || 'NOT RECORDED'}</p>
                  </div>
                  <div style={{ padding: 16, background: 'var(--pp-warm-1)', borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                    <span className="plat-profile-label">Taxation PAN</span>
                    <p style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--pp-font-mono)', letterSpacing: '0.15em', color: 'var(--pp-ink)', textTransform: 'uppercase' }}>{staff.pannumber || 'NOT RECORDED'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Vault */}
            <div className="plat-profile-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 className="plat-profile-section-title" style={{ margin: 0 }}>
                  <div style={{ width: 28, height: 28, background: '#F3E8FF', color: '#9333EA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Files size={14} /></div>
                  Digital Credential Vault
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#F3E8FF', border: '1px solid #E9D5FF', borderRadius: 6, color: '#7E22CE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                  <Sparkles size={12} /> Compliance
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {renderDocument('Medical Registration', staff.registrationCertificate)}
                {renderDocument('Identity Card', staff.aadharCard)}
                {renderDocument('Taxation ID (PAN)', staff.panCard)}
                {renderDocument('Clinical Degree: BHMS', staff.bhmsDocument)}
                {renderDocument('Advanced Degree: MD', staff.mdDocument)}
                {renderDocument('Appointment Letter', staff.appointmentLetter)}
              </div>
            </div>

            {/* Residency Log */}
            <div className="plat-profile-card">
              <h3 className="plat-profile-section-title" style={{ marginBottom: 24 }}>
                <div style={{ width: 28, height: 28, background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={14} /></div>
                Residency Log
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                <div style={{ padding: 16, background: 'var(--pp-warm-1)', borderRadius: 'var(--pp-radius-lg)', border: '1px solid var(--pp-warm-3)' }}>
                  <span className="plat-profile-label">Primary Station</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-ink)', lineHeight: 1.5 }} className="plat-capitalize">
                    {staff.address || 'Administrative station not recorded.'}
                  </p>
                </div>
                <div style={{ padding: 16, border: '1px dashed var(--pp-warm-4)', borderRadius: 'var(--pp-radius-lg)' }}>
                  <span className="plat-profile-label">Permanent Record</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-text-3)', lineHeight: 1.5 }} className="plat-capitalize">
                    {staff.permanentAddress || 'Consistent with primary station trajectory.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Institutional Summary */}
            <div className="plat-profile-card" style={{ background: 'linear-gradient(to right, var(--pp-blue-deep), var(--pp-blue))', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
                <Award size={180} />
              </div>
              <h3 className="plat-profile-section-title" style={{ color: 'white', marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={14} /></div>
                Institutional Summary
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500, color: 'rgba(255,255,255,0.9)', maxWidth: '80%', position: 'relative', zIndex: 10 }}>
                {staff.about || 'A professional practitioner summary is currently being prepared for this clinical record. All academic and institutional credentials have been digitally verified for regulatory compliance within the platform.'}
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}
