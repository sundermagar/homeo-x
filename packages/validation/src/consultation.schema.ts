import { z } from 'zod';

export const startConsultationSchema = z.object({
  visitId: z.string().min(1, 'Visit ID is required'),
});

export const consultHomeopathySchema = z.object({
  visitId: z.string().min(1),
  transcript: z.string().min(10, 'Transcript too short'),
  age: z.string().optional(),
  gender: z.string().optional(),
  thermalReaction: z.string().optional(),
  miasm: z.string().optional(),
  specialty: z.string().default('Homeopathy'),
  isBackground: z.boolean().default(false),
});

export const addSegmentsSchema = z.object({
  segments: z.array(z.object({
    sequenceNumber: z.number().int(),
    text: z.string().min(1),
    speaker: z.enum(['DOCTOR', 'PATIENT', 'SYSTEM']),
    confidence: z.number().min(0).max(1).default(1.0),
    startTimeMs: z.number().optional(),
    endTimeMs: z.number().optional(),
    isFinal: z.boolean().default(true),
    source: z.enum(['WEB_SPEECH_API', 'GROQ_WHISPER', 'MANUAL']).default('WEB_SPEECH_API'),
  })).min(1).max(100),
});

export const vitalsSchema = z.object({
  heightCm: z.number().positive().optional().nullable(),
  weightKg: z.number().positive().optional().nullable(),
  bmi: z.number().positive().optional().nullable(),
  temperatureF: z.number().optional().nullable(),
  pulseRate: z.number().int().positive().optional().nullable(),
  systolicBp: z.number().int().positive().optional().nullable(),
  diastolicBp: z.number().int().positive().optional().nullable(),
  respiratoryRate: z.number().int().positive().optional().nullable(),
  oxygenSaturation: z.number().min(0).max(100).optional().nullable(),
  bloodSugar: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type StartConsultationInput = z.infer<typeof startConsultationSchema>;
export type ConsultHomeopathyInput = z.infer<typeof consultHomeopathySchema>;
export type AddSegmentsInput = z.infer<typeof addSegmentsSchema>;
export type VitalsInput = z.infer<typeof vitalsSchema>;
