/**
 * Input Validation Schemas
 * Centralized validation using Zod for type-safe runtime validation
 * Prevents injection attacks and ensures data integrity
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
const patterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  patientCode: /^P[0-9]{3,6}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  alphanumeric: /^[a-zA-Z0-9\s-_]+$/,
};

/**
 * Sanitizes user input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Patient data validation schemas
 */
export const PatientDataSchema = z.object({
  patient_code: z.string().regex(patterns.patientCode, 'Invalid patient code format'),
  first_name: z.string().min(1).max(100).transform(sanitizeString),
  last_name: z.string().min(1).max(100).transform(sanitizeString),
  date_of_birth: z.string().datetime().optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(patterns.phone, 'Invalid phone number').optional(),
  medical_history: z.record(z.unknown()).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  consent_vocal: z.boolean().default(false),
});

export type PatientData = z.infer<typeof PatientDataSchema>;

/**
 * Medical AI interface validation
 */
export const MedicalAIInputSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  analysis_type: z.enum(['preoperative', 'intraoperative', 'postoperative', 'comprehensive']),
  symptoms: z.string().max(2000).transform(sanitizeString).optional(),
  vital_signs: z.object({
    blood_pressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Invalid blood pressure format').optional(),
    heart_rate: z.number().int().min(30).max(250).optional(),
    temperature: z.number().min(35).max(42).optional(),
    spo2: z.number().int().min(0).max(100).optional(),
  }).optional(),
  lab_values: z.string().max(5000).optional(), // Should be validated as JSON
});

export type MedicalAIInput = z.infer<typeof MedicalAIInputSchema>;

/**
 * Procedure data validation
 */
export const ProcedureDataSchema = z.object({
  procedure_type: z.enum([
    'full_arch_rehabilitation',
    'single_crown_zirconia',
    'bridge_3_units',
    'surgical_implant_placement',
    'other',
  ]),
  patient_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  case_id: z.string().optional(),
  estimated_duration: z.number().int().min(0).max(480), // Max 8 hours
  materials_required: z.record(z.number()).optional(),
  notes: z.string().max(5000).transform(sanitizeString).optional(),
});

export type ProcedureData = z.infer<typeof ProcedureDataSchema>;

/**
 * Material/Inventory validation
 */
export const MaterialDataSchema = z.object({
  material_name: z.string().min(1).max(200).transform(sanitizeString),
  material_code: z.string().regex(patterns.alphanumeric),
  current_stock: z.number().int().min(0),
  minimum_threshold: z.number().int().min(0),
  unit_cost: z.number().min(0),
  supplier: z.string().min(1).max(200).transform(sanitizeString),
  lead_time_days: z.number().int().min(0).max(365),
});

export type MaterialData = z.infer<typeof MaterialDataSchema>;

/**
 * Lab job validation
 */
export const LabJobSchema = z.object({
  patient_id: z.string().uuid(),
  job_type: z.enum(['milling', '3d_printing', 'scanning', 'finishing']),
  priority: z.number().int().min(1).max(10),
  material_requirements: z.record(z.number().positive()),
  estimated_duration: z.string(),
  notes: z.string().max(2000).transform(sanitizeString).optional(),
});

export type LabJob = z.infer<typeof LabJobSchema>;

/**
 * Event logging validation
 */
export const EventDataSchema = z.object({
  event_type: z.string().min(1).max(100),
  patient_id: z.string().uuid().optional(),
  procedure_id: z.string().uuid().optional(),
  case_id: z.string().optional(),
  event_data: z.record(z.unknown()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  timestamp: z.string().datetime().optional(),
});

export type EventData = z.infer<typeof EventDataSchema>;

/**
 * Generic API request validation
 */
export const ApiRequestSchema = z.object({
  event: z.string().min(1).max(100),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime().optional(),
});

export type ApiRequest = z.infer<typeof ApiRequestSchema>;

/**
 * Validates JSON string input
 */
export function validateJSON<T>(
  input: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(input);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format' };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validates and sanitizes form input
 */
export function validateFormInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _form: 'Validation failed' } };
  }
}

/**
 * Safe parseInt with validation
 */
export function safeParseInt(value: string | number, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe parseFloat with validation
 */
export function safeParseFloat(value: string | number, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validates file upload
 */
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'application/pdf', 'model/stl']),
});

export function validateFile(file: File, maxSize?: number, allowedTypes?: string[]): { valid: boolean; error?: string } {
  const config = {
    file,
    maxSize: maxSize || 10 * 1024 * 1024,
    allowedTypes: allowedTypes || ['image/jpeg', 'image/png', 'application/pdf', 'model/stl'],
  };

  if (file.size > config.maxSize) {
    return { valid: false, error: `File size exceeds ${config.maxSize / 1024 / 1024}MB` };
  }

  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }

  return { valid: true };
}
