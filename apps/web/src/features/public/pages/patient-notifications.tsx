import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CalendarDays, FlaskConical, Pill, Undo2, Info } from 'lucide-react';
import { usePatientPreferences, useUpdatePatientPreferences } from '../hooks/use-public-api';

export function PatientNotifications() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();

  const { data: dbPrefs, isLoading } = usePatientPreferences(phone || '');
  const updateMutation = useUpdatePatientPreferences();

  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    if (dbPrefs) {
      setPrefs(dbPrefs);
    }
  }, [dbPrefs]);

  const togglePref = (category: string, channel: string) => {
    if (!prefs) return;
    
    // Optimistic update
    const newPrefs = {
      ...prefs,
      [category]: {
        ...prefs[category],
        [channel]: !prefs[category][channel]
      }
    };
    setPrefs(newPrefs);

    // Save to DB
    updateMutation.mutate({ phone: phone!, prefs: newPrefs });
  };

  if (isLoading || !prefs) {
    return (
      <div className="patient-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #dcfce7', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const categories = [
    {
      id: 'appointments' as const,
      title: 'Appointment Reminders',
      desc: 'Reminders before your appointments',
      icon: <CalendarDays size={18} />,
      color: '#4ade80'
    },
    {
      id: 'labs' as const,
      title: 'Lab Results',
      desc: 'Alerts when lab results are ready',
      icon: <FlaskConical size={18} />,
      color: '#a3e635'
    },
    {
      id: 'prescriptions' as const,
      title: 'Prescriptions',
      desc: 'New prescriptions and refill reminders',
      icon: <Pill size={18} />,
      color: '#4ade80'
    },
    {
      id: 'followUp' as const,
      title: 'Follow-Up Reminders',
      desc: 'Reminders to book follow-up visits',
      icon: <Undo2 size={18} />,
      color: '#86efac'
    },
    {
      id: 'system' as const,
      title: 'System Notifications',
      desc: 'Updates, promotions, and platform news',
      icon: <Info size={18} />,
      color: '#86efac'
    }
  ];

  const channels = [
    { id: 'push' as const, label: 'Push Notifications', icon: '📱' },
    { id: 'sms' as const, label: 'SMS', icon: '💬' },
    { id: 'email' as const, label: 'Email', icon: '✉️' },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: '💬' }
  ];

  return (
    <div className="patient-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div className="pn-header">
        <button className="pn-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="pn-title">Notification Preferences</h1>
      </div>

      <div className="pn-content">
        <p className="pn-subtitle">Choose which notifications you want to receive and how.</p>

        <div className="pn-list">
          {categories.map(cat => (
            <div key={cat.id} className="pn-card">
              <div className="pn-card-header">
                <div className="pn-card-icon" style={{ color: cat.color }}>
                  {cat.icon}
                </div>
                <div>
                  <h2 className="pn-card-title">{cat.title}</h2>
                  <p className="pn-card-desc">{cat.desc}</p>
                </div>
              </div>
              <div className="pn-card-body">
                {channels.map(channel => (
                  <div key={channel.id} className="pn-row">
                    <div className="pn-row-left">
                      <span className="pn-row-icon">{channel.icon}</span>
                      <span className="pn-row-label">{channel.label}</span>
                    </div>
                    <label className="pn-toggle">
                      <input 
                        type="checkbox" 
                        checked={prefs[cat.id][channel.id]} 
                        onChange={() => togglePref(cat.id, channel.id)}
                      />
                      <span className="pn-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PatientNotifications;
