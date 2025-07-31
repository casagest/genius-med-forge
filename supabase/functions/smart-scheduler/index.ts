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
  patient_id: string | null;
  priority: number;
  estimated_duration: string | null;
  status: string;
  material_requirements: any;
  machine_assignment: string | null;
  created_at: string;
  updated_at: string;
  patient_eta?: string;
  is_urgent?: boolean;
}

interface SchedulingWeights {
  TIME_TO_ETA: number;
  JOB_DURATION: number;
  IS_URGENT: number;
  MATERIAL_AVAILABILITY: number;
  MACHINE_AVAILABILITY: number;
}

// Enhanced weights for lab production scheduling
const WEIGHTS: SchedulingWeights = {
  TIME_TO_ETA: 0.4,           // Patient urgency
  JOB_DURATION: 0.15,         // Shorter jobs get slight bonus
  IS_URGENT: 1.0,             // Manual urgency override
  MATERIAL_AVAILABILITY: 0.25, // Material stock levels
  MACHINE_AVAILABILITY: 0.2   // Machine capacity and status
};

class SmartSchedulingService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Calculate priority score for a production job
   */
  public calculatePriorityScore(
    job: ProductionJob, 
    materialAvailability: Record<string, number> = {},
    machineStatus: Record<string, string> = {}
  ): number {
    // Manual urgency always takes precedence
    if (job.is_urgent) {
      return 1000;
    }

    let score = 0;

    // 1. Time to ETA scoring
    if (job.patient_eta) {
      const now = new Date().getTime();
      const eta = new Date(job.patient_eta).getTime();
      const hoursToEta = Math.max(0.1, (eta - now) / (1000 * 60 * 60));
      
      // Inverse relationship: closer ETA = higher score
      const etaScore = (1 / hoursToEta) * 100;
      score += etaScore * WEIGHTS.TIME_TO_ETA;
    }

    // 2. Job duration scoring (shorter jobs get bonus)
    if (job.estimated_duration) {
      const durationMinutes = this.parseDurationToMinutes(job.estimated_duration);
      const durationScore = (1 / Math.max(durationMinutes, 10)) * 50;
      score += durationScore * WEIGHTS.JOB_DURATION;
    }

    // 3. Material availability scoring
    const materialScore = this.calculateMaterialAvailabilityScore(job, materialAvailability);
    score += materialScore * WEIGHTS.MATERIAL_AVAILABILITY;

    // 4. Machine availability scoring
    const machineScore = this.calculateMachineAvailabilityScore(job, machineStatus);
    score += machineScore * WEIGHTS.MACHINE_AVAILABILITY;

    // 5. Base priority from job
    score += (job.priority || 1) * 10;

    return parseFloat(score.toFixed(2));
  }

  /**
   * Calculate material availability score
   */
  private calculateMaterialAvailabilityScore(
    job: ProductionJob, 
    materialAvailability: Record<string, number>
  ): number {
    if (!job.material_requirements || Object.keys(job.material_requirements).length === 0) {
      return 50; // Neutral score if no materials required
    }

    let totalScore = 0;
    let materialCount = 0;

    for (const [materialName, requiredAmount] of Object.entries(job.material_requirements)) {
      const availableAmount = materialAvailability[materialName] || 0;
      const availabilityRatio = Math.min(availableAmount / (requiredAmount as number), 1);
      totalScore += availabilityRatio * 100;
      materialCount++;
    }

    return materialCount > 0 ? totalScore / materialCount : 50;
  }

  /**
   * Calculate machine availability score
   */
  private calculateMachineAvailabilityScore(
    job: ProductionJob, 
    machineStatus: Record<string, string>
  ): number {
    if (!job.machine_assignment) {
      return 70; // Neutral score if no specific machine required
    }

    const status = machineStatus[job.machine_assignment];
    switch (status) {
      case 'AVAILABLE':
        return 100;
      case 'BUSY':
        return 30;
      case 'MAINTENANCE':
        return 0;
      default:
        return 50;
    }
  }

  /**
   * Parse duration string to minutes
   */
  private parseDurationToMinutes(duration: string): number {
    const match = duration.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    if (!match) return 60; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.includes('hour') || unit.includes('hr')) {
      return value * 60;
    }
    return value;
  }

  /**
   * Get optimized production schedule
   */
  public async getOptimizedSchedule(): Promise<{
    optimizedJobs: ProductionJob[];
    analytics: any;
  }> {
    // Fetch pending jobs
    const { data: jobs, error: jobsError } = await this.supabase
      .from('lab_production_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    // Fetch material availability
    const { data: materials, error: materialsError } = await this.supabase
      .from('lab_materials')
      .select('material_name, current_stock');

    if (materialsError) {
      throw new Error(`Failed to fetch materials: ${materialsError.message}`);
    }

    const materialAvailability = materials.reduce((acc: Record<string, number>, material: any) => {
      acc[material.material_name] = material.current_stock;
      return acc;
    }, {});

    // Mock machine status (could be fetched from a machines table)
    const machineStatus = {
      'Machine-A': 'AVAILABLE',
      'Machine-B': 'BUSY',
      'Machine-C': 'AVAILABLE',
      'Machine-D': 'MAINTENANCE'
    };

    // Calculate scores and sort
    const scoredJobs = jobs.map((job: ProductionJob) => ({
      ...job,
      priority_score: this.calculatePriorityScore(job, materialAvailability, machineStatus)
    }));

    scoredJobs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    // Update scores in database
    const updatePromises = scoredJobs.map(job => 
      this.supabase
        .from('lab_production_queue')
        .update({ priority: job.priority_score })
        .eq('id', job.id)
    );

    await Promise.all(updatePromises);

    // Calculate analytics
    const analytics = {
      totalJobs: scoredJobs.length,
      highPriorityJobs: scoredJobs.filter(job => (job.priority_score || 0) > 100).length,
      materialConstrainedJobs: scoredJobs.filter(job => {
        const materialScore = this.calculateMaterialAvailabilityScore(job, materialAvailability);
        return materialScore < 50;
      }).length,
      averageScore: scoredJobs.reduce((sum, job) => sum + (job.priority_score || 0), 0) / scoredJobs.length,
      optimizationRecommendations: this.generateRecommendations(scoredJobs, materialAvailability, machineStatus)
    };

    return { optimizedJobs: scoredJobs, analytics };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    jobs: ProductionJob[], 
    materialAvailability: Record<string, number>, 
    machineStatus: Record<string, string>
  ): string[] {
    const recommendations: string[] = [];

    // Check for material shortages
    const materialConstrainedJobs = jobs.filter(job => {
      const materialScore = this.calculateMaterialAvailabilityScore(job, materialAvailability);
      return materialScore < 50;
    });

    if (materialConstrainedJobs.length > 0) {
      recommendations.push(`${materialConstrainedJobs.length} jobs are constrained by material availability. Consider reordering critical materials.`);
    }

    // Check for machine bottlenecks
    const busyMachines = Object.entries(machineStatus).filter(([_, status]) => status === 'BUSY').length;
    if (busyMachines > 2) {
      recommendations.push('Multiple machines are busy. Consider redistributing workload or scheduling maintenance during off-peak hours.');
    }

    // Check for urgent jobs
    const urgentJobs = jobs.filter(job => job.is_urgent || (job.priority_score || 0) > 200);
    if (urgentJobs.length > 0) {
      recommendations.push(`${urgentJobs.length} high-priority jobs detected. Ensure adequate resources are allocated.`);
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

    const requestBody = await req.json();
    
    // Input validation
    if (!requestBody || typeof requestBody !== 'object') {
      return new Response(JSON.stringify({ 
        error: 'Invalid request body' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { event, data } = requestBody;
    
    // Validate event type
    const validEvents = ['optimize_schedule', 'calculate_job_score'];
    if (!event || !validEvents.includes(event)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid or missing event type' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const scheduler = new SmartSchedulingService(supabaseClient);

    switch (event) {
      case 'optimize_schedule':
        const result = await scheduler.getOptimizedSchedule();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'calculate_job_score':
        const { job, materialAvailability, machineStatus } = data;
        const score = scheduler.calculatePriorityScore(job, materialAvailability, machineStatus);
        return new Response(JSON.stringify({ score }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in smart-scheduler function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});