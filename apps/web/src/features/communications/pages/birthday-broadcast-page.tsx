import React, { useState, useEffect } from 'react';
import { Gift, MessageCircle, RefreshCw, Send, CheckCircle2, User } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function BirthdayBroadcastPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("Happy Birthday! Wishing you a day filled with happiness and a year filled with joy. Regards, Homoeo Home Clinic.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/patients/meta/birthdays');
      if (res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setPatients(data);
        // Select all by default
        setSelectedIds(new Set(data.map((p: any) => p.id)));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch birthdays', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === patients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(patients.map(p => p.id)));
  };

  const handleBroadcast = async () => {
    if (selectedIds.size === 0) return alert('Select at least one patient');
    setSending(true);
    try {
      const selectedPatients = patients.filter(p => selectedIds.has(p.id));
      const patientIds = selectedPatients.map(p => p.regid);

      const res = await apiClient.post('/api/communications/whatsapp/broadcast', {
        patientIds,
        message
      });

      if (res.data?.success) {
        toast({ 
          title: 'Broadcast Started', 
          description: `Successfully initiated broadcast for ${res.data?.sent || selectedIds.size} patients.`,
          variant: 'success'
        });
        setSelectedIds(new Set());
      } else {
        throw new Error(res.data?.error || 'Broadcast failed');
      }
    } catch (err: any) {
      toast({ title: 'Broadcast Failed', description: err.message, variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gift className="text-pink-500" /> Birthday Broadcast
          </h1>
          <p className="text-slate-500 mt-1">Send personalized greetings to patients celebrating today ({format(new Date(), 'dd MMMM')})</p>
        </div>
        <button 
          onClick={fetchBirthdays} 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Message Editor */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-500" /> Greet Message
            </h3>
            <textarea
              className="w-full h-40 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your birthday message here..."
            />
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Pro Tip:</strong> Keeping messages warm and personal improves patient loyalty and clinical engagement.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Patient List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded" 
                  checked={selectedIds.size === patients.length && patients.length > 0}
                  onChange={toggleAll}
                />
                <span className="text-sm font-medium text-slate-700">
                  {selectedIds.size} of {patients.length} Selected
                </span>
              </div>
              <button
                onClick={handleBroadcast}
                disabled={sending || selectedIds.size === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
              >
                {sending ? 'Sending...' : <><Send size={16} /> Send Greetings</>}
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-20 text-center text-slate-400">Loading birthdays...</div>
              ) : patients.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-slate-300" />
                  </div>
                  <p className="text-slate-500">No birthdays identified for today.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4 w-12"></th>
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">RegID</th>
                      <th className="px-6 py-4">Mobile</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {patients.map((p) => (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(p.id) ? 'bg-blue-50/30' : ''}`}
                        onClick={() => toggleSelect(p.id)}
                      >
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded" 
                            checked={selectedIds.has(p.id)}
                            readOnly
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{p.fullName}</div>
                          <div className="text-xs text-slate-500">{p.gender}, {p.age || 'N/A'} yrs</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{p.regid}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.phone || p.mobile1 || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-xs font-bold uppercase">
                            <CheckCircle2 size={10} /> Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
