import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { TerminologyService } from '../../../domains/clinical-terminology/services/terminology.service.js';
import { TerminologyRepositoryPg } from '../../repositories/terminology.repository.pg.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('terminology-router');

// ─── Self-healing: ensure tables exist on first request ─────────────────────
const ENSURE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS icd_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  version VARCHAR(10) NOT NULL DEFAULT 'ICD-10',
  description TEXT NOT NULL,
  chapter VARCHAR(100),
  category VARCHAR(255),
  parent_code VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS icd_code_idx ON icd_codes (code);

CREATE TABLE IF NOT EXISTS snomed_concepts (
  id SERIAL PRIMARY KEY,
  concept_id BIGINT NOT NULL UNIQUE,
  fsn TEXT NOT NULL,
  term TEXT NOT NULL,
  concept_type VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loinc_codes (
  id SERIAL PRIMARY KEY,
  loinc_num VARCHAR(20) NOT NULL UNIQUE,
  component TEXT NOT NULL,
  property VARCHAR(50),
  system VARCHAR(100),
  scale VARCHAR(20),
  method VARCHAR(100),
  units VARCHAR(50),
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS loinc_num_idx ON loinc_codes (loinc_num);

CREATE TABLE IF NOT EXISTS procedure_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  standard VARCHAR(20) DEFAULT 'CPT',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_panels (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_panel_loinc_links (
  id SERIAL PRIMARY KEY,
  lab_panel_id INTEGER NOT NULL REFERENCES lab_panels(id),
  loinc_code_id INTEGER NOT NULL REFERENCES loinc_codes(id),
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS code_mappings (
  id SERIAL PRIMARY KEY,
  source_system VARCHAR(20) NOT NULL,
  source_code VARCHAR(50) NOT NULL,
  target_system VARCHAR(20) NOT NULL,
  target_code VARCHAR(50) NOT NULL,
  map_type VARCHAR(20) DEFAULT 'equivalent',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_case_diagnoses (
  id SERIAL PRIMARY KEY,
  medical_case_id INTEGER NOT NULL,
  icd_code_id INTEGER REFERENCES icd_codes(id),
  snomed_code_id INTEGER REFERENCES snomed_concepts(id),
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS investigation_results (
  id SERIAL PRIMARY KEY,
  investigation_id INTEGER NOT NULL,
  loinc_code_id INTEGER REFERENCES loinc_codes(id),
  observation_value VARCHAR(100),
  observation_unit VARCHAR(20),
  reference_range VARCHAR(50),
  is_abnormal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

const ensuredTenants = new Set<string>();

async function ensureTablesExist(db: any, tenantId: string) {
  if (ensuredTenants.has(tenantId)) return;
  try {
    await db.execute(sql.raw(ENSURE_TABLES_SQL));
    ensuredTenants.add(tenantId);
    logger.info({ tenantId }, 'Clinical terminology tables ensured');
  } catch (err: any) {
    logger.warn({ err: err.message, tenantId }, 'Table ensure skipped (may already exist)');
    ensuredTenants.add(tenantId);
  }
}

export function createTerminologyRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  // Ensure tables on every request (cached after first success per tenant)
  router.use(asyncHandler(async (req: Request, _res: Response, next: any) => {
    const db = (req as any).tenantDb;
    const tenantId = (req as any).tenantId || (req as any).user?.contextId || 'default';
    if (db) await ensureTablesExist(db, tenantId);
    next();
  }));

  const getService = (req: any): TerminologyService => {
    const repo = new TerminologyRepositoryPg(req.tenantDb || req.db);
    return new TerminologyService(repo);
  };

  // ─── ICD ──────────────────────────────────────────────────────────────────
  router.get('/icd/search', asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const results = await getService(req).searchIcd(query, limit);
    res.json({ success: true, data: results });
  }));

  router.get('/icd/:code', asyncHandler(async (req: Request, res: Response) => {
    const result = await getService(req).getIcdDetails(req.params.code as string);
    if (!result) {
      res.status(404).json({ success: false, error: 'ICD code not found' });
      return;
    }
    res.json({ success: true, data: result });
  }));

  // ─── LOINC ────────────────────────────────────────────────────────────────
  router.get('/loinc/search', asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const results = await getService(req).searchLoinc(query, limit);
    res.json({ success: true, data: results });
  }));

  router.get('/loinc/:loincNum', asyncHandler(async (req: Request, res: Response) => {
    const result = await getService(req).getLoincDetails(req.params.loincNum as string);
    if (!result) {
      res.status(404).json({ success: false, error: 'LOINC code not found' });
      return;
    }
    res.json({ success: true, data: result });
  }));

  // ─── Procedure Codes ──────────────────────────────────────────────────────
  router.get('/procedures/search', asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const results = await getService(req).searchProcedure(query, limit);
    res.json({ success: true, data: results });
  }));

  router.get('/procedures/:code', asyncHandler(async (req: Request, res: Response) => {
    const result = await getService(req).getProcedureDetails(req.params.code as string);
    if (!result) {
      res.status(404).json({ success: false, error: 'Procedure code not found' });
      return;
    }
    res.json({ success: true, data: result });
  }));

  // ─── Seed endpoint (POST /api/terminology/seed) ──────────────────────────
  router.post('/seed', asyncHandler(async (req: Request, res: Response) => {
    const db = (req as any).tenantDb;
    if (!db) {
      res.status(400).json({ success: false, error: 'No tenant database available' });
      return;
    }

    try {
      const { seedClinicalCodes } = await import('@mmc/database/seeds/clinical-codes-seed');
      await seedClinicalCodes(db);
      res.json({ success: true, message: 'Clinical codes seeded successfully' });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Seed failed');
      res.status(500).json({ success: false, error: 'Seed failed: ' + err.message });
    }
  }));

  return router;
}
