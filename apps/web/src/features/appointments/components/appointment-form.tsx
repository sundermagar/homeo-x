import { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Stethoscope, DollarSign, Loader2, Printer, Phone, CheckCircle } from 'lucide-react';
import { VisitType, Role } from '@mmc/types';
import type { Appointment, CreateAppointmentDto } from '@mmc/types';
import { useCreateAppointment, useUpdateAppointment, useAvailableSlots } from '../hooks/use-appointments';
import { useDoctors } from '../hooks/use-doctors';
import { useOrganizations } from '@/features/platform/hooks/use-organizations';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { NumericInput } from '@/shared/components/NumericInput';
import { printAppointmentSlip } from '@/shared/utils/print';
import '../styles/appointments.css';

interface Doctor { id: number; name: string; consultation_fee?: number; isActive?: boolean; }
interface Patient { id: number; regid?: number; first_name?: string; surname?: string; mobile1?: string; }

interface Props {
  initialDate?: string;
  editAppointment?: Appointment | null;
  onClose: () => void;
  onSuccess?: () => void;
  onCancel?: () => void; // Added onCancel support for drawer
}

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  phone: '',
  doctorId: '',
  bookingDate: new Date().toISOString().split('T')[0],
  bookingTime: '',
  visitType: VisitType.New,
  consultationFee: '',
  notes: '',
};

export function AppointmentForm({ initialDate, editAppointment, onClose, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM, bookingDate: initialDate ?? EMPTY_FORM.bookingDate });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'id' | 'phone' | null>(null);
  const [bookingResult, setBookingResult] = useState<{doctorName: string; tokenNo?: number} | null>(null);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const { data: slots = [] } = useAvailableSlots(
    form.doctorId ? Number(form.doctorId) : undefined,
    form.bookingDate || undefined,
  );

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
        phone: editAppointment.phone ?? '',
        doctorId: String(editAppointment.doctorId ?? ''),
        bookingDate: editAppointment.bookingDate ?? '',
        bookingTime: editAppointment.bookingTime ?? '',
        visitType: (editAppointment.visitType as VisitType) ?? VisitType.New,
        consultationFee: editAppointment.consultationFee ?? '',
        notes: editAppointment.notes ?? '',
      });
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

  // Debounced lookup for suggestions
  useEffect(() => {
    // Only search if user is actively typing in a field
    if (!activeSearchField) return;

    const value = activeSearchField === 'name' ? form.patientName
      : activeSearchField === 'id' ? form.patientId
        : activeSearchField === 'phone' ? form.phone : '';

    if (value.trim().length >= 2) {
      setLookupLoading(true);
      const timer = setTimeout(async () => {
        try {
          const { data } = await apiClient.get<any>(`/patients/lookup?query=${encodeURIComponent(value)}`);
          const results = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch { /* silent */ } finally {
          setLookupLoading(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [form.patientName, form.patientId, form.phone, activeSearchField]);

  const selectSuggestion = (p: any) => {
    setForm(f => ({
      ...f,
      patientId: String(p.regid ?? p.id ?? f.patientId),
      phone: p.mobile1 ?? p.phone ?? f.phone,
      patientName: p.fullName || `${p.firstName ?? ''} ${p.surname ?? ''}`.trim() || f.patientName,
    }));
    setShowSuggestions(false);
    setActiveSearchField(null);
  };

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.bookingDate) { setError('Booking date is required'); return; }
    if (!form.bookingTime) { setError('Please select a time slot'); return; }

    if (!form.notes || !form.notes.trim()) {
      setError('Chief Complaint is required — describe what brings the patient in today.');
      return;
    }

    // Ensure date is in YYYY-MM-DD format for the backend
    let normalizedDate = form.bookingDate;
    if (normalizedDate && normalizedDate.includes('/')) {
      const parts = normalizedDate.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
        // DD/MM/YYYY -> YYYY-MM-DD
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

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

    try {
      if (editAppointment) {
        await updateMutation.mutateAsync({ id: editAppointment.id, dto });
        onSuccess?.();
        onClose();
      } else {
        const result = await createMutation.mutateAsync(dto);
        const created = result?.data ?? result;
        const doc = doctors.find(d => String(d.id) === form.doctorId);
        setBookingResult({
          doctorName: doc?.name || 'N/A',
          tokenNo: created?.tokenNo,
        });
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Please try again.');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // True when the selected doctor is explicitly marked offline/inactive
  const selectedDoctorInactive = !!form.doctorId &&
    doctors.some(d => String(d.id) === form.doctorId && d.isActive === false);

  // If booking was successful, show the success panel
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
                  consultationFee: form.consultationFee || '0',
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

      {/* Doctor + Fee */}
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
            {/* Active doctors */}
            {doctors.filter(d => d.isActive !== false).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            {/* Inactive doctors */}
            {doctors.filter(d => d.isActive === false).map(d => (
              <option key={d.id} value={d.id} disabled>
                {d.name} (INACTIVE)
              </option>
            ))}
          </select>

          {/* Inactive warning banner */}
          {selectedDoctorInactive && (
            <div className="appt-offline-banner">
              <span className="appt-offline-dot" />
              <span>
                <strong>Dr. {doctors.find(d => String(d.id) === form.doctorId)?.name}</strong> is currently <strong>Inactive</strong>. Appointments cannot be booked.
              </span>
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

      {/* Date + Visit Type */}
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
            min={new Date().toLocaleDateString('en-CA')} // YYYY-MM-DD in local time
            onChange={e => set('bookingDate', e.target.value)}
            required
          />
        </div>
        <div className="appt-form-group">
          <label className="appt-form-label">Visit Type</label>
          <div className="appt-type-toggle">
            {[VisitType.New, VisitType.FollowUp].map(t => (
              <button
                key={t}
                type="button"
                className={`appt-type-btn ${form.visitType === t ? 'active' : ''}`}
                onClick={() => {
                  set('visitType', t);
                  if (t === VisitType.New) {
                    setForm(f => ({ ...f, patientId: '', patientName: '' }));
                  }
                }}
              >
                {t === VisitType.New ? 'New Case' : 'Follow Up'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Slot Picker */}
      <div className="appt-form-group">
        <label className="appt-form-label">
          <Clock size={13} strokeWidth={1.6} />
          Time Slot
        </label>
        {selectedDoctorInactive ? (
          <div className="appt-slots-unavailable">
            <span style={{ fontSize: 20 }}>🔴</span>
            <span>No slots available — doctor is inactive</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="appt-slots-hint">
            Select doctor and date to see available slots
          </div>
        ) : (
          <div className="appt-slots-grid">
            {slots
              .filter(s => !s.isPast || s.booked || s.time === form.bookingTime)
              .map(slot => (
              <button
                key={slot.time}
                type="button"
                className={`appt-slot-btn ${form.bookingTime === slot.time ? 'selected' :
                  slot.booked ? 'booked' :
                    slot.isPast ? 'past' : 'available'
                  }`}
                disabled={slot.booked || slot.isPast}
                onClick={() => set('bookingTime', slot.time)}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Patient Lookup */}
      <div className="appt-form-group" style={{ position: 'relative' }}>
        <label className="appt-form-label">
          <User size={13} strokeWidth={1.6} />
          Patient Selection
        </label>
        
        <div className="appt-search-container">
          <div className="appt-search-inputs">
            {form.visitType === VisitType.FollowUp ? (
              <div className="appt-input-with-icon">
                <span className="appt-input-prefix">#</span>
                <input
                  className="appt-form-input"
                  placeholder="Enter Case ID / Reg No."
                  value={form.patientId}
                  onChange={e => { set('patientId', e.target.value); setActiveSearchField('id'); }}
                  onFocus={() => setActiveSearchField('id')}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
              </div>
            ) : (
              <div className="appt-input-with-icon">
                <User size={14} className="appt-input-prefix-icon" />
                <input
                  className="appt-form-input"
                  placeholder="Patient Full Name"
                  value={form.patientName}
                  onChange={e => { set('patientName', e.target.value); setActiveSearchField('name'); }}
                  onFocus={() => setActiveSearchField('name')}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
              </div>
            )}
            
            <div className="appt-input-with-icon">
              <span className="appt-input-prefix">+91</span>
              <NumericInput
                className="appt-form-input"
                placeholder="Mobile Number"
                value={form.phone}
                onChange={e => { set('phone', e.target.value); setActiveSearchField('phone'); }}
                onFocus={() => setActiveSearchField('phone')}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="appt-autocomplete-list">
              {suggestions.map(p => (
                <li
                  key={p.regid || p.id}
                  className="appt-autocomplete-item"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(p); }}
                >
                  <div className="appt-autocomplete-name">
                    {p.fullName || `${p.firstName ?? ''} ${p.surname ?? ''}`.trim()}
                  </div>
                  <div className="appt-autocomplete-meta">
                    <span><strong>ID:</strong> {p.regid || p.id}</span>
                    {(p.mobile1 || p.phone) && <span><Phone size={10} /> {p.mobile1 || p.phone}</span>}
                    {p.lastVisit && <span style={{ opacity: 0.7 }}>Last Visit: {new Date(p.lastVisit).toLocaleDateString()}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showSuggestions && !lookupLoading && suggestions.length === 0 && (
            <div className="appt-autocomplete-list appt-autocomplete-empty">
              <p>No matching patients found. {form.visitType === VisitType.FollowUp ? 'Check the ID and try again.' : 'You can enter a new patient name.'}</p>
            </div>
          )}
        </div>

        {lookupLoading && (
          <div className="appt-lookup-spinner">
            <Loader2 size={12} className="animate-spin" /> Looking up patient…
          </div>
        )}

        {/* If follow-up, show the name only after successful lookup if we have it */}
        {form.visitType === VisitType.FollowUp && form.patientName && !showSuggestions && (
          <div className="appt-followup-confirmed">
            <CheckCircle size={14} />
            <span>
              Confirmed: <strong>{form.patientName}</strong> (ID: {form.patientId})
            </span>
          </div>
        )}
      </div>

      {/* Chief Complaint — required, shown to the doctor on the consultation page */}
      <div className="appt-form-group">
        <label className="appt-form-label">
          Chief Complaint <span style={{ color: 'var(--pp-danger-fg)' }}>*</span>
        </label>
        <textarea
          className="appt-form-input appt-form-textarea"
          placeholder="What brings the patient in today? e.g. fever for 3 days, recurring headache, anxiety…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          required
          aria-required="true"
        />
        <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
          Required. This appears on the doctor's consultation screen as the chief complaint.
        </p>
      </div>

      {/* Actions */}
      <div className="appt-form-actions">
        <button type="button" className="appt-btn appt-form-cancel" onClick={onCancel || onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="appt-btn appt-btn-primary appt-form-submit"
          disabled={isLoading || selectedDoctorInactive}
          title={selectedDoctorInactive ? 'Doctor is inactive. Please select an available doctor.' : undefined}
        >
          {isLoading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> :
            editAppointment ? 'Save Changes' : 'Confirm Booking'}
        </button>
      </div>
    </form>
  );
}
