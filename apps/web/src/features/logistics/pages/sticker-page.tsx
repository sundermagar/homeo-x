import React, { useState } from 'react';
import { 
  Printer, Search, Package, User, Pill, MapPin, Truck 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useAuthStore } from '@/shared/stores/auth-store';
import { printThermalStickers } from '@/shared/utils/print';
import './sticker-page.css';

interface Medicine {
  id: number;
  remedy: string;
  potency: string;
  frequency: string;
  days: string;
  cost: number;
}

interface PendingSticker {
  caseId: number;
  randId: string;
  dateval: string;
  patientName: string;
  phone: string;
  medicines: Medicine[];
  totalMedicineCost: number;
  postType: string;
  courierCompany?: string;
  podNumber?: string;
}

export function StickerPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['stickers-queue', selectedDate],
    queryFn: async () => {
      const { data } = await apiClient.get(`/logistics/stickers/pending?date=${selectedDate}`);
      return data.data as PendingSticker[];
    }
  });

  const printMutation = useMutation({
    mutationFn: async (randId: string) => {
      const response = await apiClient.post(`/logistics/stickers/print`, { randId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers-queue'] });
    },
    onError: (err: any) => {
      console.error('Failed to mark sticker as printed:', err);
      alert('Failed to mark sticker as printed. Please try again.');
    }
  });

  const handleGenerateStickers = (sticker: PendingSticker) => {
    // 1. Open the print window using the shared utility
    printThermalStickers(sticker, (user as any)?.clinicName || "Dr. Nanda's Homeoclinic");
    
    // 2. Fire the backend mutation to mark it as printed in the background
    printMutation.mutate(sticker.randId);
  };

  const filteredQueue = queue.filter(e => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(s) ||
      String(e.caseId).includes(s) ||
      e.medicines.some(m => m.remedy?.toLowerCase().includes(s))
    );
  });

  return (
    <div className="plat-page fade-in">
      {/* Screen Content */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Package size={22} strokeWidth={1.8} />
            Stickers Workspace
          </h1>
          <p className="pp-page-hero-sub">Generate labels and manage pending prescriptions for dispensing</p>
        </div>
      </div>

      <div className="pp-filter-bar" style={{ marginBottom: 24, display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="pp-filter-search-wrap" style={{ width: 300 }}>
          <Search size={14} strokeWidth={1.6} />
          <input
            type="text"
            className="pp-filter-search-input"
            placeholder="Search by patient, regid, or remedy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="pp-input"
          style={{ width: 'auto' }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : filteredQueue.length === 0 ? (
        <div className="sticker-empty">
          <Package size={48} />
          <h3>No Pending Prescriptions</h3>
          <p>All clear! There are no prescriptions waiting to be printed for this date.</p>
        </div>
      ) : (
        <div className="sticker-grid">
          {filteredQueue.map((item) => (
            <div key={item.randId} className="sticker-card">
              <div className="sticker-card-header">
                <div className="sticker-patient-info">
                  <h3>{item.patientName}</h3>
                  <p>
                    <User size={12} /> #{item.caseId} • {item.phone || 'No phone'}
                  </p>
                </div>
                <div className={`sticker-type-badge sticker-type-${item.postType.toLowerCase()}`}>
                  {item.postType === 'Courier' ? <Truck size={12} /> : <MapPin size={12} />}
                  {item.postType}
                </div>
              </div>

              <div className="sticker-card-body">
                <div className="sticker-medicines">
                  {item.medicines.map((med, idx) => (
                    <div key={idx} className="sticker-medicine-item">
                      <Pill size={14} className="sticker-med-icon" />
                      <div className="sticker-med-details">
                        <p className="sticker-med-name">{med.remedy} {med.potency}</p>
                        <div className="sticker-med-meta">
                          <span>{med.frequency}</span>
                          <span>{med.days} days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticker-card-footer">
                <div className="sticker-billing">
                  <span className="sticker-billing-label">Total Amount</span>
                  <span className="sticker-billing-amount">₹ {item.totalMedicineCost}</span>
                </div>
                <button 
                  className="sticker-print-btn"
                  onClick={() => handleGenerateStickers(item)}
                  disabled={printMutation.isPending}
                >
                  <Printer size={16} /> 
                  {printMutation.isPending ? 'Generating...' : 'Generate Stickers'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
