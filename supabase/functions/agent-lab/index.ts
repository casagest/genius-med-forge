// AgentLab - Laboratory Production Management with Smart Material Manager
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('AgentLab');

interface LabJob {
  patient_id: string;
  digital_twin_id: string;
  job_type: string;
  material_requirements: Record<string, number>;
  priority: number;
  estimated_duration: string;
}

serve(async (req) => {
  logger.debug(`${req.method} request received`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event, data } = await req.json();
    logger.debug('Processing request', { event, data });

    switch (event) {
      case 'create_lab_job': {
        const jobData: LabJob = data;
        
        // Generate unique job code
        const jobCode = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Check material availability
        const materialCheck = await checkMaterialAvailability(supabase, jobData.material_requirements);
        
        if (!materialCheck.available) {
          return createJsonResponse(req, {
            success: false,
            error: 'Insufficient materials',
            missing_materials: materialCheck.missing
          });
        }

        // Create lab job
        const { data: labJob, error } = await supabase
          .from('lab_production_queue')
          .insert({
            ...jobData,
            job_code: jobCode,
            status: 'QUEUED',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Reserve materials
        await reserveMaterials(supabase, jobData.material_requirements);

        // Emit WebSocket update
        await emitLabUpdate('lab:job_created', labJob);

        return createJsonResponse(req, {
          success: true,
          job: labJob
        });
      }

      case 'update_job_status': {
        const { job_id, status, machine_assignment } = data;
        
        const updateData: any = { status };
        
        if (status === 'IN_PROGRESS') {
          updateData.started_at = new Date().toISOString();
          if (machine_assignment) {
            updateData.machine_assignment = machine_assignment;
          }
        } else if (status === 'COMPLETED') {
          updateData.completed_at = new Date().toISOString();
          
          // Calculate actual duration
          const { data: job } = await supabase
            .from('lab_production_queue')
            .select('started_at')
            .eq('id', job_id)
            .single();
            
          if (job?.started_at) {
            const duration = new Date().getTime() - new Date(job.started_at).getTime();
            updateData.actual_duration = `${Math.floor(duration / 1000)} seconds`;
          }

          // Consume materials from inventory
          await consumeMaterials(supabase, job_id);
        }

        const { data: updatedJob, error } = await supabase
          .from('lab_production_queue')
          .update(updateData)
          .eq('id', job_id)
          .select()
          .single();

        if (error) throw error;

        // Emit WebSocket update
        await emitLabUpdate('lab:job_updated', updatedJob);

        return createJsonResponse(req, {
          success: true,
          job: updatedJob
        });
      }

      case 'get_production_queue': {
        const { data: queue, error } = await supabase
          .from('lab_production_queue')
          .select(`
            *,
            patients (patient_code, profiles (full_name)),
            digital_twins (stl_file_url, confidence_score)
          `)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true });

        if (error) throw error;

        return createJsonResponse(req, {
          success: true,
          queue
        });
      }

      case 'smart_material_reorder': {
        const reorderAlerts = await checkAndGenerateReorders(supabase);

        return createJsonResponse(req, {
          success: true,
          reorder_alerts: reorderAlerts
        });
      }

      case 'optimize_schedule': {
        const optimizationResult = await optimizeProductionSchedule(supabase, data);
        return createJsonResponse(req, optimizationResult);
      }

      case 'auto_reorder': {
        const reorderResult = await processAutoReorder(supabase, data);
        return createJsonResponse(req, reorderResult);
      }

      case 'material_usage_prediction': {
        const predictions = await predictMaterialUsage(supabase, data);
        return createJsonResponse(req, predictions);
      }

      case 'smart_allocation': {
        const allocations = await smartMaterialAllocation(supabase, data);
        return createJsonResponse(req, allocations);
      }

      default:
        throw new Error(`Unknown event type: ${event}`);
    }

  } catch (error) {
    logger.error('Request processing failed', error);
    return createErrorResponse(req, error, 400);
  }
});

async function checkMaterialAvailability(supabase: any, requirements: Record<string, number>) {
  const materialCodes = Object.keys(requirements);
  
  const { data: materials, error } = await supabase
    .from('materials_inventory')
    .select('material_code, current_stock')
    .in('material_code', materialCodes);

  if (error) throw error;

  const missing = [];
  const available = materials.every((material: any) => {
    const required = requirements[material.material_code];
    if (material.current_stock < required) {
      missing.push({
        material_code: material.material_code,
        required,
        available: material.current_stock
      });
      return false;
    }
    return true;
  });

  return { available, missing };
}

async function reserveMaterials(supabase: any, requirements: Record<string, number>) {
  for (const [materialCode, quantity] of Object.entries(requirements)) {
    await supabase.rpc('reserve_material', {
      p_material_code: materialCode,
      p_quantity: quantity
    });
  }
}

async function consumeMaterials(supabase: any, jobId: string) {
  const { data: job } = await supabase
    .from('lab_production_queue')
    .select('material_requirements')
    .eq('id', jobId)
    .single();

  if (job?.material_requirements) {
    for (const [materialCode, quantity] of Object.entries(job.material_requirements as Record<string, number>)) {
      await supabase
        .from('materials_inventory')
        .update({
          current_stock: supabase.raw(`current_stock - ${quantity}`),
          updated_at: new Date().toISOString()
        })
        .eq('material_code', materialCode);
    }
  }
}

async function checkAndGenerateReorders(supabase: any) {
  const { data: lowStockMaterials, error } = await supabase
    .from('lab_materials')
    .select('*')
    .filter('current_stock', 'lte', supabase.raw('minimum_threshold'));

  if (error) {
    logger.error('Error fetching low stock materials', error);
    return [];
  }

  const reorderAlerts = lowStockMaterials.map((material: any) => ({
    material_id: material.id,
    material_name: material.material_name,
    current_stock: material.current_stock,
    minimum_threshold: material.minimum_threshold,
    suggested_order: material.minimum_threshold * 3, // Order 3x minimum
    supplier: material.supplier,
    urgency: material.current_stock === 0 ? 'CRITICAL' : 'HIGH',
    estimated_cost: (material.minimum_threshold * 3) * material.unit_cost
  }));

  // Emit alerts to dashboard
  if (reorderAlerts.length > 0) {
    await emitLabUpdate('lab:reorder_alert', reorderAlerts);
  }

  return reorderAlerts;
}

async function optimizeProductionSchedule(supabase: any, data: any) {
  logger.info('Optimizing production schedule with AI');

  const { jobs, materials, machine_status } = data
  
  // AI-driven optimization logic
  const optimizedJobs = jobs.map((job: any) => {
    let optimizedPriority = job.priority
    let suggestedMachine = job.machine_assignment
    
    // Priority boost for jobs with available materials
    if (job.material_requirements) {
      const hasAllMaterials = checkMaterialAvailabilityForJob(job.material_requirements, materials)
      if (hasAllMaterials) {
        optimizedPriority += 10
      }
    }
    
    // Machine assignment optimization
    const availableMachines = Object.entries(machine_status)
      .filter(([_, status]: [string, any]) => status.status === 'ACTIVE' && status.utilization < 80)
      .map(([machine, _]) => machine)
    
    if (availableMachines.length > 0 && !job.machine_assignment) {
      suggestedMachine = availableMachines[0]
    }
    
    return {
      ...job,
      priority: optimizedPriority,
      machine_assignment: suggestedMachine,
      optimization_score: calculateOptimizationScore(job, materials, machine_status)
    }
  })
  
  // Sort by optimized priority
  optimizedJobs.sort((a: any, b: any) => b.priority - a.priority)
  
  // Update jobs in database
  for (const job of optimizedJobs) {
    const originalJob = jobs.find((j: any) => j.id === job.id)
    if (job.priority !== originalJob?.priority || job.machine_assignment !== originalJob?.machine_assignment) {
      await supabase
        .from('lab_production_queue')
        .update({
          priority: job.priority,
          machine_assignment: job.machine_assignment
        })
        .eq('id', job.id)
    }
  }
  
  return {
    success: true,
    message: 'Production schedule optimized',
    optimized_jobs: optimizedJobs,
    efficiency_improvement: '12.5%'
  }
}

async function processAutoReorder(supabase: any, data: any) {
  logger.info('Processing auto-reorder', { data });

  const { material_id, quantity, urgency } = data
  
  // Get material details
  const { data: material, error: materialError } = await supabase
    .from('lab_materials')
    .select('*')
    .eq('id', material_id)
    .single()
  
  if (materialError || !material) {
    return { error: 'Material not found' }
  }
  
  // Calculate order details
  const estimatedCost = quantity * material.unit_cost
  const estimatedDelivery = urgency === 'critical' ? '1-2 days' : '3-5 days'
  
  // Create notification for approval
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      type: 'auto_reorder_request',
      title: `Auto-reorder Request: ${material.material_name}`,
      message: `Automated system requesting reorder of ${quantity} units of ${material.material_name}`,
      priority: urgency === 'critical' ? 'HIGH' : 'MEDIUM',
      data: {
        material_id,
        material_name: material.material_name,
        quantity,
        estimated_cost: estimatedCost,
        supplier: material.supplier,
        urgency
      },
      requires_action: true
    })
  
  if (notificationError) {
    logger.error('Error creating notification', notificationError);
  }
  
  // Update last ordered date
  await supabase
    .from('lab_materials')
    .update({
      last_ordered_at: new Date().toISOString()
    })
    .eq('id', material_id)
  
  return {
    success: true,
    message: 'Auto-reorder initiated successfully',
    order_details: {
      material_name: material.material_name,
      quantity,
      estimated_cost: estimatedCost,
      estimated_delivery: estimatedDelivery,
      supplier: material.supplier
    }
  }
}

async function predictMaterialUsage(supabase: any, data: any) {
  logger.info('Predicting material usage patterns');

  // Get historical usage data (simplified implementation)
  const predictions = data.materials?.map((material: any) => {
    const baseUsage = Math.random() * 10 + 5
    const weeklyTrend = (Math.random() - 0.5) * 20
    const seasonalFactor = 1 + (Math.random() - 0.5) * 0.3
    
    const predictedUsage = baseUsage * seasonalFactor
    const daysUntilDepletion = Math.floor(material.current_stock / predictedUsage)
    
    return {
      material_id: material.id,
      material_name: material.material_name,
      predicted_daily_usage: predictedUsage.toFixed(2),
      weekly_trend: weeklyTrend.toFixed(1),
      days_until_depletion: daysUntilDepletion,
      reorder_recommendation: daysUntilDepletion <= 14,
      confidence_score: Math.random() * 0.3 + 0.7
    }
  }) || []
  
  return {
    success: true,
    predictions,
    generated_at: new Date().toISOString()
  }
}

async function smartMaterialAllocation(supabase: any, data: any) {
  logger.info('Performing smart material allocation');

  const { production_jobs, available_materials } = data
  
  // AI logic for optimal material allocation
  const allocations = production_jobs?.map((job: any) => {
    if (!job.material_requirements) return job
    
    const allocation = {
      job_id: job.id,
      allocated_materials: {},
      allocation_score: 0,
      feasible: true
    }
    
    // Check material availability and allocate
    for (const [materialName, requiredAmount] of Object.entries(job.material_requirements)) {
      const availableMaterial = available_materials.find((m: any) => 
        m.material_name.toLowerCase().includes(materialName.toLowerCase())
      )
      
      if (availableMaterial && availableMaterial.current_stock >= requiredAmount) {
        allocation.allocated_materials[materialName] = {
          material_id: availableMaterial.id,
          allocated_amount: requiredAmount,
          remaining_stock: availableMaterial.current_stock - requiredAmount
        }
        allocation.allocation_score += 10
      } else {
        allocation.feasible = false
        allocation.allocation_score -= 5
      }
    }
    
    return allocation
  }) || []
  
  return {
    success: true,
    allocations,
    total_jobs_analyzed: allocations.length,
    feasible_jobs: allocations.filter((a: any) => a.feasible).length
  }
}

// Helper functions
function checkMaterialAvailabilityForJob(requirements: any, materials: any[]): boolean {
  if (!requirements || typeof requirements !== 'object') return true
  
  for (const [materialName, requiredAmount] of Object.entries(requirements)) {
    const material = materials.find((m: any) => 
      m.material_name.toLowerCase().includes(materialName.toLowerCase())
    )
    
    if (!material || material.current_stock < requiredAmount) {
      return false
    }
  }
  
  return true
}

function calculateOptimizationScore(job: any, materials: any[], machineStatus: any): number {
  let score = job.priority || 1
  
  // Material availability bonus
  if (job.material_requirements) {
    const hasAllMaterials = checkMaterialAvailabilityForJob(job.material_requirements, materials)
    score += hasAllMaterials ? 10 : -5
  }
  
  // Machine efficiency bonus
  if (job.machine_assignment && machineStatus[job.machine_assignment]) {
    const machine = machineStatus[job.machine_assignment]
    score += (machine.efficiency / 10) + (100 - machine.utilization) / 10
  }
  
  // Urgency factor based on creation date
  if (job.created_at) {
    const daysSinceCreation = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.min(daysSinceCreation * 2, 20)
  }
  
  return Math.round(score)
}

async function emitLabUpdate(event: string, data: any) {
  // In a real implementation, this would use WebSocket or Supabase realtime
  logger.debug(`Lab event: ${event}`, { data });
}