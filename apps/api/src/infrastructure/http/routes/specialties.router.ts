// ─── Specialties Router ───────────────────────────────────────────────────────
// Returns the specialty config the consultation UI uses to render
// soap/prescription field templates. homeo-x is homeopathy-only for now,
// so we return a hardcoded Homeopathy config; can be DB-backed later.

import { Router } from 'express';
import { sendSuccess } from '../../../shared/response-formatter';

export const specialtiesRouter: Router = Router();

const HOMEOPATHY_CONFIG = {
  name: 'Homeopathy',
  displayName: 'Homeopathy',
  soapFields: [
    { key: 'subjective', label: 'Subjective', type: 'textarea', required: true,  section: 'subjective' },
    { key: 'objective',  label: 'Objective',  type: 'textarea', required: false, section: 'objective' },
    { key: 'assessment', label: 'Assessment', type: 'textarea', required: true,  section: 'assessment' },
    { key: 'plan',       label: 'Plan',       type: 'textarea', required: true,  section: 'plan' },
  ],
  prescriptionFields: [
    { key: 'medicationName', label: 'Remedy',     type: 'text',   required: true },
    { key: 'dosage',         label: 'Potency',    type: 'select', required: true,  options: ['6C', '30C', '200C', '1M', '10M', 'CM'] },
    { key: 'frequency',      label: 'Frequency',  type: 'select', required: true,  options: ['Stat', 'OD', 'BD', 'TDS', 'QID'] },
    { key: 'duration',       label: 'Duration',   type: 'text',   required: true },
    { key: 'route',          label: 'Route',      type: 'select', required: false, options: ['Globules', 'Drops', 'Tablets'] },
  ],
};

const HOMEOPATHY_SOAP_TEMPLATE = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
};

// GET /api/specialties — list of all available specialty configs
specialtiesRouter.get('/', (_req, res) => {
  sendSuccess(res, [HOMEOPATHY_CONFIG]);
});

// GET /api/specialties/:name/config — config for a single specialty
specialtiesRouter.get('/:name/config', (_req, res) => {
  // homeo-x is homeopathy-only; always return the homeopathy config.
  sendSuccess(res, HOMEOPATHY_CONFIG);
});

// GET /api/specialties/:name/soap-template — empty SOAP shell for a specialty
specialtiesRouter.get('/:name/soap-template', (_req, res) => {
  sendSuccess(res, HOMEOPATHY_SOAP_TEMPLATE);
});
