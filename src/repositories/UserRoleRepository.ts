/**
 * User Role Repository
 *
 * Handles all user role database operations
 * Provides type-safe access to user roles and permissions
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult } from './BaseRepository';

type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];
type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert'];
type UserRoleUpdate = Database['public']['Tables']['user_roles']['Update'];
type AppRole = Database['public']['Enums']['app_role'];

export class UserRoleRepository extends BaseRepository<
  'user_roles',
  UserRoleRow,
  UserRoleInsert,
  UserRoleUpdate
> {
  constructor() {
    super('user_roles');
  }

  /**
   * Find role by user ID
   */
  async findByUserId(userId: string): Promise<RepositoryResult<UserRoleRow>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        this.logger.error('Failed to find role by user ID', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findByUserId', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's role string
   */
  async getUserRole(userId: string): Promise<RepositoryResult<AppRole>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        this.logger.error('Failed to get user role', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data.role };
    } catch (error) {
      this.logger.error('Unexpected error in getUserRole', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: AppRole): Promise<RepositoryResult<UserRoleRow[]>> {
    return this.findAll({
      filter: { role },
      orderBy: { column: 'created_at', ascending: false },
    });
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('role')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      if (error || !data) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: AppRole): Promise<RepositoryResult<UserRoleRow>> {
    return this.create({
      user_id: userId,
      role,
    });
  }

  /**
   * Update user's role
   */
  async updateRole(userId: string, newRole: AppRole): Promise<RepositoryResult<UserRoleRow>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ role: newRole })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update user role', error);
        return { success: false, error: error.message };
      }

      this.logger.info('Updated user role', { userId, newRole });
      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in updateRole', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove user's role
   */
  async removeRole(userId: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to remove user role', error);
        return { success: false, error: error.message };
      }

      this.logger.info('Removed user role', { userId });
      return { success: true, data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in removeRole', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * Check if user is CEO
   */
  async isCeo(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'ceo');
  }

  /**
   * Check if user is medic
   */
  async isMedic(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'medic');
  }

  /**
   * Check if user is lab technician
   */
  async isLabTechnician(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'lab_technician');
  }
}

// Export singleton instance
export const userRoleRepository = new UserRoleRepository();
