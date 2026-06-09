import React, { useState } from 'react';
import {
  ArrowLeft, Video, Headphones, User, Calendar, Clock,
  CheckCircle, Loader2, AlertCircle, CreditCard, Stethoscope, ShieldCheck
} from 'lucide-react';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { useAvailableSlots, useCreateAppointment } from '@/features/appointments/hooks/use-appointments';
import { VisitType } from '@mmc/types';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';

interface OnlineConsultationWizardProps {
  type: 'Video' | 'Audio';
  phone: string;
  onBack: () => void;
}

export function OnlineConsultationWizard({ type, phone, onBack }: OnlineConsultationWizardProps) {
  const userToken = useAuthStore((s) => s.token);
  // Always start at Step 1 in the new-case flow — patient must fill details first.
  // If they already have a token (from a previous session), Step 1 will skip
  // the API call and just advance to Step 2 on submit.
  const [step, setStep] = useState(1);
  
  // Registration State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  // Booking State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{ doctor: string; date: string; time: string } | null>(null);

  const { data: doctors = [], isLoading: isLoadingDocs } = useDoctors(true);
  const { data: slots = [] } = useAvailableSlots(
    selectedDoctorId ? Number(selectedDoctorId) : undefined,
    selectedDate || undefined,
    true
  );
  
  const createMutation = useCreateAppointment(true);

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob || !gender) return;
    
    // If already logged in, skip registration entirely
    if (userToken) {
      setStep(2);
      return;
    }

    setIsRegistering(true);
    try {
      // Calculate age from DOB
      const birthDate = new Date(dob);
      const today = new Date();
      let ageNum = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        ageNum--;
      }

      const res = await apiClient.post('/portal/register', {
        name,
        phone,
        gender,
        age: ageNum
      });
      
      // sendSuccess wraps as { success, data: { token, user } }
      const payload = res.data.data || res.data;
      if (res.data.success && payload.token) {
        setAuth(payload.token, payload.user, true);
        setStep(2);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register patient. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDate || !selectedTime || !chiefComplaint.trim()) return;
    setStep(3);
  };

  const handleConfirmAndPay = async () => {
    setIsSubmitting(true);
    try {
      const doctorName = doctors.find(d => String(d.id) === selectedDoctorId)?.name || 'Doctor';
      const currentUser = useAuthStore.getState().user;
      
      const visitType = type === 'Video' ? 'Video Call' : 'Audio Call';

      const res = await createMutation.mutateAsync({
        patientId: currentUser?.regid ? Number(currentUser.regid) : undefined,
        unregisteredPatientId: currentUser?.isUnregistered ? Number(currentUser.id) : undefined,
        patientName: name || currentUser?.name || 'Patient',
        phone: phone,
        // email isn't in dto directly, but can be added or handled in notes
        doctorId: Number(selectedDoctorId),
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        visitType: visitType,
        consultationFee: 500, // Hardcoded standard fee for now
        notes: chiefComplaint,
      });

      const payload = res.data?.data || res.data;
      if (payload?.token && payload?.patient) {
        setAuth(payload.token, payload.patient, true);
      }

      // TODO: Integrate Razorpay here. For now, simulate success.
      setBookedDetails({ doctor: doctorName, date: selectedDate, time: selectedTime });
      setStep(4);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to book consultation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: step >= s ? (type === 'Video' ? '#2563eb' : '#7c3aed') : '#e2e8f0',
            color: step >= s ? '#fff' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>
            {step > s ? <CheckCircle size={14} /> : s}
          </div>
          {s < 3 && <div style={{ flex: 1, height: '2px', background: step > s ? (type === 'Video' ? '#2563eb' : '#7c3aed') : '#e2e8f0' }} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        maxWidth: '800px', margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px'
      }}>
        <button
          onClick={step === 1 || step === 4 ? onBack : step === 2 && userToken ? onBack : () => setStep(step - 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px',
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          {step === 1 ? 'Cancel' : step === 4 ? 'Return to Home' : 'Back'}
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            New {type} Consultation
          </h2>
          {step < 4 && <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Complete booking in 3 simple steps</p>}
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {step < 4 && renderProgress()}

        {/* STEP 1: Registration */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>Patient Details</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Please register to continue booking</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter patient's full name"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Date of Birth *</label>
                <input
                  required
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Gender *</label>
                <select
                  required
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="For reports and receipts"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Mobile Number</label>
                <input
                  disabled
                  value={`+91 ${phone}`}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#0f172a', color: '#fff', fontSize: '14px', fontWeight: 700,
                border: 'none', cursor: isRegistering ? 'not-allowed' : 'pointer',
                opacity: isRegistering ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {isRegistering ? <Loader2 size={18} className="animate-spin" /> : null}
              {isRegistering ? 'Registering...' : 'Continue to Booking'}
            </button>
          </form>
        )}

        {/* STEP 2: Book Appointment */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Select Doctor *</label>
              <select
                required
                value={selectedDoctorId}
                onChange={e => { setSelectedDoctorId(e.target.value); setSelectedTime(''); }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}
              >
                <option value="">Choose a doctor...</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialization}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Date *</label>
                <input
                  required
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Time Slot *</label>
                <select
                  required
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                  disabled={!slots.length}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: !slots.length ? '#f8fafc' : '#fff' }}
                >
                  <option value="">{slots.length ? 'Select time...' : 'No slots available'}</option>
                  {slots.filter((s: any) => !s.booked && !s.isPast).map((slot: any) => (
                    <option key={slot.time} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Chief Complaint *</label>
              <textarea
                required
                rows={3}
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="Briefly describe the health issue..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#0f172a', color: '#fff', fontSize: '14px', fontWeight: 700,
                border: 'none', cursor: 'pointer'
              }}
            >
              Review & Pay
            </button>
          </form>
        )}

        {/* STEP 3: Review & Pay */}
        {step === 3 && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>Order Summary</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Please review your booking details</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Patient</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{name} ({gender})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Consultation</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{type} Call</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Doctor</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                      {doctors.find(d => String(d.id) === selectedDoctorId)?.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Date & Time</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                      {selectedDate} at {selectedTime}
                    </span>
                  </div>
                  
                  <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>Total Payable</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>₹500</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmAndPay}
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px',
                  background: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: 700,
                  border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                }}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && bookedDetails && (
          <div style={{ background: '#fff', padding: '48px 32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#ecfdf5', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={40} />
            </div>
            
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              Consultation Requested!
            </h2>
            <p style={{ margin: '0 auto 32px', fontSize: '15px', color: '#64748b', maxWidth: '400px', lineHeight: 1.6 }}>
              Your {type.toLowerCase()} consultation request with <strong>{bookedDetails.doctor}</strong> for <strong>{bookedDetails.date}</strong> at <strong>{bookedDetails.time}</strong> has been submitted. The clinic will confirm your slot shortly.
            </p>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', textAlign: 'left', marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>What happens next?</h4>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>Clinic Approval</div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>Once approved, you will receive a WhatsApp confirmation with appointment details and a vitals link.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>Join the {type} Call</div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>When the doctor starts the session, a Join Call option will appear on your Patient Portal dashboard.</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!useAuthStore.getState().user?.isUnregistered) {
                  window.location.href = '/portal/select-track';
                } else {
                  onBack();
                }
              }}
              style={{
                padding: '14px 32px', borderRadius: '14px',
                background: '#0f172a', color: '#fff', fontSize: '14px', fontWeight: 700,
                border: 'none', cursor: 'pointer'
              }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
