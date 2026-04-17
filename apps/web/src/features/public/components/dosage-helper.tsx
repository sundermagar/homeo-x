import React from 'react';
import { 
  Sun, 
  SunMedium, 
  Moon, 
  Clock, 
  AlertCircle,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface Medicine {
  remedy: string;
  potency: string;
  days: string;
  frequency: string;
  instructions: string;
}

interface DosageHelperProps {
  prescriptions: Medicine[];
  frequencies: any[];
}

export const DosageHelper: React.FC<DosageHelperProps> = ({ prescriptions, frequencies }) => {
  // Logic to group medicines by time of day
  // In a real legacy system, we'd map frequency titles to slots
  const getSlots = (frequencyTitle: string) => {
    const ft = (frequencyTitle || '').toLowerCase();
    const slots = [];
    if (ft.includes('morning') || ft.includes('m') || ft.includes('empty')) slots.push('Morning');
    if (ft.includes('noon') || ft.includes('afternoon') || ft.includes('n')) slots.push('Noon');
    if (ft.includes('evening') || ft.includes('night') || ft.includes('e') || ft.includes('bed')) slots.push('Night');
    
    // Default if no match but sounds like 3 times
    if (slots.length === 0 && (ft.includes('three') || ft.includes('tds'))) {
      return ['Morning', 'Noon', 'Night'];
    }
    if (slots.length === 0 && (ft.includes('twice') || ft.includes('bd'))) {
      return ['Morning', 'Night'];
    }
    
    return slots.length > 0 ? slots : ['General'];
  };

  const groupedMedicines: Record<string, Medicine[]> = {
    'Morning': [],
    'Noon': [],
    'Night': [],
    'General': []
  };

  prescriptions.forEach(p => {
    const slots = getSlots(p.frequency);
    slots.forEach(slot => {
      groupedMedicines[slot].push(p);
    });
  });

  const slotsData = [
    { title: 'Morning', icon: Sun, color: 'text-orange-500', bg: 'bg-orange-50', time: '07:00 AM - 09:00 AM' },
    { title: 'Noon', icon: SunMedium, color: 'text-yellow-600', bg: 'bg-yellow-50', time: '01:00 PM - 02:00 PM' },
    { title: 'Night', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50', time: '08:00 PM - 10:00 PM' },
    { title: 'General', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', time: 'As prescribed' },
  ];

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <div className="dosage-alert">
        <AlertCircle size={24} style={{color: 'var(--primary)', flexShrink: 0}} />
        <div>
          <h4 style={{fontWeight: 700, color: '#1e3a8a', marginBottom: '0.25rem'}}>Patient Instructions</h4>
          <p style={{color: '#1e40af', fontSize: '0.875rem', lineHeight: 1.6}}>
            Please take medicines exactly as scheduled. Avoid eating or drinking anything 15 minutes before and after taking Homeopathic medicines.
          </p>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        {slotsData.map((slot) => {
          const meds = groupedMedicines[slot.title];
          if (meds.length === 0) return null;

          return (
            <div key={slot.title} className="dosage-slot-card">
              <div className="dosage-slot-header" style={{background: `var(--${slot.bg || 'bg-main'})`}}>
                <div className="dosage-slot-title">
                  <div className="dosage-slot-icon" style={{color: `var(--${slot.color || 'text-main'})`}}>
                    <slot.icon size={20} />
                  </div>
                  <div>
                    <h3 style={{fontWeight: 700, color: 'var(--text-main)'}}>{slot.title} Dosage</h3>
                    <p className="dosage-slot-time">{slot.time}</p>
                  </div>
                </div>
                <div className="dosage-slot-count">
                  {meds.length} Medicine{meds.length > 1 ? 's' : ''}
                </div>
              </div>

              <div>
                {meds.map((m, idx) => (
                  <div key={idx} className="dosage-item">
                    <div className="dosage-item-details">
                      <div style={{marginTop: '0.25rem'}}>
                        <CheckCircle2 size={20} style={{color: '#22c55e'}} />
                      </div>
                      <div>
                        <h4 style={{fontWeight: 800, color: 'var(--text-main)', fontSize: '1.125rem', textTransform: 'uppercase', letterSpacing: '-0.025em'}}>
                          {m.remedy}
                        </h4>
                        <div className="dosage-item-info">
                          <span className="dosage-item-meta" style={{background: 'var(--primary-light)', color: 'var(--primary)'}}>
                            {m.potency}
                          </span>
                          <span className="dosage-item-meta">
                            {m.days} Days
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{textAlign: 'right'}}>
                      <p style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem'}}>
                        {m.frequency}
                      </p>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '200px'}}>
                        "{m.instructions || 'No specific instructions provided.'}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="banner-card">
        <div className="banner-icon">
          <Calendar size={48} style={{color: 'rgba(255,255,255,0.8)'}} />
        </div>
        <div className="banner-text" style={{flexGrow: 1}}>
          <h3>Prescription Timeline</h3>
          <p>
            Your medicines have been calculated based on your latest consultation. 
            Always consult your doctor before making changes to your dosage.
          </p>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '9999px'}}>
              <span style={{width: 8, height: 8, borderRadius: '50%', background: '#4ade80'}} />
              Latest Summary Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
