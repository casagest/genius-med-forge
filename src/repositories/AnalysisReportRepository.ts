/**
 * Analysis Report Repository
 *
 * Handles all analysis report database operations
 * Provides type-safe access to risk analysis and report data
 */

import { BaseRepository } from './BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RepositoryResult, QueryOptions } from './BaseRepository';

type AnalysisReportRow = Database['public']['Tables']['analysis_reports']['Row'];
type AnalysisReportInsert = Database['public']['Tables']['analysis_reports']['Insert'];
type AnalysisReportUpdate = Database['public']['Tables']['analysis_reports']['Update'];

export interface AnalysisReportFilter {
  reportType?: string;
  riskLevel?: string;
  requiresAction?: boolean;
  minConfidenceScore?: number;
  maxConfidenceScore?: number;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AnalysisReportRepository extends BaseRepository<
  'analysis_reports',
  AnalysisReportRow,
  AnalysisReportInsert,
  AnalysisReportUpdate
> {
  constructor() {
    super('analysis_reports');
  }

  /**
   * Find reports by type
   */
  async findByType(reportType: string): Promise<RepositoryResult<AnalysisReportRow[]>> {
    return this.findAll({
      filter: { report_type: reportType },
      orderBy: { column: 'generated_at', ascending: false },
    });
  }

  /**
   * Find reports by risk level
   */
  async findByRiskLevel(riskLevel: string): Promise<RepositoryResult<AnalysisReportRow[]>> {
    return this.findAll({
      filter: { risk_level: riskLevel },
      orderBy: { column: 'generated_at', ascending: false },
    });
  }

  /**
   * Find reports requiring action
   */
  async findRequiringAction(): Promise<RepositoryResult<AnalysisReportRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('requires_action', true)
        .order('generated_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to find reports requiring action', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findRequiringAction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find recent reports with limit
   */
  async findRecent(limit: number = 50): Promise<RepositoryResult<AnalysisReportRow[]>> {
    return this.findAll({
      orderBy: { column: 'generated_at', ascending: false },
      limit,
    });
  }

  /**
   * Find reports with advanced filtering and pagination
   */
  async findWithFilters(
    filters: AnalysisReportFilter,
    options?: QueryOptions
  ): Promise<RepositoryResult<PaginatedResult<AnalysisReportRow>>> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.reportType) {
        query = query.eq('report_type', filters.reportType);
      }
      if (filters.riskLevel) {
        query = query.eq('risk_level', filters.riskLevel);
      }
      if (filters.requiresAction !== undefined) {
        query = query.eq('requires_action', filters.requiresAction);
      }
      if (filters.minConfidenceScore !== undefined) {
        query = query.gte('confidence_score', filters.minConfidenceScore);
      }
      if (filters.maxConfidenceScore !== undefined) {
        query = query.lte('confidence_score', filters.maxConfidenceScore);
      }
      if (filters.startDate) {
        query = query.gte('generated_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('generated_at', filters.endDate);
      }

      // Apply ordering
      const orderColumn = options?.orderBy?.column || 'generated_at';
      const ascending = options?.orderBy?.ascending ?? false;
      query = query.order(orderColumn, { ascending });

      // Apply pagination
      const page = options?.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
      const pageSize = options?.limit || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        this.logger.error('Failed to find reports with filters', error);
        return { success: false, error: error.message };
      }

      const total = count || 0;
      return {
        success: true,
        data: {
          data: data || [],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error('Unexpected error in findWithFilters', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find high risk reports (critical or high risk level)
   */
  async findHighRisk(): Promise<RepositoryResult<AnalysisReportRow[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .in('risk_level', ['critical', 'high', 'CRITICAL', 'HIGH'])
        .order('generated_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to find high risk reports', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('Unexpected error in findHighRisk', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get report statistics
   */
  async getStatistics(): Promise<RepositoryResult<{
    total: number;
    byRiskLevel: Record<string, number>;
    requiresAction: number;
    avgConfidenceScore: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('risk_level, requires_action, confidence_score');

      if (error) {
        this.logger.error('Failed to get report statistics', error);
        return { success: false, error: error.message };
      }

      const stats = {
        total: data.length,
        byRiskLevel: {} as Record<string, number>,
        requiresAction: 0,
        avgConfidenceScore: 0,
      };

      let totalConfidence = 0;
      data.forEach((report) => {
        stats.byRiskLevel[report.risk_level] = (stats.byRiskLevel[report.risk_level] || 0) + 1;
        if (report.requires_action) stats.requiresAction++;
        totalConfidence += report.confidence_score;
      });

      stats.avgConfidenceScore = data.length > 0 ? totalConfidence / data.length : 0;

      return { success: true, data: stats };
    } catch (error) {
      this.logger.error('Unexpected error in getStatistics', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const analysisReportRepository = new AnalysisReportRepository();
