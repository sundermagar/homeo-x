import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Search, Calendar, Package, User, Pill, MapPin, Truck 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useAuthStore } from '@/shared/stores/auth-store';
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
  
  // State for printing
  const [printData, setPrintData] = useState<PendingSticker | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['stickers-queue', selectedDate],
    queryFn: async () => {
      const { data } = await apiClient.get(`/logistics/stickers/pending?date=${selectedDate}`);
      return data.data as PendingSticker[];
    }
  });

  const printMutation = useMutation({
    mutationFn: async (randId: string) => {
      await apiClient.post(`/logistics/stickers/print`, { randId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers-queue'] });
      // Triggers browser print dialog when state updates
      setTimeout(() => window.print(), 100);
    }
  });

  // Handle when printing is finished or cancelled
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintData(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleGenerateStickers = (sticker: PendingSticker) => {
    setPrintData(sticker);
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
    <div className="sticker-page">
      {/* Print Only Container */}
      {printData && (
        <div className="print-only-container">
          {printData.medicines.map((med, idx) => (
            <div key={`${printData.randId}-${idx}`} className="thermal-label">
              <div className="thermal-header">
                {(user as any)?.clinicName || "Dr. Nanda's Homeoclinic"}
              </div>
              <div className="thermal-row">
                <span className="thermal-patient-name">{printData.patientName}</span>
                <span>ID: {printData.caseId}</span>
              </div>
              <div className="thermal-row" style={{ fontSize: '7px' }}>
                <span>Date: {new Date(printData.dateval).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="thermal-remedy">
                {med.remedy} {med.potency}
              </div>
              <div className="thermal-footer">
                <span>Freq: {med.frequency}</span>
                <span>Days: {med.days}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screen Content */}
      <div className="sticker-header">
        <div>
          <h1 className="sticker-title">Stickers Workspace</h1>
          <p className="sticker-subtitle">Generate labels and manage pending prescriptions for dispensing</p>
        </div>
      </div>

      <div className="sticker-controls">
        <div className="sticker-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by patient, regid, or remedy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sticker-date-picker">
          <Calendar size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
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
