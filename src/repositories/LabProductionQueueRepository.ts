/**
 * Lab Production Queue Repository
 *
 * Handles all lab production queue database operations
 * Provides type-safe access to production jobs and queue management
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type LabProductionQueueRow = Database['public']['Tables']['lab_production_queue']['Row'];
type LabProductionQueueInsert = Database['public']['Tables']['lab_production_queue']['Insert'];
type LabProductionQueueUpdate = Database['public']['Tables']['lab_production_queue']['Update'];

export interface ProductionJobWithPatient extends LabProductionQueueRow {
  patients?: {
    id: string;
    patient_code: string;
  } | null;
}

export class LabProductionQueueRepository extends BaseRepository<
  'lab_production_queue',
  LabProductionQueueRow,
  LabProductionQueueInsert,
  LabProductionQueueUpdate
> {
  constructor() {
    super('lab_production_queue');
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: string): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findAll({
      filter: { status },
      orderBy: { column: 'priority', ascending: false },
    });
  }

  /**
   * Find pending jobs
   */
  async findPending(): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findByStatus('pending');
  }

  /**
   * Find in-progress jobs
   */
  async findInProgress(): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findByStatus('in_progress');
  }

  /**
   * Find urgent jobs
   */
  async findUrgent(): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('is_urgent', true)
        .order('priority', { ascending: false });

      if (error) {
        this.logger.error('Failed to find urgent jobs', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findUrgent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find jobs with patient information
   */
  async findWithPatientInfo(): Promise<RepositoryResult<ProductionJobWithPatient[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          patients (
            id,
            patient_code
          )
        `)
        .order('priority', { ascending: false });

      if (error) {
        this.logger.error('Failed to find jobs with patient info', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ProductionJobWithPatient[] };
    } catch (error) {
      this.logger.error('Unexpected error in findWithPatientInfo', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find jobs by patient ID
   */
  async findByPatientId(patientId: string): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findAll({
      filter: { patient_id: patientId },
      orderBy: { column: 'created_at', ascending: false },
    });
  }

  /**
   * Find jobs by machine assignment
   */
  async findByMachine(machineAssignment: string): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findAll({
      filter: { machine_assignment: machineAssignment },
      orderBy: { column: 'priority', ascending: false },
    });
  }

  /**
   * Update job status
   */
  async updateStatus(
    jobId: string,
    status: string,
    additionalData?: Partial<LabProductionQueueUpdate>
  ): Promise<RepositoryResult<LabProductionQueueRow>> {
    return this.update(jobId, {
      status,
      ...additionalData,
    } as LabProductionQueueUpdate);
  }

  /**
   * Start a job
   */
  async startJob(jobId: string, machineAssignment?: string): Promise<RepositoryResult<LabProductionQueueRow>> {
    return this.updateStatus(jobId, 'in_progress', {
      machine_assignment: machineAssignment,
    });
  }

  /**
   * Complete a job
   */
  async completeJob(jobId: string, actualDuration?: string): Promise<RepositoryResult<LabProductionQueueRow>> {
    return this.updateStatus(jobId, 'completed', {
      actual_duration: actualDuration,
    });
  }

  /**
   * Get queue ordered by priority
   */
  async getQueueByPriority(): Promise<RepositoryResult<ProductionJobWithPatient[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          patients (
            id,
            patient_code
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error('Failed to get queue by priority', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ProductionJobWithPatient[] };
    } catch (error) {
      this.logger.error('Unexpected error in getQueueByPriority', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update job priority
   */
  async updatePriority(jobId: string, priority: number): Promise<RepositoryResult<LabProductionQueueRow>> {
    return this.update(jobId, { priority } as LabProductionQueueUpdate);
  }

  /**
   * Mark job as urgent
   */
  async markAsUrgent(jobId: string, isUrgent: boolean = true): Promise<RepositoryResult<LabProductionQueueRow>> {
    return this.update(jobId, {
      is_urgent: isUrgent,
      priority: isUrgent ? 10 : undefined,
    } as LabProductionQueueUpdate);
  }

  /**
   * Find jobs by type
   */
  async findByJobType(jobType: string): Promise<RepositoryResult<LabProductionQueueRow[]>> {
    return this.findAll({
      filter: { job_type: jobType },
      orderBy: { column: 'priority', ascending: false },
    });
  }
}

// Export singleton instance
export const labProductionQueueRepository = new LabProductionQueueRepository();
