/**
 * Base Repository Pattern
 *
 * Provides abstraction layer over Supabase database operations
 * Makes the application database-agnostic and easier to test
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

/**
 * Generic repository result type
 */
export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
  filter?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

/**
 * Base Repository class that other repositories extend
 */
export abstract class BaseRepository<
  TTable extends TableName,
  TRow extends Tables[TTable]['Row'],
  TInsert extends Tables[TTable]['Insert'],
  TUpdate extends Tables[TTable]['Update']
> {
  protected tableName: TTable;
  protected logger = logger.createChild(`Repository:${this.constructor.name}`);

  constructor(tableName: TTable) {
    this.tableName = tableName;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<RepositoryResult<TRow>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        this.logger.error(`Failed to find ${this.tableName} by ID`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as TRow };
    } catch (error) {
      this.logger.error(`Unexpected error in findById`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(options?: QueryOptions): Promise<RepositoryResult<TRow[]>> {
    try {
      let query = supabase.from(this.tableName).select('*');

      // Apply filters
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to find all ${this.tableName}`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as TRow[] };
    } catch (error) {
      this.logger.error(`Unexpected error in findAll`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<RepositoryResult<TRow>> {
    try {
      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert(data as never)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create ${this.tableName}`, error);
        return { success: false, error: error.message };
      }

      this.logger.info(`Created ${this.tableName}`, { id: (created as TRow & { id?: string }).id });
      return { success: true, data: created as TRow };
    } catch (error) {
      this.logger.error(`Unexpected error in create`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: TUpdate): Promise<RepositoryResult<TRow>> {
    try {
      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to update ${this.tableName}`, error);
        return { success: false, error: error.message };
      }

      this.logger.info(`Updated ${this.tableName}`, { id });
      return { success: true, data: updated as TRow };
    } catch (error) {
      this.logger.error(`Unexpected error in update`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error(`Failed to delete ${this.tableName}`, error);
        return { success: false, error: error.message };
      }

      this.logger.info(`Deleted ${this.tableName}`, { id });
      return { success: true, data: undefined };
    } catch (error) {
      this.logger.error(`Unexpected error in delete`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(filter?: Record<string, unknown>): Promise<RepositoryResult<number>> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count, error } = await query;

      if (error) {
        this.logger.error(`Failed to count ${this.tableName}`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data: count || 0 };
    } catch (error) {
      this.logger.error(`Unexpected error in count`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result.success;
  }
}

export default BaseRepository;
