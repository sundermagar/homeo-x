import React, { useState, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { usePublicClinicalData, usePatientAppointments } from '../hooks/use-public-api';
import { PatientHeader, Notification } from '../components/patient-header';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { CalendarDays, Stethoscope, Sparkles, Info } from 'lucide-react';

const healthTips = [
  'Include fruits and vegetables in every meal for essential vitamins and minerals.',
  'Drink at least 8 glasses of water daily to stay properly hydrated.',
  'Take homeopathic medicines 30 minutes before or after meals for best absorption.',
  'Practice deep breathing for 5 minutes daily to reduce stress and improve immunity.',
  'Avoid coffee and strong-flavored items 30 minutes before taking homeopathic remedies.',
  'Regular walking for 30 minutes improves circulation and overall well-being.',
];

function getTodaysTip(): string {
  const day = new Date().getDate();
  return healthTips[day % healthTips.length] ?? healthTips[0]!;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function buildNotifications(
  appointments: any[] | undefined,
  prescriptions: any[] | undefined,
  history: any[] | undefined
): Notification[] {
  const notifs: Notification[] = [];

  // Appointment notifications
  if (appointments && appointments.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    appointments.forEach((appt: any) => {
      const apptDate = new Date(appt.bookingDate);
      const isUpcoming = apptDate >= today;
      const diffDays = Math.floor((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (isUpcoming && appt.status !== 'Cancelled') {
        notifs.push({
          id: `appt-${appt.id}`,
          type: 'appointment',
          title: diffDays === 0 ? 'Appointment Today!' : diffDays === 1 ? 'Appointment Tomorrow' : 'Upcoming Appointment',
          message: `${new Date(appt.bookingDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${appt.bookingTime || 'No time set'} — ${appt.status}`,
          time: diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`,
          read: diffDays > 3,
        });
      } else if (appt.status === 'Confirmed' && !isUpcoming) {
        notifs.push({
          id: `appt-done-${appt.id}`,
          type: 'appointment',
          title: 'Appointment Completed',
          message: `Visit on ${new Date(appt.bookingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} was completed`,
          time: timeAgo(appt.bookingDate),
          read: true,
        });
      }
    });
  }

  // Prescription notifications
  if (prescriptions && prescriptions.length > 0) {
    const recentRx = prescriptions.slice(0, 3);
    recentRx.forEach((rx: any, i: number) => {
      notifs.push({
        id: `rx-${rx.id || i}`,
        type: 'prescription',
        title: 'Prescription Updated',
        message: `${rx.remedy} ${rx.potency} — ${rx.frequency}, ${rx.days} days course`,
        time: timeAgo(rx.date),
        read: i > 0,
      });
    });
  }

  // Consultation notifications
  if (history && history.length > 0) {
    const recentVisit = history[0];
    notifs.push({
      id: `visit-${recentVisit.visitId || 0}`,
      type: 'system',
      title: 'Consultation Report Available',
      message: recentVisit.condition || 'Your latest consultation report is ready to view',
      time: timeAgo(recentVisit.date),
      read: false,
    });
  }

  // Sort: unread first, then by recency
  return notifs.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return 0;
  });
}

export function PatientDashboard() {
  const { phone } = useParams<{ phone: string }>();
  const { data, isLoading, error } = usePublicClinicalData(phone || '');
  const { data: appointmentsData } = usePatientAppointments(phone || '');
  const [allRead, setAllRead] = useState(false);

  // Build real notifications from data
  const notifications = useMemo(() => {
    const notifs = buildNotifications(
      appointmentsData,
      data?.prescriptions,
      data?.history
    );
    if (allRead) return notifs.map(n => ({ ...n, read: true }));
    return notifs;
  }, [appointmentsData, data, allRead]);

  if (isLoading) {
    return (
      <div className="patient-shell">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading your dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/verify-otp" />;
  }

  const { patientInfo } = data;

  // Find next upcoming appointment
  const upcomingAppt = appointmentsData?.find((a: any) => {
    const apptDate = new Date(a.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return apptDate >= today && a.status !== 'Cancelled';
  });

  return (
    <div className="patient-shell">
      <PatientHeader 
        patientName={patientInfo.name} 
        notifications={notifications}
        onMarkAllRead={() => setAllRead(true)}
      />

      <main className="patient-main">
        {/* Upcoming Appointment — clickable, goes to appointments page */}
        <Link to={`/patient/${phone}/appointments`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {upcomingAppt ? (
            <div className="patient-appt-filled" id="patient-upcoming-appt">
              <div className="patient-appt-filled-icon">
                <CalendarDays size={24} />
              </div>
              <div className="patient-appt-filled-info">
                <div className="patient-appt-filled-date">
                  {new Date(upcomingAppt.bookingDate).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short'
                  })}
                </div>
                <div className="patient-appt-filled-time">
                  {upcomingAppt.bookingTime || 'Time not set'}
                </div>
              </div>
              <span className={`patient-appt-filled-status ${upcomingAppt.status === 'Confirmed' ? 'confirmed' : 'pending'}`}>
                {upcomingAppt.status}
              </span>
            </div>
          ) : (
            <div className="patient-appt-card" id="patient-no-appt-card">
              <div className="patient-appt-icon">
                <CalendarDays size={28} />
              </div>
              <div className="patient-appt-title">No upcoming appointments</div>
              <div className="patient-appt-subtitle">Book a consultation with your doctor</div>
            </div>
          )}
        </Link>

        {/* Quick Actions */}
        <div className="patient-section-title">Quick Actions</div>
        <div className="patient-quick-actions">
          <Link 
            to={`/public/clinical/${phone}`} 
            className="patient-action-card"
            id="patient-action-consultation"
          >
            <div className="patient-action-icon green">
              <Stethoscope size={22} />
            </div>
            <div className="patient-action-title">AI Consultation</div>
            <div className="patient-action-desc">View history or start new</div>
          </Link>

          <Link 
            to={`/patient/${phone}/book`} 
            className="patient-action-card"
            id="patient-action-book"
          >
            <div className="patient-action-icon orange">
              <CalendarDays size={22} />
            </div>
            <div className="patient-action-title">Book Appointment</div>
            <div className="patient-action-desc">Schedule new visit</div>
          </Link>
        </div>

        {/* Health Tip */}
        <div className="patient-health-tip" id="patient-health-tip">
          <div className="patient-health-tip-icon">
            <Info size={18} />
          </div>
          <div className="patient-health-tip-content">
            <div className="patient-health-tip-label">Health Tip of the Day</div>
            <div className="patient-health-tip-text">{getTodaysTip()}</div>
          </div>
        </div>
      </main>


      <PatientBottomNav />
    </div>
  );
}

export default PatientDashboard;
