import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, CheckCircle, Activity, FileText, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { useAvailableSlots, useCreateAppointment } from '@/features/appointments/hooks/use-appointments';

import { VisitType } from '@mmc/types';

export function VisitClinicWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const user = useAuthStore(s => s.user);

  const { data: doctors = [], isLoading: isLoadingDocs } = useDoctors();
  const { data: slots = [] } = useAvailableSlots(
    selectedDoctorId ? Number(selectedDoctorId) : undefined,
    selectedDate || undefined
  );
  
  const createMutation = useCreateAppointment();

  const handleConfirm = async () => {
    try {
      await createMutation.mutateAsync({
        patientId: user?.id,
        patientName: user?.name,
        phone: user?.email, // assuming phone might be in email or auth store if not available
        doctorId: Number(selectedDoctorId),
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        visitType: VisitType.New,
        consultationFee: 0,
        notes: notes || 'Booked via Patient Portal',
      });
      alert('Appointment booked successfully! Check your WhatsApp for reminders.');
      onBack();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to book appointment.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 fade-in">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Book Clinic Visit</h1>
            <p className="text-slate-500">Step {step} of 2</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="space-y-6">
          {step === 1 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Select Doctor, Date & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-2 font-medium">Select Doctor</label>
                  <select 
                    className="w-full border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">Select a doctor</option>
                    {doctors.filter(d => d.isActive !== false).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-2 font-medium">Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toLocaleDateString('en-CA')}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-2 font-medium">Time Slot</label>
                  <select 
                    className="w-full border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    disabled={!selectedDate || !selectedDoctorId || slots.length === 0}
                  >
                    <option value="">{(!selectedDate || !selectedDoctorId) ? 'Select doctor and date first' : slots.length === 0 ? 'No slots available' : 'Select a time'}</option>
                    {slots.filter(s => !s.booked && !s.isPast).map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.time}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-2 font-medium">Reason for Visit (Brief)</label>
                  <textarea 
                    className="w-full border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Briefly describe your issue..."
                  />
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!selectedDate || !selectedTime || !selectedDoctorId}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review & Confirm
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Confirmation & Next Steps</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                  <CheckCircle size={20} /> Appointment Ready to Book
                </h3>
                <p className="text-blue-700">
                  You are booking a visit with <strong>{doctors.find(d => String(d.id) === selectedDoctorId)?.name}</strong> on <strong>{selectedDate}</strong> at <strong>{selectedTime}</strong>.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 mb-6 space-y-4">
                <h4 className="font-semibold text-slate-800 mb-2">What happens next?</h4>
                <div className="flex items-start gap-3 text-slate-600">
                  <Activity size={20} className="text-blue-500 shrink-0 mt-0.5" />
                  <p>You will receive a WhatsApp message with a link to submit your vitals before the visit.</p>
                </div>
                <div className="flex items-start gap-3 text-slate-600">
                  <FileText size={20} className="text-blue-500 shrink-0 mt-0.5" />
                  <p>During the visit, your doctor will share a detailed report comparison via the portal and WhatsApp.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex flex-1 items-center justify-center disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
