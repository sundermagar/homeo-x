import { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Stethoscope, DollarSign, Loader2, Printer, Phone, CheckCircle, Search, FileText } from 'lucide-react';
import { VisitType, Role } from '@mmc/types';
import type { Appointment, CreateAppointmentDto } from '@mmc/types';
import { useCreateAppointment, useUpdateAppointment, useAvailableSlots } from '../hooks/use-appointments';
import { useDoctors } from '../hooks/use-doctors';
import { useCreatePatient } from '@/features/patients/hooks/use-patients';
import { useOrganizations } from '@/features/platform/hooks/use-organizations';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { NumericInput } from '@/shared/components/NumericInput';
import { printAppointmentSlip } from '@/shared/utils/print';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import '../styles/appointments.css';

interface Doctor { id: number; name: string; consultation_fee?: number; isActive?: boolean; }
interface Patient { id: number; regid?: number; first_name?: string; surname?: string; mobile1?: string; }

interface Props {
  initialDate?: string;
  editAppointment?: Appointment | null;
  onClose: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  gender: 'M',
  dateOfBirth: '',
  city: '',
  phone: '',
  doctorId: '',
  bookingDate: new Date().toISOString().split('T')[0],
  bookingTime: '',
  visitType: VisitType.New,
  consultationFee: '',
  notes: '',
};

type SearchStatus = 'idle' | 'searching' | 'found' | 'not-found';

export function AppointmentForm({ initialDate, editAppointment, onClose, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM, bookingDate: initialDate ?? EMPTY_FORM.bookingDate });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [bookingResult, setBookingResult] = useState<{doctorName: string; tokenNo?: number} | null>(null);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const createPatientMutation = useCreatePatient();
  const { data: slots = [] } = useAvailableSlots(
    form.doctorId ? Number(form.doctorId) : undefined,
    form.bookingDate || undefined,
  );
  
  const { useSendText } = useWhatsApp();
  const sendText = useSendText();

  const user = useAuthStore(s => s.user);

  const { data: doctorsList = [] } = useDoctors();
  const { data: orgs = [] } = useOrganizations();
  const currentOrg = orgs[0];

  useEffect(() => {
    if (doctorsList.length > 0) {
      setDoctors(doctorsList);

      // Auto-select if logged in as a doctor and not editing
      if (!editAppointment && user?.type === Role.Doctor) {
        const myDoc = doctorsList.find((d: Doctor) => d.id === user.id);
        if (myDoc) {
          setForm(f => ({
            ...f,
            doctorId: String(myDoc.id),
            consultationFee: (myDoc.consultation_fee !== undefined && myDoc.consultation_fee !== null)
              ? String(myDoc.consultation_fee)
              : f.consultationFee
          }));
        }
      }
    }
  }, [doctorsList, user, editAppointment]);

  // Populate form if editing
  useEffect(() => {
    if (editAppointment) {
      setForm({
        patientId: String(editAppointment.patientId ?? ''),
        patientName: editAppointment.patientName ?? '',
        gender: 'M',
        dateOfBirth: '',
        city: '',
        phone: editAppointment.phone ?? '',
        doctorId: String(editAppointment.doctorId ?? ''),
        bookingDate: editAppointment.bookingDate ?? '',
        bookingTime: editAppointment.bookingTime ?? '',
        visitType: (editAppointment.visitType as VisitType) ?? VisitType.New,
        consultationFee: String(editAppointment.consultationFee ?? ''),
        notes: editAppointment.notes ?? '',
      });
      setSearchStatus('found');
    }
  }, [editAppointment]);

  const handleDoctorChange = (id: string) => {
    const doc = doctors.find(d => String(d.id) === id);
    setForm(f => ({
      ...f,
      doctorId: id,
      consultationFee: (doc?.consultation_fee !== undefined && doc?.consultation_fee !== null)
        ? String(doc.consultation_fee)
        : f.consultationFee
    }));
  };

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (form.phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setSearchStatus('searching');
    setSearchResults([]);
    try {
      const { data } = await apiClient.get<any>(`/patients/lookup?query=${encodeURIComponent(form.phone)}`);
      const results = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      
      if (results.length > 0) {
        if (results.length > 1) {
           // Let the user pick if multiple
           setSearchResults(results);
           setSearchStatus('idle'); // We will show suggestions
        } else {
           selectPatient(results[0]);
        }
      } else {
        setForm(f => ({
          ...f,
          visitType: VisitType.New,
          patientId: '',
          patientName: '',
        }));
        setSearchStatus('not-found');
      }
    } catch (e) {
      console.error('Search failed', e);
      setSearchStatus('not-found');
    }
  };

  const selectPatient = (p: any) => {
    let previousDoctorId = form.doctorId;
    let previousFee = form.consultationFee;
    if (p.doctorName && doctorsList.length > 0) {
       const doc = doctorsList.find((d: Doctor) => d.name === p.doctorName);
       if (doc) {
         previousDoctorId = String(doc.id);
         previousFee = (doc.consultation_fee !== undefined && doc.consultation_fee !== null) 
             ? String(doc.consultation_fee) 
             : form.consultationFee;
       }
    }

    setForm(f => ({
      ...f,
      patientId: String(p.regid ?? p.id ?? f.patientId),
      patientName: p.fullName || `${p.firstName ?? ''} ${p.surname ?? ''}`.trim() || f.patientName,
      doctorId: previousDoctorId,
      consultationFee: previousFee,
      visitType: VisitType.FollowUp,
    }));
    setSearchStatus('found');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.bookingDate) { setError('Booking date is required'); return; }
    if (!form.bookingTime) { setError('Please select a time slot'); return; }

    if (form.visitType === VisitType.New && (!form.patientName || !form.patientName.trim())) {
      setError('Patient name is required for new registration.');
      return;
    }
    if (form.visitType === VisitType.New && !form.dateOfBirth && !form.patientId) {
      setError('Date of birth is required for new patient registration.');
      return;
    }

    let normalizedDate = form.bookingDate;
    if (normalizedDate && normalizedDate.includes('/')) {
      const parts = normalizedDate.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    try {
      if (editAppointment) {
        const dto: CreateAppointmentDto = {
          patientId: form.patientId ? Number(form.patientId) : undefined,
          patientName: form.patientName || undefined,
          phone: form.phone || undefined,
          doctorId: form.doctorId ? Number(form.doctorId) : undefined,
          bookingDate: normalizedDate,
          bookingTime: form.bookingTime || undefined,
          visitType: form.visitType as any,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : 0,
          notes: form.notes || '',
        };
        await updateMutation.mutateAsync({ id: editAppointment.id, dto });
        onSuccess?.();
        onClose();
      } else {
        let finalPatientId = form.patientId ? Number(form.patientId) : undefined;
        let unregisteredPatientId = undefined;

        // If it's a completely new patient without an ID, register them now
        if (form.visitType === VisitType.New && !finalPatientId) {
            const nameParts = form.patientName.trim().split(' ');
            const firstName = nameParts[0];
            const surname = nameParts.slice(1).join(' ') || '.';

            try {
                const newPatient = await createPatientMutation.mutateAsync({
                    title: form.gender === 'F' ? 'Mrs.' : 'Mr.',
                    firstName,
                    surname,
                    gender: form.gender as 'M'|'F'|'Other',
                    phone: form.phone,
                    dateOfBirth: form.dateOfBirth,
                    city: form.city,
                });
                finalPatientId = newPatient.regid;
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to register patient');
                return;
            }
        }

        const dto: CreateAppointmentDto = {
          patientId: finalPatientId,
          patientName: form.patientName || undefined,
          phone: form.phone || undefined,
          doctorId: form.doctorId ? Number(form.doctorId) : undefined,
          bookingDate: normalizedDate,
          bookingTime: form.bookingTime || undefined,
          visitType: form.visitType as any,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : 0,
          notes: form.notes || '',
        };

        const result = await createMutation.mutateAsync(dto);
        const created = result?.data ?? result;
        const doc = doctors.find(d => String(d.id) === form.doctorId);
        setBookingResult({
          doctorName: doc?.name || 'N/A',
          tokenNo: created?.tokenNo,
        });
        
        if (form.phone) {
          const cleaned = form.phone.replace(/\D/g, '');
          const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
          try {
            await sendText.mutateAsync({
              phone: finalPhone,
              message: `Dear ${form.patientName || 'Patient'},\n\nYour appointment with Dr. ${doc?.name || 'N/A'} is confirmed for ${normalizedDate} at ${form.bookingTime || 'N/A'}.\n${created?.tokenNo ? `Your Token Number is *${created.tokenNo}*.\n` : ''}\nRegards,\nMMC HomeoTech`
            });
          } catch (err) {
            console.error('Auto WhatsApp failed', err);
          }
        }
        
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Please try again.');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const selectedDoctorInactive = !!form.doctorId &&
    doctors.some(d => String(d.id) === form.doctorId && d.isActive === false);

  if (bookingResult) {
    return (
      <div className="appt-success-panel animate-fade-in">
        <div className="appt-success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="appt-success-text">
          <h3>Appointment Confirmed!</h3>
          <p>Dr. {bookingResult.doctorName} • {form.bookingDate} at {form.bookingTime}</p>
          {bookingResult.tokenNo && <span className="appt-token-badge">Token #{bookingResult.tokenNo}</span>}
        </div>
        <div className="appt-success-actions">
          <button
            type="button"
            className="appt-print-btn"
            onClick={() => {
              const doc = doctors.find(d => String(d.id) === form.doctorId);
              if (currentOrg) {
                const today = new Date().toISOString().split('T')[0] as string;
                printAppointmentSlip({
                  patientName: form.patientName || 'Patient',
                  phone: form.phone || '',
                  doctorName: (doc?.name) || 'N/A',
                  bookingDate: form.bookingDate || today,
                  bookingTime: form.bookingTime || '',
                  consultationFee: String(form.consultationFee || 0),
                  visitType: form.visitType,
                  tokenNo: bookingResult.tokenNo ?? undefined,
                  notes: form.notes,
                }, currentOrg);
              }
            }}
          >
            <Printer size={16} />
            Print Slip
          </button>
          <button type="button" className="appt-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="appt-form">

      {error && (
        <div className="appt-alert appt-alert-error">{error}</div>
      )}

      {!editAppointment && (
        <div className="appt-form-group">
          <label className="appt-form-label">
            <Phone size={13} strokeWidth={1.6} />
            Mobile Number
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="appt-input-with-icon" style={{ flex: 1 }}>
              <span className="appt-input-prefix">+91</span>
              <NumericInput
                className="appt-form-input"
                placeholder="Enter 10-digit mobile number"
                value={form.phone}
                onChange={e => {
                   set('phone', e.target.value);
                   if (searchStatus !== 'idle') setSearchStatus('idle');
                   if (searchResults.length > 0) setSearchResults([]);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (form.phone.length >= 10 && searchStatus !== 'searching') {
                      handleSearch();
                    }
                  }
                }}
                disabled={searchStatus === 'searching'}
              />
            </div>
            <button
              type="button"
              className="appt-btn appt-btn-primary"
              onClick={handleSearch}
              disabled={form.phone.length < 10 || searchStatus === 'searching'}
              style={{ width: '120px', justifyContent: 'center' }}
            >
              {searchStatus === 'searching' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>
        </div>
      )}

      {searchResults.length > 0 && !editAppointment && (
        <div className="appt-form-group">
          <label className="appt-form-label" style={{ color: 'var(--pp-blue)' }}>
            Multiple Patients Found — Select One:
          </label>
          <ul className="appt-autocomplete-list" style={{ position: 'relative', border: '1px solid var(--pp-blue)', display: 'block' }}>
            {searchResults.map(p => (
              <li
                key={p.regid || p.id}
                className="appt-autocomplete-item"
                onClick={() => selectPatient(p)}
                style={{ cursor: 'pointer' }}
              >
                <div className="appt-autocomplete-name">
                  {p.fullName || `${p.firstName ?? ''} ${p.surname ?? ''}`.trim()}
                </div>
                <div className="appt-autocomplete-meta">
                  <span><strong>ID:</strong> {p.regid || p.id}</span>
                  {(p.mobile1 || p.phone) && <span><Phone size={10} /> {p.mobile1 || p.phone}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {searchStatus === 'found' && !editAppointment && (
        <div className="appt-alert appt-alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>Patient Found: <strong>{form.patientName}</strong> (ID: {form.patientId})</span>
        </div>
      )}

      {searchStatus === 'not-found' && !editAppointment && (
        <div className="appt-alert appt-alert-info">
          New Patient. Please fill in the details below to proceed.
        </div>
      )}

      {searchStatus !== 'idle' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="appt-form-group">
            <label className="appt-form-label">
              <User size={13} strokeWidth={1.6} />
              Patient Full Name <span className="appt-required">*</span>
            </label>
            <input
              className="appt-form-input"
              placeholder="Enter patient full name"
              value={form.patientName}
              onChange={e => set('patientName', e.target.value)}
              required
              readOnly={searchStatus === 'found'}
              style={searchStatus === 'found' ? { backgroundColor: 'var(--pp-surface-alt)', opacity: 0.8 } : {}}
            />
          </div>

          {searchStatus === 'not-found' && !editAppointment && (
            <div className="appt-form-row appt-form-row-2 animate-fade-in" style={{ marginTop: '8px' }}>
              <div className="appt-form-group">
                <label className="appt-form-label">Gender <span className="appt-required">*</span></label>
                <select
                  className="appt-form-select"
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="appt-form-group">
                <label className="appt-form-label">Date of Birth <span className="appt-required">*</span></label>
                <input
                  className="appt-form-input"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="appt-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="appt-form-label">City (Optional)</label>
                <input
                  className="appt-form-input"
                  placeholder="e.g. Chandigarh"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="appt-form-row appt-form-row-2">
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Stethoscope size={13} strokeWidth={1.6} />
                Practitioner
              </label>
              <select
                className={`appt-form-select${selectedDoctorInactive ? ' appt-select-offline' : ''}`}
                value={form.doctorId}
                onChange={e => handleDoctorChange(e.target.value)}
              >
                <option value="">Select Doctor</option>
                {doctors.filter(d => d.isActive !== false).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                {doctors.filter(d => d.isActive === false).map(d => (
                  <option key={d.id} value={d.id} disabled>
                    {d.name} (INACTIVE)
                  </option>
                ))}
              </select>
              {selectedDoctorInactive && (
                <div className="appt-offline-banner">
                  <span className="appt-offline-dot" />
                  <span><strong>Inactive</strong> doctor selected.</span>
                </div>
              )}
            </div>
            <div className="appt-form-group">
              <label className="appt-form-label">
                <DollarSign size={13} strokeWidth={1.6} />
                Fee (₹)
              </label>
              <NumericInput
                className="appt-form-input"
                placeholder="0.00"
                value={form.consultationFee}
                onChange={e => set('consultationFee', e.target.value)}
              />
            </div>
          </div>

          <div className="appt-form-row appt-form-row-2">
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Calendar size={13} strokeWidth={1.6} />
                Booking Date
              </label>
              <input
                className="appt-form-input"
                type="date"
                value={form.bookingDate}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={e => set('bookingDate', e.target.value)}
                required
              />
            </div>
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Clock size={13} strokeWidth={1.6} />
                Time Slot
              </label>
              <select
                className="appt-form-select"
                value={form.bookingTime}
                onChange={e => set('bookingTime', e.target.value)}
                required
              >
                <option value="">Select Time Slot</option>
                {slots
                  .filter(s => !s.isPast || s.booked || s.time === form.bookingTime)
                  .map(slot => (
                    <option 
                      key={slot.time} 
                      value={slot.time} 
                      disabled={slot.booked || slot.isPast}
                    >
                      {slot.time} {slot.booked ? '(Booked)' : ''}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="appt-form-group">
            <label className="appt-form-label">
              <FileText size={13} strokeWidth={1.6} />
              Chief Complaint
            </label>
            <textarea
              className="appt-form-input appt-form-textarea"
              placeholder="What brings the patient in today? e.g. fever for 3 days, recurring headache, anxiety…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div className="appt-form-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="appt-btn appt-form-cancel" onClick={onCancel || onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="appt-btn appt-btn-primary appt-form-submit"
              disabled={isLoading || selectedDoctorInactive}
            >
              {isLoading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> :
                editAppointment ? 'Save Changes' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
