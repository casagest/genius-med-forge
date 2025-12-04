import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { BaseRepository } from './BaseRepository';
import type { Database } from '@/integrations/supabase/types';

// Create a concrete implementation for testing
type TestRow = Database['public']['Tables']['patients']['Row'];
type TestInsert = Database['public']['Tables']['patients']['Insert'];
type TestUpdate = Database['public']['Tables']['patients']['Update'];

class TestRepository extends BaseRepository<'patients', TestRow, TestInsert, TestUpdate> {
  constructor() {
    super('patients');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockQuery: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = new TestRepository();

    // Reset and setup mock chain
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom = vi.fn(() => mockQuery);
    vi.mocked(supabase.from).mockImplementation(mockFrom);
  });

  describe('findById', () => {
    it('should return success with data when record exists', async () => {
      const mockPatient = {
        id: 'test-123',
        patient_code: 'P001',
        digital_twin_id: 'DT001',
      };

      mockQuery.single.mockResolvedValue({ data: mockPatient, error: null });

      const result = await repository.findById('test-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockPatient);
      }
      expect(mockFrom).toHaveBeenCalledWith('patients');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-123');
    });

    it('should return failure when record not found', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Record not found' },
      });

      const result = await repository.findById('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Record not found');
      }
    });

    it('should handle unexpected errors', async () => {
      mockQuery.single.mockRejectedValue(new Error('Network error'));

      const result = await repository.findById('test-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network error');
      }
    });
  });

  describe('findAll', () => {
    it('should return all records without options', async () => {
      const mockPatients = [
        { id: '1', patient_code: 'P001', digital_twin_id: 'DT001' },
        { id: '2', patient_code: 'P002', digital_twin_id: 'DT002' },
      ];

      // For findAll, the query chain doesn't end with single()
      mockQuery.select.mockResolvedValue({ data: mockPatients, error: null });

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockPatients);
      }
    });

    it('should apply ordering when specified', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await repository.findAll({
        orderBy: { column: 'patient_code', ascending: false },
      });

      expect(mockQuery.order).toHaveBeenCalledWith('patient_code', {
        ascending: false,
      });
    });

    it('should apply limit when specified', async () => {
      mockQuery.limit.mockResolvedValue({ data: [], error: null });

      await repository.findAll({ limit: 10 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should apply pagination with offset and limit', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await repository.findAll({ offset: 20, limit: 10 });

      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });
  });

  describe('create', () => {
    it('should create a new record successfully', async () => {
      const newPatient = {
        patient_code: 'P003',
        digital_twin_id: 'DT003',
      };
      const createdPatient = { id: '3', ...newPatient };

      mockQuery.single.mockResolvedValue({ data: createdPatient, error: null });

      const result = await repository.create(newPatient as TestInsert);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(createdPatient);
      }
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should return failure on create error', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Duplicate key' },
      });

      const result = await repository.create({
        patient_code: 'P001',
      } as TestInsert);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Duplicate key');
      }
    });
  });

  describe('update', () => {
    it('should update a record successfully', async () => {
      const updateData = { patient_code: 'P001-Updated' };
      const updatedPatient = {
        id: '1',
        patient_code: 'P001-Updated',
        digital_twin_id: 'DT001',
      };

      mockQuery.single.mockResolvedValue({ data: updatedPatient, error: null });

      const result = await repository.update('1', updateData as TestUpdate);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient_code).toBe('P001-Updated');
      }
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('delete', () => {
    it('should delete a record successfully', async () => {
      mockQuery.eq.mockResolvedValue({ error: null });

      const result = await repository.delete('1');

      expect(result.success).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should return failure when delete fails', async () => {
      mockQuery.eq.mockResolvedValue({
        error: { message: 'Foreign key constraint' },
      });

      const result = await repository.delete('1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Foreign key constraint');
      }
    });
  });

  describe('count', () => {
    it('should return count of records', async () => {
      mockQuery.select.mockResolvedValue({ count: 42, error: null });

      const result = await repository.count();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should apply filter to count', async () => {
      mockQuery.eq.mockResolvedValue({ count: 5, error: null });

      await repository.count({ patient_code: 'P001' });

      expect(mockQuery.eq).toHaveBeenCalledWith('patient_code', 'P001');
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: '1' },
        error: null,
      });

      const result = await repository.exists('1');

      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await repository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
