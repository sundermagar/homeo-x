import React, { useState } from 'react';
import { 
  Truck, Package, MapPin, Calendar, 
  Plus, CheckCircle2, Clock, Trash2, 
  ExternalLink, ChevronRight, Send, AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

interface Shipment {
  id: number;
  regid: number;
  type: 'COURIER' | 'PICKUP';
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'COLLECTED';
  carrierName?: string;
  trackingNumber?: string;
  dispatchDate?: string;
  pickupDate?: string;
  notes?: string;
  createdAt: string;
}

export function LogisticsSection({ regid }: { regid: number }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<'COURIER' | 'PICKUP'>('COURIER');
  const [notes, setNotes] = useState('');

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['logistics', 'patient', regid],
    queryFn: async () => {
      const { data } = await apiClient.get(`/logistics/patient/${regid}`);
      return data.data as Shipment[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (input: any) => {
      await apiClient.post('/logistics', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics', 'patient', regid] });
      setIsAdding(false);
      setNotes('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiClient.patch(`/logistics/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics', 'patient', regid] });
    }
  });

  const handleCreate = () => {
    createMutation.mutate({ regid, type: newType, notes });
  };

  if (isLoading) return <div className="p-4 text-center text-gray-400">Loading logistics...</div>;

  return (
    <div className="mc-sidebar-card" style={{ marginTop: '16px' }}>
      <div className="mc-sidebar-card-header">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-blue-600" />
          <span className="font-bold text-gray-800">Pharmacy & Logistics</span>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="p-4">
        {isAdding ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setNewType('COURIER')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newType === 'COURIER' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                Courier
              </button>
              <button 
                onClick={() => setNewType('PICKUP')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newType === 'PICKUP' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
              >
                Pickup
              </button>
            </div>
            <textarea 
              placeholder="Internal notes or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="pp-input w-full text-sm min-h-[60px] resize-none"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Register'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments?.length === 0 ? (
              <div className="text-center py-4 px-2 border-2 border-dashed border-gray-100 rounded-xl">
                <Package size={24} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400 font-medium italic">No shipments registered yet.</p>
              </div>
            ) : (
              shipments?.map((shipment) => (
                <div 
                  key={shipment.id} 
                  className="p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all group border-l-4"
                  style={{ borderLeftColor: shipment.type === 'COURIER' ? 'var(--pp-blue)' : 'var(--pp-success)' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${shipment.type === 'COURIER' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {shipment.type === 'COURIER' ? <Truck size={14} /> : <MapPin size={14} />}
                      </div>
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">
                        {shipment.type}
                      </span>
                    </div>
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      shipment.status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
                      shipment.status === 'DISPATCHED' ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {shipment.status}
                    </div>
                  </div>

                  {shipment.trackingNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                      <span className="text-[10px] uppercase font-bold text-gray-400">POD:</span>
                      <span className="text-gray-900 font-bold">{shipment.trackingNumber}</span>
                      <ExternalLink size={10} className="text-blue-400" />
                    </div>
                  )}

                  {shipment.notes && (
                    <p className="text-[11px] text-gray-400 italic line-clamp-2 leading-relaxed mb-2 px-1 border-l-2 border-gray-100">
                      "{shipment.notes}"
                    </p>
                  )}

                  {shipment.status === 'PENDING' && (
                    <button 
                      onClick={() => updateStatusMutation.mutate({ 
                        id: shipment.id, 
                        status: shipment.type === 'COURIER' ? 'DISPATCHED' : 'COLLECTED' 
                      })}
                      className="w-full mt-2 py-1.5 bg-gray-50 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-200 text-gray-600 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={12} /> Mark as {shipment.type === 'COURIER' ? 'Dispatched' : 'Collected'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
