import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppointmentForm } from '../components/appointment-form';
import { useAppointment } from '../hooks/use-appointments';
import '../styles/appointments.css';

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  
  const initialDate = searchParams.get('date') || undefined;
  const { data: appointment, isLoading } = useAppointment(id ? Number(id) : undefined);

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSuccess = () => {
    navigate('/appointments');
  };

  if (isEdit && isLoading) {
    return (
      <div className="pp-page-container animate-fade-in">
        <div className="pp-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-subtitle">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>{isEdit ? 'Edit Appointment' : 'Book Appointment'}</h1>
          <p className="text-subtitle">{isEdit ? 'Update appointment details' : 'Fill in appointment information to book a slot'}</p>
        </div>
      </div>

      <div className="pp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--pp-warm-2)', padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)' }}>
          <h3 className="text-title" style={{ fontSize: '15px', margin: 0 }}>Appointment Details</h3>
        </div>

        <div style={{ padding: '20px' }}>
          <AppointmentForm 
            initialDate={initialDate}
            editAppointment={appointment}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
