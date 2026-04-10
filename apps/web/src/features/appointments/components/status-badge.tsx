import { AppointmentStatus } from '@mmc/types';

const CONFIG: Record<string, { label: string; cls: string }> = {
  [AppointmentStatus.Pending]:      { label: 'Pending',      cls: 'appt-badge-pending' },
  [AppointmentStatus.Confirmed]:    { label: 'Confirmed',    cls: 'appt-badge-confirmed' },
  [AppointmentStatus.Consultation]: { label: 'Consultation', cls: 'appt-badge-consultation' },
  [AppointmentStatus.Done]:         { label: 'Done',         cls: 'appt-badge-done' },
  [AppointmentStatus.Visited]:      { label: 'Visited',      cls: 'appt-badge-visited' },
  [AppointmentStatus.Absent]:       { label: 'Absent',       cls: 'appt-badge-absent' },
  [AppointmentStatus.Cancelled]:    { label: 'Cancelled',    cls: 'appt-badge-cancelled' },
  [AppointmentStatus.Rescheduled]:  { label: 'Rescheduled',  cls: 'appt-badge-rescheduled' },
  [AppointmentStatus.Waitlist]:     { label: 'Waitlist',     cls: 'appt-badge-waitlist' },
  [AppointmentStatus.Arrived]:      { label: 'Arrived',      cls: 'appt-badge-arrived' },
  [AppointmentStatus.InProgress]:   { label: 'In Progress',  cls: 'appt-badge-consultation' },
  [AppointmentStatus.Completed]:    { label: 'Completed',    cls: 'appt-badge-done' },
};

/** Color used as a stripe/dot in the calendar */
export const STATUS_COLOR: Record<string, string> = {
  [AppointmentStatus.Pending]:      '#D97706',
  [AppointmentStatus.Confirmed]:    '#2563EB',
  [AppointmentStatus.Consultation]: '#7C3AED',
  [AppointmentStatus.Done]:         '#16A34A',
  [AppointmentStatus.Visited]:      '#16A34A',
  [AppointmentStatus.Absent]:       '#94A3B8',
  [AppointmentStatus.Cancelled]:    '#DC2626',
  [AppointmentStatus.Rescheduled]:  '#D97706',
  [AppointmentStatus.Waitlist]:     '#0891B2',
  [AppointmentStatus.Arrived]:      '#059669',
};

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status] ?? { label: status, cls: 'appt-badge-absent' };
  return (
    <span
      className={`appt-badge ${cfg.cls}`}
      style={size === 'sm' ? { fontSize: '0.68rem', padding: '2px 7px' } : undefined}
    >
      {cfg.label}
    </span>
  );
}
