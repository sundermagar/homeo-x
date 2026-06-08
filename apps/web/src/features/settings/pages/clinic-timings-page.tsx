import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useOrganizations, useUpdateOrganization } from '@/features/platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import type { ClinicTimingConfig, DayTiming } from '@mmc/types';
import '../../appointments/styles/appointments.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DAY: DayTiming = { isOpen: true, start: '09:00', end: '17:00' };

export default function ClinicTimingsPage() {
  const { data: orgs = [], isLoading: isLoadingOrg } = useOrganizations();
  const updateMutation = useUpdateOrganization();
  
  const user = useAuthStore(s => s.user);
  const currentOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];

  const [slotDuration, setSlotDuration] = useState<number>(15);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<Record<string, DayTiming>>(() => {
    const init: Record<string, DayTiming> = {};
    DAYS.forEach(d => init[d] = { ...DEFAULT_DAY });
    if (init['Sunday']) init['Sunday'].isOpen = false;
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (currentOrg?.timing) {
      try {
        const config: ClinicTimingConfig = JSON.parse(currentOrg.timing);
        if (config.slotDuration) {
          setSlotDuration(config.slotDuration);
          if (![10, 15, 20, 30, 45, 60].includes(config.slotDuration)) {
            setIsCustomDuration(true);
          } else {
            setIsCustomDuration(false);
          }
        }
        if (config.schedule) {
          setSchedule(prev => ({ ...prev, ...config.schedule }));
        }
      } catch (err) {
        console.error('Failed to parse clinic timings:', err);
      }
    }
  }, [currentOrg]);

  const handleDayChange = (day: string, field: keyof DayTiming, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value } as DayTiming
    }));
  };

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    setSuccessMsg('');
    const config: ClinicTimingConfig = {
      slotDuration,
      schedule
    };

    try {
      await updateMutation.mutateAsync({
        id: currentOrg.id,
        timing: JSON.stringify(config)
      });
      setSuccessMsg('Clinic timings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save timings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingOrg) {
    return (
      <div className="pp-page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[var(--pp-blue)]" size={32} />
      </div>
    );
  }

  return (
    <div className="pp-page-container appt-page animate-fade-in">
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Clock size={22} strokeWidth={1.8} />
            Clinic Timings
          </h1>
          <p className="pp-page-hero-sub">Manage your clinic's operating hours. This will determine the available time slots when booking appointments.</p>
        </div>
      </div>

      <div className="appt-card mt-6">
        <div className="appt-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Row: Slot Duration & Save Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="appt-form-group flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 m-0 w-full md:w-auto">
              <label className="appt-form-label !mb-0 shrink-0">Appointment Slot Duration (minutes):</label>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  className="appt-form-select flex-1 sm:flex-none sm:w-[150px]" 
                  value={isCustomDuration ? 'manual' : slotDuration}
                  onChange={(e) => {
                    if (e.target.value === 'manual') {
                      setIsCustomDuration(true);
                    } else {
                      setIsCustomDuration(false);
                      setSlotDuration(Number(e.target.value));
                    }
                  }}
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value="manual">Manual</option>
                </select>
                {isCustomDuration && (
                  <input 
                    type="number"
                    min={1}
                    max={240}
                    className="appt-form-input flex-1 sm:flex-none sm:w-[100px]"
                    placeholder="e.g. 12"
                    value={slotDuration || ''}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {successMsg && (
                <span style={{ color: 'var(--pp-green-mid)', fontWeight: 500, fontSize: '14px' }}>{successMsg}</span>
              )}
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Timings'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DAYS.map(day => {
            const timing = schedule[day] || { ...DEFAULT_DAY };
            return (
              <div key={day} 
                className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 p-4 lg:p-5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg transition-all"
                style={{ opacity: timing.isOpen ? 1 : 0.6 }}
              >
                {/* Day Header (Responsive) */}
                <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto lg:min-w-[220px] gap-4">
                  <div className="font-semibold text-[var(--pp-ink)] w-auto lg:w-[120px]">
                    {day}
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={timing.isOpen}
                      onChange={(e) => handleDayChange(day, 'isOpen', e.target.checked)}
                      className="w-4 h-4 accent-[var(--pp-blue)]"
                    />
                    <span className="text-sm font-medium text-[var(--pp-text-2)]">{timing.isOpen ? 'Open' : 'Closed'}</span>
                  </label>
                </div>

                {timing.isOpen ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                    {/* Shift Timing */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full sm:flex sm:w-auto">
                      <input 
                        type="time" 
                        className="appt-form-input w-full sm:w-[120px]"
                        value={timing.start}
                        onChange={(e) => handleDayChange(day, 'start', e.target.value)}
                      />
                      <span className="text-[13px] text-[var(--pp-text-3)] font-medium text-center shrink-0">to</span>
                      <input 
                        type="time" 
                        className="appt-form-input w-full sm:w-[120px]"
                        value={timing.end}
                        onChange={(e) => handleDayChange(day, 'end', e.target.value)}
                      />
                    </div>
                    
                    {/* Break Timing */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[var(--pp-warm-3)] sm:pl-4 w-full sm:w-auto">
                      <span className="appt-form-label !mb-0 shrink-0">Break:</span>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full sm:flex sm:w-auto">
                        <input 
                          type="time" 
                          className="appt-form-input w-full sm:w-[120px]"
                          value={timing.lunchStart || ''}
                          onChange={(e) => handleDayChange(day, 'lunchStart', e.target.value)}
                        />
                        <span className="text-[13px] text-[var(--pp-text-3)] font-medium text-center shrink-0">to</span>
                        <input 
                          type="time" 
                          className="appt-form-input w-full sm:w-[120px]"
                          value={timing.lunchEnd || ''}
                          onChange={(e) => handleDayChange(day, 'lunchEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-[var(--pp-text-3)] italic text-sm">
                    No appointments on this day
                  </div>
                )}
              </div>
            );
          })}
        </div>



        </div>
      </div>
    </div>
  );
}
