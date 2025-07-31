import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface AnalysisResult {
  alerts: ProactiveAlert[];
  metrics: {
    pending_jobs_count: number;
    low_stock_materials: number;
    machine_utilization: number;
    production_efficiency: number;
    critical_alerts: number;
  };
  recommendations: string[];
}

interface ProductionJob {
  id: string;
  job_code: string;
  status: string;
  priority: number;
  created_at: string;
  estimated_duration: string | null;
  patient_eta?: string;
  material_requirements: any;
}

interface Material {
  id: string;
  material_name: string;
  current_stock: number;
  minimum_threshold: number;
  unit_cost: number;
  supplier: string;
}

class ReactiveAnalysisService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Run comprehensive reactive analysis
   */
  public async runAnalysis(): Promise<AnalysisResult> {
    const alerts: ProactiveAlert[] = [];
    const timestamp = new Date().toISOString();

    // Fetch current data
    const [productionJobs, materials] = await Promise.all([
      this.fetchProductionJobs(),
      this.fetchMaterials()
    ]);

    // Run all analysis checks
    const analysisChecks = await Promise.all([
      this.checkMachineBottlenecks(productionJobs, timestamp),
      this.checkLowStockAlerts(materials, timestamp),
      this.checkProductionDelays(productionJobs, timestamp),
      this.checkCriticalShortages(materials, productionJobs, timestamp),
      this.checkEfficiencyDrops(productionJobs, timestamp)
    ]);

    // Flatten all alerts
    analysisChecks.forEach(checkAlerts => alerts.push(...checkAlerts));

    // Calculate metrics
    const metrics = this.calculateMetrics(productionJobs, materials, alerts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(alerts, metrics);

    return { alerts, metrics, recommendations };
  }

  /**
   * Fetch production jobs
   */
  private async fetchProductionJobs(): Promise<ProductionJob[]> {
    const { data, error } = await this.supabase
      .from('lab_production_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching production jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Fetch materials
   */
  private async fetchMaterials(): Promise<Material[]> {
    const { data, error } = await this.supabase
      .from('lab_materials')
      .select('*')
      .order('material_name');

    if (error) {
      console.error('Error fetching materials:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check for machine bottlenecks
   */
  private async checkMachineBottlenecks(jobs: ProductionJob[], timestamp: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    const pendingJobs = jobs.filter(job => job.status === 'PENDING');
    const inProgressJobs = jobs.filter(job => job.status === 'IN_PROGRESS');

    // Critical threshold: More than 8 pending jobs
    if (pendingJobs.length > 8) {
      alerts.push({
        type: 'machine_bottleneck',
        severity: 'critical',
        title: 'Critical Production Bottleneck',
        message: `${pendingJobs.length} jobs pending. Immediate action required to prevent delays.`,
        payload: { 
          pendingJobs: pendingJobs.length,
          inProgressJobs: inProgressJobs.length,
          threshold: 8
        },
        timestamp,
        actionable: true,
        recommended_actions: [
          'Redistribute jobs across available machines',
          'Consider overtime production schedule',
          'Review machine maintenance status'
        ]
      });
    }
    // High threshold: More than 5 pending jobs
    else if (pendingJobs.length > 5) {
      alerts.push({
        type: 'machine_bottleneck',
        severity: 'high',
        title: 'Production Queue Congestion',
        message: `${pendingJobs.length} jobs in queue. Consider optimization to prevent bottlenecks.`,
        payload: { 
          pendingJobs: pendingJobs.length,
          inProgressJobs: inProgressJobs.length,
          threshold: 5
        },
        timestamp,
        actionable: true,
        recommended_actions: [
          'Run production schedule optimization',
          'Check machine availability',
          'Review job priorities'
        ]
      });
    }

    return alerts;
  }

  /**
   * Check for low stock alerts
   */
  private async checkLowStockAlerts(materials: Material[], timestamp: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    
    for (const material of materials) {
      const stockRatio = material.current_stock / material.minimum_threshold;
      
      if (stockRatio <= 0.5) { // Critical: 50% below minimum
        alerts.push({
          type: 'critical_shortage',
          severity: 'critical',
          title: 'Critical Material Shortage',
          message: `${material.material_name} is critically low (${material.current_stock} units, min: ${material.minimum_threshold}).`,
          payload: {
            material_name: material.material_name,
            current_stock: material.current_stock,
            minimum_threshold: material.minimum_threshold,
            supplier: material.supplier
          },
          timestamp,
          actionable: true,
          recommended_actions: [
            'Place emergency order immediately',
            'Check alternative suppliers',
            'Adjust production priorities'
          ]
        });
      } else if (stockRatio <= 1.0) { // Below minimum threshold
        alerts.push({
          type: 'low_stock',
          severity: 'high',
          title: 'Low Stock Alert',
          message: `${material.material_name} is below minimum threshold (${material.current_stock}/${material.minimum_threshold} units).`,
          payload: {
            material_name: material.material_name,
            current_stock: material.current_stock,
            minimum_threshold: material.minimum_threshold,
            supplier: material.supplier
          },
          timestamp,
          actionable: true,
          recommended_actions: [
            'Initiate reorder process',
            'Review usage patterns',
            'Consider increasing safety stock'
          ]
        });
      }
    }

    return alerts;
  }

  /**
   * Check for production delays
   */
  private async checkProductionDelays(jobs: ProductionJob[], timestamp: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    const now = new Date();
    
    // Check for jobs that are overdue based on patient ETA
    const overdueJobs = jobs.filter(job => {
      if (!job.patient_eta || job.status === 'COMPLETED') return false;
      const eta = new Date(job.patient_eta);
      const daysDiff = (now.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 1; // More than 1 day overdue
    });

    if (overdueJobs.length > 0) {
      alerts.push({
        type: 'production_delay',
        severity: overdueJobs.length > 3 ? 'critical' : 'high',
        title: 'Production Delays Detected',
        message: `${overdueJobs.length} jobs are overdue. Patient care may be impacted.`,
        payload: {
          overdue_jobs: overdueJobs.length,
          job_codes: overdueJobs.map(job => job.job_code).slice(0, 5)
        },
        timestamp,
        actionable: true,
        recommended_actions: [
          'Prioritize overdue jobs immediately',
          'Contact patients with delay notifications',
          'Review production capacity'
        ]
      });
    }

    return alerts;
  }

  /**
   * Check for critical shortages based on upcoming production
   */
  private async checkCriticalShortages(
    materials: Material[], 
    jobs: ProductionJob[], 
    timestamp: string
  ): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    const pendingJobs = jobs.filter(job => job.status === 'PENDING');

    // Calculate material requirements for pending jobs
    const materialRequirements: Record<string, number> = {};
    
    for (const job of pendingJobs) {
      if (job.material_requirements && typeof job.material_requirements === 'object') {
        for (const [materialName, quantity] of Object.entries(job.material_requirements)) {
          if (typeof quantity === 'number') {
            materialRequirements[materialName] = (materialRequirements[materialName] || 0) + quantity;
          }
        }
      }
    }

    // Check if current stock can fulfill pending requirements
    for (const material of materials) {
      const required = materialRequirements[material.material_name] || 0;
      if (required > 0 && material.current_stock < required) {
        const shortage = required - material.current_stock;
        alerts.push({
          type: 'critical_shortage',
          severity: 'critical',
          title: 'Production Material Shortage',
          message: `${material.material_name} insufficient for pending jobs. Need ${shortage} more units.`,
          payload: {
            material_name: material.material_name,
            current_stock: material.current_stock,
            required: required,
            shortage: shortage,
            affected_jobs: pendingJobs.filter(job => 
              job.material_requirements?.[material.material_name] > 0
            ).length
          },
          timestamp,
          actionable: true,
          recommended_actions: [
            'Halt affected job assignments',
            'Emergency material procurement',
            'Reschedule affected jobs'
          ]
        });
      }
    }

    return alerts;
  }

  /**
   * Check for efficiency drops
   */
  private async checkEfficiencyDrops(jobs: ProductionJob[], timestamp: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    
    // Simple efficiency check based on job completion rates
    const recentJobs = jobs.filter(job => {
      const jobDate = new Date(job.created_at);
      const daysDiff = (new Date().getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7; // Last 7 days
    });

    const completedJobs = recentJobs.filter(job => job.status === 'COMPLETED').length;
    const totalJobs = recentJobs.length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    if (totalJobs >= 5 && completionRate < 60) { // Less than 60% completion rate
      alerts.push({
        type: 'efficiency_drop',
        severity: completionRate < 40 ? 'critical' : 'high',
        title: 'Production Efficiency Drop',
        message: `Only ${completionRate.toFixed(1)}% of jobs completed this week. Performance review needed.`,
        payload: {
          completion_rate: completionRate,
          completed_jobs: completedJobs,
          total_jobs: totalJobs,
          period: '7 days'
        },
        timestamp,
        actionable: true,
        recommended_actions: [
          'Analyze production bottlenecks',
          'Review machine maintenance schedules',
          'Check staff scheduling and training'
        ]
      });
    }

    return alerts;
  }

  /**
   * Calculate system metrics
   */
  private calculateMetrics(jobs: ProductionJob[], materials: Material[], alerts: ProactiveAlert[]): any {
    const pendingJobs = jobs.filter(job => job.status === 'PENDING').length;
    const lowStockMaterials = materials.filter(m => m.current_stock <= m.minimum_threshold).length;
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;

    // Mock machine utilization and efficiency (in real system, this would come from actual machine data)
    const machineUtilization = Math.max(0, Math.min(100, 85 - (pendingJobs * 5))); // Decreases with more pending jobs
    const productionEfficiency = Math.max(0, Math.min(100, 90 - (criticalAlerts * 10))); // Decreases with critical alerts

    return {
      pending_jobs_count: pendingJobs,
      low_stock_materials: lowStockMaterials,
      machine_utilization: machineUtilization,
      production_efficiency: productionEfficiency,
      critical_alerts: criticalAlerts
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(alerts: ProactiveAlert[], metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.critical_alerts > 0) {
      recommendations.push('Address critical alerts immediately to prevent production disruption.');
    }

    if (metrics.pending_jobs_count > 5) {
      recommendations.push('Consider running production optimization to reduce queue backlog.');
    }

    if (metrics.low_stock_materials > 2) {
      recommendations.push('Review inventory forecasting and reorder policies.');
    }

    if (metrics.machine_utilization < 70) {
      recommendations.push('Analyze machine scheduling efficiency and consider load balancing.');
    }

    if (metrics.production_efficiency < 80) {
      recommendations.push('Investigate root causes of production inefficiency.');
    }

    // Add generic recommendations if no specific issues
    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters. Continue monitoring.');
    }

    return recommendations;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { event } = await req.json();
    const analysisService = new ReactiveAnalysisService(supabaseClient);

    switch (event) {
      case 'run_analysis':
        const result = await analysisService.runAnalysis();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in reactive-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});