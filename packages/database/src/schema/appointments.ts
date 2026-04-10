import {
  pgTable, serial, integer, varchar, date, timestamp, text, real, boolean, decimal,
} from 'drizzle-orm/pg-core';

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = pgTable('appointments', {
  id:                 serial('id').primaryKey(),
  patientId:          integer('patient_id'),
  doctorId:           integer('doctor_id'),
  bookingDate:        date('booking_date'),              // YYYY-MM-DD
  bookingTime:        varchar('booking_time', { length: 20 }),  // "09:00 AM"
  status:             varchar('status', { length: 30 }).notNull().default('Pending'),
  visitType:          varchar('visit_type', { length: 20 }),    // "New" | "FollowUp"
  consultationFee:    decimal('consultation_fee', { precision: 10, scale: 2 }),
  tokenNo:            integer('token_no'),
  notes:              text('notes'),
  phone:              varchar('phone', { length: 20 }),
  patientName:        varchar('patient_name', { length: 200 }),
  cancellationReason: text('cancellation_reason'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
  deletedAt:          timestamp('deleted_at'),
});

// ─── Daily Tokens ─────────────────────────────────────────────────────────────
export const tokens = pgTable('tokens', {
  id:        serial('id').primaryKey(),
  patientId: integer('patient_id'),
  doctorId:  integer('doctor_id'),
  tokenNo:   integer('token_no').notNull(),
  date:      date('date').notNull(),                     // resets daily
  status:    varchar('status', { length: 20 }).notNull().default('queued'), // queued|called|done
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Live Waiting Room ─────────────────────────────────────────────────────────
export const waitlist = pgTable('waitlist', {
  id:              serial('id').primaryKey(),
  patientId:       integer('patient_id').notNull(),
  appointmentId:   integer('appointment_id'),
  doctorId:        integer('doctor_id'),
  waitingNumber:   integer('waiting_number').notNull(),
  date:            date('date').notNull(),
  status:          integer('status').notNull().default(0), // 0=waiting 1=called 2=done
  consultationFee: decimal('consultation_fee', { precision: 10, scale: 2 }),
  checkedInAt:     timestamp('checked_in_at'),
  calledAt:        timestamp('called_at'),
  completedAt:     timestamp('completed_at'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
  deletedAt:       timestamp('deleted_at'),
});

// ─── Doctor Availability ──────────────────────────────────────────────────────
export const doctorAvailability = pgTable('doctor_availability', {
  id:          serial('id').primaryKey(),
  doctorId:    integer('doctor_id').notNull(),
  dayOfWeek:   integer('day_of_week').notNull(),         // 0=Sun … 6=Sat
  startTime:   varchar('start_time', { length: 20 }).notNull(),
  endTime:     varchar('end_time', { length: 20 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  deletedAt:   timestamp('deleted_at'),
});
