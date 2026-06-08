import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Calendar, Clock, CheckCircle, Activity, FileText,
  Loader2, Upload, X, File, Image, AlertCircle, MapPin, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { useAvailableSlots, useCreateAppointment } from '@/features/appointments/hooks/use-appointments';
import { VisitType } from '@mmc/types';
import { apiClient } from '@/infrastructure/api-client';

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  preview?: string;
}

export function VisitClinicWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isBooked, setIsBooked] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{ doctor: string; date: string; time: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(s => s.user);

  const { data: doctors = [], isLoading: isLoadingDocs } = useDoctors();
  const { data: slots = [] } = useAvailableSlots(
    selectedDoctorId ? Number(selectedDoctorId) : undefined,
    selectedDate || undefined
  );
  
  const createMutation = useCreateAppointment();

  // File upload handler
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      name: file.name,
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleConfirm = async () => {
    try {
      const doctorName = doctors.find(d => String(d.id) === selectedDoctorId)?.name || 'Doctor';
      
      const response = await createMutation.mutateAsync({
        patientId: user?.id,
        patientName: user?.name,
        phone: user?.phone || (user as any)?.mobile1 || '',
        doctorId: Number(selectedDoctorId),
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        visitType: VisitType.New,
        consultationFee: 0,
        notes: chiefComplaint || 'Booked via Patient Portal',
      });

      // The backend returns the new appointment ID inside data or data.data depending on the wrapper
      const appointmentId = response.data?.id || response.data?.data?.id;

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(uf => formData.append('files', uf.file));
        formData.append('type', 'VISIT_CLINIC_REPORT');
        
        // Append IDs so the backend can link these files to the patient/appointment
        if (user?.id) formData.append('patientId', String(user.id));
        if (appointmentId) formData.append('appointmentId', String(appointmentId));
        
        await apiClient.post('/portal/upload-reports', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setBookedDetails({ doctor: doctorName, date: selectedDate, time: selectedTime });
      setIsBooked(true);
      setStep(4); // Success screen
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to book appointment.');
    }
  };

  const selectedDoctorName = doctors.find(d => String(d.id) === selectedDoctorId)?.name || '';

  // Step 4: Success Screen
  if (step === 4 && isBooked) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 fade-in">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Appointment Requested! 🎉</h1>
            <p className="text-xs text-slate-500">Your booking request has been submitted. The clinic will review and confirm your slot shortly.</p>
          </div>

          {/* Booking Details Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-blue-800 text-sm mb-3">Booking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Activity size={15} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-medium">Doctor</div>
                  <div className="text-xs font-bold text-blue-900 truncate max-w-[120px]">{bookedDetails?.doctor}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar size={15} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-medium">Date</div>
                  <div className="text-xs font-bold text-blue-900">{bookedDetails?.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Clock size={15} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-medium">Time</div>
                  <div className="text-xs font-bold text-blue-900">{bookedDetails?.time}</div>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              What happens next?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex items-start gap-2.5 p-2 bg-green-50/50 rounded-lg border border-green-100">
                <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <div>
                  <div className="text-xs font-semibold text-green-800">WhatsApp Alert</div>
                  <div className="text-[10px] text-green-700 leading-tight">Confirmation sent after approval.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <div>
                  <div className="text-xs font-semibold text-blue-800">Vitals Link</div>
                  <div className="text-[10px] text-blue-700 leading-tight">A link will be shared to submit vitals.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <div>
                  <div className="text-xs font-semibold text-purple-800">Report Cover</div>
                  <div className="text-[10px] text-purple-700 leading-tight">Post-visit comparison report shared here.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Back to Menu
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex-1"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 fade-in">
      <button onClick={onBack} className="flex items-center text-xs text-slate-500 hover:text-slate-800 transition-colors mb-1">
        <ArrowLeft size={16} className="mr-1.5" /> Back to Menu
      </button>

      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Book Clinic Visit</h1>
            <p className="text-xs text-slate-500">Step {step} of 3</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        {/* Wizard Steps */}
        <div className="space-y-4">
          {/* Step 1: Doctor + Date + Time + Chief Complaint */}
          {step === 1 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Select Doctor, Date & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Select Doctor</label>
                  <select 
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toLocaleDateString('en-CA')}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Time Slot</label>
                  <select 
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    disabled={!selectedDate || !selectedDoctorId || slots.length === 0}
                  >
                    <option value="">{(!selectedDate || !selectedDoctorId) ? 'Select doctor and date' : slots.length === 0 ? 'No slots available' : 'Select a time'}</option>
                    {slots.filter(s => !s.booked && !s.isPast).map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.time}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Chief Complaint <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm min-h-[70px] max-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    placeholder="Describe your main health concern or reason for visit..."
                  />
                  {!chiefComplaint.trim() && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} />
                      Chief complaint is mandatory for booking
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!selectedDate || !selectedTime || !selectedDoctorId || !chiefComplaint.trim()}
                className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Upload Reports
              </button>
            </div>
          )}

          {/* Step 2: Upload Reports */}
          {step === 2 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Upload Recent Reports (Optional)</h2>
              <p className="text-xs text-slate-500 leading-normal">Upload any recent blood tests, X-rays, or medical reports for your doctor to review before the visit.</p>
              
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload size={32} className="mx-auto mb-2 text-blue-400" />
                <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PDF, Images • Max 20MB per file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf"
                  onChange={e => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  <h4 className="text-xs font-semibold text-slate-700">{uploadedFiles.length} file(s) selected</h4>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                          <File size={15} className="text-red-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-400">{f.size}</div>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex-1"
                >
                  {uploadedFiles.length > 0 ? 'Next: Review' : 'Skip & Review'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Book */}
          {step === 3 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Review & Book</h2>
              
              {/* Appointment Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2">
                  <CheckCircle size={16} /> Appointment Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-600 font-medium">Doctor:</span>{' '}
                    <span className="text-blue-900 font-semibold">{selectedDoctorName}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Date:</span>{' '}
                    <span className="text-blue-900 font-semibold">{selectedDate}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Time:</span>{' '}
                    <span className="text-blue-900 font-semibold">{selectedTime}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Patient:</span>{' '}
                    <span className="text-blue-900 font-semibold">{user?.name}</span>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 text-xs mb-1.5 flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  Chief Complaint
                </h4>
                <p className="text-slate-600 text-xs bg-slate-50 rounded-lg p-3 line-clamp-3">{chiefComplaint}</p>
              </div>

              {/* Uploaded Reports */}
              {uploadedFiles.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-800 text-xs mb-2 flex items-center gap-2">
                    <Upload size={14} className="text-blue-500" />
                    Uploaded Reports ({uploadedFiles.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs border border-slate-200">
                        {f.preview ? <Image size={12} className="text-blue-500" /> : <File size={12} className="text-red-500" />}
                        <span className="text-slate-700 truncate max-w-[120px]">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700 leading-relaxed">
                <span className="font-bold">After Booking:</span> Your request will be sent to the clinic. You will receive a WhatsApp message once your slot is confirmed by the doctor.
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(2)}
                  className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex flex-1 items-center justify-center disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="animate-spin mr-2" size={16} /> Booking...</>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
