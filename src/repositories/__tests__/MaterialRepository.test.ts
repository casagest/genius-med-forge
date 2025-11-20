/**
 * Unit Tests for MaterialRepository
 *
 * Demonstrates testing pattern for inventory management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaterialRepository } from '../MaterialRepository';
import type { Database } from '@/integrations/supabase/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    raw: vi.fn((sql) => sql),
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

type MaterialRow = Database['public']['Tables']['lab_materials']['Row'];

describe('MaterialRepository', () => {
  let repository: MaterialRepository;
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('@/integrations/supabase/client');
    mockSupabase = clientModule.supabase;
    repository = new MaterialRepository();
  });

  describe('findLowStock', () => {
    it('should return materials below reorder threshold', async () => {
      const mockMaterials: Partial<MaterialRow>[] = [
        {
          id: '1',
          material_name: 'Titanium Powder',
          current_stock: 5,
          reorder_threshold: 10,
        },
        {
          id: '2',
          material_name: 'Zirconia Block',
          current_stock: 2,
          reorder_threshold: 15,
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFilter = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMaterials,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        filter: mockFilter,
      });
      mockFilter.mockReturnValue({
        order: mockOrder,
      });

      const result = await repository.findLowStock();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].current_stock).toBeLessThanOrEqual(
          result.data[0].reorder_threshold || 0
        );
      }
    });
  });

  describe('updateStock', () => {
    it('should add stock correctly', async () => {
      const materialId = '1';
      const currentMaterial: Partial<MaterialRow> = {
        id: '1',
        material_name: 'Titanium Powder',
        current_stock: 10,
        reorder_threshold: 5,
      };

      const updatedMaterial: Partial<MaterialRow> = {
        ...currentMaterial,
        current_stock: 20,
      };

      // Mock findById
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: currentMaterial,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      // Mock update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockSelect2 = vi.fn().mockReturnThis();
      const mockSingle2 = vi.fn().mockResolvedValue({
        data: updatedMaterial,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq2,
      });
      mockEq2.mockReturnValue({
        select: mockSelect2,
      });
      mockSelect2.mockReturnValue({
        single: mockSingle2,
      });

      const result = await repository.updateStock(materialId, 10, 'add');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current_stock).toBe(20);
      }
    });

    it('should prevent negative stock', async () => {
      const materialId = '1';
      const currentMaterial: Partial<MaterialRow> = {
        id: '1',
        material_name: 'Titanium Powder',
        current_stock: 5,
        reorder_threshold: 5,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: currentMaterial,
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

      const result = await repository.updateStock(materialId, 10, 'subtract');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Insufficient stock');
      }
    });
  });

  describe('findBySupplier', () => {
    it('should return materials from specific supplier', async () => {
      const mockMaterials: Partial<MaterialRow>[] = [
        {
          id: '1',
          material_name: 'Titanium Powder',
          supplier: 'DentalTech Supplies',
        },
        {
          id: '2',
          material_name: 'Zirconia Block',
          supplier: 'DentalTech Supplies',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMaterials,
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

      const result = await repository.findBySupplier('DentalTech Supplies');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(m => m.supplier === 'DentalTech Supplies')).toBe(true);
      }
    });
  });
});
