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
    <div className="mc-side-card">
      <div className="mc-side-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mc-side-card-title">
          <Truck size={16} />
          Pharmacy & Logistics
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-ghost"
            style={{ padding: '4px', color: 'var(--pp-blue)' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="mc-side-card-body">
        {isAdding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', background: 'var(--pp-warm-1)', padding: '4px', borderRadius: '8px', border: '1px solid var(--pp-warm-2)' }}>
              <button 
                onClick={() => setNewType('COURIER')}
                style={{ 
                  flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800, borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: newType === 'COURIER' ? 'white' : 'transparent',
                  color: newType === 'COURIER' ? 'var(--pp-blue)' : 'var(--pp-text-3)',
                  boxShadow: newType === 'COURIER' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Courier
              </button>
              <button 
                onClick={() => setNewType('PICKUP')}
                style={{ 
                  flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800, borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: newType === 'PICKUP' ? 'white' : 'transparent',
                  color: newType === 'PICKUP' ? 'var(--pp-success-fg)' : 'var(--pp-text-3)',
                  boxShadow: newType === 'PICKUP' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Pickup
              </button>
            </div>
            <textarea 
              placeholder="Shipment details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="pp-textarea"
              style={{ minHeight: '80px', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setIsAdding(false)}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn-primary"
                style={{ flex: 2, fontSize: '0.8rem', padding: '8px' }}
              >
                {createMutation.isPending ? 'Saving...' : 'Register'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shipments?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', border: '1px dashed var(--border-main)', borderRadius: '12px' }}>
                <Package size={24} style={{ margin: '0 auto 8px', color: 'var(--pp-text-3)', opacity: 0.3 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontStyle: 'italic' }}>No shipments registered yet.</p>
              </div>
            ) : (
              shipments?.map((shipment) => (
                <div 
                  key={shipment.id} 
                  style={{ 
                    padding: '12px', borderRadius: '12px', background: 'var(--bg-surface-1)', border: '1px solid var(--border-main)',
                    borderLeft: `4px solid ${shipment.type === 'COURIER' ? 'var(--pp-blue)' : 'var(--pp-success-fg)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-text-3)', textTransform: 'uppercase' }}>
                        {shipment.type}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase',
                      background: shipment.status === 'PENDING' ? 'var(--pp-warm-1)' : 'var(--pp-success-bg)',
                      color: shipment.status === 'PENDING' ? 'var(--pp-text-2)' : 'var(--pp-success-fg)'
                    }}>
                      {shipment.status}
                    </span>
                  </div>

                  {shipment.notes && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--pp-ink)', margin: '0 0 8px', lineHeight: 1.4 }}>
                      {shipment.notes}
                    </p>
                  )}

                  {shipment.status === 'PENDING' && (
                    <button 
                      onClick={() => updateStatusMutation.mutate({ 
                        id: shipment.id, 
                        status: shipment.type === 'COURIER' ? 'DISPATCHED' : 'COLLECTED' 
                      })}
                      style={{ 
                        width: '100%', padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer',
                        background: 'white', border: '1px solid var(--border-main)', color: 'var(--pp-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={12} /> Mark {shipment.type === 'COURIER' ? 'Dispatched' : 'Collected'}
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
