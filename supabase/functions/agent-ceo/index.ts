// AgentCEO - Strategic Operations with AnalysisReport Generation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskReport {
  report_type: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  analysis_data: Record<string, any>;
  rationale: Record<string, any>;
  requires_action: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event, data } = await req.json();

    switch (event) {
      case 'generate_analysis_report': {
        const reportData: RiskReport = data;
        
        // AgentCEO AI Analysis
        const ceoAnalysis = await performStrategicAnalysis(supabase, reportData);
        
        // Save AnalysisReport
        const { data: savedReport, error } = await supabase
          .from('analysis_reports')
          .insert({
            ...reportData,
            confidence_score: ceoAnalysis.confidence,
            analysis_data: {
              ...reportData.analysis_data,
              strategic_insights: ceoAnalysis.insights,
              financial_impact: ceoAnalysis.financial_impact,
              operational_recommendations: ceoAnalysis.recommendations
            },
            generated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Emit to StrategicOps Panel
        await emitToStrategicOps('ceo:new_risk_report', savedReport);

        return new Response(JSON.stringify({
          success: true,
          report: savedReport,
          ceo_analysis: ceoAnalysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_reports': {
        const { page = 1, limit = 20, risk_level, date_from, date_to } = data;
        
        let query = supabase
          .from('analysis_reports')
          .select('*')
          .order('generated_at', { ascending: false });

        if (risk_level) {
          query = query.eq('risk_level', risk_level);
        }

        if (date_from) {
          query = query.gte('generated_at', date_from);
        }

        if (date_to) {
          query = query.lte('generated_at', date_to);
        }

        const { data: reports, error, count } = await query
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          reports,
          pagination: {
            page,
            limit,
            total: count,
            total_pages: Math.ceil((count || 0) / limit)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'operational_dashboard': {
        const dashboardData = await generateOperationalDashboard(supabase);
        
        return new Response(JSON.stringify({
          success: true,
          dashboard: dashboardData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'ceo:new_risk_report': {
        // Handle incoming risk reports from other agents
        const { event_id, risk_level, rationale } = data;
        
        const riskReport: RiskReport = {
          report_type: 'OPERATIONAL_RISK',
          risk_level,
          analysis_data: { source_event_id: event_id },
          rationale,
          requires_action: risk_level === 'HIGH' || risk_level === 'CRITICAL'
        };

        // Recursive call to generate full analysis
        const response = await fetch(`${req.url}`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.get('Authorization') || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: 'generate_analysis_report',
            data: riskReport
          })
        });

        return response;
      }

      default:
        throw new Error(`Unknown event type: ${event}`);
    }

  } catch (error) {
    console.error('AgentCEO Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performStrategicAnalysis(supabase: any, reportData: RiskReport) {
  // AgentCEO Strategic AI Logic
  const insights = await analyzeBusinessImpact(supabase, reportData);
  const financialImpact = await calculateFinancialImpact(reportData);
  const recommendations = await generateStrategicRecommendations(reportData, insights);
  
  let confidence = 0.85;
  
  // Adjust confidence based on data quality and risk level
  if (reportData.risk_level === 'CRITICAL') {
    confidence = Math.min(confidence, 0.95);
  }
  
  if (reportData.analysis_data.data_points < 10) {
    confidence -= 0.1;
  }

  return {
    confidence,
    insights,
    financial_impact: financialImpact,
    recommendations,
    strategic_priority: calculateStrategicPriority(reportData.risk_level, financialImpact.severity)
  };
}

async function analyzeBusinessImpact(supabase: any, reportData: RiskReport) {
  // Fetch operational metrics
  const [procedureMetrics, labMetrics, materialMetrics] = await Promise.all([
    getPerformanceMetrics(supabase, 'procedure_event_log'),
    getPerformanceMetrics(supabase, 'lab_production_queue'),
    getInventoryMetrics(supabase)
  ]);

  return {
    operational_efficiency: calculateEfficiency(procedureMetrics, labMetrics),
    resource_utilization: calculateResourceUtilization(materialMetrics),
    quality_indicators: analyzeQualityTrends(procedureMetrics),
    patient_satisfaction_projection: 0.87, // Would integrate with actual feedback
    market_position: 'STRONG', // Would integrate with competitive analysis
    growth_potential: assessGrowthPotential(procedureMetrics, labMetrics)
  };
}

async function calculateFinancialImpact(reportData: RiskReport) {
  const baseCost = 1000; // Base procedure cost
  let impactMultiplier = 1;

  switch (reportData.risk_level) {
    case 'CRITICAL':
      impactMultiplier = 3.5;
      break;
    case 'HIGH':
      impactMultiplier = 2.0;
      break;
    case 'MEDIUM':
      impactMultiplier = 1.3;
      break;
    case 'LOW':
      impactMultiplier = 1.1;
      break;
  }

  const estimatedCost = baseCost * impactMultiplier;
  
  return {
    estimated_cost: estimatedCost,
    roi_impact: calculateROIImpact(estimatedCost),
    severity: estimatedCost > 5000 ? 'HIGH' : estimatedCost > 2000 ? 'MEDIUM' : 'LOW',
    mitigation_cost: estimatedCost * 0.3,
    potential_savings: estimatedCost * 0.8
  };
}

function generateStrategicRecommendations(reportData: RiskReport, insights: any) {
  const recommendations = [];

  if (reportData.risk_level === 'CRITICAL' || reportData.risk_level === 'HIGH') {
    recommendations.push({
      priority: 'IMMEDIATE',
      action: 'Activate emergency protocols',
      timeline: '1-4 hours',
      responsible: 'Medical Director'
    });
  }

  if (insights.operational_efficiency < 0.8) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Review and optimize workflows',
      timeline: '1-2 weeks',
      responsible: 'Operations Manager'
    });
  }

  recommendations.push({
    priority: 'MEDIUM',
    action: 'Update risk assessment protocols',
    timeline: '1 month',
    responsible: 'Quality Assurance'
  });

  return recommendations;
}

function calculateStrategicPriority(riskLevel: string, financialSeverity: string) {
  if (riskLevel === 'CRITICAL' || financialSeverity === 'HIGH') {
    return 'P0_CRITICAL';
  } else if (riskLevel === 'HIGH' || financialSeverity === 'MEDIUM') {
    return 'P1_HIGH';
  } else {
    return 'P2_MEDIUM';
  }
}

async function getPerformanceMetrics(supabase: any, tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return data || [];
}

async function getInventoryMetrics(supabase: any) {
  const { data, error } = await supabase
    .from('materials_inventory')
    .select('*');

  return data || [];
}

function calculateEfficiency(procedureMetrics: any[], labMetrics: any[]) {
  const completedProcedures = procedureMetrics.filter(p => p.status === 'COMPLETED').length;
  const totalProcedures = procedureMetrics.length;
  
  const completedJobs = labMetrics.filter(j => j.status === 'COMPLETED').length;
  const totalJobs = labMetrics.length;
  
  return ((completedProcedures + completedJobs) / (totalProcedures + totalJobs)) || 0;
}

function calculateResourceUtilization(materialMetrics: any[]) {
  const lowStockItems = materialMetrics.filter(m => m.current_stock <= m.minimum_threshold).length;
  const totalItems = materialMetrics.length;
  
  return 1 - (lowStockItems / totalItems);
}

function analyzeQualityTrends(procedureMetrics: any[]) {
  const avgConfidence = procedureMetrics
    .filter(p => p.confidence_score)
    .reduce((acc, p) => acc + p.confidence_score, 0) / procedureMetrics.length;
    
  return {
    average_confidence: avgConfidence || 0,
    trend: avgConfidence > 0.8 ? 'IMPROVING' : 'NEEDS_ATTENTION',
    quality_score: avgConfidence * 100
  };
}

function assessGrowthPotential(procedureMetrics: any[], labMetrics: any[]) {
  const monthlyGrowth = calculateMonthlyGrowth(procedureMetrics);
  return {
    monthly_growth_rate: monthlyGrowth,
    capacity_utilization: calculateCapacityUtilization(labMetrics),
    market_expansion_potential: monthlyGrowth > 0.1 ? 'HIGH' : 'MEDIUM'
  };
}

function calculateMonthlyGrowth(metrics: any[]) {
  // Simplified growth calculation
  const thisMonth = metrics.filter(m => 
    new Date(m.created_at).getMonth() === new Date().getMonth()
  ).length;
  
  const lastMonth = metrics.filter(m => 
    new Date(m.created_at).getMonth() === new Date().getMonth() - 1
  ).length;
  
  return lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : 0;
}

function calculateCapacityUtilization(labMetrics: any[]) {
  const activeJobs = labMetrics.filter(j => j.status === 'IN_PROGRESS').length;
  const maxCapacity = 10; // Assumed max capacity
  
  return activeJobs / maxCapacity;
}

function calculateROIImpact(cost: number) {
  return {
    short_term: -cost * 0.2,
    medium_term: cost * 0.5,
    long_term: cost * 1.5
  };
}

async function generateOperationalDashboard(supabase: any) {
  const [procedureStats, labStats, materialStats, riskStats] = await Promise.all([
    getPerformanceMetrics(supabase, 'procedure_event_log'),
    getPerformanceMetrics(supabase, 'lab_production_queue'),
    getInventoryMetrics(supabase),
    getRecentRiskReports(supabase)
  ]);

  return {
    summary: {
      total_procedures: procedureStats.length,
      active_lab_jobs: labStats.filter(j => j.status === 'IN_PROGRESS').length,
      material_alerts: materialStats.filter(m => m.current_stock <= m.minimum_threshold).length,
      high_risk_alerts: riskStats.filter(r => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL').length
    },
    performance: {
      efficiency: calculateEfficiency(procedureStats, labStats),
      quality_score: analyzeQualityTrends(procedureStats).quality_score,
      resource_utilization: calculateResourceUtilization(materialStats)
    },
    trends: {
      growth: assessGrowthPotential(procedureStats, labStats),
      risk_trend: calculateRiskTrend(riskStats)
    }
  };
}

async function getRecentRiskReports(supabase: any) {
  const { data, error } = await supabase
    .from('analysis_reports')
    .select('*')
    .gte('generated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  return data || [];
}

function calculateRiskTrend(riskStats: any[]) {
  const highRiskCount = riskStats.filter(r => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL').length;
  const totalReports = riskStats.length;
  
  return {
    risk_percentage: totalReports > 0 ? (highRiskCount / totalReports) * 100 : 0,
    trend: highRiskCount > totalReports * 0.3 ? 'INCREASING' : 'STABLE'
  };
}

async function emitToStrategicOps(event: string, data: any) {
  // In a real implementation, this would use WebSocket or Supabase realtime
  console.log(`CEO Event: ${event}`, data);
}