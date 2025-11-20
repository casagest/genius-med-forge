/**
 * Repository Index
 *
 * Central export point for all repositories
 * Use these instead of direct Supabase calls
 */

export { BaseRepository } from './BaseRepository';
export type { RepositoryResult, QueryOptions } from './BaseRepository';

export { PatientRepository, patientRepository } from './PatientRepository';
export { ProcedureRepository, procedureRepository } from './ProcedureRepository';
export { MaterialRepository, materialRepository } from './MaterialRepository';

/**
 * Usage Example:
 *
 * ```typescript
 * import { patientRepository } from '@/repositories';
 *
 * // Instead of:
 * const { data } = await supabase.from('patients').select('*');
 *
 * // Use:
 * const result = await patientRepository.findAll();
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
