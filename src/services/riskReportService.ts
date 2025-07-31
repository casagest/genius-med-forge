import { supabase } from '@/integrations/supabase/client';
import { RiskReport } from '@/store/useRiskReportStore';

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
    try {
      let query = supabase
        .from('analysis_reports')
        .select('*', { count: 'exact' });

      // Aplicăm filtrele
      if (filters.score_lt && filters.score_lt < 1) {
        query = query.lte('risk_score', filters.score_lt);
      }

      if (filters.actionRequired !== null) {
        query = query.eq('requires_action', filters.actionRequired);
      }

      if (filters.from) {
        query = query.gte('created_at', filters.from);
      }

      if (filters.to) {
        query = query.lte('created_at', filters.to);
      }

      // Aplicăm paginarea
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      
      query = query
        .range(from, to)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Eroare la preluarea rapoartelor de risc:', error);
        return { data: [], pagination: { total: 0, totalPages: 1 } };
      }

      // Transformăm datele din format Supabase în format RiskReport
      const transformedData: RiskReport[] = (data || []).map(report => ({
        id: report.id,
        title: report.report_type || 'Raport de risc',
        description: 'Analiză AI generată automatic',
        riskScore: report.risk_level === 'HIGH' ? 0.8 : report.risk_level === 'MEDIUM' ? 0.5 : 0.2,
        status: 'pending',
        category: report.report_type || 'general',
        timestamp: report.generated_at,
        actionRequired: report.requires_action || false,
        aiConfidence: report.confidence_score || 0.8,
        recommendations: [],
      }));

      const totalPages = Math.ceil((count || 0) / pagination.limit);

      return {
        data: transformedData,
        pagination: {
          total: count || 0,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Eroare neașteptată la preluarea rapoartelor de risc:', error);
      return { data: [], pagination: { total: 0, totalPages: 1 } };
    }
  }
}

export const riskReportService = new RiskReportService();