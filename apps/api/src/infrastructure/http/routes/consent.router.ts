import { Router } from 'express';
import { ConsentRepositoryPg } from '../../repositories/consent.repository.pg.js';
import { GrantConsentUseCase } from '../../../domains/consent/use-cases/grant-consent.js';
import { RevokeConsentUseCase } from '../../../domains/consent/use-cases/revoke-consent.js';
import { GetConsentStatusUseCase } from '../../../domains/consent/use-cases/get-consent-status.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendSuccess } from '../../../shared/response-formatter.js';

export const consentRouter = Router();

consentRouter.use(authMiddleware);

// POST /api/consent
consentRouter.post('/', async (req: any, res, next) => {
  try {
    const repo = new ConsentRepositoryPg(req.tenantDb);
    const uc = new GrantConsentUseCase(repo);
    const result = await uc.execute({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    if (result.success) {
      sendSuccess(res, result.data, 'Consent recorded');
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/consent/:regid
consentRouter.get('/:regid', async (req: any, res, next) => {
  try {
    const regid = Number(req.params.regid);
    const repo = new ConsentRepositoryPg(req.tenantDb);
    const uc = new GetConsentStatusUseCase(repo);
    const result = await uc.execute(regid);
    
    if (result.success) {
      sendSuccess(res, result.data);
    } else {
      res.status(404).json(result);
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/consent/:regid/:type
consentRouter.delete('/:regid/:type', async (req: any, res, next) => {
  try {
    const regid = Number(req.params.regid);
    const { type } = req.params;
    const repo = new ConsentRepositoryPg(req.tenantDb);
    const uc = new RevokeConsentUseCase(repo);
    const result = await uc.execute(regid, type);
    
    if (result.success) {
      sendSuccess(res, undefined, 'Consent revoked');
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});
