/**
 * Unit Tests for ProcedureRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcedureRepository } from '../ProcedureRepository';
import type { Database } from '@/integrations/supabase/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    createChild: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

type ProcedureRow = Database['public']['Tables']['active_procedures']['Row'];

describe('ProcedureRepository', () => {
  let repository: ProcedureRepository;
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('@/integrations/supabase/client');
    mockSupabase = clientModule.supabase;
    repository = new ProcedureRepository();
  });

  describe('findByStatus', () => {
    it('should return procedures with specific status', async () => {
      const mockProcedures: Partial<ProcedureRow>[] = [
        {
          id: '1',
          case_id: 'CASE001',
          status: 'IN_PROGRESS',
          procedure_type: 'dental_implant',
        },
        {
          id: '2',
          case_id: 'CASE002',
          status: 'IN_PROGRESS',
          procedure_type: 'crown',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockProcedures,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.findByStatus('IN_PROGRESS');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(p => p.status === 'IN_PROGRESS')).toBe(true);
      }
    });
  });

  describe('findActive', () => {
    it('should return only active procedures', async () => {
      const mockProcedures: Partial<ProcedureRow>[] = [
        {
          id: '1',
          status: 'IN_PROGRESS',
          procedure_type: 'dental_implant',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockProcedures,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.findActive();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every(p => p.status === 'IN_PROGRESS')).toBe(true);
      }
    });
  });

  describe('completeProcedure', () => {
    it('should complete a procedure with completion data', async () => {
      const procedureId = '1';
      const completionData = {
        actual_duration_minutes: 120,
        complications: 'None',
        notes: 'Procedure completed successfully',
      };

      const completedProcedure: Partial<ProcedureRow> = {
        id: procedureId,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        ...completionData,
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: completedProcedure,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await repository.completeProcedure(procedureId, completionData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('COMPLETED');
        expect(result.data.actual_duration_minutes).toBe(120);
      }
    });
  });

  describe('findByPatientId', () => {
    it('should return all procedures for a patient', async () => {
      const patientId = 'patient-123';
      const mockProcedures: Partial<ProcedureRow>[] = [
        {
          id: '1',
          patient_id: patientId,
          procedure_type: 'dental_implant',
          status: 'COMPLETED',
        },
        {
          id: '2',
          patient_id: patientId,
          procedure_type: 'crown',
          status: 'IN_PROGRESS',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockProcedures,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.findByPatientId(patientId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(p => p.patient_id === patientId)).toBe(true);
      }
    });
  });

  describe('findByDateRange', () => {
    it('should return procedures within date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const mockProcedures: Partial<ProcedureRow>[] = [
        {
          id: '1',
          started_at: '2024-06-15T10:00:00Z',
          status: 'COMPLETED',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockProcedures,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.findByDateRange(startDate, endDate);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });
  });
});
