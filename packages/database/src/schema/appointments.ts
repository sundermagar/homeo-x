import {
  pgTable, serial, integer, varchar, date, timestamp, text, real, boolean, decimal,
} from 'drizzle-orm/pg-core';

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = pgTable('appointments', {
  id:                 serial('id').primaryKey(),
  // clinicId:           integer('clinic_id'),
  patientId:          integer('patient_id'),
  doctorId:           integer('doctor_id'),
  bookingDate:        date('booking_date'),
  bookingTime:        varchar('booking_time', { length: 20 }),
  status:             varchar('status', { length: 30 }).notNull().default('Pending'),
  visitType:          varchar('visit_type', { length: 20 }),
  consultationFee:    decimal('consultation_fee', { precision: 10, scale: 2 }),
  tokenNo:            integer('token_no'),
  notes:              text('notes'),
  phone:              varchar('phone', { length: 20 }),
  patientName:        varchar('patient_name', { length: 200 }),
  // assistantDoctor:    text('assistant_doctor'),
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
  date:      date('date').notNull(),
  status:    varchar('status', { length: 20 }).notNull().default('queued'),
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
  status:          integer('status').notNull().default(0),
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
  dayOfWeek:   integer('day_of_week').notNull(),
  startTime:   varchar('start_time', { length: 20 }).notNull(),
  endTime:     varchar('end_time', { length: 20 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  deletedAt:   timestamp('deleted_at'),
});
