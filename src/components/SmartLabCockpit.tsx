// Smart Lab Cockpit with Intelligent Material Management
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  BarChart3,
  ShoppingCart,
  RefreshCw,
  Zap,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface MaterialUsageAnalytics {
  material_name: string;
  daily_usage: number;
  weekly_trend: number;
  predicted_depletion: string;
  cost_analysis: number;
}

interface AutoReorderSuggestion {
  material_id: string;
  material_name: string;
  suggested_quantity: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimated_cost: number;
}

interface ForecastResult {
  material_name: string;
  current_stock: number;
  predicted_usage: number;
  predicted_shortage: number;
  days_until_depletion: number;
  confidence_level: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_order_quantity: number;
  estimated_cost: number;
  lead_time_days: number;
}

interface ForecastAnalytics {
  total_materials_analyzed: number;
  materials_at_risk: number;
  total_predicted_cost: number;
  next_critical_shortage: {
    material: string;
    days: number;
  } | null;
  forecast_accuracy_score: number;
  recommendations: string[];
}

interface ProactiveAlert {
  type: 'low_stock' | 'machine_bottleneck' | 'production_delay' | 'critical_shortage' | 'efficiency_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  payload: Record<string, any>;
  timestamp: string;
  actionable: boolean;
  recommended_actions?: string[];
}

interface SystemMetrics {
  pending_jobs_count: number;
  low_stock_materials: number;
  machine_utilization: number;
  production_efficiency: number;
  critical_alerts: number;
}

export function SmartLabCockpit() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [analytics, setAnalytics] = useState<MaterialUsageAnalytics[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<AutoReorderSuggestion[]>([]);
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [forecastAnalytics, setForecastAnalytics] = useState<ForecastAnalytics | null>(null);
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isForecasting, setIsForecasting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    generateAnalytics();
    
    // Real-time material updates
    const materialChannel = supabase
      .channel('lab_materials_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_materials'
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setMaterials(prev => prev.map(material => 
            material.id === payload.new.id ? payload.new as Material : material
          ));
          
          // Check for low stock alert
          const updatedMaterial = payload.new as Material;
          if (updatedMaterial.current_stock <= updatedMaterial.minimum_threshold) {
            toast({
              title: "Low Stock Alert",
              description: `${updatedMaterial.material_name} is running low!`,
              variant: "destructive"
            });
          }
        }
      })
      .subscribe();

    // Real-time production updates
    const productionChannel = supabase
      .channel('production_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_production_queue'
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          fetchProductionJobs();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(materialChannel);
      supabase.removeChannel(productionChannel);
    };
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_materials')
        .select('*')
        .order('material_name');
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
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
        },
        {
          id: '3',
          material_name: 'Bio-Compatible Resin',
          current_stock: 8,
          minimum_threshold: 15,
          unit_cost: 85.00,
          supplier: 'BioMed Materials',
          last_ordered_at: '2025-01-18T11:45:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-28T16:20:00Z'
        }
      ]);
    }
  };

  const fetchProductionJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_production_queue')
        .select(`
          *,
          patients (patient_code)
        `)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      setProductionJobs(data || []);
    } catch (error) {
      console.error('Error fetching production jobs:', error);
    }
  };

  const generateAnalytics = async () => {
    // Simulate AI-driven analytics
    const mockAnalytics: MaterialUsageAnalytics[] = [
      {
        material_name: 'Titanium Dioxide Powder',
        daily_usage: 12.5,
        weekly_trend: -5.2,
        predicted_depletion: '2025-02-15',
        cost_analysis: 562.50
      },
      {
        material_name: 'Zirconia Blanks',
        daily_usage: 3.2,
        weekly_trend: 8.1,
        predicted_depletion: '2025-02-08',
        cost_analysis: 384.00
      },
      {
        material_name: 'Bio-Compatible Resin',
        daily_usage: 1.8,
        weekly_trend: 12.5,
        predicted_depletion: '2025-02-05',
        cost_analysis: 153.00
      }
    ];
    
    setAnalytics(mockAnalytics);
    generateReorderSuggestions(mockAnalytics);
  };

  const generateReorderSuggestions = (analyticsData: MaterialUsageAnalytics[]) => {
    const suggestions: AutoReorderSuggestion[] = [];
    
    materials.forEach(material => {
      const usage = analyticsData.find(a => a.material_name === material.material_name);
      if (!usage) return;

      const daysUntilDepletion = new Date(usage.predicted_depletion).getTime() - new Date().getTime();
      const daysRemaining = Math.ceil(daysUntilDepletion / (1000 * 60 * 60 * 24));
      
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let suggestedQuantity = Math.ceil(usage.daily_usage * 30); // 30-day supply
      
      if (material.current_stock <= material.minimum_threshold) {
        urgency = 'critical';
        suggestedQuantity = Math.ceil(usage.daily_usage * 45); // 45-day supply for critical items
      } else if (daysRemaining <= 7) {
        urgency = 'high';
        suggestedQuantity = Math.ceil(usage.daily_usage * 35);
      } else if (daysRemaining <= 14) {
        urgency = 'medium';
      }

      if (urgency !== 'low') {
        suggestions.push({
          material_id: material.id,
          material_name: material.material_name,
          suggested_quantity: suggestedQuantity,
          urgency_level: urgency,
          reason: urgency === 'critical' 
            ? 'Below minimum threshold' 
            : `Predicted depletion in ${daysRemaining} days`,
          estimated_cost: suggestedQuantity * material.unit_cost
        });
      }
    });
    
    setReorderSuggestions(suggestions);
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
      
      // Update production jobs with optimized order
      if (data?.optimizedJobs) {
        setProductionJobs(data.optimizedJobs);
      }
      
      // Display optimization analytics
      if (data?.analytics) {
        const { analytics } = data;
        toast({
          title: "Schedule Optimized",
          description: `Optimized ${analytics.totalJobs} jobs. ${analytics.highPriorityJobs} high-priority jobs identified.`,
        });
        
        // Show recommendations if any
        if (analytics.optimizationRecommendations?.length > 0) {
          setTimeout(() => {
            toast({
              title: "Optimization Recommendations",
              description: analytics.optimizationRecommendations[0],
            });
          }, 2000);
        }
      }
      
      await fetchProductionJobs();
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize production schedule.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAutoReorder = async (suggestion: AutoReorderSuggestion) => {
    try {
      const { error } = await supabase.functions.invoke('agent-lab', {
        body: {
          event: 'auto_reorder',
          data: {
            material_id: suggestion.material_id,
            quantity: suggestion.suggested_quantity,
            urgency: suggestion.urgency_level
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Reorder Initiated",
        description: `Auto-reorder for ${suggestion.material_name} has been processed`,
      });
      
      // Remove the suggestion from the list
      setReorderSuggestions(prev => prev.filter(s => s.material_id !== suggestion.material_id));
    } catch (error) {
      console.error('Error processing auto-reorder:', error);
      toast({
        title: "Reorder Failed",
        description: "Unable to process automatic reorder",
        variant: "destructive"
      });
    }
  };

  const runInventoryForecast = async () => {
    setIsForecasting(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-forecast', {
        body: { 
          event: 'run_forecast',
          data: { daysAhead: 14 }
        }
      });

      if (error) throw error;
      
      if (data?.forecasts) {
        setForecastResults(data.forecasts);
      }
      
      if (data?.analytics) {
        setForecastAnalytics(data.analytics);
        toast({
          title: "Forecast Complete",
          description: `Analyzed ${data.analytics.total_materials_analyzed} materials. ${data.analytics.materials_at_risk} at risk.`,
        });
        
        // Show critical recommendations
        if (data.analytics.recommendations?.length > 0) {
          setTimeout(() => {
            toast({
              title: "Forecast Recommendations",
              description: data.analytics.recommendations[0],
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error running forecast:', error);
      toast({
        title: "Forecast Failed",
        description: "Failed to run inventory forecast.",
        variant: "destructive",
      });
    } finally {
      setIsForecasting(false);
    }
  };

  const runReactiveAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reactive-analysis', {
        body: { 
          event: 'run_analysis'
        }
      });

      if (error) throw error;
      
      if (data?.alerts) {
        setProactiveAlerts(data.alerts);
        
        // Show critical alerts as toasts
        const criticalAlerts = data.alerts.filter((alert: ProactiveAlert) => alert.severity === 'critical');
        criticalAlerts.forEach((alert: ProactiveAlert) => {
          toast({
            title: alert.title,
            description: alert.message,
            variant: "destructive",
          });
        });
      }
      
      if (data?.metrics) {
        setSystemMetrics(data.metrics);
      }
      
      toast({
        title: "Analysis Complete",
        description: `Found ${data?.alerts?.length || 0} alerts. System monitoring active.`,
      });
    } catch (error) {
      console.error('Error running reactive analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run reactive analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
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
            onClick={runReactiveAnalysis}
            disabled={isAnalyzing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Live Monitor'}
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitor">Live Monitor</TabsTrigger>
          <TabsTrigger value="inventory">Smart Inventory</TabsTrigger>
          <TabsTrigger value="production">Production Queue</TabsTrigger>
          <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reorder">Auto-Reorder</TabsTrigger>
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
                  
                  {reorderSuggestions.slice(0, 3).map(suggestion => (
                    <div key={suggestion.material_id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-yellow-800">{suggestion.material_name}</h4>
                        <p className="text-sm text-yellow-600">{suggestion.reason}</p>
                      </div>
                      <Badge variant={getUrgencyColor(suggestion.urgency_level)}>
                        {suggestion.urgency_level.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <div className="space-y-6">
            {/* System Metrics Dashboard */}
            {systemMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Real-Time System Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{systemMetrics.pending_jobs_count}</div>
                      <div className="text-sm text-muted-foreground">Pending Jobs</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{systemMetrics.low_stock_materials}</div>
                      <div className="text-sm text-muted-foreground">Low Stock Items</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{systemMetrics.machine_utilization}%</div>
                      <div className="text-sm text-muted-foreground">Machine Utilization</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{systemMetrics.production_efficiency}%</div>
                      <div className="text-sm text-muted-foreground">Production Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{systemMetrics.critical_alerts}</div>
                      <div className="text-sm text-muted-foreground">Critical Alerts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Live Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Live Alert System
                  </span>
                  <Button 
                    onClick={runReactiveAnalysis}
                    disabled={isAnalyzing}
                    size="sm"
                    variant="outline"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proactiveAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <h3 className="text-lg font-medium">All systems operational</h3>
                      <p>No active alerts detected</p>
                    </div>
                  ) : (
                    proactiveAlerts.map((alert, index) => (
                      <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{alert.title}</h3>
                            <p className="text-sm">{alert.message}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getUrgencyColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Alert Payload Details */}
                        <div className="mb-3 p-2 bg-white/50 rounded text-xs">
                          <strong>Details:</strong> {JSON.stringify(alert.payload, null, 2).slice(0, 200)}...
                        </div>

                        {/* Recommended Actions */}
                        {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Recommended Actions:</h4>
                            <div className="space-y-1">
                              {alert.recommended_actions.map((action, actionIndex) => (
                                <div key={actionIndex} className="flex items-center gap-2 text-sm">
                                  <Activity className="h-3 w-3" />
                                  <span>{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {alert.actionable && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline">
                              Take Action
                            </Button>
                            <Button size="sm" variant="ghost">
                              Acknowledge
                            </Button>
                            <Button size="sm" variant="ghost">
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monitoring Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Monitoring Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Alert Thresholds</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Machine Bottleneck:</span>
                        <span className="font-medium">5+ pending jobs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Low Stock Alert:</span>
                        <span className="font-medium">Below minimum threshold</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Production Delay:</span>
                        <span className="font-medium">1+ days overdue</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Monitoring Status</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Real-time updates: Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Alerting system: Online</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Forecast engine: Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="space-y-1">
                      <Button size="sm" variant="outline" className="w-full">
                        Configure Thresholds
                      </Button>
                      <Button size="sm" variant="outline" className="w-full">
                        Export Alert History
                      </Button>
                      <Button size="sm" variant="outline" className="w-full">
                        Test Alert System
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
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
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Package className="h-3 w-3 mr-1" />
                        Update Stock
                      </Button>
                      <Button size="sm" className="flex-1">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Reorder
                      </Button>
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
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{job.job_code}</h3>
                        <p className="text-sm text-muted-foreground">
                          {job.patients?.patient_code} - {job.job_type}
                        </p>
                        {job.machine_assignment && (
                          <p className="text-xs text-blue-600 mt-1">
                            Assigned to: {job.machine_assignment}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge>Priority: {job.priority}</Badge>
                        <Badge variant={job.status === 'IN_PROGRESS' ? 'default' : 'outline'}>
                          {job.status}
                        </Badge>
                      </div>
                    </div>

                    {job.material_requirements && (
                      <div className="mb-3 p-2 bg-muted rounded">
                        <h4 className="text-sm font-medium mb-1">Material Requirements:</h4>
                        <p className="text-xs text-muted-foreground">
                          {JSON.stringify(job.material_requirements)}
                        </p>
                      </div>
                    )}

                    {job.status === 'IN_PROGRESS' && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>ETA: {job.estimated_duration}</span>
                        </div>
                        <Progress value={Math.random() * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <div className="space-y-6">
            {/* Forecast Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    AI-Powered Inventory Forecast
                  </span>
                  <Button 
                    onClick={runInventoryForecast}
                    disabled={isForecasting}
                    className="flex items-center gap-2"
                  >
                    {isForecasting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    {isForecasting ? 'Analyzing...' : 'Run Forecast'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {forecastAnalytics && (
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{forecastAnalytics.total_materials_analyzed}</div>
                      <div className="text-sm text-muted-foreground">Materials Analyzed</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{forecastAnalytics.materials_at_risk}</div>
                      <div className="text-sm text-muted-foreground">At Risk</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{forecastAnalytics.forecast_accuracy_score}%</div>
                      <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">${forecastAnalytics.total_predicted_cost.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">Predicted Cost</div>
                    </div>
                  </div>
                  
                  {forecastAnalytics.next_critical_shortage && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-1">Next Critical Shortage</h4>
                      <p className="text-red-600">
                        {forecastAnalytics.next_critical_shortage.material} in {forecastAnalytics.next_critical_shortage.days} days
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Forecast Results */}
            {forecastResults.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {forecastResults.map(forecast => (
                  <Card key={forecast.material_name}>
                    <CardHeader>
                      <CardTitle className="text-base flex justify-between items-center">
                        {forecast.material_name}
                        <Badge variant={getUrgencyColor(forecast.urgency_level)}>
                          {forecast.urgency_level.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Current vs Predicted */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current Stock:</span>
                            <div className="font-medium">{forecast.current_stock} units</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Predicted Usage:</span>
                            <div className="font-medium">{forecast.predicted_usage} units</div>
                          </div>
                        </div>

                        {/* Shortage Indicator */}
                        {forecast.predicted_shortage > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="font-medium text-red-800">
                                Predicted Shortage: {forecast.predicted_shortage} units
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Days Until Depletion:</span>
                            <div className="font-medium text-orange-600">{forecast.days_until_depletion} days</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lead Time:</span>
                            <div className="font-medium">{forecast.lead_time_days} days</div>
                          </div>
                        </div>

                        {/* Confidence & Recommendation */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Forecast Confidence</span>
                            <span className="font-medium">{Math.round(forecast.confidence_level * 100)}%</span>
                          </div>
                          <Progress value={forecast.confidence_level * 100} className="h-2" />
                        </div>

                        {/* Recommended Action */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-1">Recommended Order</h4>
                          <div className="text-sm text-blue-600">
                            <div>Quantity: {forecast.recommended_order_quantity} units</div>
                            <div>Estimated Cost: ${forecast.estimated_cost.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {forecastAnalytics?.recommendations && forecastAnalytics.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecastAnalytics.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-sm text-blue-700">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Material Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.map(item => (
                    <div key={item.material_name} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.material_name}</h4>
                        <div className="flex items-center gap-1">
                          {item.weekly_trend > 0 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                          <span className={`text-sm ${item.weekly_trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {Math.abs(item.weekly_trend)}%
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Daily Usage:</span>
                          <div className="font-medium">{item.daily_usage} units</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weekly Cost:</span>
                          <div className="font-medium">${item.cost_analysis}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Predicted Depletion:</span>
                          <div className="font-medium">{new Date(item.predicted_depletion).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis & Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Weekly Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Cost:</span>
                        <div className="text-lg font-bold text-blue-600">
                          ${analytics.reduce((sum, item) => sum + item.cost_analysis, 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Efficiency:</span>
                        <div className="text-lg font-bold text-green-600">94.2%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Optimization Suggestions:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Bulk order Titanium Dioxide for 15% cost savings</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span>Consider alternative supplier for Zirconia Blanks</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span>Optimize production schedule to reduce material waste</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reorder" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Intelligent Auto-Reorder System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reorderSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <h3 className="text-lg font-medium">All inventory levels optimal</h3>
                    <p>No reorder suggestions at this time</p>
                  </div>
                ) : (
                  reorderSuggestions.map(suggestion => (
                    <div key={suggestion.material_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{suggestion.material_name}</h3>
                          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <Badge variant={getUrgencyColor(suggestion.urgency_level)}>
                          {suggestion.urgency_level.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Suggested Qty:</span>
                          <div className="font-medium">{suggestion.suggested_quantity} units</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estimated Cost:</span>
                          <div className="font-medium">${suggestion.estimated_cost.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Urgency:</span>
                          <div className="font-medium capitalize">{suggestion.urgency_level}</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleAutoReorder(suggestion)}
                          variant={suggestion.urgency_level === 'critical' ? 'destructive' : 'default'}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Auto-Reorder Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Modify Order
                        </Button>
                        <Button size="sm" variant="ghost">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}