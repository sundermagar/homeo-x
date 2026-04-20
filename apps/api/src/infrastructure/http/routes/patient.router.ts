import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { createPatientSchema, updatePatientSchema, familyMemberSchema } from '@mmc/validation';
import { PatientRepositoryPg } from '../../repositories/patient.repository.pg';
import {
  ListPatientsUseCase,
  GetPatientUseCase,
  CreatePatientUseCase,
  UpdatePatientUseCase,
  DeletePatientUseCase,
} from '../../../domains/patient';

export const patientRouter: IRouter = Router();

function getRepo(req: Request) {
  return new PatientRepositoryPg(req.tenantDb);
}

// GET /api/patients?search=&page=&limit=&sortBy=&sortOrder=
patientRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '30', sortBy, sortOrder } = req.query;
    const repo = getRepo(req);
    const uc = new ListPatientsUseCase(repo);
    const result = await uc.execute({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    if (result.success) {
      res.json({ success: true, data: result.data.data, total: result.data.total });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/lookup?query=
patientRouter.get('/lookup', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || (query as string).length < 2) {
      res.json({ success: true, data: [] });
      return;
    }
    const repo = getRepo(req);
    const data = await repo.lookup(query as string, 20);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/meta/form
patientRouter.get('/meta/form', async (req: Request, res: Response) => {
  try {
    const repo = getRepo(req);
    const meta = await repo.getFormMeta();
    res.json({ success: true, data: meta });
  } catch (err: any) {
    console.error('CRITICAL PatientRouter Error:', err);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

// ─── Family Group Endpoints ───

// GET /api/family-groups
patientRouter.get('/family-groups', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '30' } = req.query;
    const repo = getRepo(req);
    const result = await repo.getFamilyGroups({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    });
    res.json({ success: true, data: result.data, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:regid
patientRouter.get('/:regid', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const repo = getRepo(req);
    const uc = new GetPatientUseCase(repo);
    const result = await uc.execute(regid);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients
patientRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const uc = new CreatePatientUseCase(repo);
    const result = await uc.execute(parsed.data);
    if (result.success) {
      res.status(201).json({ success: true, data: result.data, regid: result.data.regid });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/patients/:regid
patientRouter.put('/:regid', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const uc = new UpdatePatientUseCase(repo);
    const result = await uc.execute(regid, parsed.data);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/patients/:regid
patientRouter.delete('/:regid', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const repo = getRepo(req);
    const uc = new DeletePatientUseCase(repo);
    const result = await uc.execute(regid);
    if (result.success) {
      res.json({ success: true, message: 'Patient deleted' });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:regid/family
patientRouter.get('/:regid/family', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const repo = getRepo(req);
    const members = await repo.getFamilyMembers(regid);
    res.json({ success: true, data: members });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients/:regid/family
patientRouter.post('/:regid/family', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const parsed = familyMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const member = await repo.addFamilyMember(regid, parsed.data);
    res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/patients/:regid/family/:id
patientRouter.delete('/:regid/family/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const repo = getRepo(req);
    const deleted = await repo.removeFamilyMember(id);
    if (deleted) {
      res.json({ success: true, message: 'Family member removed' });
    } else {
      res.status(404).json({ success: false, message: 'Family member not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
