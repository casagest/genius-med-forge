import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BaseProcedureEvent {
  appointmentId: string;
  patientId?: string;
  caseId: string;
}

interface ProcedureEventPayload extends BaseProcedureEvent {
  eventType: string;
  timestamp: string;
  [key: string]: any;
}

interface MaterialUsageEvent {
  itemSku: string;
  quantityUsed: number;
  materialName?: string;
}

interface ComplicationEvent {
  description: string;
  severity: 'low' | 'medium' | 'high';
}

class MedicalProcedureHandler {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Process incoming medical procedure events
   */
  public async processProcedureEvent(payload: ProcedureEventPayload): Promise<any> {
    console.log(`Processing procedure event: ${payload.eventType}`, payload);

    // Store the event
    await this.storeProcedureEvent(payload);

    // Process based on event type
    switch (payload.eventType) {
      case 'start_surgery':
        return await this.handleSurgeryStart(payload);
      
      case 'material_confirmed':
        return await this.handleMaterialUsage(payload);
      
      case 'implant_placed':
        return await this.handleImplantPlacement(payload);
      
      case 'complication_detected':
        return await this.handleComplication(payload);
      
      case 'end_surgery':
        return await this.handleSurgeryEnd(payload);
      
      default:
        console.log(`Unknown event type: ${payload.eventType}`);
        return { success: true, message: 'Event stored but not processed' };
    }
  }

  /**
   * Store procedure event in database
   */
  private async storeProcedureEvent(payload: ProcedureEventPayload): Promise<void> {
    const { error } = await this.supabase
      .from('procedure_events')
      .insert({
        appointment_id: payload.appointmentId,
        patient_id: payload.patientId,
        case_id: payload.caseId,
        event_type: payload.eventType,
        event_data: {
          ...payload,
          originalTimestamp: payload.timestamp
        },
        timestamp: payload.timestamp
      });

    if (error) {
      console.error('Error storing procedure event:', error);
      throw error;
    }
  }

  /**
   * Handle surgery start event
   */
  private async handleSurgeryStart(payload: any): Promise<any> {
    // Create or update active procedure
    const { error } = await this.supabase
      .from('active_procedures')
      .upsert({
        appointment_id: payload.appointmentId,
        patient_id: payload.patientId,
        case_id: payload.caseId,
        procedure_type: payload.procedureType || 'Unknown',
        status: 'IN_PROGRESS',
        started_at: payload.timestamp,
        estimated_duration_minutes: payload.estimatedDurationMinutes
      });

    if (error) {
      console.error('Error creating active procedure:', error);
      throw error;
    }

    // Trigger reactive analysis to check system readiness
    await this.triggerReactiveAnalysis();

    return {
      success: true,
      message: 'Surgery started successfully',
      actions: ['procedure_created', 'reactive_analysis_triggered']
    };
  }

  /**
   * Handle material usage event
   */
  private async handleMaterialUsage(payload: any): Promise<any> {
    const { itemSku, quantityUsed, materialName } = payload as MaterialUsageEvent;

    // Update material inventory
    const { data: material, error: fetchError } = await this.supabase
      .from('lab_materials')
      .select('*')
      .eq('material_name', materialName || itemSku)
      .single();

    if (!fetchError && material) {
      const newStock = Math.max(0, material.current_stock - quantityUsed);
      
      const { error: updateError } = await this.supabase
        .from('lab_materials')
        .update({ current_stock: newStock })
        .eq('id', material.id);

      if (updateError) {
        console.error('Error updating material stock:', updateError);
      }

      // Update active procedure materials used
      await this.updateProcedureMaterials(payload.appointmentId, itemSku, quantityUsed);

      // Check if material is now below threshold
      if (newStock <= material.minimum_threshold) {
        await this.triggerLowStockAlert(material, newStock);
      }
    }

    return {
      success: true,
      message: 'Material usage recorded',
      actions: ['inventory_updated', 'stock_checked']
    };
  }

  /**
   * Handle implant placement event
   */
  private async handleImplantPlacement(payload: any): Promise<any> {
    // Record implant placement in procedure
    await this.updateProcedureData(payload.appointmentId, {
      implants_placed: {
        ...payload,
        implantId: payload.implantId,
        position: payload.position,
        torque: payload.torque,
        timestamp: payload.timestamp
      }
    });

    // Could trigger production queue for follow-up items
    await this.checkFollowUpProduction(payload);

    return {
      success: true,
      message: 'Implant placement recorded',
      actions: ['implant_recorded', 'followup_checked']
    };
  }

  /**
   * Handle complication event
   */
  private async handleComplication(payload: any): Promise<any> {
    const { description, severity } = payload as ComplicationEvent;

    // Add complication to active procedure
    const { data: procedure } = await this.supabase
      .from('active_procedures')
      .select('complications')
      .eq('appointment_id', payload.appointmentId)
      .single();

    if (procedure) {
      const complications = Array.isArray(procedure.complications) ? procedure.complications : [];
      complications.push({
        description,
        severity,
        timestamp: payload.timestamp,
        id: crypto.randomUUID()
      });

      await this.supabase
        .from('active_procedures')
        .update({ complications })
        .eq('appointment_id', payload.appointmentId);
    }

    // Trigger reactive analysis for high severity complications
    if (severity === 'high') {
      await this.triggerReactiveAnalysis();
      await this.createCriticalAlert(payload);
    }

    return {
      success: true,
      message: 'Complication recorded',
      actions: ['complication_recorded', severity === 'high' ? 'critical_alert_created' : 'logged']
    };
  }

  /**
   * Handle surgery end event
   */
  private async handleSurgeryEnd(payload: any): Promise<any> {
    // Update active procedure
    const { data: procedure, error: fetchError } = await this.supabase
      .from('active_procedures')
      .select('*')
      .eq('appointment_id', payload.appointmentId)
      .single();

    if (!fetchError && procedure) {
      const startTime = new Date(procedure.started_at);
      const endTime = new Date(payload.timestamp);
      const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const { error: updateError } = await this.supabase
        .from('active_procedures')
        .update({
          status: 'COMPLETED',
          completed_at: payload.timestamp,
          actual_duration_minutes: actualDuration,
          notes: payload.notes
        })
        .eq('appointment_id', payload.appointmentId);

      if (updateError) {
        console.error('Error completing procedure:', updateError);
      }

      // Trigger quality analysis
      await this.triggerQualityAnalysis(payload.appointmentId);

      // Trigger inventory forecast based on materials used
      await this.triggerInventoryForecast();

      return {
        success: true,
        message: 'Surgery completed successfully',
        actions: ['procedure_completed', 'quality_analysis_triggered', 'inventory_forecast_triggered'],
        procedure: {
          ...procedure,
          status: 'COMPLETED',
          actual_duration_minutes: actualDuration
        }
      };
    }

    return {
      success: true,
      message: 'Surgery end recorded'
    };
  }

  /**
   * Update procedure materials used
   */
  private async updateProcedureMaterials(appointmentId: string, material: string, quantity: number): Promise<void> {
    const { data: procedure } = await this.supabase
      .from('active_procedures')
      .select('materials_used')
      .eq('appointment_id', appointmentId)
      .single();

    if (procedure) {
      const materialsUsed = procedure.materials_used || {};
      materialsUsed[material] = (materialsUsed[material] || 0) + quantity;

      await this.supabase
        .from('active_procedures')
        .update({ materials_used: materialsUsed })
        .eq('appointment_id', appointmentId);
    }
  }

  /**
   * Update procedure data
   */
  private async updateProcedureData(appointmentId: string, data: any): Promise<void> {
    const { error } = await this.supabase
      .from('active_procedures')
      .update(data)
      .eq('appointment_id', appointmentId);

    if (error) {
      console.error('Error updating procedure data:', error);
    }
  }

  /**
   * Trigger reactive analysis
   */
  private async triggerReactiveAnalysis(): Promise<void> {
    try {
      await this.supabase.functions.invoke('reactive-analysis', {
        body: { event: 'run_analysis' }
      });
    } catch (error) {
      console.error('Error triggering reactive analysis:', error);
    }
  }

  /**
   * Trigger quality analysis
   */
  private async triggerQualityAnalysis(appointmentId: string): Promise<void> {
    try {
      // Find related production jobs for this appointment
      const { data: jobs } = await this.supabase
        .from('lab_production_queue')
        .select('id')
        .eq('status', 'COMPLETED')
        .limit(1);

      if (jobs && jobs.length > 0) {
        await this.supabase.functions.invoke('enhanced-replay-critic', {
          body: {
            event: 'analyze_job',
            data: { jobId: jobs[0].id }
          }
        });
      }
    } catch (error) {
      console.error('Error triggering quality analysis:', error);
    }
  }

  /**
   * Trigger inventory forecast
   */
  private async triggerInventoryForecast(): Promise<void> {
    try {
      await this.supabase.functions.invoke('inventory-forecast', {
        body: { event: 'run_forecast' }
      });
    } catch (error) {
      console.error('Error triggering inventory forecast:', error);
    }
  }

  /**
   * Trigger low stock alert
   */
  private async triggerLowStockAlert(material: any, currentStock: number): Promise<void> {
    console.log(`LOW STOCK ALERT: ${material.material_name} - Current: ${currentStock}, Min: ${material.minimum_threshold}`);
    
    // Could trigger automatic reordering here
    // await this.triggerAutoReorder(material);
  }

  /**
   * Create critical alert for high severity complications
   */
  private async createCriticalAlert(payload: any): Promise<void> {
    console.log(`CRITICAL ALERT: High severity complication in procedure ${payload.appointmentId}`);
    
    // Store in analysis reports for visibility
    await this.supabase
      .from('analysis_reports')
      .insert({
        report_type: 'RISK',
        risk_level: 'high',
        confidence_score: 1.0,
        analysis_data: {
          source: 'live_procedure',
          appointment_id: payload.appointmentId,
          complication: payload.description,
          severity: payload.severity,
          timestamp: payload.timestamp
        },
        requires_action: true
      });
  }

  /**
   * Check for follow-up production needs
   */
  private async checkFollowUpProduction(payload: any): Promise<void> {
    // Could create follow-up production jobs based on implant placement
    console.log(`Checking follow-up production for implant: ${payload.implantId}`);
  }

  /**
   * Get active procedures
   */
  public async getActiveProcedures(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('active_procedures')
      .select(`
        *,
        patients (patient_code)
      `)
      .in('status', ['PLANNED', 'IN_PROGRESS'])
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active procedures:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get procedure events for a specific appointment
   */
  public async getProcedureEvents(appointmentId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('procedure_events')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching procedure events:', error);
      return [];
    }

    return data || [];
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
    const handler = new MedicalProcedureHandler(supabaseClient);

    switch (event) {
      case 'process_event':
        const result = await handler.processProcedureEvent(data);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_active_procedures':
        const procedures = await handler.getActiveProcedures();
        return new Response(JSON.stringify({ procedures }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_procedure_events':
        const { appointmentId } = data;
        const events = await handler.getProcedureEvents(appointmentId);
        return new Response(JSON.stringify({ events }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in medical-procedure-handler function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});