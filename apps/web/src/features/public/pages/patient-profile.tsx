import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { usePublicClinicalData, useUpdatePatientProfile } from '../hooks/use-public-api';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { 
  ChevronRight,
  LogOut, 
  Pencil,
  Mail,
  FileText,
  Shield,
  Bell as BellIcon,
  MapPin,
  User,
  Video,
  Phone,
  Check,
  Save,
  X,
  Droplet,
  ChevronsUpDown,
  Scale,
  TriangleAlert,
  Activity,
  Pill,
  UserPlus,
  Users,
  CalendarDays
} from 'lucide-react';

type ConsultMode = 'in-person' | 'video' | 'audio';

export function PatientProfile() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePublicClinicalData(phone || '');
  const updateMutation = useUpdatePatientProfile();

  const [editing, setEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [consultMode, setConsultMode] = useState<ConsultMode>('in-person');

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    email: '',
    bloodGroup: '',
    height: '',
    weight: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
  });

  // Populate form from data
  useEffect(() => {
    if (data?.patientInfo) {
      const p = data.patientInfo;
      setForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        gender: p.gender || '',
        dob: p.dob || '',
        email: p.email || '',
        bloodGroup: p.bloodGroup || '',
        height: p.height || '',
        weight: p.weight || '',
        allergies: p.allergies || '',
        chronicConditions: p.chronicConditions || '',
        currentMedications: p.currentMedications || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        pin: p.pin || '',
        emergencyName: p.emergencyName || '',
        emergencyPhone: p.emergencyPhone || '',
        emergencyRelation: p.emergencyRelation || '',
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="patient-shell">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/verify-otp" />;
  }

  const { patientInfo } = data;
  const initials = patientInfo.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ phone: phone!, updates: form });
      setEditing(false);
      setSaveSuccess(true);
      refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    navigate('/verify-otp');
  };

  const consultModes: { key: ConsultMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'in-person', label: 'In-Person', desc: 'Visit the clinic', icon: <User size={18} /> },
    { key: 'video', label: 'Video', desc: 'Video consultation', icon: <Video size={18} /> },
    { key: 'audio', label: 'Audio', desc: 'Voice call', icon: <Phone size={18} /> },
  ];

  return (
    <div className="patient-shell">
      {/* Page Header */}
      <header className="patient-header" id="patient-profile-header">
        <div className="patient-header-left">
          <div>
            <div className="patient-header-greeting" style={{ fontSize: '1.2rem' }}>
              {editing ? 'Edit Profile' : 'My Profile'}
            </div>
          </div>
        </div>
        <div className="patient-header-right">
          {!editing ? (
            <button className="pp-edit-top-btn" onClick={() => setEditing(true)} id="pp-edit-btn">
              <Pencil size={14} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="pp-cancel-btn" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
              <button 
                className="pp-save-btn" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save size={14} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="patient-main">
        {saveSuccess && (
          <div className="pp-toast-success">
            <Check size={16} /> Profile updated successfully!
          </div>
        )}

        {/* Avatar + Name */}
        <div className="patient-profile-card">
          <div className="patient-profile-avatar">{initials}</div>
          <div className="patient-profile-name">{patientInfo.name}</div>
          <div className="patient-profile-regid">
            Patient ID: {patientInfo.regid} • {phone}
          </div>
        </div>

        {/* Personal Information */}
        <div className="pp-section">
          <div className="pp-section-title">Personal Information</div>
          <div className="pp-info-card">
            <ProfileField label="First Name" value={form.firstName} editing={editing} onChange={v => updateField('firstName', v)} />
            <ProfileField label="Last Name" value={form.lastName} editing={editing} onChange={v => updateField('lastName', v)} />
            <ProfileField label="Email Address" icon={<Mail size={18} />} value={form.email} editing={editing} onChange={v => updateField('email', v)} type="email" />
            <ProfileField label="Date of Birth" icon={<CalendarDays size={18} />} value={form.dob} editing={editing} onChange={v => updateField('dob', v)} type="date" />
            <ProfileField label="Gender" icon={<Users size={18} />} value={form.gender} editing={editing} onChange={v => updateField('gender', v)} type="select" options={['Male', 'Female', 'Other']} />
          </div>
        </div>

        {/* Medical Information */}
        <div className="pp-section">
          <div className="pp-section-title">Medical Information</div>
          <div className="pp-info-card">
            <ProfileField label="Blood Group" icon={<Droplet size={18} />} value={form.bloodGroup} editing={editing} onChange={v => updateField('bloodGroup', v)} type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <div className="pp-field pp-field-row">
              <div className="pp-field-half">
                <div className="pp-field-label">Height (cm)</div>
                {editing ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#1e293b' }}>
                      <ChevronsUpDown size={18} />
                    </div>
                    <input className="pp-field-input" style={{ paddingLeft: '40px' }} value={form.height} onChange={e => updateField('height', e.target.value)} placeholder="e.g., 170" />
                  </div>
                ) : (
                  <div className="pp-field-value">{form.height || '—'}</div>
                )}
              </div>
              <div className="pp-field-half">
                <div className="pp-field-label">Weight (kg)</div>
                {editing ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#1e293b' }}>
                      <Scale size={18} />
                    </div>
                    <input className="pp-field-input" style={{ paddingLeft: '40px' }} value={form.weight} onChange={e => updateField('weight', e.target.value)} placeholder="e.g., 72" />
                  </div>
                ) : (
                  <div className="pp-field-value">{form.weight || '—'}</div>
                )}
              </div>
            </div>
            <ProfileField label={editing ? "Known Allergies" : "Allergies"} icon={<TriangleAlert size={18} />} value={form.allergies} editing={editing} onChange={v => updateField('allergies', v)} placeholder="e.g. Rhus Tox sensitivity" />
            {editing && (
              <>
                <ProfileField label="Chronic Conditions" icon={<Activity size={18} />} value={form.chronicConditions} editing={editing} onChange={v => updateField('chronicConditions', v)} placeholder="e.g. Psoriasis, Asthma" />
                <ProfileField label="Current Medications" icon={<Pill size={18} />} value={form.currentMedications} editing={editing} onChange={v => updateField('currentMedications', v)} placeholder="e.g. Arsenicum Album 30C" />
              </>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="pp-section">
          <div className="pp-section-title" style={{ color: 'var(--primary)' }}>Emergency Contact</div>
          <div className="pp-info-card">
            <ProfileField label="Contact Name" icon={<UserPlus size={18} />} value={form.emergencyName} editing={editing} onChange={v => updateField('emergencyName', v)} placeholder="Contact Name" />
            <ProfileField label="Contact Phone" icon={<Phone size={18} />} value={form.emergencyPhone} editing={editing} onChange={v => updateField('emergencyPhone', v)} placeholder="Contact Phone" />
            <ProfileField label="Relationship" icon={<Users size={18} />} value={form.emergencyRelation} editing={editing} onChange={v => updateField('emergencyRelation', v)} placeholder="e.g., Spouse, Parent" />
          </div>
        </div>

        {/* AI Preferences */}
        <div className="pp-section">
          <div className="pp-section-title" style={{ color: 'var(--primary)' }}>AI Preferences</div>
          <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Opt out of AI-assisted prescriptions</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Doctor may use AI to assist with prescription suggestions</div>
            </div>
            <label className="pn-toggle" style={{ transform: 'scale(0.8)' }}>
              <input type="checkbox" />
              <span className="pn-slider"></span>
            </label>
          </div>
        </div>

        {!editing && (
          <>
            {/* Addresses */}
            <div className="pp-section">
              <div className="pp-section-title">Addresses</div>
              <div className="pp-menu-list">
                <div className="pp-menu-item">
                  <div className="pp-menu-item-icon"><MapPin size={18} /></div>
                  <div className="pp-menu-item-text">
                    <div className="pp-menu-item-title">My Address</div>
                    <div className="pp-menu-item-desc">
                      {[form.address, form.city, form.state, form.pin].filter(Boolean).join(', ') || 'No address saved'}
                    </div>
                  </div>
                  <ChevronRight size={16} className="patient-profile-menu-arrow" />
                </div>
              </div>
            </div>

            {/* Support & Legal */}
            <div className="pp-section">
              <div className="pp-section-title">Support & Legal</div>
              <div className="pp-menu-list">
                <a href={`mailto:support@managemyclinic.in`} className="pp-menu-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="pp-menu-item-icon"><Mail size={18} /></div>
                  <div className="pp-menu-item-text">
                    <div className="pp-menu-item-title">Email Support</div>
                    <div className="pp-menu-item-desc">support@managemyclinic.in</div>
                  </div>
                  <ChevronRight size={16} className="patient-profile-menu-arrow" />
                </a>
                <button className="pp-menu-item" onClick={() => navigate('/p/terms-of-service')}>
                  <div className="pp-menu-item-icon"><FileText size={18} /></div>
                  <div className="pp-menu-item-text">
                    <div className="pp-menu-item-title">Terms of Service</div>
                  </div>
                  <ChevronRight size={16} className="patient-profile-menu-arrow" />
                </button>
                <button className="pp-menu-item" onClick={() => navigate('/p/privacy-policy')}>
                  <div className="pp-menu-item-icon"><Shield size={18} /></div>
                  <div className="pp-menu-item-text">
                    <div className="pp-menu-item-title">Privacy Policy</div>
                  </div>
                  <ChevronRight size={16} className="patient-profile-menu-arrow" />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="pp-section">
              <div className="pp-section-title">Notifications</div>
              <div className="pp-menu-list">
                <button className="pp-menu-item" onClick={() => navigate(`/patient/${phone}/notifications`)}>
                  <div className="pp-menu-item-icon"><BellIcon size={18} /></div>
                  <div className="pp-menu-item-text">
                    <div className="pp-menu-item-title">Notification Preferences</div>
                    <div className="pp-menu-item-desc">Manage push, SMS, email alerts</div>
                  </div>
                  <ChevronRight size={16} className="patient-profile-menu-arrow" />
                </button>
              </div>
            </div>

            {/* Consultation Mode */}
            <div className="pp-section">
              <div className="pp-section-title">Consultation Mode</div>
              <div className="pp-consult-modes">
                {consultModes.map(mode => (
                  <button
                    key={mode.key}
                    className={`pp-consult-mode-item ${consultMode === mode.key ? 'active' : ''}`}
                    onClick={() => setConsultMode(mode.key)}
                  >
                    <div className="pp-consult-mode-icon">{mode.icon}</div>
                    <div className="pp-consult-mode-text">
                      <div className="pp-consult-mode-label">{mode.label}</div>
                      <div className="pp-consult-mode-desc">{mode.desc}</div>
                    </div>
                    {consultMode === mode.key && (
                      <div className="pp-consult-mode-check">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="pp-section">
              <div className="pp-section-title">Account</div>
              <button className="patient-logout-btn" onClick={handleLogout} id="patient-logout-btn">
                <LogOut size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Logout
              </button>
            </div>
          </>
        )}

        <div className="pp-footer">
          Powered by <strong>ManageMyClinic</strong>
        </div>
      </main>

      <PatientBottomNav />
    </div>
  );
}

/* ─── Profile Field Subcomponent ─── */
function ProfileField({ 
  label, value, editing, onChange, type = 'text', options, placeholder, icon 
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'date' | 'select';
  options?: string[];
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pp-field">
      <div className="pp-field-label">{label}</div>
      {editing ? (
        <div style={{ position: 'relative' }}>
          {icon && (
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#1e293b' }}>
              {icon}
            </div>
          )}
          {type === 'select' ? (
            <select className="pp-field-input" style={{ paddingLeft: icon ? '40px' : undefined }} value={value} onChange={e => onChange(e.target.value)}>
              <option value="">Select...</option>
              {options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              className="pp-field-input"
              style={{ paddingLeft: icon ? '40px' : undefined }}
              type={type}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder || label}
            />
          )}
        </div>
      ) : (
        <div className="pp-field-value">{value || '—'}</div>
      )}
    </div>
  );
}

export default PatientProfile;
