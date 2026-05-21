import { z } from 'zod';

// Shared numeric validation: optional, nullable, can be string or number (for flexibility from UI inputs)
const numericField = z.union([z.string(), z.number()]).optional().nullable().transform(v => {
  if (v === null || v === undefined || v === '') return null;
  const parsed = Number(v);
  return isNaN(parsed) ? null : parsed;
});

const textField = z.string().optional().nullable();

export const cbcSchema = z.object({
  hb: numericField,
  rbc: numericField,
  wbc: numericField,
  platelets: numericField,
  neutrophils: numericField,
  lymphocytes: numericField,
  eosinophils: numericField,
  monocytes: numericField,
  basophils: numericField,
  esr: numericField,
  vitaminb: numericField,
  vitamind: numericField,
  abnor_rbc: textField,
  parasites: textField,
});

export const diabetesSchema = z.object({
  blood_fasting: numericField,
  blood_prandial: numericField,
  blood_random: numericField,
  urine_fasting: textField,
  urine_prandial: textField,
  urine_random: textField,
  glu_test: textField,
  glycosylated_hb: numericField, // HbA1c
});

export const liverProfileSchema = z.object({
  total_bil: numericField,
  albumin: numericField,
  dir_bilirubin: numericField,
  globulin: numericField,
  ind_bilirubin: numericField,
  sgot: numericField,
  gamma_gt: numericField,
  sgpt: numericField,
  total_protein: numericField,
  alk_phos: numericField,
  aust_antigen: textField,
  amylase: numericField,
});

export const renalProfileSchema = z.object({
  urea: numericField,
  bun: numericField,
  phosphorus: numericField,
  sodium: numericField,
  creatinine: numericField,
  potassium: numericField,
  uric_acid: numericField,
  chloride: numericField,
  calcium: numericField,
});

export const genericInvestigationSchema = z.record(z.any()); // Fallback for unstructured types

export const saveInvestigationSchema = z.object({
  regid: z.coerce.number().positive(),
  visitId: z.coerce.number().positive().optional(),
  type: z.enum([
    'CBC', 'Diabetes Profile', 'Liver Profile', 'Renal Profile', 
    'Urine', 'Stool', 'Arthritis', 'Endocrine', 'X-ray - CT - MRI',
    'USG Female', 'USG Male', 'Immunology', 'Lipid Profile',
    'Cardiac Profile', 'Serology', 'Semen Analysis', 'Specific'
  ]),
  data: z.any(), // We will refine this in the backend based on 'type'
  investDate: z.string().optional(),
}).superRefine((val, ctx) => {
  // Conditionally validate `data` based on `type`
  let schemaToUse = genericInvestigationSchema;
  
  if (val.type === 'CBC') schemaToUse = cbcSchema as any;
  else if (val.type === 'Diabetes Profile') schemaToUse = diabetesSchema as any;
  else if (val.type === 'Liver Profile') schemaToUse = liverProfileSchema as any;
  else if (val.type === 'Renal Profile') schemaToUse = renalProfileSchema as any;

  const result = schemaToUse.safeParse(val.data);
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid structured data for ${val.type}: ${result.error.message}`,
      path: ['data'],
    });
  } else {
    // Override data with parsed/coerced values
    val.data = result.data;
  }
});

export type SaveInvestigationInput = z.infer<typeof saveInvestigationSchema>;
export type CbcData = z.infer<typeof cbcSchema>;
export type DiabetesData = z.infer<typeof diabetesSchema>;
export type LiverProfileData = z.infer<typeof liverProfileSchema>;
export type RenalProfileData = z.infer<typeof renalProfileSchema>;
