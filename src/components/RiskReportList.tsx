import React, { useEffect } from 'react';
import { useRiskReportStore } from '@/store/useRiskReportStore';
import { riskReportService } from '@/services/riskReportService';
import { RiskReportCard } from '@/components/RiskReportCard';
import { RiskFilterControls } from '@/components/RiskFilterControls';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents';

export const RiskReportList: React.FC = () => {
  const { 
    filters, 
    pagination, 
    reports, 
    loading, 
    setReports, 
    setLoading, 
    setPagination,
    addReport 
  } = useRiskReportStore();

  // Hook pentru actualizări în timp real
  const realtimeHook = useRealtimeAgents('CEO');

  // Efect pentru încărcarea datelor când filtrele sau paginarea se schimbă
  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const response = await riskReportService.fetchRiskReports(filters, pagination);
        setReports(response.data);
        setPagination({ 
          total: response.pagination.total, 
          totalPages: response.pagination.totalPages 
        });
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [filters, pagination.page, pagination.limit, setReports, setLoading, setPagination]);

  // Efect pentru actualizări în timp real de la WebSocket
  useEffect(() => {
    // Ascultăm pentru noi rapoarte de risc de la agenții AI
    if (realtimeHook.isConnected) {
      // Implementare viitoare pentru actualizări real-time
      console.log('Connected to realtime agents for risk reports');
    }
  }, [realtimeHook.isConnected, addReport]);

  const handleActionClick = async (reportId: string) => {
    // Implementare viitoare pentru acționarea asupra unui raport
    console.log('Action clicked for report:', reportId);
  };

  const handleDismiss = async (reportId: string) => {
    // Implementare viitoare pentru respingerea unui raport
    console.log('Dismiss clicked for report:', reportId);
  };

  const handleLoadMore = () => {
    setPagination({ page: pagination.page + 1 });
  };

  const hasMorePages = pagination.totalPages && pagination.page < pagination.totalPages;

  return (
    <div className="space-y-6">
      <RiskFilterControls />

      {/* Indicator de încărcare */}
      {loading && pagination.page === 1 && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Încărcare rapoarte...</span>
        </div>
      )}

      {/* Stare goală */}
      {!loading && reports.length === 0 && (
        <div className="text-center p-8 border rounded-lg bg-muted/50">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Niciun raport găsit</h3>
          <p className="text-muted-foreground">
            Nu există rapoarte care să corespundă filtrelor selectate.
          </p>
        </div>
      )}

      {/* Lista de rapoarte */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => (
            <RiskReportCard
              key={report.id}
              report={report}
              onActionClick={handleActionClick}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Paginare - Load More */}
      {!loading && reports.length > 0 && hasMorePages && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleLoadMore}
            variant="outline"
            disabled={loading}
          >
            {loading && pagination.page > 1 ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Încărcare...
              </>
            ) : (
              'Încarcă mai multe'
            )}
          </Button>
        </div>
      )}

      {/* Informații despre paginare */}
      {!loading && reports.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Afișate {reports.length} din {pagination.total || 0} rapoarte
        </div>
      )}
    </div>
  );
};