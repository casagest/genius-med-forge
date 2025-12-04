/**
 * Repository Index
 *
 * Central export point for all repositories
 * Use these instead of direct Supabase calls
 */

export { BaseRepository } from './BaseRepository';
export type { RepositoryResult, QueryOptions } from './BaseRepository';

// Entity repositories
export { PatientRepository, patientRepository } from './PatientRepository';
export { ProcedureRepository, procedureRepository } from './ProcedureRepository';
export { MaterialRepository, materialRepository } from './MaterialRepository';
export { AnalysisReportRepository, analysisReportRepository } from './AnalysisReportRepository';
export type { AnalysisReportFilter, PaginatedResult } from './AnalysisReportRepository';
export { ProcedureEventRepository, procedureEventRepository } from './ProcedureEventRepository';
export { LabProductionQueueRepository, labProductionQueueRepository } from './LabProductionQueueRepository';
export type { ProductionJobWithPatient } from './LabProductionQueueRepository';
export { UserRoleRepository, userRoleRepository } from './UserRoleRepository';

/**
 * Usage Example:
 *
 * ```typescript
 * import { patientRepository, analysisReportRepository } from '@/repositories';
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
 *
 * // For analysis reports:
 * const reports = await analysisReportRepository.findRecent(50);
 * const highRisk = await analysisReportRepository.findHighRisk();
 * ```
 */
