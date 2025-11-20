/**
 * Procedure Repository
 *
 * Handles all procedure-related database operations
 * Provides type-safe access to active procedures and events
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type ProcedureRow = Database['public']['Tables']['active_procedures']['Row'];
type ProcedureInsert = Database['public']['Tables']['active_procedures']['Insert'];
type ProcedureUpdate = Database['public']['Tables']['active_procedures']['Update'];
type ProcedureEventRow = Database['public']['Tables']['procedure_events']['Row'];

export class ProcedureRepository extends BaseRepository<
  'active_procedures',
  ProcedureRow,
  ProcedureInsert,
  ProcedureUpdate
> {
  constructor() {
    super('active_procedures');
  }

  /**
   * Find procedures by status
   */
  async findByStatus(status: string): Promise<RepositoryResult<ProcedureRow[]>> {
    return this.findAll({
      filter: { status },
      orderBy: { column: 'started_at', ascending: false },
    });
  }

  /**
   * Find active (in-progress) procedures
   */
  async findActive(): Promise<RepositoryResult<ProcedureRow[]>> {
    return this.findByStatus('IN_PROGRESS');
  }

  /**
   * Find procedures by patient ID
   */
  async findByPatientId(patientId: string): Promise<RepositoryResult<ProcedureRow[]>> {
    return this.findAll({
      filter: { patient_id: patientId },
      orderBy: { column: 'started_at', ascending: false },
    });
  }

  /**
   * Get procedure events for a specific procedure
   */
  async getProcedureEvents(procedureId: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from('procedure_events')
        .select('*')
        .eq('case_id', procedureId)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to get procedure events', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in getProcedureEvents', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete a procedure
   */
  async completeProcedure(
    procedureId: string,
    completionData: {
      actual_duration_minutes?: number;
      materials_used?: Record<string, unknown>;
      complications?: string;
      notes?: string;
    }
  ): Promise<RepositoryResult<ProcedureRow>> {
    return this.update(procedureId, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      ...completionData,
    } as ProcedureUpdate);
  }

  /**
   * Get procedures within a date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<RepositoryResult<ProcedureRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('started_at', startDate)
        .lte('started_at', endDate)
        .order('started_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to find procedures by date range', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByDateRange', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const procedureRepository = new ProcedureRepository();
