// AgentLab - Laboratory Production Management with Smart Material Manager
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabJob {
  patient_id: string;
  digital_twin_id: string;
  job_type: string;
  material_requirements: Record<string, number>;
  priority: number;
  estimated_duration: string;
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
      case 'create_lab_job': {
        const jobData: LabJob = data;
        
        // Generate unique job code
        const jobCode = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Check material availability
        const materialCheck = await checkMaterialAvailability(supabase, jobData.material_requirements);
        
        if (!materialCheck.available) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Insufficient materials',
            missing_materials: materialCheck.missing
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

        return new Response(JSON.stringify({
          success: true,
          job: labJob
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

        return new Response(JSON.stringify({
          success: true,
          job: updatedJob
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

        return new Response(JSON.stringify({
          success: true,
          queue
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'smart_material_reorder': {
        const reorderAlerts = await checkAndGenerateReorders(supabase);
        
        return new Response(JSON.stringify({
          success: true,
          reorder_alerts: reorderAlerts
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown event type: ${event}`);
    }

  } catch (error) {
    console.error('AgentLab Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
    .from('materials_inventory')
    .select('*')
    .filter('current_stock', 'lte', supabase.raw('minimum_threshold'))
    .eq('is_active', true);

  if (error) throw error;

  const reorderAlerts = lowStockMaterials.map((material: any) => ({
    material_code: material.material_code,
    material_name: material.material_name,
    current_stock: material.current_stock,
    minimum_threshold: material.minimum_threshold,
    suggested_order: material.minimum_threshold * 3, // Order 3x minimum
    supplier: material.supplier_info,
    urgency: material.current_stock === 0 ? 'CRITICAL' : 'HIGH'
  }));

  // Emit alerts to CEO dashboard
  if (reorderAlerts.length > 0) {
    await emitLabUpdate('lab:reorder_alert', reorderAlerts);
  }

  return reorderAlerts;
}

async function emitLabUpdate(event: string, data: any) {
  // In a real implementation, this would use WebSocket or Supabase realtime
  console.log(`Lab Event: ${event}`, data);
}