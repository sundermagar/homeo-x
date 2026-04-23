import { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Stethoscope, DollarSign, Loader2 } from 'lucide-react';
import { VisitType, Role } from '@mmc/types';
import type { Appointment, CreateAppointmentDto } from '@mmc/types';
import { useCreateAppointment, useUpdateAppointment, useAvailableSlots } from '../hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { NumericInput } from '@/shared/components/NumericInput';
import '../styles/appointments.css';

interface Doctor { id: number; name: string; consultation_fee?: number; isActive?: boolean; }
interface Patient { id: number; regid?: number; first_name?: string; surname?: string; mobile1?: string; }

interface Props {
  initialDate?: string;
  editAppointment?: Appointment | null;
  onClose: () => void;
  onSuccess?: () => void;
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

export function AppointmentForm({ initialDate, editAppointment, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM, bookingDate: initialDate ?? EMPTY_FORM.bookingDate });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'id' | 'phone' | null>(null);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const { data: slots = [] } = useAvailableSlots(
    form.doctorId ? Number(form.doctorId) : undefined,
    form.bookingDate || undefined,
  );

  const user = useAuthStore(s => s.user);

  // Fetch doctors list
  useEffect(() => {
    apiClient.get('/doctors').then(({ data }) => {
      // The response structure is { success: true, data: [] }
      const docList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setDoctors(docList);

      // Auto-select if logged in as a doctor and not editing
      if (!editAppointment && user?.type === Role.Doctor) {
        const myDoc = docList.find((d: Doctor) => d.id === user.id);
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
    }).catch(() => {});
  }, [user, editAppointment]);

  // Populate form if editing
  useEffect(() => {
    if (editAppointment) {
      setForm({
        patientId:       String(editAppointment.patientId ?? ''),
        patientName:     editAppointment.patientName ?? '',
        phone:           editAppointment.phone ?? '',
        doctorId:        String(editAppointment.doctorId ?? ''),
        bookingDate:     editAppointment.bookingDate ?? '',
        bookingTime:     editAppointment.bookingTime ?? '',
        visitType:       (editAppointment.visitType as VisitType) ?? VisitType.New,
        consultationFee: editAppointment.consultationFee ?? '',
        notes:           editAppointment.notes ?? '',
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

    // Ensure date is in YYYY-MM-DD format for the backend
    let normalizedDate = form.bookingDate;
    if (normalizedDate && normalizedDate.includes('/')) {
      const parts = normalizedDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    const dto: CreateAppointmentDto = {
      patientId:       form.patientId ? Number(form.patientId) : undefined,
      patientName:     form.patientName || undefined,
      phone:           form.phone || undefined,
      doctorId:        form.doctorId ? Number(form.doctorId) : undefined,
      bookingDate:     normalizedDate,
      bookingTime:     form.bookingTime || undefined,
      visitType:       form.visitType as any,
      consultationFee: form.consultationFee ? Number(form.consultationFee) : 0,
      notes:           form.notes || '',
    };

    try {
      if (editAppointment) {
        await updateMutation.mutateAsync({ id: editAppointment.id, dto });
      } else {
        await createMutation.mutateAsync(dto);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Please try again.');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="appt-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="appt-modal">
        {/* Header */}
        <div className="appt-modal-header">
          <h2 className="appt-modal-title">
            {editAppointment ? 'Edit Appointment' : 'Book Appointment'}
          </h2>
          <button onClick={onClose} className="appt-btn appt-btn-icon appt-modal-close">
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        {/* Body */}
        <div className="appt-modal-body">
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
                  className="appt-form-select"
                  value={form.doctorId}
                  onChange={e => handleDoctorChange(e.target.value)}
                >
                  <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option 
                        key={d.id} 
                        value={d.id} 
                        disabled={!d.isActive}
                        style={{ 
                          color: !d.isActive ? '#dc2626' : 'inherit',
                          fontWeight: !d.isActive ? '800' : 'normal',
                          backgroundColor: !d.isActive ? '#fef2f2' : 'inherit'
                        }}
                      >
                        {d.name} {!d.isActive ? ' (OFFLINE - DO NOT SELECT)' : ''}
                      </option>
                    ))}
                </select>
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
              {slots.length === 0 ? (
                <div className="appt-slots-hint">
                  Select doctor and date to see available slots
                </div>
              ) : (
                <div className="appt-slots-grid">
                  {slots.map(slot => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`appt-slot-btn ${
                        form.bookingTime === slot.time ? 'selected' :
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
            <div className="appt-form-group">
              <label className="appt-form-label">
                <User size={13} strokeWidth={1.6} />
                Patient
              </label>
              <div className="appt-form-row appt-form-row-2 appt-form-row-start" style={{ position: 'relative' }}>
                {form.visitType === VisitType.FollowUp ? (
                  <input
                    className="appt-form-input"
                    placeholder="Case ID / Reg No."
                    value={form.patientId}
                    onChange={e => { set('patientId', e.target.value); setActiveSearchField('id'); }}
                    onFocus={() => setActiveSearchField('id')}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                ) : (
                  <input
                    className="appt-form-input"
                    placeholder="Patient Name"
                    value={form.patientName}
                    onChange={e => { set('patientName', e.target.value); setActiveSearchField('name'); }}
                    onFocus={() => setActiveSearchField('name')}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    required
                  />
                )}
              <NumericInput
                className="appt-form-input"
                placeholder="Mobile Number"
                value={form.phone}
                onChange={e => { set('phone', e.target.value); setActiveSearchField('phone'); }}
                onFocus={() => setActiveSearchField('phone')}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, 
                    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: 250, overflowY: 'auto', 
                    listStyle: 'none', padding: 0, margin: '4px 0 0 0'
                  }}>
                    {suggestions.map(p => (
                      <li 
                        key={p.regid || p.id} 
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(p); }}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {p.fullName || `${p.firstName ?? ''} ${p.surname ?? ''}`.trim()}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: '12px', marginTop: 2 }}>
                          <span>ID: {p.regid || p.id}</span>
                          {(p.mobile1 || p.phone) && <span>📞 {p.mobile1 || p.phone}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {lookupLoading && <div style={{ fontSize: 12, color: 'var(--pp-text-3)', marginTop: 4 }}>Looking up patient…</div>}
              
              {/* If follow-up, show the name only after successful lookup if we have it */}
              {form.visitType === VisitType.FollowUp && form.patientName && !showSuggestions && (
                <div className="appt-followup-confirmed">
                  <span className="appt-followup-check">
                    ✓ Confirmed: {form.patientName} (ID: {form.patientId})
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="appt-form-group">
              <label className="appt-form-label">Notes (optional)</label>
              <textarea
                className="appt-form-input appt-form-textarea"
                placeholder="Additional remarks…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="appt-form-actions">
              <button type="button" className="appt-btn appt-form-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="appt-btn appt-btn-primary appt-form-submit" disabled={isLoading}>
                {isLoading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> :
                  editAppointment ? 'Save Changes' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
