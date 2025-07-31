import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductionEventLog {
  id: string;
  job_id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface QualityMetric {
  metric_name: string;
  value: number;
  threshold: number;
  status: 'pass' | 'fail' | 'warning';
}

interface AnalysisReport {
  job_id: string;
  report_type: 'QUALITY' | 'RISK' | 'EFFICIENCY' | 'COMPLIANCE';
  risk_score: number;
  confidence_score: number;
  ai_rationale: string;
  requires_action: boolean;
  quality_metrics: QualityMetric[];
  recommendations: string[];
  generated_at: string;
}

class ReplayCriticService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Analyze a completed production job
   */
  public async analyzeProductionJob(jobId: string): Promise<AnalysisReport> {
    // Fetch job details and events
    const [jobDetails, eventLogs] = await Promise.all([
      this.fetchJobDetails(jobId),
      this.fetchJobEventLogs(jobId)
    ]);

    if (!jobDetails) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Perform comprehensive analysis
    const riskScore = this.calculateRiskScore(eventLogs, jobDetails);
    const qualityMetrics = this.analyzeQualityMetrics(eventLogs, jobDetails);
    const confidenceScore = this.calculateConfidenceScore(eventLogs);
    const aiRationale = this.generateAIRationale(eventLogs, qualityMetrics, riskScore);
    const recommendations = this.generateRecommendations(eventLogs, qualityMetrics, riskScore);
    const requiresAction = this.determineActionRequired(riskScore, qualityMetrics);

    const report: AnalysisReport = {
      job_id: jobId,
      report_type: this.determineReportType(riskScore, qualityMetrics),
      risk_score: riskScore,
      confidence_score: confidenceScore,
      ai_rationale: aiRationale,
      requires_action: requiresAction,
      quality_metrics: qualityMetrics,
      recommendations: recommendations,
      generated_at: new Date().toISOString()
    };

    // Save the analysis report
    await this.saveAnalysisReport(report);

    return report;
  }

  /**
   * Fetch job details
   */
  private async fetchJobDetails(jobId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('lab_production_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job details:', error);
      return null;
    }

    return data;
  }

  /**
   * Fetch job event logs (simulated for now)
   */
  private async fetchJobEventLogs(jobId: string): Promise<ProductionEventLog[]> {
    // In a real system, this would fetch from a production_event_logs table
    // For now, we'll simulate based on job characteristics
    return this.simulateEventLogs(jobId);
  }

  /**
   * Simulate event logs for demonstration
   */
  private simulateEventLogs(jobId: string): ProductionEventLog[] {
    const events: ProductionEventLog[] = [];
    const baseTime = new Date();

    // Simulate typical production events
    events.push({
      id: `${jobId}-start`,
      job_id: jobId,
      event_type: 'job_started',
      event_data: { machine: 'CAD_CAM_1', operator: 'operator_01' },
      timestamp: new Date(baseTime.getTime() - 120 * 60000).toISOString(),
      severity: 'info'
    });

    events.push({
      id: `${jobId}-setup`,
      job_id: jobId,
      event_type: 'material_loaded',
      event_data: { material: 'Titanium Dioxide', quantity: 50 },
      timestamp: new Date(baseTime.getTime() - 110 * 60000).toISOString(),
      severity: 'info'
    });

    // Add some quality events
    events.push({
      id: `${jobId}-quality`,
      job_id: jobId,
      event_type: 'quality_check',
      event_data: { 
        dimensional_accuracy: 0.95, 
        surface_finish: 0.88, 
        material_integrity: 0.92 
      },
      timestamp: new Date(baseTime.getTime() - 60 * 60000).toISOString(),
      severity: 'info'
    });

    // Randomly add some issues for demonstration
    if (Math.random() > 0.7) {
      events.push({
        id: `${jobId}-issue`,
        job_id: jobId,
        event_type: 'surface_defect_detected',
        event_data: { 
          defect_type: 'minor_scratching', 
          affected_area: 0.15,
          severity: 'minor'
        },
        timestamp: new Date(baseTime.getTime() - 45 * 60000).toISOString(),
        severity: 'warning'
      });
    }

    if (Math.random() > 0.85) {
      events.push({
        id: `${jobId}-critical`,
        job_id: jobId,
        event_type: 'dimensional_tolerance_exceeded',
        event_data: { 
          expected: 0.1, 
          actual: 0.15, 
          tolerance: 0.05 
        },
        timestamp: new Date(baseTime.getTime() - 30 * 60000).toISOString(),
        severity: 'error'
      });
    }

    events.push({
      id: `${jobId}-complete`,
      job_id: jobId,
      event_type: 'job_completed',
      event_data: { 
        total_duration: 120, 
        final_quality_score: 0.91,
        pass_status: true
      },
      timestamp: baseTime.toISOString(),
      severity: 'info'
    });

    return events;
  }

  /**
   * Calculate risk score based on events and job details
   */
  private calculateRiskScore(events: ProductionEventLog[], jobDetails: any): number {
    let riskScore = 1.0; // Start with perfect score

    // Analyze critical events
    const criticalEvents = events.filter(e => e.severity === 'critical');
    const errorEvents = events.filter(e => e.severity === 'error');
    const warningEvents = events.filter(e => e.severity === 'warning');

    // Deduct points for severity
    riskScore -= criticalEvents.length * 0.3;
    riskScore -= errorEvents.length * 0.2;
    riskScore -= warningEvents.length * 0.1;

    // Specific event type analysis
    events.forEach(event => {
      switch (event.event_type) {
        case 'dimensional_tolerance_exceeded':
          riskScore -= 0.25;
          break;
        case 'material_contamination':
          riskScore -= 0.20;
          break;
        case 'surface_defect_detected':
          const severity = event.event_data?.severity || 'minor';
          riskScore -= severity === 'major' ? 0.15 : 0.05;
          break;
        case 'machine_overheating':
          riskScore -= 0.10;
          break;
      }
    });

    // Analyze quality metrics from final event
    const finalEvent = events.find(e => e.event_type === 'job_completed');
    if (finalEvent?.event_data?.final_quality_score) {
      const qualityScore = finalEvent.event_data.final_quality_score;
      if (qualityScore < 0.8) {
        riskScore -= (0.8 - qualityScore) * 0.5;
      }
    }

    return Math.max(0, Math.min(1, riskScore));
  }

  /**
   * Analyze quality metrics
   */
  private analyzeQualityMetrics(events: ProductionEventLog[], jobDetails: any): QualityMetric[] {
    const metrics: QualityMetric[] = [];

    // Extract quality data from events
    const qualityEvents = events.filter(e => 
      e.event_type === 'quality_check' || e.event_type === 'job_completed'
    );

    qualityEvents.forEach(event => {
      const data = event.event_data;
      
      if (data.dimensional_accuracy !== undefined) {
        metrics.push({
          metric_name: 'Dimensional Accuracy',
          value: data.dimensional_accuracy,
          threshold: 0.9,
          status: data.dimensional_accuracy >= 0.9 ? 'pass' : 
                  data.dimensional_accuracy >= 0.8 ? 'warning' : 'fail'
        });
      }

      if (data.surface_finish !== undefined) {
        metrics.push({
          metric_name: 'Surface Finish Quality',
          value: data.surface_finish,
          threshold: 0.85,
          status: data.surface_finish >= 0.85 ? 'pass' : 
                  data.surface_finish >= 0.75 ? 'warning' : 'fail'
        });
      }

      if (data.material_integrity !== undefined) {
        metrics.push({
          metric_name: 'Material Integrity',
          value: data.material_integrity,
          threshold: 0.9,
          status: data.material_integrity >= 0.9 ? 'pass' : 
                  data.material_integrity >= 0.8 ? 'warning' : 'fail'
        });
      }
    });

    return metrics;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(events: ProductionEventLog[]): number {
    // More events = higher confidence in analysis
    const eventCount = events.length;
    const qualityCheckCount = events.filter(e => e.event_type === 'quality_check').length;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence with more data points
    confidence += Math.min(0.3, eventCount * 0.05);
    confidence += Math.min(0.2, qualityCheckCount * 0.1);
    
    return Math.min(1, confidence);
  }

  /**
   * Generate AI rationale
   */
  private generateAIRationale(
    events: ProductionEventLog[], 
    qualityMetrics: QualityMetric[], 
    riskScore: number
  ): string {
    const issues: string[] = [];
    const positives: string[] = [];

    // Analyze events for issues
    events.forEach(event => {
      switch (event.event_type) {
        case 'dimensional_tolerance_exceeded':
          issues.push('Dimensional tolerance exceeded specification limits');
          break;
        case 'surface_defect_detected':
          issues.push(`Surface defect detected: ${event.event_data?.defect_type || 'unknown type'}`);
          break;
        case 'material_contamination':
          issues.push('Material contamination detected during production');
          break;
        case 'machine_overheating':
          issues.push('Machine overheating event recorded');
          break;
      }
    });

    // Analyze quality metrics
    qualityMetrics.forEach(metric => {
      if (metric.status === 'fail') {
        issues.push(`${metric.metric_name} below acceptable threshold (${metric.value.toFixed(2)} < ${metric.threshold})`);
      } else if (metric.status === 'pass' && metric.value > metric.threshold + 0.05) {
        positives.push(`Excellent ${metric.metric_name} (${metric.value.toFixed(2)})`);
      }
    });

    // Generate summary
    let rationale = '';
    
    if (riskScore >= 0.9) {
      rationale = 'Production completed successfully with excellent quality metrics. ';
    } else if (riskScore >= 0.7) {
      rationale = 'Production completed with minor quality concerns. ';
    } else {
      rationale = 'Production completed with significant quality issues requiring attention. ';
    }

    if (positives.length > 0) {
      rationale += `Strengths: ${positives.join(', ')}. `;
    }

    if (issues.length > 0) {
      rationale += `Issues identified: ${issues.join(', ')}. `;
    }

    return rationale.trim();
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    events: ProductionEventLog[], 
    qualityMetrics: QualityMetric[], 
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskScore < 0.7) {
      recommendations.push('Immediate quality review required before releasing product');
      recommendations.push('Consider rework or reproduction of affected items');
    } else if (riskScore < 0.8) {
      recommendations.push('Enhanced quality inspection recommended');
    }

    // Event-specific recommendations
    const dimensionalIssues = events.filter(e => e.event_type === 'dimensional_tolerance_exceeded');
    if (dimensionalIssues.length > 0) {
      recommendations.push('Review machine calibration and tooling wear');
      recommendations.push('Implement more frequent dimensional checks');
    }

    const surfaceDefects = events.filter(e => e.event_type === 'surface_defect_detected');
    if (surfaceDefects.length > 0) {
      recommendations.push('Inspect cutting tools and replace if worn');
      recommendations.push('Review surface finishing parameters');
    }

    // Quality metric recommendations
    const failedMetrics = qualityMetrics.filter(m => m.status === 'fail');
    if (failedMetrics.length > 0) {
      recommendations.push('Process parameter optimization required');
      recommendations.push('Additional operator training may be beneficial');
    }

    // Generic recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('Continue current production parameters');
      recommendations.push('Monitor for consistency in future production runs');
    }

    return recommendations;
  }

  /**
   * Determine if action is required
   */
  private determineActionRequired(riskScore: number, qualityMetrics: QualityMetric[]): boolean {
    if (riskScore < 0.8) return true;
    if (qualityMetrics.some(m => m.status === 'fail')) return true;
    return false;
  }

  /**
   * Determine report type
   */
  private determineReportType(riskScore: number, qualityMetrics: QualityMetric[]): 'QUALITY' | 'RISK' | 'EFFICIENCY' | 'COMPLIANCE' {
    if (riskScore < 0.7) return 'RISK';
    if (qualityMetrics.some(m => m.status === 'fail')) return 'QUALITY';
    return 'EFFICIENCY';
  }

  /**
   * Save analysis report
   */
  private async saveAnalysisReport(report: AnalysisReport): Promise<void> {
    const { error } = await this.supabase
      .from('analysis_reports')
      .insert({
        report_type: report.report_type,
        risk_level: report.risk_score > 0.8 ? 'low' : report.risk_score > 0.6 ? 'medium' : 'high',
        confidence_score: report.confidence_score,
        analysis_data: {
          job_id: report.job_id,
          ai_rationale: report.ai_rationale,
          quality_metrics: report.quality_metrics,
          recommendations: report.recommendations
        },
        requires_action: report.requires_action
      });

    if (error) {
      console.error('Error saving analysis report:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple completed jobs (batch analysis)
   */
  public async batchAnalyzeJobs(jobIds: string[]): Promise<AnalysisReport[]> {
    const reports: AnalysisReport[] = [];
    
    for (const jobId of jobIds) {
      try {
        const report = await this.analyzeProductionJob(jobId);
        reports.push(report);
      } catch (error) {
        console.error(`Error analyzing job ${jobId}:`, error);
      }
    }
    
    return reports;
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
    const criticService = new ReplayCriticService(supabaseClient);

    switch (event) {
      case 'analyze_job':
        const { jobId } = data;
        const report = await criticService.analyzeProductionJob(jobId);
        return new Response(JSON.stringify({ report }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'batch_analyze':
        const { jobIds } = data;
        const reports = await criticService.batchAnalyzeJobs(jobIds);
        return new Response(JSON.stringify({ reports }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in replay-critic function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});