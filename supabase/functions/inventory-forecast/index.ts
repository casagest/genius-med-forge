import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductionJob {
  id: string;
  job_code: string;
  job_type: string;
  material_requirements: any;
  status: string;
  priority: number;
  estimated_duration: string | null;
  patient_eta?: string;
  created_at: string;
}

interface Material {
  id: string;
  material_name: string;
  current_stock: number;
  minimum_threshold: number;
  unit_cost: number;
  supplier: string;
  last_ordered_at: string | null;
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

class InventoryForecastService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Run comprehensive inventory forecast analysis
   */
  public async runForecastAnalysis(daysAhead: number = 14): Promise<{
    forecasts: ForecastResult[];
    analytics: ForecastAnalytics;
  }> {
    // Fetch production jobs and materials
    const [productionJobs, materials] = await Promise.all([
      this.fetchProductionJobs(),
      this.fetchMaterials()
    ]);

    // Calculate material usage patterns
    const usagePatterns = await this.calculateUsagePatterns(materials);
    
    // Generate forecasts for each material
    const forecasts: ForecastResult[] = [];
    
    for (const material of materials) {
      const forecast = await this.generateMaterialForecast(
        material,
        productionJobs,
        usagePatterns[material.material_name] || { dailyUsage: 0, trend: 0, volatility: 0 },
        daysAhead
      );
      forecasts.push(forecast);
    }

    // Generate analytics
    const analytics = this.generateForecastAnalytics(forecasts);

    return { forecasts, analytics };
  }

  /**
   * Fetch active and upcoming production jobs
   */
  private async fetchProductionJobs(): Promise<ProductionJob[]> {
    const { data, error } = await this.supabase
      .from('lab_production_queue')
      .select('*')
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching production jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Fetch all materials
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
   * Calculate historical usage patterns for materials
   */
  private async calculateUsagePatterns(materials: Material[]): Promise<Record<string, {
    dailyUsage: number;
    trend: number;
    volatility: number;
  }>> {
    // For now, simulate historical analysis
    // In production, this would analyze historical consumption data
    const patterns: Record<string, any> = {};

    for (const material of materials) {
      // Simulate usage based on material type and current stock
      let baseDailyUsage = 0;
      
      // Estimate usage based on material type
      if (material.material_name.toLowerCase().includes('titanium')) {
        baseDailyUsage = 2.5;
      } else if (material.material_name.toLowerCase().includes('zirconia')) {
        baseDailyUsage = 1.8;
      } else if (material.material_name.toLowerCase().includes('resin')) {
        baseDailyUsage = 3.2;
      } else {
        baseDailyUsage = 1.5;
      }

      // Add some variability based on recent trends
      const trend = (Math.random() - 0.5) * 0.3; // -15% to +15% trend
      const volatility = Math.random() * 0.4 + 0.1; // 10% to 50% volatility

      patterns[material.material_name] = {
        dailyUsage: baseDailyUsage,
        trend,
        volatility
      };
    }

    return patterns;
  }

  /**
   * Generate forecast for a specific material
   */
  private async generateMaterialForecast(
    material: Material,
    productionJobs: ProductionJob[],
    usagePattern: { dailyUsage: number; trend: number; volatility: number },
    daysAhead: number
  ): Promise<ForecastResult> {
    // Calculate predicted usage from production jobs
    const predictedProductionUsage = this.calculateProductionUsage(material, productionJobs);
    
    // Calculate base usage with trend
    const baseUsage = usagePattern.dailyUsage * (1 + usagePattern.trend);
    const totalPredictedUsage = (baseUsage * daysAhead) + predictedProductionUsage;
    
    // Calculate potential shortage
    const predictedShortage = Math.max(0, totalPredictedUsage - material.current_stock);
    
    // Calculate days until depletion
    const daysUntilDepletion = baseUsage > 0 
      ? Math.floor(material.current_stock / baseUsage)
      : 999;

    // Calculate confidence level based on volatility
    const confidenceLevel = Math.max(0.5, 1 - usagePattern.volatility);

    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(
      daysUntilDepletion,
      predictedShortage,
      material.minimum_threshold
    );

    // Calculate recommended order quantity
    const recommendedOrderQuantity = this.calculateRecommendedOrder(
      material,
      predictedShortage,
      baseUsage,
      urgencyLevel
    );

    // Estimate lead time (simplified)
    const leadTimeDays = this.estimateLeadTime(material.supplier);

    return {
      material_name: material.material_name,
      current_stock: material.current_stock,
      predicted_usage: Math.round(totalPredictedUsage * 100) / 100,
      predicted_shortage: Math.round(predictedShortage * 100) / 100,
      days_until_depletion: daysUntilDepletion,
      confidence_level: Math.round(confidenceLevel * 100) / 100,
      urgency_level: urgencyLevel,
      recommended_order_quantity: recommendedOrderQuantity,
      estimated_cost: recommendedOrderQuantity * material.unit_cost,
      lead_time_days: leadTimeDays
    };
  }

  /**
   * Calculate material usage from upcoming production jobs
   */
  private calculateProductionUsage(material: Material, jobs: ProductionJob[]): number {
    let totalUsage = 0;

    for (const job of jobs) {
      if (job.material_requirements && typeof job.material_requirements === 'object') {
        const requirement = job.material_requirements[material.material_name];
        if (requirement && typeof requirement === 'number') {
          totalUsage += requirement;
        }
      }
    }

    return totalUsage;
  }

  /**
   * Determine urgency level based on multiple factors
   */
  private determineUrgencyLevel(
    daysUntilDepletion: number,
    predictedShortage: number,
    minimumThreshold: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (predictedShortage > minimumThreshold || daysUntilDepletion <= 3) {
      return 'critical';
    } else if (daysUntilDepletion <= 7 || predictedShortage > 0) {
      return 'high';
    } else if (daysUntilDepletion <= 14) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate recommended order quantity with optimization
   */
  private calculateRecommendedOrder(
    material: Material,
    predictedShortage: number,
    dailyUsage: number,
    urgencyLevel: string
  ): number {
    let baseOrder = Math.max(predictedShortage, material.minimum_threshold);
    
    // Add safety stock based on urgency
    const safetyMultiplier = {
      'critical': 45, // 45 days
      'high': 30,     // 30 days
      'medium': 21,   // 21 days
      'low': 14       // 14 days
    }[urgencyLevel] || 14;

    const safetyStock = dailyUsage * safetyMultiplier;
    
    // Economic order quantity considerations (simplified)
    const economicOrderQuantity = Math.sqrt(2 * dailyUsage * 365 * 50 / (material.unit_cost * 0.2));
    
    return Math.max(baseOrder + safetyStock, economicOrderQuantity);
  }

  /**
   * Estimate lead time based on supplier
   */
  private estimateLeadTime(supplier: string): number {
    // Simplified lead time estimation
    const leadTimes: Record<string, number> = {
      'DentalTech Supplies': 5,
      'CeramTech Solutions': 7,
      'BioMed Materials': 10,
      'default': 7
    };

    return leadTimes[supplier] || leadTimes['default'];
  }

  /**
   * Generate comprehensive analytics
   */
  private generateForecastAnalytics(forecasts: ForecastResult[]): ForecastAnalytics {
    const materialsAtRisk = forecasts.filter(f => f.urgency_level !== 'low').length;
    const totalPredictedCost = forecasts.reduce((sum, f) => sum + f.estimated_cost, 0);
    
    // Find next critical shortage
    const criticalForecasts = forecasts
      .filter(f => f.urgency_level === 'critical')
      .sort((a, b) => a.days_until_depletion - b.days_until_depletion);

    const nextCriticalShortage = criticalForecasts.length > 0 ? {
      material: criticalForecasts[0].material_name,
      days: criticalForecasts[0].days_until_depletion
    } : null;

    // Calculate forecast accuracy score (simplified)
    const averageConfidence = forecasts.reduce((sum, f) => sum + f.confidence_level, 0) / forecasts.length;
    const forecastAccuracyScore = Math.round(averageConfidence * 100);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (materialsAtRisk > forecasts.length * 0.3) {
      recommendations.push('High inventory risk detected. Consider increasing safety stock levels.');
    }
    
    if (criticalForecasts.length > 0) {
      recommendations.push(`Immediate action required for ${criticalForecasts.length} critical materials.`);
    }
    
    if (totalPredictedCost > 10000) {
      recommendations.push('Consider bulk purchasing discounts for high-value orders.');
    }

    return {
      total_materials_analyzed: forecasts.length,
      materials_at_risk: materialsAtRisk,
      total_predicted_cost: Math.round(totalPredictedCost * 100) / 100,
      next_critical_shortage: nextCriticalShortage,
      forecast_accuracy_score: forecastAccuracyScore,
      recommendations
    };
  }

  /**
   * Generate automated reorder suggestions
   */
  public async generateReorderSuggestions(): Promise<any[]> {
    const { forecasts } = await this.runForecastAnalysis();
    
    return forecasts
      .filter(forecast => forecast.urgency_level !== 'low')
      .map(forecast => ({
        material_name: forecast.material_name,
        urgency_level: forecast.urgency_level,
        recommended_quantity: forecast.recommended_order_quantity,
        estimated_cost: forecast.estimated_cost,
        reason: `Predicted shortage in ${forecast.days_until_depletion} days`,
        confidence: forecast.confidence_level
      }));
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

    const { event, data } = await req.json();
    const forecastService = new InventoryForecastService(supabaseClient);

    switch (event) {
      case 'run_forecast':
        const daysAhead = data?.daysAhead || 14;
        const result = await forecastService.runForecastAnalysis(daysAhead);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'generate_reorders':
        const reorders = await forecastService.generateReorderSuggestions();
        return new Response(JSON.stringify({ reorders }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in inventory-forecast function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});