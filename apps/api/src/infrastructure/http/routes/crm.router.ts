import { Router } from 'express';
import { eq, desc, ilike, or, and, isNull, count, sql } from 'drizzle-orm';
import { 
  leads, 
  leadFollowups, 
  referrals, 
  caseReminders, 
  caseDatasLegacy as caseDatas 
} from '@mmc/database/schema';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/leads', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    const baseWhere = and(
      isNull(leads.deletedAt),
      status ? eq(leads.status, status) : undefined,
      search ? or(
        ilike(leads.name, `%${search}%`),
        ilike(leads.mobile, `%${search}%`),
        ilike(leads.phone, `%${search}%`),
        ilike(leads.email, `%${search}%`)
      ) : undefined
    );

    const [totalRecord] = await db.select({ total: count() }).from(leads).where(baseWhere);
    const rows = await db.select()
      .from(leads)
      .where(baseWhere)
      .orderBy(desc(leads.id))
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: rows, total: totalRecord.total, page, limit });
  } catch (error) { next(error); }
});

router.put('/leads/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    await db.update(leadFollowups)
      .set({
        name: data.notes || data.name || '',
        task: data.task || data.followup_type || '',
        taskstatus: data.taskstatus || data.status || '',
        updatedAt: new Date()
      })
      .where(eq(leadFollowups.id, parseInt(req.params.fid)));
    res.json({ success: true, message: 'Followup updated' });
  } catch (error) { next(error); }
});

router.delete('/leads/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(leadFollowups)
      .set({ deletedAt: new Date() })
      .where(eq(leadFollowups.id, parseInt(req.params.fid)));
    res.json({ success: true, message: 'Followup deleted' });
  } catch (error) { next(error); }
});

router.delete('/leads/:id/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(leadFollowups)
      .set({ deletedAt: new Date() })
      .where(eq(leadFollowups.id, parseInt(req.params.fid)));
    res.json({ success: true, message: 'Followup deleted' });
  } catch (error) { next(error); }
});

router.get('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const leadId = parseInt(req.params.id);
    
    const [lead] = await db.select()
      .from(leads)
      .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
      .limit(1);

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const followups = await db.select()
      .from(leadFollowups)
      .where(and(eq(leadFollowups.leadId, leadId), isNull(leadFollowups.deletedAt)))
      .orderBy(desc(leadFollowups.createdAt));
      
    res.json({ success: true, data: { ...lead, followups } });
  } catch (error) { next(error); }
});

router.post('/leads', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    
    const [result] = await db.insert(leads).values({
      name: data.name,
      mobile: data.mobile || data.phone || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      source: data.source || '',
      status: data.status || '',
      notes: data.notes || '',
      assignedTo: data.assigned_to || null,
    }).returning({ id: leads.id });
    
    res.status(201).json({ success: true, id: result.id });
  } catch (error) { next(error); }
});

router.put('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    await db.update(leads)
      .set({
        name: data.name,
        mobile: data.mobile || data.phone || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        source: data.source || '',
        status: data.status || '',
        notes: data.notes || '',
        assignedTo: data.assigned_to || null,
        updatedAt: new Date()
      })
      .where(eq(leads.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Lead updated' });
  } catch (error) { next(error); }
});

router.delete('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(leads)
      .set({ deletedAt: new Date() })
      .where(eq(leads.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) { next(error); }
});

router.get('/leads/:id/followups', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const rows = await db.select()
      .from(leadFollowups)
      .where(and(eq(leadFollowups.leadId, parseInt(req.params.id)), isNull(leadFollowups.deletedAt)))
      .orderBy(desc(leadFollowups.createdAt));
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/leads/:id/followups', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    const [result] = await db.insert(leadFollowups).values({
      leadId: parseInt(req.params.id),
      name: data.notes || data.name || '',
      task: data.task || data.followup_type || '',
      taskstatus: data.taskstatus || data.status || '',
    }).returning({ id: leadFollowups.id });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/referrals/summary', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    
    // Group By trick to sum referrals
    const rows = await db.select({
      total_amount: sql<string>`SUM(CAST(NULLIF(${referrals.totalAmount}, '') AS DECIMAL(10,2)))`,
      used_amount: sql<string>`SUM(CAST(NULLIF(${referrals.usedAmount}, '') AS DECIMAL(10,2)))`,
      referral_id: referrals.referralId,
      first_name: caseDatas.firstName,
      surname: caseDatas.surname
    })
    .from(referrals)
    .leftJoin(caseDatas, eq(caseDatas.regid, referrals.referralId))
    .where(isNull(referrals.deletedAt))
    .groupBy(referrals.referralId, caseDatas.firstName, caseDatas.surname);

    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.get('/referrals/details/:referralId', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const rows = await db.select()
      .from(referrals)
      .where(and(eq(referrals.referralId, parseInt(req.params.referralId)), isNull(referrals.deletedAt)))
      .orderBy(desc(referrals.createdAt));
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/referrals', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const { regid, referral_id, total_amount, used_amount } = req.body;
    const [result] = await db.insert(referrals).values({
      regid: parseInt(regid),
      referralId: parseInt(referral_id),
      totalAmount: total_amount ? String(total_amount) : '0',
      usedAmount: used_amount ? String(used_amount) : '0'
    }).returning({ id: referrals.id });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) { next(error); }
});

router.delete('/referrals/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(referrals)
      .set({ deletedAt: new Date() })
      .where(eq(referrals.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Referral deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reminders', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    const baseWhere = and(
      isNull(caseReminders.deletedAt),
      status ? eq(caseReminders.status, status) : undefined
    );

    const [totalRecord] = await db.select({ total: count() }).from(caseReminders).where(baseWhere);
    
    // Select with patient name mapping
    const rows = await db.select({
      id: caseReminders.id,
      regid: caseReminders.regid,
      patient_id: caseReminders.patientId,
      start_date: caseReminders.startDate,
      remind_time: caseReminders.remindTime,
      heading: caseReminders.heading,
      comments: caseReminders.comments,
      status: caseReminders.status,
      created_at: caseReminders.createdAt,
      patient_name: sql<string>`CONCAT(${caseDatas.firstName}, ' ', ${caseDatas.surname})`,
      patient_mobile: caseDatas.mobile1
    })
    .from(caseReminders)
    .leftJoin(caseDatas, eq(caseReminders.patientId, caseDatas.id))
    .where(baseWhere)
    .orderBy(desc(caseReminders.id))
    .limit(limit)
    .offset(offset);

    // Some frontend UI components expect original snake_case fields since this was a legacy router.
    // It's mapped natively by the selected keys above.
    res.json({ success: true, data: rows, total: totalRecord.total, page, limit });
  } catch (error) { next(error); }
});

router.get('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const [row] = await db.select({
      id: caseReminders.id,
      regid: caseReminders.regid,
      patient_id: caseReminders.patientId,
      start_date: caseReminders.startDate,
      remind_time: caseReminders.remindTime,
      heading: caseReminders.heading,
      comments: caseReminders.comments,
      status: caseReminders.status,
      patient_name: sql<string>`CONCAT(${caseDatas.firstName}, ' ', ${caseDatas.surname})`,
      patient_mobile: caseDatas.mobile1
    })
    .from(caseReminders)
    .leftJoin(caseDatas, eq(caseReminders.patientId, caseDatas.id))
    .where(and(eq(caseReminders.id, parseInt(req.params.id)), isNull(caseReminders.deletedAt)))
    .limit(1);

    if (!row) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

router.post('/reminders', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    const [result] = await db.insert(caseReminders).values({
      regid: data.regid,
      startDate: data.start_date || data.followup_date,
      remindTime: data.remind_time || '09:00',
      comments: data.comments || data.notes || '',
      heading: data.heading || data.reminder_type || '',
      status: data.status || 'pending',
    }).returning({ id: caseReminders.id });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) { next(error); }
});

router.put('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    const data = req.body;
    await db.update(caseReminders)
      .set({
        regid: data.regid,
        startDate: data.start_date || data.followup_date,
        remindTime: data.remind_time || '09:00',
        comments: data.comments || data.notes || '',
        heading: data.heading || data.reminder_type || '',
        status: data.status || 'pending',
        updatedAt: new Date()
      })
      .where(eq(caseReminders.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Reminder updated' });
  } catch (error) { next(error); }
});

router.post('/reminders/:id/done', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(caseReminders)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(caseReminders.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Reminder marked as done' });
  } catch (error) { next(error); }
});

router.delete('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.tenantDb;
    await db.update(caseReminders)
      .set({ deletedAt: new Date() })
      .where(eq(caseReminders.id, parseInt(req.params.id)));
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) { next(error); }
});

export const crmRouter = router;
