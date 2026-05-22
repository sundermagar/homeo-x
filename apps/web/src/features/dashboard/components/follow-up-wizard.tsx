import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, UploadCloud, MapPin, CreditCard, Stethoscope, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { api as apiClient } from '@/lib/api-client';

export function FollowUpWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [complaints, setComplaints] = useState('');
  const [address, setAddress] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore(s => s.user);

  const handleGoToCheckout = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{ isMember: boolean }>('/follow-ups', {
        patientId: user?.id,
        complaints,
        address
      });
      setIsMember(res.isMember);
      setStep(4);
    } catch (err) {
      console.error('Error fetching membership logic', err);
      // fallback
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 fade-in">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Follow-Up & Medicine Refill</h1>
            <p className="text-slate-500">Step {step} of 4</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="space-y-6">
          {step === 1 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Update Health Progress</h2>
              <textarea 
                className="w-full border border-slate-300 rounded-xl p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe your current chief complaints and health progress..."
                value={complaints}
                onChange={e => setComplaints(e.target.value)}
              />
              <button 
                onClick={() => setStep(2)}
                disabled={!complaints.trim()}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Upload Recent Reports</h2>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
                <UploadCloud size={48} className="mx-auto mb-4 text-emerald-500" />
                <p>Drag and drop your files here, or click to browse</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                >
                  Skip / Next Step
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Confirm Delivery Address</h2>
              <textarea 
                className="w-full border border-slate-300 rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter full delivery address with pincode..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleGoToCheckout}
                  disabled={!address.trim() || isLoading}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Payment & Confirmation</h2>
              
              {isMember ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                    <CheckCircle size={20} /> Active Membership Detected
                  </h3>
                  <p className="text-emerald-700">
                    You have an active membership. Consultation and standard shipping charges are waived.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <CreditCard size={20} /> Regular Fee Applies
                  </h3>
                  <p className="text-amber-700">
                    No active membership found. Standard consultation and courier charges apply.
                  </p>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-6 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Consultation Fee</span>
                  <span className={isMember ? "line-through text-slate-400" : "text-slate-800"}>₹500</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Courier Charges</span>
                  <span className={isMember ? "line-through text-slate-400" : "text-slate-800"}>₹100</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-4 mt-2">
                  <span>Total Amount</span>
                  <span className={isMember ? "text-emerald-600" : "text-slate-800"}>
                    {isMember ? "₹0" : "₹600"}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(3)}
                  className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    alert('Follow-up request submitted successfully!');
                    onBack();
                  }}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex-1"
                >
                  {isMember ? 'Submit Follow-Up Request' : 'Proceed to Razorpay'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
