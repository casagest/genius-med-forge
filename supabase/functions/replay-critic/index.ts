// ReplayCritic - Post-Procedure Analysis and Learning System
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      case 'analyze_procedure': {
        const { event_id } = data;
        
        // Get procedure event details
        const { data: procedureEvent, error } = await supabase
          .from('procedure_event_log')
          .select(`
            *,
            patients (patient_code, medical_history),
            digital_twins (mesh_data, ai_analysis, confidence_score)
          `)
          .eq('id', event_id)
          .single();

        if (error) throw error;

        // Perform ReplayCritic analysis
        const analysis = await performReplayCriticAnalysis(procedureEvent);
        
        // Save analysis
        const { data: savedAnalysis, error: saveError } = await supabase
          .from('replay_critic_analysis')
          .insert({
            procedure_event_id: event_id,
            performance_score: analysis.performance_score,
            improvement_suggestions: analysis.improvement_suggestions,
            risk_factors: analysis.risk_factors,
            learning_points: analysis.learning_points,
            generated_by: 'ReplayCritic_AI_v2.1',
            metadata: analysis.metadata
          })
          .select()
          .single();

        if (saveError) throw saveError;

        // Trigger CEO report if significant issues found
        if (analysis.performance_score < 0.7) {
          await triggerCEOAlert(analysis, procedureEvent);
        }

        return new Response(JSON.stringify({
          success: true,
          analysis: savedAnalysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_learning_insights': {
        const { patient_id, procedure_type, limit = 10 } = data;
        
        let query = supabase
          .from('replay_critic_analysis')
          .select(`
            *,
            procedure_event_log (
              procedure_id,
              event_type,
              patient_id,
              patients (patient_code)
            )
          `)
          .order('analysis_timestamp', { ascending: false })
          .limit(limit);

        if (patient_id) {
          query = query.eq('procedure_event_log.patient_id', patient_id);
        }

        const { data: insights, error } = await query;

        if (error) throw error;

        // Aggregate learning insights
        const aggregatedInsights = aggregateLearningPoints(insights);

        return new Response(JSON.stringify({
          success: true,
          insights: aggregatedInsights,
          raw_data: insights
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown event type: ${event}`);
    }

  } catch (error) {
    console.error('ReplayCritic Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performReplayCriticAnalysis(procedureEvent: any) {
  const analysisStart = performance.now();
  
  // Analyze procedure performance
  const performanceMetrics = analyzePerformanceMetrics(procedureEvent);
  const qualityAssessment = assessQuality(procedureEvent);
  const riskAssessment = identifyRiskFactors(procedureEvent);
  const learningPoints = extractLearningPoints(procedureEvent, performanceMetrics);
  
  // Calculate overall performance score
  const performanceScore = calculatePerformanceScore(
    performanceMetrics,
    qualityAssessment,
    riskAssessment
  );

  const analysisEnd = performance.now();

  return {
    performance_score: performanceScore,
    improvement_suggestions: generateImprovementSuggestions(performanceMetrics, qualityAssessment),
    risk_factors: riskAssessment.factors,
    learning_points: learningPoints,
    metadata: {
      analysis_duration_ms: analysisEnd - analysisStart,
      ai_model_version: 'ReplayCritic_v2.1',
      confidence_threshold: 0.85,
      data_quality_score: assessDataQuality(procedureEvent),
      comparative_analysis: performComparativeAnalysis(procedureEvent)
    }
  };
}

function analyzePerformanceMetrics(procedureEvent: any) {
  const eventData = procedureEvent.event_data || {};
  
  return {
    timeline_adherence: calculateTimelineAdherence(eventData),
    precision_score: calculatePrecisionScore(eventData),
    resource_efficiency: calculateResourceEfficiency(eventData),
    protocol_compliance: assessProtocolCompliance(eventData),
    patient_comfort: assessPatientComfort(eventData)
  };
}

function assessQuality(procedureEvent: any) {
  const digitalTwin = procedureEvent.digital_twins?.[0];
  const aiAnalysis = digitalTwin?.ai_analysis || {};
  
  return {
    digital_twin_accuracy: digitalTwin?.confidence_score || 0,
    measurement_precision: aiAnalysis.measurement_accuracy || 0,
    surface_quality: aiAnalysis.surface_analysis?.quality_score || 0,
    dimensional_accuracy: aiAnalysis.dimensional_check?.accuracy || 0,
    material_integrity: aiAnalysis.material_analysis?.integrity_score || 0
  };
}

function identifyRiskFactors(procedureEvent: any) {
  const riskFactors = [];
  const eventData = procedureEvent.event_data || {};
  
  if (eventData.complications) {
    riskFactors.push({
      type: 'CLINICAL_COMPLICATION',
      severity: 'HIGH',
      description: 'Complications detected during procedure',
      mitigation: 'Review clinical protocols and patient preparation'
    });
  }
  
  if (eventData.duration_exceeded) {
    riskFactors.push({
      type: 'TIMELINE_DEVIATION',
      severity: 'MEDIUM',
      description: 'Procedure duration exceeded planned time',
      mitigation: 'Optimize workflow and consider additional training'
    });
  }
  
  if (procedureEvent.confidence_score < 0.7) {
    riskFactors.push({
      type: 'AI_CONFIDENCE_LOW',
      severity: 'MEDIUM',
      description: 'AI confidence below acceptable threshold',
      mitigation: 'Manual review required, consider additional data collection'
    });
  }

  return {
    factors: riskFactors,
    overall_risk: calculateOverallRisk(riskFactors),
    mitigation_priority: prioritizeMitigation(riskFactors)
  };
}

function extractLearningPoints(procedureEvent: any, performanceMetrics: any) {
  const learningPoints = [];
  
  if (performanceMetrics.timeline_adherence < 0.8) {
    learningPoints.push({
      category: 'WORKFLOW_OPTIMIZATION',
      insight: 'Timeline management needs improvement',
      actionable_advice: 'Consider breaking complex procedures into smaller phases',
      evidence: `Timeline adherence: ${(performanceMetrics.timeline_adherence * 100).toFixed(1)}%`
    });
  }
  
  if (performanceMetrics.precision_score > 0.9) {
    learningPoints.push({
      category: 'BEST_PRACTICE',
      insight: 'Excellent precision achieved',
      actionable_advice: 'Document and replicate this approach for similar cases',
      evidence: `Precision score: ${(performanceMetrics.precision_score * 100).toFixed(1)}%`
    });
  }
  
  return learningPoints;
}

function calculatePerformanceScore(performanceMetrics: any, qualityAssessment: any, riskAssessment: any) {
  const weights = {
    performance: 0.4,
    quality: 0.4,
    risk: 0.2
  };
  
  const avgPerformance = Object.values(performanceMetrics).reduce((a: any, b: any) => a + b, 0) / Object.keys(performanceMetrics).length;
  const avgQuality = Object.values(qualityAssessment).reduce((a: any, b: any) => a + b, 0) / Object.keys(qualityAssessment).length;
  const riskPenalty = riskAssessment.overall_risk === 'HIGH' ? 0.3 : riskAssessment.overall_risk === 'MEDIUM' ? 0.1 : 0;
  
  const score = (avgPerformance * weights.performance) + 
                (avgQuality * weights.quality) - 
                (riskPenalty * weights.risk);
  
  return Math.max(0, Math.min(1, score));
}

function generateImprovementSuggestions(performanceMetrics: any, qualityAssessment: any) {
  const suggestions = [];
  
  if (performanceMetrics.timeline_adherence < 0.8) {
    suggestions.push({
      priority: 'HIGH',
      category: 'WORKFLOW',
      suggestion: 'Implement time management protocols',
      expected_improvement: '15-20% reduction in procedure time',
      implementation_effort: 'MEDIUM'
    });
  }
  
  if (qualityAssessment.digital_twin_accuracy < 0.85) {
    suggestions.push({
      priority: 'HIGH',
      category: 'TECHNOLOGY',
      suggestion: 'Enhance digital twin calibration',
      expected_improvement: '10-15% increase in accuracy',
      implementation_effort: 'LOW'
    });
  }
  
  if (performanceMetrics.resource_efficiency < 0.8) {
    suggestions.push({
      priority: 'MEDIUM',
      category: 'RESOURCE_MANAGEMENT',
      suggestion: 'Optimize material usage and tool selection',
      expected_improvement: '10-12% cost reduction',
      implementation_effort: 'LOW'
    });
  }
  
  return suggestions;
}

// Helper functions
function calculateTimelineAdherence(eventData: any) {
  const plannedDuration = eventData.planned_duration || 60;
  const actualDuration = eventData.actual_duration || 60;
  return Math.max(0, 1 - Math.abs(actualDuration - plannedDuration) / plannedDuration);
}

function calculatePrecisionScore(eventData: any) {
  return eventData.precision_measurements?.average || 0.85;
}

function calculateResourceEfficiency(eventData: any) {
  const plannedResources = eventData.planned_resources || 100;
  const actualResources = eventData.actual_resources || 100;
  return plannedResources / actualResources;
}

function assessProtocolCompliance(eventData: any) {
  return eventData.protocol_adherence || 0.9;
}

function assessPatientComfort(eventData: any) {
  return eventData.patient_comfort_score || 0.8;
}

function calculateOverallRisk(riskFactors: any[]) {
  if (riskFactors.some(f => f.severity === 'HIGH')) return 'HIGH';
  if (riskFactors.some(f => f.severity === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function prioritizeMitigation(riskFactors: any[]) {
  return riskFactors
    .sort((a, b) => {
      const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })
    .slice(0, 3); // Top 3 priorities
}

function assessDataQuality(procedureEvent: any) {
  let score = 0.5; // Base score
  
  if (procedureEvent.event_data) score += 0.2;
  if (procedureEvent.digital_twins?.length > 0) score += 0.2;
  if (procedureEvent.confidence_score) score += 0.1;
  
  return Math.min(1, score);
}

function performComparativeAnalysis(procedureEvent: any) {
  // In a real implementation, this would compare against historical data
  return {
    similar_cases_analyzed: 25,
    performance_percentile: 75,
    best_practice_alignment: 0.82,
    deviation_from_standard: 0.15
  };
}

function aggregateLearningPoints(insights: any[]) {
  const categories = {};
  const commonIssues = {};
  const bestPractices = {};
  
  insights.forEach(insight => {
    insight.learning_points.forEach((point: any) => {
      if (!categories[point.category]) {
        categories[point.category] = [];
      }
      categories[point.category].push(point);
      
      if (point.category === 'BEST_PRACTICE') {
        bestPractices[point.insight] = (bestPractices[point.insight] || 0) + 1;
      } else {
        commonIssues[point.insight] = (commonIssues[point.insight] || 0) + 1;
      }
    });
  });
  
  return {
    learning_categories: categories,
    most_common_issues: Object.entries(commonIssues)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5),
    best_practices: Object.entries(bestPractices)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5),
    total_insights: insights.length,
    analysis_period: {
      from: insights[insights.length - 1]?.analysis_timestamp,
      to: insights[0]?.analysis_timestamp
    }
  };
}

async function triggerCEOAlert(analysis: any, procedureEvent: any) {
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/agent-ceo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'ceo:new_risk_report',
      data: {
        event_id: procedureEvent.id,
        risk_level: 'HIGH',
        rationale: {
          source: 'ReplayCritic',
          performance_score: analysis.performance_score,
          key_issues: analysis.improvement_suggestions.filter((s: any) => s.priority === 'HIGH')
        }
      }
    })
  });
}