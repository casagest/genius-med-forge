/**
 * Patient Repository
 *
 * Handles all patient-related database operations
 * Provides type-safe access to patient data
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type PatientRow = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export class PatientRepository extends BaseRepository<
  'patients',
  PatientRow,
  PatientInsert,
  PatientUpdate
> {
  constructor() {
    super('patients');
  }

  /**
   * Find patient by patient code
   */
  async findByPatientCode(patientCode: string): Promise<RepositoryResult<PatientRow>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('patient_code', patientCode)
        .single();

      if (error) {
        this.logger.error('Failed to find patient by code', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByPatientCode', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find patients with active procedures
   */
  async findWithActiveProcedures(): Promise<RepositoryResult<PatientRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          active_procedures!inner(*)
        `)
        .eq('active_procedures.status', 'IN_PROGRESS');

      if (error) {
        this.logger.error('Failed to find patients with active procedures', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PatientRow[] };
    } catch (error) {
      this.logger.error('Unexpected error in findWithActiveProcedures', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search patients by name
   */
  async searchByName(searchTerm: string): Promise<RepositoryResult<PatientRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .order('last_name', { ascending: true });

      if (error) {
        this.logger.error('Failed to search patients by name', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in searchByName', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const patientRepository = new PatientRepository();
