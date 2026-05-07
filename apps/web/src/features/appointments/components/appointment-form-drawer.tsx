import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { AppointmentForm } from './appointment-form';
import '../styles/appointments.css';

interface AppointmentFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: number | null; // null for create, number for edit
  initialDate?: string;
  onSuccess?: () => void;
}

export function AppointmentFormDrawer({ isOpen, onClose, appointmentId, initialDate, onSuccess }: AppointmentFormDrawerProps) {
  const [editData, setEditData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && appointmentId) {
      setLoading(true);
      // Fetch the specific appointment data if editing
      import('@/infrastructure/api-client').then(({ apiClient }) => {
        apiClient.get(`/appointments/${appointmentId}`)
          .then(({ data }) => {
            setEditData(data.data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
    } else if (!appointmentId) {
      setEditData(null);
    }
  }, [isOpen, appointmentId]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel">
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">
            {appointmentId ? 'Edit Appointment' : 'New Appointment Booking'}
          </h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading appointment details...
            </div>
          ) : (
            <AppointmentForm
              initialDate={initialDate}
              editAppointment={editData}
              onClose={onClose}
              onCancel={onClose}
              onSuccess={() => {
                onSuccess?.();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
