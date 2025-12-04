// Smart Lab Cockpit with Intelligent Material Management and Quality Analysis
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Cpu,
  ShoppingCart,
  RefreshCw,
  Zap,
  Activity,
  FileText,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  materialRepository,
  labProductionQueueRepository,
  analysisReportRepository
} from '@/repositories';
import { logger } from '@/utils/logger';

interface Material {
  id: string;
  material_name: string;
  current_stock: number;
  minimum_threshold: number;
  unit_cost: number;
  supplier: string;
  last_ordered_at: string;
  created_at: string;
  updated_at: string;
}

interface ProductionJob {
  id: string;
  job_code: string;
  job_type: string;
  status: string;
  priority: number;
  machine_assignment?: string;
  estimated_duration?: string;
  material_requirements?: any;
  patient_id?: string;
  patients?: { patient_code: string };
}

interface QualityAnalysisReport {
  job_id: string;
  report_type: 'QUALITY' | 'RISK' | 'EFFICIENCY' | 'COMPLIANCE';
  risk_score: number;
  confidence_score: number;
  ai_rationale: string;
  requires_action: boolean;
  quality_metrics: Array<{
    metric_name: string;
    value: number;
    threshold: number;
    status: 'pass' | 'fail' | 'warning';
  }>;
  recommendations: string[];
  generated_at: string;
}

export function SmartLabCockpit() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityAnalysisReport[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzingQuality, setIsAnalyzingQuality] = useState(false);
  const { toast } = useToast();

  const [machineStatus] = useState({
    CAD_CAM_1: { status: 'ACTIVE', utilization: 85, efficiency: 92 },
    CAD_CAM_2: { status: 'IDLE', utilization: 0, efficiency: 0 },
    PRINTER_3D_1: { status: 'ACTIVE', utilization: 67, efficiency: 88 },
    PRINTER_3D_2: { status: 'MAINTENANCE', utilization: 0, efficiency: 0 },
    MILLING_MACHINE: { status: 'ACTIVE', utilization: 45, efficiency: 94 }
  });

  useEffect(() => {
    fetchMaterials();
    fetchProductionJobs();
    fetchQualityReports();
  }, []);

  const fetchMaterials = async () => {
    const result = await materialRepository.findAll({
      orderBy: { column: 'material_name', ascending: true }
    });

    if (result.success) {
      setMaterials(result.data as Material[]);
    } else {
      logger.error('Error fetching materials', { error: result.error });
      // Mock data for development
      setMaterials([
        {
          id: '1',
          material_name: 'Titanium Dioxide Powder',
          current_stock: 150,
          minimum_threshold: 50,
          unit_cost: 45.00,
          supplier: 'DentalTech Supplies',
          last_ordered_at: '2025-01-20T10:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-20T10:00:00Z'
        },
        {
          id: '2',
          material_name: 'Zirconia Blanks',
          current_stock: 25,
          minimum_threshold: 30,
          unit_cost: 120.00,
          supplier: 'CeramTech Solutions',
          last_ordered_at: '2025-01-15T14:30:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-25T09:15:00Z'
        }
      ]);
    }
  };

  const fetchProductionJobs = async () => {
    const result = await labProductionQueueRepository.findWithPatientInfo();

    if (result.success) {
      const mappedJobs = result.data.map(job => ({
        ...job,
        patients: job.patients ? { patient_code: job.patients.patient_code } : undefined
      }));
      setProductionJobs(mappedJobs as ProductionJob[]);
    } else {
      logger.error('Error fetching production jobs', { error: result.error });
    }
  };

  const fetchQualityReports = async () => {
    const result = await analysisReportRepository.findRecent(10);

    if (result.success) {
      // Transform to match our QualityAnalysisReport interface
      const transformedReports = result.data.map(report => {
        const analysisData = (report.analysis_data as Record<string, unknown>) || {};
        return {
          job_id: (analysisData.job_id as string) || 'unknown',
          report_type: report.report_type as 'QUALITY' | 'RISK' | 'EFFICIENCY' | 'COMPLIANCE',
          risk_score: report.confidence_score || 0,
          confidence_score: report.confidence_score || 0,
          ai_rationale: (analysisData.ai_rationale as string) || 'No rationale provided',
          requires_action: report.requires_action || false,
          quality_metrics: (analysisData.quality_metrics as QualityAnalysisReport['quality_metrics']) || [],
          recommendations: (analysisData.recommendations as string[]) || [],
          generated_at: report.generated_at || new Date().toISOString()
        };
      });

      setQualityReports(transformedReports);
    } else {
      logger.error('Error fetching quality reports', { error: result.error });
    }
  };

  const runQualityAnalysis = async (jobId?: string) => {
    setIsAnalyzingQuality(true);
    try {
      const targetJobId = jobId || productionJobs.find(job => job.status === 'COMPLETED')?.id;
      
      if (!targetJobId) {
        toast({
          title: "No Completed Jobs",
          description: "No completed jobs available for analysis.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('enhanced-replay-critic', {
        body: { 
          event: 'analyze_job',
          data: { jobId: targetJobId }
        }
      });

      if (error) throw error;
      
      if (data?.report) {
        setQualityReports(prev => [data.report, ...prev.slice(0, 9)]);
        
        toast({
          title: "Quality Analysis Complete",
          description: `Risk Score: ${(data.report.risk_score * 100).toFixed(1)}%. ${data.report.requires_action ? 'Action required.' : 'No action needed.'}`,
          variant: data.report.requires_action ? "destructive" : "default",
        });
      }
    } catch (error) {
      logger.error('Error running quality analysis', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run quality analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingQuality(false);
    }
  };

  const optimizeProductionSchedule = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-scheduler', {
        body: { 
          event: 'optimize_schedule'
        }
      });

      if (error) throw error;
      
      if (data?.optimizedJobs) {
        setProductionJobs(data.optimizedJobs);
      }
      
      if (data?.analytics) {
        toast({
          title: "Schedule Optimized",
          description: `Optimized ${data.analytics.totalJobs} jobs. ${data.analytics.highPriorityJobs} high-priority jobs identified.`,
        });
      }
      
      await fetchProductionJobs();
    } catch (error) {
      logger.error('Error optimizing schedule', error);
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize production schedule.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getStockStatusColor = (current: number, minimum: number) => {
    const ratio = current / minimum;
    if (ratio <= 1) return 'text-red-600';
    if (ratio <= 1.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'default';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (riskScore >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Smart Lab Cockpit
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => runQualityAnalysis()}
            disabled={isAnalyzingQuality}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isAnalyzingQuality ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            {isAnalyzingQuality ? 'Analyzing...' : 'Quality Check'}
          </Button>
          <Button 
            onClick={optimizeProductionSchedule}
            disabled={isOptimizing}
            className="flex items-center gap-2"
          >
            {isOptimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Smart Inventory</TabsTrigger>
          <TabsTrigger value="production">Production Queue</TabsTrigger>
          <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Machine Status Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Machine Status & Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(machineStatus).map(([machineId, machine]) => (
                    <div key={machineId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{machineId.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground">
                          Efficiency: {machine.efficiency}%
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={machine.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {machine.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {machine.utilization}% utilized
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materials
                    .filter(m => m.current_stock <= m.minimum_threshold)
                    .map(material => (
                      <div key={material.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-red-800">{material.material_name}</h4>
                          <p className="text-sm text-red-600">
                            Stock: {material.current_stock} (Min: {material.minimum_threshold})
                          </p>
                        </div>
                        <Button size="sm" variant="destructive">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Reorder
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {materials.map(material => (
              <Card key={material.id}>
                <CardHeader>
                  <CardTitle className="text-base flex justify-between items-center">
                    {material.material_name}
                    <Badge variant={material.current_stock <= material.minimum_threshold ? 'destructive' : 'default'}>
                      {material.current_stock} units
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Stock Level</span>
                        <span className={getStockStatusColor(material.current_stock, material.minimum_threshold)}>
                          {Math.round((material.current_stock / material.minimum_threshold) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((material.current_stock / (material.minimum_threshold * 2)) * 100, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Min: {material.minimum_threshold}</span>
                        <span>Current: {material.current_stock}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cost/Unit:</span>
                        <div className="font-medium">${material.unit_cost}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supplier:</span>
                        <div className="font-medium text-xs">{material.supplier}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Production Queue Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionJobs.map(job => (
                  <div key={job.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{job.job_code}</h4>
                        <Badge variant={job.status === 'COMPLETED' ? 'default' : 'outline'}>
                          {job.status}
                        </Badge>
                        <Badge variant="secondary">
                          Priority: {job.priority}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>Type: {job.job_type}</div>
                        <div>Duration: {job.estimated_duration || 'N/A'}</div>
                        <div>Machine: {job.machine_assignment || 'Unassigned'}</div>
                        <div>Patient: {job.patients?.patient_code || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {job.status === 'COMPLETED' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => runQualityAnalysis(job.id)}
                          disabled={isAnalyzingQuality}
                        >
                          <Target className="h-3 w-3 mr-1" />
                          Analyze
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <div className="space-y-6">
            {/* Quality Analysis Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Quality Analysis Reports
                  </span>
                  <Button 
                    onClick={() => runQualityAnalysis()}
                    disabled={isAnalyzingQuality}
                    size="sm"
                  >
                    {isAnalyzingQuality ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                    Run Analysis
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  AI-powered quality analysis for completed production jobs. Analyzes risk factors, quality metrics, and provides actionable recommendations.
                </div>
              </CardContent>
            </Card>

            {/* Quality Reports */}
            <div className="space-y-4">
              {qualityReports.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Quality Reports</h3>
                    <p className="text-muted-foreground">Run quality analysis on completed jobs to see reports here.</p>
                  </CardContent>
                </Card>
              ) : (
                qualityReports.map((report, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          Job: {report.job_id}
                          <Badge variant={getUrgencyColor(report.report_type.toLowerCase())}>
                            {report.report_type}
                          </Badge>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Risk Score: {(report.risk_score * 100).toFixed(1)}%
                          </span>
                          {report.requires_action && (
                            <Badge variant="destructive">Action Required</Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Risk Score Visualization */}
                        <div className={`p-3 rounded-lg border ${getRiskColor(report.risk_score)}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Risk Assessment</span>
                            <span className="text-sm">
                              Confidence: {(report.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={report.risk_score * 100} className="h-2 mb-2" />
                          <p className="text-sm">{report.ai_rationale}</p>
                        </div>

                        {/* Quality Metrics */}
                        {report.quality_metrics.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Quality Metrics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {report.quality_metrics.map((metric, metricIndex) => (
                                <div key={metricIndex} className="p-2 border rounded">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{metric.metric_name}</span>
                                    <Badge variant={
                                      metric.status === 'pass' ? 'default' : 
                                      metric.status === 'warning' ? 'secondary' : 'destructive'
                                    }>
                                      {metric.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {metric.value.toFixed(2)} / {metric.threshold}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {report.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Recommendations</h4>
                            <div className="space-y-1">
                              {report.recommendations.map((recommendation, recIndex) => (
                                <div key={recIndex} className="flex items-start gap-2 text-sm">
                                  <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5" />
                                  <span>{recommendation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Generated: {new Date(report.generated_at).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Production Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Weekly Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Jobs:</span>
                        <div className="text-lg font-bold text-blue-600">{productionJobs.length}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Efficiency:</span>
                        <div className="text-lg font-bold text-green-600">94.2%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Key Insights:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Production efficiency above target</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span>Quality scores consistently high</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Quality Overview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Risk Score:</span>
                        <div className="text-lg font-bold text-green-600">
                          {qualityReports.length > 0 
                            ? (qualityReports.reduce((sum, r) => sum + r.risk_score, 0) / qualityReports.length * 100).toFixed(1) + '%'
                            : 'N/A'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reports:</span>
                        <div className="text-lg font-bold text-blue-600">{qualityReports.length}</div>
                      </div>
                    </div>
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