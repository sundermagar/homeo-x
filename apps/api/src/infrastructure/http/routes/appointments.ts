import { Router } from 'express';
import { AppointmentRepositoryPG } from '../../repositories/appointment.repository.pg';
import { PatientRepositoryPg } from '../../repositories/patient.repository.pg';
import { ListAppointmentsUseCase } from '../../../domains/appointment/use-cases/list-appointments.use-case';
import { GetAppointmentUseCase } from '../../../domains/appointment/use-cases/get-appointment.use-case';
import { BookAppointmentUseCase } from '../../../domains/appointment/use-cases/book-appointment.use-case';
import { ManageAppointmentUseCase } from '../../../domains/appointment/use-cases/manage-appointment.use-case';
import { QueueManagementUseCase } from '../../../domains/appointment/use-cases/queue-management.use-case';
import { SendSmsUseCase } from '../../../domains/communication/use-cases/send-sms.use-case';
import { CommunicationRepositoryPG } from '../../repositories/communication.repository.pg';
import { createSmsGateway } from '../../communication/msg91-sms-gateway';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { BadRequestError, ValidationError } from '../../../shared/errors';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';
import { z } from 'zod';

const addToWaitlistSchema = z.object({
  patientId: z.number().int().positive().optional(),
  appointmentId: z.number().int().positive().optional(),
  doctorId: z.number().int().positive().optional(),
  consultationFee: z.number().min(0).optional(),
}).refine((data) => data.patientId || data.appointmentId, {
  message: "Either patientId or appointmentId is required",
  path: ["patientId"],
});

const logger = createLogger('appointments');
const smsGateway = createSmsGateway();

export const appointmentsRouter: Router = Router();

const getRepo = (req: any) => new AppointmentRepositoryPG(req.tenantDb);

// Apply auth to all routes
appointmentsRouter.use(authMiddleware);

// ─── List / Query ────────────────────────────────────────────────────────────

// GET /api/appointments
appointmentsRouter.get('/', asyncHandler(async (req, res) => {
  const { date, from_date, to_date, doctor_id, status, search, page, limit } = req.query as Record<string, string>;
  const listAppts = new ListAppointmentsUseCase(getRepo(req));

  let effectiveDoctorId = doctor_id ? Number(doctor_id) : undefined;
  // if ((req.user as any)?.type === 'Doctor') {
  //   effectiveDoctorId = (req.user as any).contextId;
  // }

  const result = await listAppts.execute({
    date:      date    || undefined,
    fromDate:  from_date || undefined,
    toDate:    to_date || undefined,
    doctorId:  effectiveDoctorId,
    status:    status  || undefined,
    search:    search  || undefined,
    page:      page    ? Number(page)  : 1,
    limit:     limit   ? Number(limit) : 50,
  });

  if (result.success) {
    sendSuccess(res, result.data);
  }
}));

// GET /api/appointments/today
appointmentsRouter.get('/today', asyncHandler(async (req, res) => {
  const { doctor_id } = req.query as Record<string, string>;
  const getAppts = new GetAppointmentUseCase(getRepo(req));
  const effectiveDoctorId = doctor_id ? Number(doctor_id) : undefined;
  const result = await getAppts.getToday(effectiveDoctorId);
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/appointments/availability
appointmentsRouter.get('/availability', asyncHandler(async (req, res) => {
  const { doctor_id, date } = req.query as Record<string, string>;
  if (!doctor_id || !date) throw new BadRequestError('doctor_id and date are required');
  const getAppts = new GetAppointmentUseCase(getRepo(req));
  const result = await getAppts.getAvailability(Number(doctor_id), date);
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/appointments/waiting
appointmentsRouter.get('/waiting', asyncHandler(async (req, res) => {
  const { date, doctor_id } = req.query as Record<string, string>;
  const today = new Date().toISOString().split('T')[0];
  const queueMgmt = new QueueManagementUseCase(getRepo(req));
  const result = await queueMgmt.getWaitlist((date || today) as string, doctor_id ? Number(doctor_id) : undefined);
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/appointments/:id
appointmentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const getAppts = new GetAppointmentUseCase(getRepo(req));
  const result = await getAppts.getById(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data);
}));

// ─── Mutations ───────────────────────────────────────────────────────────────

// POST /api/appointments
appointmentsRouter.post('/', asyncHandler(async (req, res) => {
  const commRepo = new CommunicationRepositoryPG(req.tenantDb);
  const patientRepo = new PatientRepositoryPg(req.tenantDb);
  const smsUc = new SendSmsUseCase(commRepo, smsGateway);
  const bookAppt = new BookAppointmentUseCase(getRepo(req), smsUc, patientRepo);
  const result = await bookAppt.execute(req.body);

  if (result.success) {
    sendSuccess(res, result.data, undefined, 201);
  }
}));

// PUT /api/appointments/:id
appointmentsRouter.put('/:id', asyncHandler(async (req, res) => {
  const manageAppt = new ManageAppointmentUseCase(getRepo(req));
  await manageAppt.update(Number(req.params.id), req.body);
  sendSuccess(res, undefined, 'Appointment updated');
}));

// DELETE /api/appointments/:id
appointmentsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const manageAppt = new ManageAppointmentUseCase(getRepo(req));
  await manageAppt.delete(Number(req.params.id));
  sendSuccess(res, undefined, 'Appointment deleted');
}));

// POST /api/appointments/:id/status
appointmentsRouter.post('/:id/status', asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body;
  if (!status) throw new BadRequestError('status is required');
  const manageAppt = new ManageAppointmentUseCase(getRepo(req));
  await manageAppt.updateStatus(Number(req.params.id), status, cancellationReason);
  sendSuccess(res, undefined, `Status updated to ${status}`);
}));

// POST /api/appointments/:id/issue-token
appointmentsRouter.post('/:id/issue-token', asyncHandler(async (req, res) => {
  const manageAppt = new ManageAppointmentUseCase(getRepo(req));
  const result = await manageAppt.issueToken(Number(req.params.id));
  
  if (result.success) {
    const io = (req as any).io;
    if (io && !result.data.alreadyIssued) {
      io.emit('tokenIssued', { appointmentId: req.params.id, token: result.data.token });
    }
    sendSuccess(res, result.data);
  }
}));

// ─── Waiting Room ─────────────────────────────────────────────────────────────

// POST /api/appointments/waiting
appointmentsRouter.post('/waiting', asyncHandler(async (req, res) => {
  const validation = addToWaitlistSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid waitlist data', validation.error.format());
  }

  const queueMgmt = new QueueManagementUseCase(getRepo(req));
  const result = await queueMgmt.addToWaitlist(validation.data);
  if (result.success) {
    sendSuccess(res, result.data, undefined, 201);
  }
}));

// POST /api/appointments/waiting/:id/call-next
appointmentsRouter.post('/waiting/:id/call-next', asyncHandler(async (req, res) => {
  const queueMgmt = new QueueManagementUseCase(getRepo(req));
  await queueMgmt.callNext(Number(req.params.id));
  const io = (req as any).io;
  if (io) io.emit('queueUpdated', { action: 'called', id: req.params.id });
  sendSuccess(res, undefined, 'Patient called in');
}));

// POST /api/appointments/waiting/:id/complete
appointmentsRouter.post('/waiting/:id/complete', asyncHandler(async (req, res) => {
  const queueMgmt = new QueueManagementUseCase(getRepo(req));
  await queueMgmt.completeVisit(Number(req.params.id));
  const io = (req as any).io;
  if (io) io.emit('queueUpdated', { action: 'completed', id: req.params.id });
  sendSuccess(res, undefined, 'Consultation completed');
}));

// POST /api/appointments/waiting/:id/skip
appointmentsRouter.post('/waiting/:id/skip', asyncHandler(async (req, res) => {
  const queueMgmt = new QueueManagementUseCase(getRepo(req));
  await queueMgmt.skipWaitlist(Number(req.params.id));
  const io = (req as any).io;
  if (io) io.emit('queueUpdated', { action: 'skipped', id: req.params.id });
  sendSuccess(res, undefined, 'Patient skipped, next patient called in');
}));

// POST /api/appointments/:id/reschedule
appointmentsRouter.post('/:id/reschedule', asyncHandler(async (req, res) => {
  const { date, time } = req.body;
  const manageAppt = new ManageAppointmentUseCase(getRepo(req));
  await manageAppt.reschedule(Number(req.params.id), date, time);
  sendSuccess(res, undefined, 'Appointment rescheduled');
}));
