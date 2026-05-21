import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, Check, X, 
  Loader2, CalendarPlus, AlertCircle, MessageSquare
} from 'lucide-react';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { apiClient } from '@/infrastructure/api-client';

interface FollowupSchedulerProps {
  patientId: number;
  patientName: string;
  defaultDoctorId?: number;
  onSuccess?: () => void;
}

export function FollowupScheduler({ 
  patientId, 
  patientName,
  defaultDoctorId, 
  onSuccess 
}: FollowupSchedulerProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: doctors = [] } = useDoctors();
  
  const [form, setForm] = useState({
    bookingDate: '',
    bookingTime: '10:00 AM',
    doctorId: defaultDoctorId || '',
    notes: 'Follow-up visit',
    visitType: 'Follow-up'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bookingDate || !form.doctorId) {
      setError('Date and Doctor are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post('/appointments', {
        patientId,
        patientName,
        doctorId: Number(form.doctorId),
        bookingDate: form.bookingDate,
        bookingTime: form.bookingTime,
        notes: form.notes,
        visitType: form.visitType,
        status: 'Pending'
      });
      
      setShowForm(false);
      setForm(f => ({ ...f, bookingDate: '', notes: 'Follow-up visit' }));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button 
        className="mc-btn-primary" 
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        onClick={() => setShowForm(true)}
      >
        <CalendarPlus size={16} />
        Schedule Next Visit
      </button>
    );
  }

  return (
    <div className="mc-scheduler-card">
      <div className="mc-scheduler-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="mc-scheduler-icon">
            <Calendar size={18} />
          </div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Schedule Follow-up</h4>
        </div>
        <button className="mc-btn-ghost-sm" onClick={() => setShowForm(false)}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSave} className="mc-scheduler-form">
        <div className="mc-scheduler-grid">
          <div className="mc-form-group">
            <label><Calendar size={12} /> Date</label>
            <input 
              type="date" 
              className="mc-input"
              required
              min={new Date().toISOString().split('T')[0]}
              value={form.bookingDate}
              onChange={e => setForm(f => ({ ...f, bookingDate: e.target.value }))}
            />
          </div>

          <div className="mc-form-group">
            <label><Clock size={12} /> Time</label>
            <select 
              className="mc-input"
              value={form.bookingTime}
              onChange={e => setForm(f => ({ ...f, bookingTime: e.target.value }))}
            >
              {[
                '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
                '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
                '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'
              ].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="mc-form-group">
            <label><User size={12} /> Doctor</label>
            <select 
              className="mc-input"
              required
              value={form.doctorId}
              onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
            >
              <option value="">Select Doctor</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mc-form-group" style={{ marginTop: 12 }}>
          <label><FileText size={12} /> Instructions / Notes</label>
          <textarea 
            className="mc-input"
            rows={2}
            placeholder="e.g. Review blood reports, check progress on remedy..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error && (
          <div className="mc-scheduler-error">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="mc-scheduler-actions">
          <button 
            type="button" 
            className="mc-btn-ghost"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="mc-btn-primary"
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="mc-spin" /> : <Check size={16} />}
            {saving ? 'Scheduling...' : 'Confirm Follow-up'}
          </button>
        </div>
      </form>

      <style>{`
        .mc-scheduler-card {
          background: var(--bg-card);
          border: 1px solid var(--pp-warm-4);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mc-scheduler-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--pp-warm-3);
        }
        .mc-scheduler-icon {
          width: 32px;
          height: 32px;
          background: var(--pp-blue-bg);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .mc-scheduler-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .mc-form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .mc-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--pp-warm-4);
          border-radius: 6px;
          font-size: 0.85rem;
          background: var(--bg-page);
          color: var(--text-primary);
          transition: border-color 0.2s;
        }
        .mc-input:focus {
          border-color: var(--primary);
          outline: none;
        }
        .mc-scheduler-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--pp-warm-3);
        }
        .mc-scheduler-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          color: var(--pp-danger-fg);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          margin-top: 12px;
        }
        .mc-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
