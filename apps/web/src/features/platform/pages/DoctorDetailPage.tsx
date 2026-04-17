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
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--pp-blue-tint)] border-t-[var(--pp-blue)] rounded-full animate-spin" />
          <p className="text-[10px] font-black text-[var(--pp-text-3)] uppercase tracking-widest">Digital Credential Access...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="plat-profile-page p-8">
        <div className="max-w-xl mx-auto bg-white border border-[var(--pp-warm-4)] rounded-[var(--pp-radius-lg)] shadow-[var(--pp-shadow-sm)] p-12 text-center">
          <div className="w-16 h-16 bg-[var(--pp-danger-bg)] text-[var(--pp-danger-fg)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-[var(--pp-ink)] mb-3">Record Restricted</h2>
          <p className="text-[var(--pp-text-2)] text-sm mb-8 leading-relaxed">
            The requested practitioner profile is currently unavailable or has been archived.
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate('/platform/doctors')}
          >
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
        <div className="flex items-center gap-3">
          <div className="plat-doc-icon">
            <Files size={14} />
          </div>
          <div className="flex flex-col">
            <span className="plat-profile-label mb-0">Verified Record</span>
            <span className="text-[11px] font-bold text-[var(--pp-ink)] uppercase">{label}</span>
          </div>
        </div>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--pp-blue)] hover:bg-[var(--pp-blue-tint)] transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    );
  };

  return (
    <div className="plat-profile-page animate-fade-in">
      {/* Paperplane Identity Header */}
      <div className="plat-profile-header">
        <div className="plat-profile-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] font-black text-[var(--pp-text-3)] uppercase tracking-[0.2em] leading-none mb-1">Electronic Clinical Record</span>
              <h2 className="text-[10px] sm:text-xs font-black text-[var(--pp-ink)] uppercase tracking-widest leading-none flex items-center gap-2">
                Practitioner <span className="text-[var(--pp-blue)] font-mono"># {String(id).padStart(4, '0')}</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-[var(--pp-warm-2)] border border-[var(--pp-warm-4)] rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? 'bg-[var(--pp-success-fg)] animate-pulse' : 'bg-[var(--pp-text-4)]'}`} />
              <span className="text-[9px] sm:text-[10px] font-black text-[var(--pp-ink)] uppercase tracking-wider">{staff.isActive ? 'Active' : 'Archived'}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="plat-profile-container">
        <div className="plat-grid">

          {/* Sidebar - Demographic Snapshot */}
          <aside className="plat-sidebar space-y-6">
            <div className="plat-profile-card text-center">
              <div className="inline-block relative mb-6">
                <div className="w-28 h-28 rounded-[32px] bg-[var(--pp-warm-2)] border-2 border-white shadow-[var(--pp-shadow-md)] relative overflow-hidden flex items-center justify-center">
                  {staff.profilepic ? (
                    <img src={staff.profilepic} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-[var(--pp-text-4)]">
                      <User size={40} />
                      <span className="text-[8px] font-black tracking-tighter mt-1 uppercase">No Photo</span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-[var(--pp-warm-4)] rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={16} className="text-[var(--pp-success-fg)]" />
                </div>
              </div>

              <h1 className="plat-profile-title plat-capitalize mb-2">
                {staff.title} {staff.firstname} {staff.surname}
              </h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--pp-blue-tint)] text-[var(--pp-blue)] rounded-lg border border-[var(--pp-blue-border)]">
                <Award size={12} />
                <span className="text-[10px] font-black uppercase tracking-wider plat-capitalize">{staff.designation || 'Practitioner'}</span>
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--pp-warm-2)] grid grid-cols-2 gap-4">
                <div className="bg-[var(--pp-warm-1)] p-3 rounded-xl border border-white">
                  <span className="plat-profile-label">Visit Fee</span>
                  <p className="plat-profile-value plat-profile-mono text-lg">₹{staff.consultationFee || '0'}</p>
                </div>
                <div className="bg-[var(--pp-warm-1)] p-3 rounded-xl border border-white">
                  <span className="plat-profile-label">Tenure</span>
                  <p className="plat-profile-value text-lg">{staff.joiningdate ? new Date(staff.joiningdate).getFullYear() : 'New'}</p>
                </div>
              </div>
            </div>

            <div className="plat-profile-card">
              <h3 className="plat-profile-section-title !mb-4">
                <div className="w-6 h-6 bg-[var(--pp-blue-tint)] text-[var(--pp-blue)] rounded flex items-center justify-center shadow-sm"><Phone size={12} /></div>
                Contact Gateway
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-[var(--pp-warm-2)] rounded-lg border border-white">
                  <span className="plat-profile-label">Verified Mobile</span>
                  <p className="plat-profile-value plat-profile-mono text-sm">{staff.mobile}</p>
                </div>
                <div className="px-1">
                  <span className="plat-profile-label">Clinical Email</span>
                  <p className="text-xs font-bold text-[var(--pp-ink)] truncate underline decoration-[var(--pp-warm-4)] underline-offset-4">{staff.email}</p>
                </div>
                <div className="px-1">
                  <span className="plat-profile-label">Assigned Station</span>
                  <p className="text-xs font-bold text-[var(--pp-ink)] plat-capitalize flex items-center gap-1.5">
                    <MapPin size={10} className="text-[var(--pp-danger-fg)]" /> {staff.city || 'Regional Hub'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content - Clinical Record */}
          <section className="plat-main space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="plat-profile-card hover:border-[var(--pp-blue-border)] transition-colors">
                <h3 className="plat-profile-section-title">
                  <div className="w-6 h-6 bg-[var(--pp-success-bg)] text-[var(--pp-success-fg)] rounded flex items-center justify-center shadow-sm"><GraduationCap size={12} /></div>
                  Academic Record
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--pp-warm-2)] rounded-xl border border-white shadow-sm">
                    <span className="plat-profile-label">Primary Qualification</span>
                    <p className="text-sm font-extrabold text-[var(--pp-ink)] plat-capitalize">{staff.qualification || 'Medical Graduate'}</p>
                  </div>
                  <div className="px-1">
                    <span className="plat-profile-label">Alma Mater / University</span>
                    <p className="text-[13px] font-bold text-[var(--pp-ink)] plat-capitalize leading-snug">{staff.institute || 'Verified Institution'}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--pp-blue-tint)] border border-[var(--pp-blue-border)] rounded-lg w-max shadow-sm">
                    <Landmark size={12} className="text-[var(--pp-blue)]" />
                    <span className="text-[10px] font-black text-[var(--pp-blue-deep)] font-mono tracking-tighter uppercase">Reg: {staff.registrationId || 'PENDING'}</span>
                  </div>
                </div>
              </div>

              <div className="plat-profile-card hover:border-amber-200 transition-colors">
                <h3 className="plat-profile-section-title">
                  <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded flex items-center justify-center shadow-sm"><Fingerprint size={12} /></div>
                  Identity & Compliance
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col p-4 bg-[var(--pp-warm-1)] rounded-xl border border-[var(--pp-warm-4)] shadow-sm">
                    <span className="plat-profile-label">Aadhar UIDAI</span>
                    <span className="text-xs font-black font-mono tracking-[0.2em]">{staff.aadharnumber || 'NOT RECORDED'}</span>
                  </div>
                  <div className="flex flex-col p-4 bg-[var(--pp-warm-1)] rounded-xl border border-[var(--pp-warm-4)] shadow-sm">
                    <span className="plat-profile-label">Taxation PAN</span>
                    <span className="text-xs font-black font-mono tracking-[0.2em] uppercase">{staff.pannumber || 'NOT RECORDED'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credential Vault */}
            <div className="plat-profile-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="plat-profile-section-title !mb-0">
                  <div className="w-6 h-6 bg-purple-50 text-purple-600 rounded flex items-center justify-center shadow-sm"><Files size={12} /></div>
                  Digital Credential Vault
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-100 rounded text-[9px] font-black text-purple-700 uppercase">
                  <Sparkles size={10} /> Clinical Compliance
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderDocument('Medical Registration', staff.registrationCertificate)}
                {renderDocument('Identity Card (Aadhar)', staff.aadharCard)}
                {renderDocument('Taxation ID (PAN)', staff.panCard)}
                {renderDocument('Clinical Degree: BHMS', staff.bhmsDocument)}
                {renderDocument('Advanced Degree: MD', staff.mdDocument)}
                {renderDocument('Higher Secondary (12th)', staff.col12Document)}
                {renderDocument('Primary Secondary (10th)', staff.col10Document)}
                {renderDocument('Appointment Letter', staff.appointmentLetter)}
              </div>
            </div>

            {/* Address Residency */}
            <div className="plat-profile-card">
              <h3 className="plat-profile-section-title !mb-6">
                <div className="w-6 h-6 bg-[var(--pp-danger-bg)] text-[var(--pp-danger-fg)] rounded flex items-center justify-center shadow-sm"><MapPin size={12} /></div>
                Residency Log
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-4 bg-[var(--pp-warm-2)] rounded-xl border border-white shadow-sm">
                  <span className="plat-profile-label">Primary Station</span>
                  <p className="text-[13px] font-bold leading-relaxed plat-capitalize text-[var(--pp-ink)]">
                    {staff.address || 'Administrative station not recorded.'}
                  </p>
                </div>
                <div className="p-4 border border-[var(--pp-warm-2)] rounded-xl shadow-sm">
                  <span className="plat-profile-label">Permanent Record</span>
                  <p className="text-[13px] font-bold leading-relaxed plat-capitalize text-[var(--pp-ink)]">
                    {staff.permanentAddress || 'Consistent with primary station.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="plat-profile-card bg-gradient-to-br from-white to-[var(--pp-warm-1)]">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Award size={160} />
              </div>
              <h3 className="plat-profile-section-title">
                <div className="w-6 h-6 bg-[var(--pp-blue-tint)] text-[var(--pp-blue)] rounded flex items-center justify-center shadow-sm"><FileText size={12} /></div>
                Institutional Summary
              </h3>
              <p className="text-sm leading-relaxed text-[var(--pp-text-2)] font-medium max-w-2xl relative z-10">
                {staff.about || 'A professional practitioner summary is currently being prepared for this clinical record. All academic and institutional credentials have been digitally verified for regulatory compliance within the HomeoX platform.'}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
