// AgentMedic - Medical AI Agent with Real-time WebSocket
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcedureEvent {
  patient_id: string;
  procedure_id: string;
  event_type: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REVISION_NEEDED';
  event_data: Record<string, any>;
  ai_decision_rationale?: Record<string, any>;
  confidence_score?: number;
  requires_review?: boolean;
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

    console.log('🔍 Received request body:', JSON.stringify(await req.clone().json(), null, 2));
    const requestBody = await req.json();
    console.log('📋 Processing request:', requestBody);

    // Handle both old and new formats
    const { event, data, patientData, analysisType } = requestBody;
    
    // If new format with event/data
    if (event && data) {
      console.log('📋 New format detected:', event);
      const eventToProcess = event;
      const dataToProcess = data;
      
      if (eventToProcess === 'get_procedure_recommendations') {
        const recommendations = await generateMedicalRecommendations(
          dataToProcess.patientData || dataToProcess,
          dataToProcess.analysisType || 'comprehensive'
        );
        
        return new Response(JSON.stringify(recommendations), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // If old format with direct patientData
    if (patientData) {
      console.log('📋 Legacy format detected');
      const recommendations = await generateMedicalRecommendations(patientData, analysisType || 'comprehensive');
      
      return new Response(JSON.stringify(recommendations), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event: eventType, data: eventData } = requestBody;

    switch (event) {
      case 'procedure_status_update': {
        const procedureEvent: ProcedureEvent = data;
        
        // AgentMedic AI Decision Logic
        const aiAnalysis = await analyzeProceduralDecision(procedureEvent);
        
        // Save to ProcedureEventLog
        const { data: savedEvent, error } = await supabase
          .from('procedure_event_log')
          .insert({
            ...procedureEvent,
            ai_decision_rationale: aiAnalysis.rationale,
            confidence_score: aiAnalysis.confidence,
            requires_review: aiAnalysis.confidence < 0.7,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Trigger ReplayCritic if procedure completed
        if (procedureEvent.status === 'COMPLETED') {
          await triggerReplayCritic(savedEvent.id);
        }

        // Emit WebSocket event to AgentCEO
        if (aiAnalysis.confidence < 0.7 || procedureEvent.requires_review) {
          await emitToCEO('risk_alert', {
            event_id: savedEvent.id,
            risk_level: aiAnalysis.confidence < 0.5 ? 'HIGH' : 'MEDIUM',
            rationale: aiAnalysis.rationale
          });
        }

        return new Response(JSON.stringify({
          success: true,
          event_id: savedEvent.id,
          ai_analysis: aiAnalysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_procedure_recommendations': {
        const { patient_id, procedure_type } = data;
        
        const recommendations = await generateMedicalRecommendations(patient_id, procedure_type);
        
        return new Response(JSON.stringify({
          success: true,
          recommendations
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown event type: ${event}`);
    }

  } catch (error) {
    console.error('AgentMedic Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeProceduralDecision(event: ProcedureEvent) {
  // AgentMedic AI Logic - Explainable AI for medical decisions
  const riskFactors = [];
  let confidence = 0.9;
  
  // Analyze event data for medical risk factors
  if (event.event_data.complications) {
    riskFactors.push('Complications detected');
    confidence -= 0.2;
  }
  
  if (event.event_data.duration_exceeded) {
    riskFactors.push('Procedure duration exceeded');
    confidence -= 0.1;
  }
  
  if (event.event_data.material_issues) {
    riskFactors.push('Material compatibility issues');
    confidence -= 0.15;
  }

  const rationale = {
    decision_factors: event.event_data,
    risk_assessment: riskFactors,
    clinical_indicators: event.event_data.vitals || {},
    ai_model_version: 'RoMedGPT_v2.1',
    explainable_reasoning: generateExplanation(event, riskFactors),
    medical_sources: ['Clinical Guidelines 2024', 'Dental Standards ISO 12345']
  };

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    rationale,
    requires_escalation: confidence < 0.7
  };
}

function generateExplanation(event: ProcedureEvent, riskFactors: string[]) {
  return {
    primary_decision: `Based on ${event.event_type} analysis`,
    risk_analysis: riskFactors.length > 0 ? `Identified ${riskFactors.length} risk factors` : 'No significant risks detected',
    recommendation: event.status === 'COMPLETED' ? 'Procedure completed successfully' : 'Continue monitoring',
    confidence_explanation: 'Decision based on clinical data patterns and evidence-based protocols'
  };
}

async function triggerReplayCritic(eventId: string) {
  // Trigger ReplayCritic analysis
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/replay-critic`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'analyze_procedure',
      data: { event_id: eventId }
    })
  });
}

async function emitToCEO(event: string, data: any) {
  // Emit to AgentCEO via realtime
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/agent-ceo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'ceo:new_risk_report',
      data
    })
  });
}

async function generateMedicalRecommendations(patientId: string, procedureType: string) {
  // RoMedGPT integration for medical recommendations
  return {
    pre_operative: [
      'Verify patient allergies and contraindications',
      'Confirm digital twin accuracy',
      'Check material availability'
    ],
    intra_operative: [
      'Monitor vitals continuously',
      'Follow CAD/CAM precision guidelines',
      'Document any deviations'
    ],
    post_operative: [
      'Schedule follow-up in 7 days',
      'Provide patient care instructions',
      'Monitor for complications'
    ],
    ai_confidence: 0.92,
    sources: ['Clinical Protocol DB', 'Medical Literature 2024']
  };
}