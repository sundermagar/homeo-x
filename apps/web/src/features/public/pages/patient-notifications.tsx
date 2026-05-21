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
    const categoryPrefs = prefs[category] || {};
    const newPrefs = {
      ...prefs,
      [category]: {
        ...categoryPrefs,
        [channel]: !categoryPrefs[channel]
      }
    };
    setPrefs(newPrefs);

    // Save to DB
    updateMutation.mutate({ phone: phone!, prefs: newPrefs });
  };

  if (isLoading || !prefs) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top App Bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '16px', background: 'transparent', backdropFilter: 'blur(10px)' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '1.2rem', marginRight: '40px' }}>
          Notification Preferences
        </div>
      </div>

      <div className="pn-content" style={{ padding: '8px 16px' }}>
        <p className="pn-subtitle" style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>Choose which notifications you want to receive and how.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ color: cat.color, display: 'flex', alignItems: 'center' }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{cat.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{cat.desc}</div>
                </div>
              </div>
              
              {/* Card Body (Channels) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {channels.map((channel, idx) => {
                  const isChecked = prefs[cat.id]?.[channel.id] ?? false;
                  return (
                    <div key={channel.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: idx < channels.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{channel.icon}</span>
                        <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{channel.label}</span>
                      </div>
                      
                      {/* Toggle Switch */}
                      <div 
                        onClick={() => togglePref(cat.id, channel.id)}
                        style={{
                          width: '44px',
                          height: '24px',
                          background: isChecked ? '#22c55e' : '#cbd5e1',
                          borderRadius: '12px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.3s ease'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '2px',
                          left: isChecked ? '22px' : '2px',
                          transition: 'left 0.3s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PatientNotifications;
