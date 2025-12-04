import { RiskReport } from '@/store/useRiskReportStore';
import { analysisReportRepository } from '@/repositories';
import { logger } from '@/utils/logger';

// Tipuri pentru filtre și paginare
interface ReportFilters {
  score_lt?: number | null;
  actionRequired?: boolean | null;
  from?: string | null;
  to?: string | null;
}

interface PaginationState {
  page: number;
  limit: number;
}

interface ApiResponse {
  data: RiskReport[];
  pagination: {
    total: number;
    totalPages: number;
  };
}

class RiskReportService {
  public async fetchRiskReports(filters: ReportFilters, pagination: PaginationState): Promise<ApiResponse> {
    const result = await analysisReportRepository.findWithFilters(
      {
        maxConfidenceScore: filters.score_lt || undefined,
        requiresAction: filters.actionRequired !== null ? filters.actionRequired : undefined,
        startDate: filters.from || undefined,
        endDate: filters.to || undefined,
      },
      {
        offset: (pagination.page - 1) * pagination.limit,
        limit: pagination.limit,
        orderBy: { column: 'generated_at', ascending: false },
      }
    );

    if (!result.success) {
      logger.error('Error fetching risk reports', { error: result.error });
      return { data: [], pagination: { total: 0, totalPages: 1 } };
    }

    // Transformăm datele din format Supabase în format RiskReport
    const transformedData: RiskReport[] = result.data.data.map(report => ({
      id: report.id,
      title: report.report_type || 'Raport de risc',
      description: 'Analiză AI generată automatic',
      riskScore: report.risk_level === 'HIGH' ? 0.8 : report.risk_level === 'MEDIUM' ? 0.5 : 0.2,
      status: 'pending' as const,
      category: report.report_type || 'general',
      timestamp: report.generated_at || new Date().toISOString(),
      actionRequired: report.requires_action || false,
      aiConfidence: report.confidence_score || 0.8,
      recommendations: [],
    }));

    return {
      data: transformedData,
      pagination: {
        total: result.data.total,
        totalPages: result.data.totalPages,
      },
    };
  }
}

export const riskReportService = new RiskReportService();