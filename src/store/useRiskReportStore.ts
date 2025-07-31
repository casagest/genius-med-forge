import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Interfețe pentru o tipare sigură
export interface RiskReport {
  id: string;
  title: string;
  description: string;
  riskScore: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  category: string;
  timestamp: string;
  actionRequired: boolean;
  aiConfidence: number;
  recommendations?: string[];
}

interface ReportFilters {
  score_lt?: number | null;
  actionRequired?: boolean | null;
  from?: string | null;
  to?: string | null;
}

interface PaginationState {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
}

interface RiskReportState {
  filters: ReportFilters;
  pagination: PaginationState;
  reports: RiskReport[];
  loading: boolean;
  setFilters: (newFilters: Partial<ReportFilters>) => void;
  setPagination: (newPagination: Partial<PaginationState>) => void;
  setReports: (reports: RiskReport[]) => void;
  setLoading: (loadingState: boolean) => void;
  addReport: (newReport: RiskReport) => void;
}

export const useRiskReportStore = create<RiskReportState>()(
  persist(
    (set, get) => ({
      // Starea inițială
      filters: {
        score_lt: null,
        actionRequired: null,
        from: null,
        to: null,
      },
      pagination: {
        page: 1,
        limit: 10,
      },
      reports: [],
      loading: false,

      // Acțiuni pentru a modifica starea
      setFilters: (newFilters) => 
        set({ 
          filters: { ...get().filters, ...newFilters }, 
          pagination: { ...get().pagination, page: 1 } 
        }),
      setPagination: (newPagination) => 
        set({ pagination: { ...get().pagination, ...newPagination } }),
      setReports: (reports) => set({ reports }),
      setLoading: (loadingState) => set({ loading: loadingState }),
      
      // Acțiune pentru update-uri în timp real de la WebSocket
      addReport: (newReport) => set((state) => ({
        reports: [newReport, ...state.reports],
      })),
    }),
    {
      name: 'risk-report-storage',
      storage: createJSONStorage(() => localStorage),
      // Salvăm doar filtrele și paginarea, nu și datele efective
      partialize: (state) => ({ 
        filters: state.filters, 
        pagination: state.pagination 
      }),
    }
  )
);