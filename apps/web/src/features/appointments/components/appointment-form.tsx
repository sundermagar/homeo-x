import { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Stethoscope, DollarSign, Loader2 } from 'lucide-react';
import { VisitType } from '@mmc/types';
import type { Appointment, CreateAppointmentDto } from '@mmc/types';
import { useCreateAppointment, useUpdateAppointment, useAvailableSlots } from '../hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import '../styles/appointments.css';

interface Doctor { id: number; name: string; consultation_fee?: number; }
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

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const { data: slots = [] } = useAvailableSlots(
    form.doctorId ? Number(form.doctorId) : undefined,
    form.bookingDate || undefined,
  );

  // Fetch doctors list
  useEffect(() => {
    apiClient.get('/doctors').then(({ data }) => {
      // The API response is wrapped in { success: true, data: [...] }
      const payload = data.data ?? data;
      setDoctors(Array.isArray(payload) ? payload : []);
    }).catch(() => {});
  }, []);

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
    setForm(f => ({ ...f, doctorId: id, consultationFee: doc?.consultation_fee ? String(doc.consultation_fee) : f.consultationFee }));
  };

  const handlePatientLookup = async (value: string, field: 'id' | 'phone') => {
    if (value.length < 2) return;
    setLookupLoading(true);
    try {
      const { data } = await apiClient.get<Patient[]>(`/patients/lookup?query=${encodeURIComponent(value)}`);
      const patients = data ?? [];
      if (patients.length > 0) {
        const p = field === 'phone'
          ? patients.find(pt => pt.mobile1 === value) ?? patients[0]
          : patients.find(pt => String(pt.regid ?? pt.id) === value) ?? patients[0];
        if (!p) return;
        setForm(f => ({
          ...f,
          patientId:   String(p.regid ?? p.id ?? f.patientId),
          phone:       p.mobile1 ?? f.phone,
          patientName: `${p.first_name ?? ''} ${p.surname ?? ''}`.trim() || f.patientName,
        }));
      }
    } catch { /* silent */ } finally { setLookupLoading(false); }
  };

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.bookingDate) { setError('Booking date is required'); return; }

    const dto: CreateAppointmentDto = {
      patientId:       form.patientId ? Number(form.patientId) : undefined,
      patientName:     form.patientName || undefined,
      phone:           form.phone || undefined,
      doctorId:        form.doctorId ? Number(form.doctorId) : undefined,
      bookingDate:     form.bookingDate,
      bookingTime:     form.bookingTime || undefined,
      visitType:       form.visitType,
      consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
      notes:           form.notes || undefined,
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
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="appt-form-group">
                <label className="appt-form-label">
                  <DollarSign size={13} strokeWidth={1.6} />
                  Fee (₹)
                </label>
                <input
                  className="appt-form-input"
                  type="number"
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
              <div className="appt-form-row appt-form-row-2 appt-form-row-start">
                {form.visitType === VisitType.FollowUp ? (
                  <input
                    className="appt-form-input"
                    placeholder="Case ID / Reg No."
                    value={form.patientId}
                    onChange={e => set('patientId', e.target.value)}
                    onBlur={e => handlePatientLookup(e.target.value, 'id')}
                  />
                ) : (
                  <input
                    className="appt-form-input"
                    placeholder="Patient Name"
                    value={form.patientName}
                    onChange={e => set('patientName', e.target.value)}
                    required
                  />
                )}
                <input
                  className="appt-form-input"
                  placeholder="Mobile Number"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  onBlur={e => form.visitType === VisitType.FollowUp && handlePatientLookup(e.target.value, 'phone')}
                />
              </div>
              
              {lookupLoading && <span className="appt-lookup-loading">Looking up patient…</span>}
              
              {/* If follow-up, show the name only after successful lookup */}
              {form.visitType === VisitType.FollowUp && form.patientName && (
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
