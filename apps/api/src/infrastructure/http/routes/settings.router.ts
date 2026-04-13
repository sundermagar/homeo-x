import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { SettingsRepositoryPg } from '../../repositories/settings.repository.pg.js';
import { createLogger } from '../../../shared/logger.js';
import { z } from 'zod';
import {
  createDepartmentSchema, updateDepartmentSchema,
  createDispensarySchema, updateDispensarySchema,
  createReferralSourceSchema, updateReferralSourceSchema,
  createStickerSchema, updateStickerSchema,
  createStaticPageSchema, updateStaticPageSchema,
  createFaqSchema, updateFaqSchema,
  createPdfSettingsSchema, updatePdfSettingsSchema,
  // createMedicineSchema, updateMedicineSchema,
  createPotencySchema, updatePotencySchema,
  createFrequencySchema, updateFrequencySchema,
  createExpenseHeadSchema, updateExpenseHeadSchema,
  createMessageTemplateSchema, updateMessageTemplateSchema,
  createPackagePlanSchema, updatePackagePlanSchema,
  createCourierSchema, updateCourierSchema,
} from '@mmc/validation';

const createMedicineSchema = z.object({
  name: z.string().min(1).max(255),
  disease: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  detail: z.string().optional().nullable(),
});
const updateMedicineSchema = createMedicineSchema.partial();

export function createSettingsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const logger = createLogger('settings-router');
  const getRepo = (req: Request) => new SettingsRepositoryPg(req.tenantDb);

  // ─── Departments ─────────────────────────────────────────────────────────
  router.get('/departments', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listDepartments();
    res.json({ success: true, data });
  }));

  router.get('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getDepartment(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/departments', validate(createDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createDepartment(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/departments/:id', validate(updateDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateDepartment(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteDepartment(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Medicines (catalog) ──────────────────────────────────────────────────
  router.get('/medicines', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listMedicines();
    res.json({ success: true, data });
  }));

  router.get('/medicines/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getMedicine(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/medicines', validate(createMedicineSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createMedicine(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/medicines/:id', validate(updateMedicineSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateMedicine(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/medicines/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteMedicine(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Potencies ────────────────────────────────────────────────────────────
  router.get('/potencies', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listPotencies();
    res.json({ success: true, data });
  }));

  router.get('/potencies/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getPotency(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/potencies', validate(createPotencySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createPotency(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/potencies/:id', validate(updatePotencySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updatePotency(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/potencies/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deletePotency(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Frequencies ──────────────────────────────────────────────────────────
  router.get('/frequencies', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listFrequencies();
    res.json({ success: true, data });
  }));

  router.get('/frequencies/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getFrequency(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/frequencies', validate(createFrequencySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createFrequency(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/frequencies/:id', validate(updateFrequencySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateFrequency(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/frequencies/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteFrequency(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Referral Sources ─────────────────────────────────────────────────────
  router.get('/referrals', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listReferralSources();
    res.json({ success: true, data });
  }));

  router.get('/referrals/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getReferralSource(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/referrals', validate(createReferralSourceSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createReferralSource(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/referrals/:id', validate(updateReferralSourceSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateReferralSource(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/referrals/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteReferralSource(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Stickers ─────────────────────────────────────────────────────────────
  router.get('/stickers', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listStickers();
    res.json({ success: true, data });
  }));

  router.get('/stickers/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getSticker(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/stickers', validate(createStickerSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createSticker(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/stickers/:id', validate(updateStickerSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateSticker(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/stickers/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteSticker(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Dispensaries ─────────────────────────────────────────────────────────
  router.get('/dispensaries', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listDispensaries();
    res.json({ success: true, data });
  }));

  router.get('/dispensaries/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getDispensary(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/dispensaries', validate(createDispensarySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createDispensary(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/dispensaries/:id', validate(updateDispensarySchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateDispensary(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/dispensaries/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteDispensary(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── CMS: Static Pages ────────────────────────────────────────────────────
  router.get('/cms/pages', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listStaticPages();
    res.json({ success: true, data });
  }));

  router.get('/cms/pages/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getStaticPage(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.get('/cms/pages/slug/:slug', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getStaticPageBySlug(req.params.slug as string);
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/cms/pages', validate(createStaticPageSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createStaticPage(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/cms/pages/:id', validate(updateStaticPageSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateStaticPage(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/cms/pages/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteStaticPage(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── CMS: FAQs ────────────────────────────────────────────────────────────
  router.get('/cms/faqs', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listFaqs();
    res.json({ success: true, data });
  }));

  router.get('/cms/faqs/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getFaq(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/cms/faqs', validate(createFaqSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createFaq(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/cms/faqs/:id', validate(updateFaqSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateFaq(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/cms/faqs/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteFaq(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── PDF Settings ─────────────────────────────────────────────────────────
  router.get('/pdf', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listPdfSettings();
    res.json({ success: true, data });
  }));

  router.get('/pdf/:id', asyncHandler(async (req: Request, res: Response) => {
    const row = await getRepo(req).getPdfSetting(Number(req.params.id));
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: row });
  }));

  router.post('/pdf', validate(createPdfSettingsSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createPdfSetting(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/pdf/:id', validate(updatePdfSettingsSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updatePdfSetting(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/pdf/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deletePdfSetting(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Expense Heads ────────────────────────────────────────────────────────
  router.get('/expense-heads', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listExpenseHeads();
    res.json({ success: true, data });
  }));

  router.post('/expense-heads', validate(createExpenseHeadSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createExpenseHead(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/expense-heads/:id', validate(updateExpenseHeadSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateExpenseHead(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/expense-heads/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteExpenseHead(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Message Templates ────────────────────────────────────────────────────
  router.get('/message-templates', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listMessageTemplates();
    res.json({ success: true, data });
  }));

  router.post('/message-templates', validate(createMessageTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createMessageTemplate(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/message-templates/:id', validate(updateMessageTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateMessageTemplate(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/message-templates/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteMessageTemplate(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Stock Logs ───────────────────────────────────────────────────────────
  router.get('/stock-logs', asyncHandler(async (req: Request, res: Response) => {
    const medicineId = req.query.medicineId ? Number(req.query.medicineId) : undefined;
    const data = await getRepo(req).listStockLogs(medicineId);
    res.json({ success: true, data });
  }));

  // ─── Package Plans ────────────────────────────────────────────────────────
  router.get('/packages', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listPackagePlans();
    res.json({ success: true, data });
  }));

  router.post('/packages', validate(createPackagePlanSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createPackagePlan(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/packages/:id', validate(updatePackagePlanSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updatePackagePlan(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/packages/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deletePackagePlan(Number(req.params.id));
    res.json({ success: true });
  }));

  // ─── Couriers ─────────────────────────────────────────────────────────────
  router.get('/couriers', asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).listCouriers();
    res.json({ success: true, data });
  }));

  router.post('/couriers', validate(createCourierSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).createCourier(req.body);
    res.status(201).json({ success: true, data });
  }));

  router.put('/couriers/:id', validate(updateCourierSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = await getRepo(req).updateCourier(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }));

  router.delete('/couriers/:id', asyncHandler(async (req: Request, res: Response) => {
    await getRepo(req).deleteCourier(Number(req.params.id));
    res.json({ success: true });
  }));

  return router;
}
