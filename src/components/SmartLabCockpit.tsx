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

export function SmartLabCockpit() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [analytics, setAnalytics] = useState<MaterialUsageAnalytics[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<AutoReorderSuggestion[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
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
      const { data, error } = await supabase.functions.invoke('agent-lab', {
        body: {
          event: 'optimize_schedule',
          data: {
            jobs: productionJobs,
            materials: materials,
            machine_status: machineStatus
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Production Optimized",
        description: "Schedule optimized for efficiency and material usage",
      });
      
      fetchProductionJobs();
    } catch (error) {
      console.error('Error optimizing production:', error);
      toast({
        title: "Optimization Failed",
        description: "Unable to optimize production schedule",
        variant: "destructive"
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
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Smart Inventory</TabsTrigger>
          <TabsTrigger value="production">Production Queue</TabsTrigger>
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