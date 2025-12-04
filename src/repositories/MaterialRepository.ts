/**
 * Material Repository
 *
 * Handles all material/inventory-related database operations
 * Provides type-safe access to lab materials data
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type MaterialRow = Database['public']['Tables']['lab_materials']['Row'];
type MaterialInsert = Database['public']['Tables']['lab_materials']['Insert'];
type MaterialUpdate = Database['public']['Tables']['lab_materials']['Update'];

export class MaterialRepository extends BaseRepository<
  'lab_materials',
  MaterialRow,
  MaterialInsert,
  MaterialUpdate
> {
  constructor() {
    super('lab_materials');
  }

  /**
   * Find materials below reorder threshold
   */
  async findLowStock(): Promise<RepositoryResult<MaterialRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .filter('current_stock', 'lte', supabase.raw('reorder_threshold'))
        .order('current_stock', { ascending: true });

      if (error) {
        this.logger.error('Failed to find low stock materials', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findLowStock', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update material stock level by ID
   */
  async updateStockById(materialId: string, quantity: number, operation: 'add' | 'subtract'): Promise<RepositoryResult<MaterialRow>> {
    try {
      // First, get current stock
      const currentResult = await this.findById(materialId);
      if (!currentResult.success) {
        return currentResult;
      }

      const currentStock = currentResult.data.current_stock || 0;
      const newStock = operation === 'add' ? currentStock + quantity : currentStock - quantity;

      if (newStock < 0) {
        return {
          success: false,
          error: 'Insufficient stock for this operation',
        };
      }

      return this.update(materialId, {
        current_stock: newStock,
      } as MaterialUpdate);
    } catch (error) {
      this.logger.error('Unexpected error in updateStockById', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update material stock level by name
   */
  async updateStock(materialName: string, newStock: number): Promise<RepositoryResult<MaterialRow>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ current_stock: newStock })
        .eq('material_name', materialName)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update stock by name', error);
        return { success: false, error: error.message };
      }

      this.logger.info('Updated stock', { materialName, newStock });
      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in updateStock', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find materials by supplier
   */
  async findBySupplier(supplier: string): Promise<RepositoryResult<MaterialRow[]>> {
    return this.findAll({
      filter: { supplier },
      orderBy: { column: 'material_name', ascending: true },
    });
  }

  /**
   * Get materials expiring soon (based on lead time)
   */
  async findExpiringStock(): Promise<RepositoryResult<MaterialRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .filter('current_stock', 'lte', supabase.raw('reorder_threshold * 1.5'))
        .order('lead_time_days', { ascending: false });

      if (error) {
        this.logger.error('Failed to find expiring stock', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findExpiringStock', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const materialRepository = new MaterialRepository();
