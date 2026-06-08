import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, CheckCircle, Upload, MapPin, CreditCard, Stethoscope,
  Loader2, X, File, Image, Sparkles, Package, Truck, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { apiClient } from '@/infrastructure/api-client';

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  preview?: string;
}

export function FollowUpWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [complaints, setComplaints] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(s => s.user);

  // File upload handlers
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

  const handleGoToCheckout = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{ data: { isMember: boolean } }>('/follow-ups', {
        patientId: user?.id,
        complaints,
        address
      });
      setIsMember(res.data?.data?.isMember ?? false);
      setStep(4);
    } catch (err) {
      console.error('Error fetching membership logic', err);
      // fallback — go to checkout anyway
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(uf => formData.append('files', uf.file));
        formData.append('type', 'FOLLOW_UP_REPORT');
        
        if (user?.id) formData.append('patientId', String(user.id));
        
        await apiClient.post('/portal/upload-reports', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    } catch (err) {
      console.error('Failed to upload reports', err);
    } finally {
      setIsLoading(false);
    }
    // TODO: Integrate with actual payment gateway (Razorpay) when ready
    setIsSubmitted(true);
    setStep(5);
  };

  // Step 5: Success Screen
  if (step === 5 && isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 fade-in">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Follow-Up Submitted! 🎉</h1>
            <p className="text-xs text-slate-500">Your follow-up request has been received. The doctor will review your case.</p>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-emerald-800 text-sm mb-3">Request Summary</h3>
            <div className="space-y-2 text-xs">
              <div><span className="text-emerald-600 font-medium">Patient:</span> <span className="text-emerald-900 font-semibold">{user?.name}</span></div>
              <div><span className="text-emerald-600 font-medium">Reports:</span> <span className="text-emerald-900">{uploadedFiles.length} file(s) uploaded</span></div>
              <div><span className="text-emerald-600 font-medium">Delivery:</span> <span className="text-emerald-900">{address}</span></div>
              <div><span className="text-emerald-600 font-medium">Charges:</span> <span className="text-emerald-900 font-semibold">{isMember ? '₹0 (Membership)' : '₹600'}</span></div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              What happens next?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex items-start gap-2.5 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <div>
                  <div className="text-xs font-semibold text-blue-800">Doctor Review</div>
                  <div className="text-[10px] text-blue-700 leading-tight">Your doctor will review complaints and reports.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <div>
                  <div className="text-xs font-semibold text-purple-800">Prescription</div>
                  <div className="text-[10px] text-purple-700 leading-tight">Prescription updated & medicine dispatched.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-green-50/50 rounded-lg border border-green-100">
                <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <div>
                  <div className="text-xs font-semibold text-green-800">WhatsApp Alert</div>
                  <div className="text-[10px] text-green-700 leading-tight">Tracking details sent on WhatsApp.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onBack} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
              Back to Menu
            </button>
            <button onClick={() => window.location.href = '/'} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex-1">
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
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Follow-Up & Refill</h1>
            <p className="text-xs text-slate-500">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        {/* Wizard Steps */}
        <div className="space-y-4">
          {/* Step 1: Chief Complaints / Health Update */}
          {step === 1 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Chief Complaints & Health Progress</h2>
              <p className="text-xs text-slate-500 leading-normal">Describe your current health status and any new symptoms since your last visit.</p>
              <textarea 
                className="w-full border border-slate-300 rounded-xl p-3 text-sm min-h-[80px] max-h-[110px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe your current chief complaints and health progress..."
                value={complaints}
                onChange={e => setComplaints(e.target.value)}
              />
              {!complaints.trim() && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1">
                  <AlertCircle size={10} />
                  Chief complaints are mandatory for follow-up requests
                </p>
              )}
              <button 
                onClick={() => setStep(2)}
                disabled={!complaints.trim()}
                className="w-full md:w-auto bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Next: Upload Reports
              </button>
            </div>
          )}

          {/* Step 2: Upload Recent Reports */}
          {step === 2 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Upload Recent Reports</h2>
              <p className="text-xs text-slate-500 leading-normal">Upload any new reports for comparison with previous records. The doctor will review report changes on the portal.</p>
              
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload size={32} className="mx-auto mb-2 text-emerald-400" />
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
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex-1"
                >
                  {uploadedFiles.length > 0 ? 'Next: Delivery Address' : 'Skip & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Delivery Address */}
          {step === 3 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Confirm Delivery Address</h2>
              <p className="text-xs text-slate-500 leading-normal">Where should we send your medicines? Enter your complete delivery address.</p>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Full Address <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm min-h-[60px] max-h-[85px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter full delivery address..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Pincode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., 400001"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(2)}
                  className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleGoToCheckout}
                  disabled={!address.trim() || !pincode.trim() || pincode.length < 6 || isLoading}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isLoading ? <><Loader2 className="animate-spin mr-1.5" size={16} /> Checking...</> : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Payment & Confirmation */}
          {step === 4 && (
            <div className="fade-in space-y-4">
              <h2 className="text-base font-semibold text-slate-800">Payment & Confirmation</h2>
              
              {/* Membership Check Result */}
              {isMember ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h3 className="font-bold text-emerald-800 text-sm flex items-center gap-2 mb-1.5">
                    <CheckCircle size={16} /> Active Membership Detected
                  </h3>
                  <p className="text-emerald-700 text-xs leading-normal">
                    You have an active membership. Consultation and standard shipping charges are waived.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-1.5">
                    <CreditCard size={16} /> Regular Fee Applies
                  </h3>
                  <p className="text-amber-700 text-xs leading-normal">
                    No active membership found. Standard consultation and courier charges apply.
                  </p>
                </div>
              )}

              {/* Order Summary */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Order Summary</h4>
                
                {/* Review items */}
                <div className="space-y-2 mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-start gap-2.5 text-xs">
                    <Stethoscope size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-500">Chief Complaints:</span>
                      <p className="text-slate-800 font-medium mt-0.5 text-xs bg-slate-50 rounded-lg p-2 truncate">{complaints}</p>
                    </div>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <File size={14} className="text-blue-500 shrink-0" />
                      <span className="text-slate-500">Reports: <strong>{uploadedFiles.length} file(s)</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-xs">
                    <MapPin size={14} className="text-red-500 shrink-0" />
                    <span className="text-slate-500 truncate">Delivery: <strong>{address} — {pincode}</strong></span>
                  </div>
                </div>

                {/* Charges */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className={isMember ? "line-through text-slate-400" : "text-slate-800 font-semibold"}>₹500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Truck size={12} /> Courier Charges
                    </span>
                    <span className={isMember ? "line-through text-slate-400" : "text-slate-800 font-semibold"}>₹100</span>
                  </div>
                  {isMember && (
                    <div className="flex justify-between text-emerald-600">
                      <span className="font-medium">Membership Discount</span>
                      <span className="font-semibold">- ₹600</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                    <span>Total Amount</span>
                    <span className={isMember ? "text-emerald-600" : "text-slate-800"}>
                      {isMember ? "₹0" : "₹600"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(3)}
                  className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex-1"
                >
                  {isMember ? 'Submit Follow-Up Request' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
