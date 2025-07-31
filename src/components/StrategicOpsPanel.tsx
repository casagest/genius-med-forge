import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Clock, 
  DollarSign,
  Package,
  Truck,
  Brain,
  Zap,
  Target,
  BarChart3,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Stethoscope,
  Factory,
  ShoppingCart,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RiskReport {
  id: string;
  report_type: string;
  risk_level: string;
  confidence_score: number;
  analysis_data: any;
  requires_action: boolean;
  generated_at: string;
}

interface ActiveProcedure {
  id: string;
  case_id: string;
  procedure_type: string;
  status: string;
  patient_id: string;
  started_at: string;
  created_at: string;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  complications: any;
  materials_used: any;
}

interface ProcurementAlert {
  id: string;
  sku: string;
  current_stock: number;
  required_stock: number;
  supplier: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  eta_hours: number;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered';
}

export function StrategicOpsPanel() {
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [activeProcedures, setActiveProcedures] = useState<ActiveProcedure[]>([]);
  const [procurementAlerts, setProcurementAlerts] = useState<ProcurementAlert[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [realtimeStats, setRealtimeStats] = useState({
    casesLast24h: 0,
    avgCostPerCase: 0,
    criticalAlerts: 0,
    labEfficiency: 0,
    predictiveAccuracy: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
    
    // Real-time updates
    const channel = supabase
      .channel('strategic_ops_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analysis_reports'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReport = payload.new as RiskReport;
          setReports(prev => [newReport, ...prev.slice(0, 49)]);
          
          // Voice alert for critical reports
          if (newReport.confidence_score < 0.7 && newReport.risk_level === 'CRITICAL') {
            playVoiceAlert(newReport);
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_procedures'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          fetchActiveProcedures();
        }
      })
      .subscribe();

    // Update real-time stats every 30 seconds
    const statsInterval = setInterval(updateRealtimeStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(statsInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([
      fetchReports(),
      fetchActiveProcedures(),
      fetchProcurementAlerts(),
      updateRealtimeStats()
    ]);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('analysis_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(50);
    
    setReports(data || []);
  };

  const fetchActiveProcedures = async () => {
    const { data } = await supabase
      .from('active_procedures')
      .select('*')
      .in('status', ['IN_PROGRESS', 'PLANNED'])
      .order('created_at', { ascending: false });
    
    setActiveProcedures(data || []);
  };

  const fetchProcurementAlerts = async () => {
    // Simulate procurement alerts from inventory forecast service
    const mockAlerts: ProcurementAlert[] = [
      {
        id: '1',
        sku: 'pmma_disk_a1',
        current_stock: 3,
        required_stock: 15,
        supplier: 'DentalTech Supplies',
        urgency: 'high',
        eta_hours: 48,
        status: 'ordered'
      },
      {
        id: '2',
        sku: 'zirc_block_a2',
        current_stock: 8,
        required_stock: 25,
        supplier: 'CeramTech Solutions',
        urgency: 'medium',
        eta_hours: 72,
        status: 'pending'
      }
    ];
    setProcurementAlerts(mockAlerts);
  };

  const updateRealtimeStats = async () => {
    try {
      // Fetch real-time statistics
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: completedCases } = await supabase
        .from('active_procedures')
        .select('*')
        .eq('status', 'COMPLETED')
        .gte('completed_at', last24h);

      const { data: criticalReports } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('risk_level', 'CRITICAL')
        .eq('requires_action', true);

      setRealtimeStats({
        casesLast24h: completedCases?.length || 0,
        avgCostPerCase: 2450, // Mock calculation
        criticalAlerts: criticalReports?.length || 0,
        labEfficiency: 92.5, // Mock efficiency score
        predictiveAccuracy: 89.7 // Mock accuracy from AI models
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const playVoiceAlert = (report: RiskReport) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Alertă critică: ${report.report_type}. Acțiune imediată necesară în sala de operație.`
      );
      utterance.lang = 'ro-RO';
      speechSynthesis.speak(utterance);
    }
  };

  const triggerReplayCritic = async (caseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-replay-critic', {
        body: { 
          event: 'analyze_case',
          data: { caseId }
        }
      });

      if (error) throw error;
      
      toast({
        title: "ReplayCritic Activat",
        description: `Analiză AI inițiată pentru cazul ${caseId}`,
      });
    } catch (error) {
      toast({
        title: "Eroare ReplayCritic",
        description: "Nu s-a putut activa analiza AI",
        variant: "destructive"
      });
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const filteredReports = reports.filter(report => 
    filter === 'ALL' || report.risk_level === filter
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            StrategicOps Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Central de comandă AI pentru operațiuni critice
          </p>
        </div>
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

      {/* Real-time KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cazuri 24h</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{realtimeStats.casesLast24h}</div>
            <p className="text-xs text-muted-foreground">+12% vs ieri</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Mediu/Caz</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{realtimeStats.avgCostPerCase} RON</div>
            <p className="text-xs text-muted-foreground">-8% vs target</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerte Critice</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{realtimeStats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Necesită acțiune</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiență Lab</CardTitle>
            <Factory className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{realtimeStats.labEfficiency}%</div>
            <Progress value={realtimeStats.labEfficiency} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acuratețe AI</CardTitle>
            <Brain className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{realtimeStats.predictiveAccuracy}%</div>
            <Progress value={realtimeStats.predictiveAccuracy} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">📅 Timeline Critic</TabsTrigger>
          <TabsTrigger value="procurement">🚚 Smart Procurement</TabsTrigger>
          <TabsTrigger value="reports">📊 Risk Reports</TabsTrigger>
          <TabsTrigger value="analytics">🧠 AI Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Procedures Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Intervenții Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeProcedures.length > 0 ? activeProcedures.map(procedure => {
                    const startTime = new Date(procedure.started_at || procedure.created_at);
                    const currentDuration = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
                    const progressPercentage = procedure.estimated_duration_minutes 
                      ? Math.min((currentDuration / procedure.estimated_duration_minutes) * 100, 100)
                      : 0;
                    
                    return (
                      <div key={procedure.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              <Stethoscope className="h-4 w-4" />
                              {procedure.procedure_type}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Caz: {procedure.case_id} | Pacient: {procedure.patient_id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={procedure.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                              {procedure.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => triggerReplayCritic(procedure.case_id)}
                            >
                              <PlayCircle className="h-3 w-3 mr-1" />
                              ReplayCritic
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progres procedură</span>
                            <span>{currentDuration}min / {procedure.estimated_duration_minutes || '?'}min</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>

                        {procedure.complications && Array.isArray(procedure.complications) && procedure.complications.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-sm text-red-700 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {procedure.complications.length} complicații detectate
                            </p>
                          </div>
                        )}

                        {procedure.materials_used && typeof procedure.materials_used === 'object' && Object.keys(procedure.materials_used).length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="text-sm text-blue-700 flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Materiale: {Object.entries(procedure.materials_used as Record<string, number>).map(([sku, qty]) => 
                                `${sku}(${qty})`).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center text-muted-foreground p-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nu există intervenții active în acest moment</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Equipment & Stock Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Status Echipamente & Stoc
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Equipment Status */}
                  <div className="space-y-3">
                    <h5 className="font-medium">Echipamente Lab</h5>
                    {[
                      { name: 'CAD/CAM Milling', status: 'active', utilization: 85 },
                      { name: '3D Printer SLA', status: 'active', utilization: 67 },
                      { name: 'Furnace Sintering', status: 'maintenance', utilization: 0 }
                    ].map(equipment => (
                      <div key={equipment.name} className="flex justify-between items-center p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            equipment.status === 'active' ? 'bg-green-500' : 
                            equipment.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">{equipment.name}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={equipment.status === 'active' ? 'default' : 'secondary'}>
                            {equipment.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {equipment.utilization}% utilizare
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Critical Stock Alerts */}
                  <div className="space-y-3">
                    <h5 className="font-medium">Alerte Stoc Critic</h5>
                    {[
                      { material: 'PMMA Disk A1', current: 3, minimum: 10, urgency: 'high' },
                      { material: 'Zirconia Block A2', current: 8, minimum: 15, urgency: 'medium' }
                    ].map(item => (
                      <div key={item.material} className={`p-2 border rounded ${getUrgencyColor(item.urgency)}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.material}</span>
                          <Badge variant="outline">
                            {item.current}/{item.minimum} unități
                          </Badge>
                        </div>
                        <Progress 
                          value={(item.current / item.minimum) * 100} 
                          className="mt-2 h-1" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="procurement" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Smart Procurement Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {procurementAlerts.map(alert => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{alert.sku}</h4>
                        <p className="text-sm text-muted-foreground">
                          Furnizor: {alert.supplier}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getRiskColor(alert.urgency.toUpperCase())}>
                          {alert.urgency.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stoc actual:</span>
                        <div className="font-semibold text-red-600">{alert.current_stock}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Necesar:</span>
                        <div className="font-semibold">{alert.required_stock}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ETA:</span>
                        <div className="font-semibold text-blue-600">{alert.eta_hours}h</div>
                      </div>
                    </div>

                    {/* Procurement Timeline */}
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs">Detectat</span>
                      </div>
                      <div className="w-4 h-px bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`h-4 w-4 ${alert.status !== 'pending' ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className="text-xs">Comandat</span>
                      </div>
                      <div className="w-4 h-px bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`h-4 w-4 ${alert.status === 'shipped' || alert.status === 'delivered' ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className="text-xs">Expediat</span>
                      </div>
                      <div className="w-4 h-px bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`h-4 w-4 ${alert.status === 'delivered' ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className="text-xs">Livrat</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Reports & AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReports.map(report => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{report.report_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.generated_at).toLocaleString('ro-RO')}
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
                          <Zap className="h-3 w-3 mr-1" />
                          Acțiune Necesară
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  AI Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Predictive Accuracy</span>
                    <span className="font-semibold">{realtimeStats.predictiveAccuracy}%</span>
                  </div>
                  <Progress value={realtimeStats.predictiveAccuracy} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">False Positive Rate</span>
                    <span className="font-semibold">2.3%</span>
                  </div>
                  <Progress value={2.3} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time</span>
                    <span className="font-semibold">145ms</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Explainable AI Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-medium text-blue-800">🧠 AI Decision</p>
                    <p className="text-blue-700 mt-1">
                      Cazul #CR-2024-001 a fost prioritizat pentru că AI-ul a detectat risc de 
                      complicație în 23 minute pe baza modelului biometric.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="font-medium text-orange-800">🔄 Material Switch</p>
                    <p className="text-orange-700 mt-1">
                      Schimbare automată PMMA A1 → A2: algoritm crack detection a identificat 
                      risc de fractură 15% mai mare cu nuanța inițială.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-medium text-green-800">📊 Efficiency Boost</p>
                    <p className="text-green-700 mt-1">
                      Queue optimization a redus timpul de așteptare cu 32 minute prin 
                      reordonarea job-urilor pe criteriul urgent + durata.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}