import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { MaterialRepository } from './MaterialRepository';

describe('MaterialRepository', () => {
  let repository: MaterialRepository;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockQuery: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    repository = new MaterialRepository();

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom = vi.fn(() => mockQuery);
    vi.mocked(supabase.from).mockImplementation(mockFrom);
  });

  describe('findLowStock', () => {
    it('should return materials below reorder threshold', async () => {
      const lowStockMaterials = [
        {
          id: '1',
          material_name: 'PMMA Disk',
          current_stock: 5,
          reorder_threshold: 10,
        },
        {
          id: '2',
          material_name: 'Zirconia Block',
          current_stock: 2,
          reorder_threshold: 5,
        },
      ];

      mockQuery.order.mockResolvedValue({
        data: lowStockMaterials,
        error: null,
      });

      const result = await repository.findLowStock();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].current_stock).toBeLessThan(
          result.data[0].reorder_threshold
        );
      }
      expect(mockQuery.filter).toHaveBeenCalled();
      expect(mockQuery.order).toHaveBeenCalledWith('current_stock', {
        ascending: true,
      });
    });

    it('should handle database errors', async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await repository.findLowStock();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });
  });

  describe('updateStockById', () => {
    it('should add stock quantity correctly', async () => {
      const material = {
        id: '1',
        material_name: 'PMMA Disk',
        current_stock: 10,
        reorder_threshold: 5,
      };

      // Mock findById
      mockQuery.single.mockResolvedValueOnce({ data: material, error: null });

      // Mock update
      mockQuery.single.mockResolvedValueOnce({
        data: { ...material, current_stock: 15 },
        error: null,
      });

      const result = await repository.updateStockById('1', 5, 'add');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current_stock).toBe(15);
      }
    });

    it('should subtract stock quantity correctly', async () => {
      const material = {
        id: '1',
        material_name: 'PMMA Disk',
        current_stock: 10,
        reorder_threshold: 5,
      };

      mockQuery.single.mockResolvedValueOnce({ data: material, error: null });
      mockQuery.single.mockResolvedValueOnce({
        data: { ...material, current_stock: 7 },
        error: null,
      });

      const result = await repository.updateStockById('1', 3, 'subtract');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current_stock).toBe(7);
      }
    });

    it('should fail when subtracting more than available stock', async () => {
      const material = {
        id: '1',
        material_name: 'PMMA Disk',
        current_stock: 5,
        reorder_threshold: 10,
      };

      mockQuery.single.mockResolvedValueOnce({ data: material, error: null });

      const result = await repository.updateStockById('1', 10, 'subtract');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Insufficient stock for this operation');
      }
    });

    it('should fail when material not found', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Material not found' },
      });

      const result = await repository.updateStockById('nonexistent', 5, 'add');

      expect(result.success).toBe(false);
    });
  });

  describe('updateStock', () => {
    it('should update stock by material name', async () => {
      const updatedMaterial = {
        id: '1',
        material_name: 'PMMA Disk',
        current_stock: 20,
      };

      mockQuery.single.mockResolvedValue({
        data: updatedMaterial,
        error: null,
      });

      const result = await repository.updateStock('PMMA Disk', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current_stock).toBe(20);
      }
      expect(mockQuery.eq).toHaveBeenCalledWith('material_name', 'PMMA Disk');
    });

    it('should handle update errors', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Material not found' },
      });

      const result = await repository.updateStock('Nonexistent Material', 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Material not found');
      }
    });
  });

  describe('findBySupplier', () => {
    it('should return materials from specified supplier', async () => {
      const supplierMaterials = [
        { id: '1', material_name: 'Material A', supplier: 'SupplierX' },
        { id: '2', material_name: 'Material B', supplier: 'SupplierX' },
      ];

      mockQuery.order.mockResolvedValue({
        data: supplierMaterials,
        error: null,
      });

      const result = await repository.findBySupplier('SupplierX');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('findExpiringStock', () => {
    it('should return stock approaching threshold with priority for high lead time', async () => {
      const expiringStock = [
        {
          id: '1',
          material_name: 'Material A',
          current_stock: 12,
          reorder_threshold: 10,
          lead_time_days: 7,
        },
        {
          id: '2',
          material_name: 'Material B',
          current_stock: 6,
          reorder_threshold: 5,
          lead_time_days: 3,
        },
      ];

      mockQuery.order.mockResolvedValue({
        data: expiringStock,
        error: null,
      });

      const result = await repository.findExpiringStock();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
      expect(mockQuery.order).toHaveBeenCalledWith('lead_time_days', {
        ascending: false,
      });
    });
  });
});
