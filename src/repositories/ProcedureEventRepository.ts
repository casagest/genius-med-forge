/**
 * Procedure Event Repository
 *
 * Handles all procedure event database operations
 * Provides type-safe access to procedure events and timeline data
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type ProcedureEventRow = Database['public']['Tables']['procedure_events']['Row'];
type ProcedureEventInsert = Database['public']['Tables']['procedure_events']['Insert'];
type ProcedureEventUpdate = Database['public']['Tables']['procedure_events']['Update'];

export class ProcedureEventRepository extends BaseRepository<
  'procedure_events',
  ProcedureEventRow,
  ProcedureEventInsert,
  ProcedureEventUpdate
> {
  constructor() {
    super('procedure_events');
  }

  /**
   * Find events by case ID
   */
  async findByCaseId(caseId: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('case_id', caseId)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to find events by case ID', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByCaseId', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find events by appointment ID
   */
  async findByAppointmentId(appointmentId: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to find events by appointment ID', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByAppointmentId', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find events by type
   */
  async findByEventType(eventType: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    return this.findAll({
      filter: { event_type: eventType },
      orderBy: { column: 'timestamp', ascending: false },
    });
  }

  /**
   * Find unprocessed events
   */
  async findUnprocessed(): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('processed', false)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to find unprocessed events', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findUnprocessed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark event as processed
   */
  async markAsProcessed(eventId: string): Promise<RepositoryResult<ProcedureEventRow>> {
    return this.update(eventId, { processed: true } as ProcedureEventUpdate);
  }

  /**
   * Get event timeline for a case
   */
  async getTimeline(caseId: string): Promise<RepositoryResult<{
    timestamp: string;
    event_type: string;
  }[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('timestamp, event_type')
        .eq('case_id', caseId)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to get event timeline', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in getTimeline', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Count events for a case
   */
  async countByCaseId(caseId: string): Promise<RepositoryResult<number>> {
    return this.count({ case_id: caseId });
  }

  /**
   * Find events by patient ID
   */
  async findByPatientId(patientId: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false });

      if (error) {
        this.logger.error('Failed to find events by patient ID', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByPatientId', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log a new procedure event
   */
  async logEvent(
    caseId: string,
    appointmentId: string,
    eventType: string,
    eventData: Json,
    patientId?: string
  ): Promise<RepositoryResult<ProcedureEventRow>> {
    return this.create({
      case_id: caseId,
      appointment_id: appointmentId,
      event_type: eventType,
      event_data: eventData,
      patient_id: patientId || null,
      processed: false,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Find events within a date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<RepositoryResult<ProcedureEventRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error('Failed to find events by date range', error);
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
export const procedureEventRepository = new ProcedureEventRepository();
