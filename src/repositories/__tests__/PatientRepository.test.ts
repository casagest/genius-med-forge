/**
 * Unit Tests for PatientRepository
 *
 * Demonstrates testing pattern for repository layer
 * Uses Vitest for testing framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientRepository } from '../PatientRepository';
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

type PatientRow = Database['public']['Tables']['patients']['Row'];

describe('PatientRepository', () => {
  let repository: PatientRepository;
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Import the mocked supabase
    const { supabase } = require('@/integrations/supabase/client');
    mockSupabase = supabase;

    // Create repository instance
    repository = new PatientRepository();
  });

  describe('findById', () => {
    it('should return patient when found', async () => {
      const mockPatient: Partial<PatientRow> = {
        id: '123',
        patient_code: 'P001',
        first_name: 'John',
        last_name: 'Doe',
      };

      // Setup mock chain
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await repository.findById('123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockPatient);
      }
      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });

    it('should return error when patient not found', async () => {
      const mockError = { message: 'Patient not found' };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await repository.findById('999');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Patient not found');
      }
    });
  });

  describe('findByPatientCode', () => {
    it('should return patient when found by code', async () => {
      const mockPatient: Partial<PatientRow> = {
        id: '123',
        patient_code: 'P001',
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await repository.findByPatientCode('P001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient_code).toBe('P001');
      }
      expect(mockEq).toHaveBeenCalledWith('patient_code', 'P001');
    });
  });

  describe('searchByName', () => {
    it('should return matching patients', async () => {
      const mockPatients: Partial<PatientRow>[] = [
        {
          id: '1',
          patient_code: 'P001',
          first_name: 'John',
          last_name: 'Doe',
        },
        {
          id: '2',
          patient_code: 'P002',
          first_name: 'Jane',
          last_name: 'Doe',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPatients,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        or: mockOr,
      });
      mockOr.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.searchByName('Doe');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].last_name).toBe('Doe');
      }
    });
  });

  describe('create', () => {
    it('should create a new patient', async () => {
      const newPatient = {
        patient_code: 'P003',
        first_name: 'Alice',
        last_name: 'Smith',
      };

      const createdPatient: Partial<PatientRow> = {
        id: '3',
        ...newPatient,
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: createdPatient,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await repository.create(newPatient as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient_code).toBe('P003');
        expect(result.data.id).toBe('3');
      }
      expect(mockInsert).toHaveBeenCalledWith(newPatient);
    });
  });

  describe('update', () => {
    it('should update an existing patient', async () => {
      const updates = {
        first_name: 'Johnny',
      };

      const updatedPatient: Partial<PatientRow> = {
        id: '123',
        patient_code: 'P001',
        first_name: 'Johnny',
        last_name: 'Doe',
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedPatient,
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

      const result = await repository.update('123', updates as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe('Johnny');
      }
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });
  });

  describe('delete', () => {
    it('should delete a patient', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const result = await repository.delete('123');

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await repository.findById('123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });
  });
});
