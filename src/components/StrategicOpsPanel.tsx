// StrategicOps Panel - CEO Dashboard with RiskReportList
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RiskReport {
  id: string;
  report_type: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence_score: number;
  analysis_data: any;
  requires_action: boolean;
  generated_at: string;
}

export function StrategicOpsPanel() {
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchReports();
    
    // WebSocket listener for real-time updates
    const channel = supabase
      .channel('ceo_reports')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analysis_reports'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReport = payload.new as RiskReport;
          setReports(prev => [newReport, ...prev]);
          
          // Voice alert for critical reports
          if (newReport.confidence_score < 0.7) {
            playVoiceAlert(newReport);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await (supabase as any)
        .from('analysis_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);
      
      setReports((data as RiskReport[]) || []);
    } catch (error) {
      console.log('Table not found yet - using mock data');
      // Mock data until database is set up
      setReports([
        {
          id: '1',
          report_type: 'Surgical Risk Assessment',
          risk_level: 'HIGH',
          confidence_score: 0.85,
          analysis_data: {},
          requires_action: true,
          generated_at: new Date().toISOString()
        }
      ]);
    }
  };

  const playVoiceAlert = (report: RiskReport) => {
    if ('speechSynthesis' in window && report.confidence_score < 0.7) {
      const utterance = new SpeechSynthesisUtterance(
        `Critical alert: ${report.report_type} requires immediate attention. Risk level: ${report.risk_level}`
      );
      speechSynthesis.speak(utterance);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      default: return 'default';
    }
  };

  const filteredReports = reports.filter(report => 
    filter === 'ALL' || report.risk_level === filter
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">StrategicOps Panel</h1>
        <div className="flex gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <Button
              key={level}
              variant={filter === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.requires_action).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((reports.reduce((acc, r) => acc + r.confidence_score, 0) / reports.length) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Reports</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.risk_level === 'CRITICAL').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map(report => (
              <div key={report.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{report.report_type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.generated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getRiskColor(report.risk_level)}>
                      {report.risk_level}
                    </Badge>
                    <Badge variant="outline">
                      {(report.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                {report.requires_action && (
                  <div className="mt-2">
                    <Button size="sm" variant="destructive">
                      Take Action
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}