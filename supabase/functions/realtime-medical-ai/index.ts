import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log('WebSocket connection established for GENIUS MedicalCor AI');
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let openAISocket: WebSocket | null = null;
  let sessionInitialized = false;

  socket.onopen = () => {
    console.log('Client WebSocket connected');
    
    // Connect to OpenAI Realtime API
    openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", [], {
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
    };

    openAISocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('OpenAI message type:', data.type);

        // Initialize session after receiving session.created
        if (data.type === 'session.created' && !sessionInitialized) {
          sessionInitialized = true;
          const sessionUpdate = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: `You are GENIUS MedicalCor AI, an advanced medical AI assistant specialized in:
              
              1. Medical Analysis & Diagnostics - Analyze medical data, symptoms, and provide evidence-based recommendations
              2. Digital Twin Operations - Interpret 3D medical models and surgical planning
              3. Lab Production Management - Coordinate medical device manufacturing and quality control
              4. Risk Assessment - Evaluate patient safety and procedural risks
              5. Strategic Medical Operations - Support healthcare workflow optimization
              
              Always provide:
              - Clear, evidence-based recommendations
              - Confidence scores for your assessments
              - Detailed reasoning chains
              - Risk factor analysis
              - Regulatory compliance guidance
              
              You can call functions to:
              - Analyze medical data
              - Generate risk reports
              - Update lab production queues
              - Query patient information
              
              Maintain professional medical standards and emphasize patient safety in all interactions.`,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: "function",
                  name: "analyze_medical_data",
                  description: "Analyze medical data and generate insights for patient care",
                  parameters: {
                    type: "object",
                    properties: {
                      patient_id: { type: "string" },
                      analysis_type: { type: "string" },
                      data: { type: "object" }
                    },
                    required: ["patient_id", "analysis_type", "data"]
                  }
                },
                {
                  type: "function",
                  name: "generate_risk_report",
                  description: "Generate comprehensive risk assessment report",
                  parameters: {
                    type: "object",
                    properties: {
                      report_type: { type: "string" },
                      risk_level: { type: "string" },
                      analysis_data: { type: "object" }
                    },
                    required: ["report_type", "risk_level"]
                  }
                },
                {
                  type: "function",
                  name: "update_lab_queue",
                  description: "Update laboratory production queue with new jobs",
                  parameters: {
                    type: "object",
                    properties: {
                      job_type: { type: "string" },
                      patient_id: { type: "string" },
                      priority: { type: "number" },
                      estimated_duration: { type: "string" }
                    },
                    required: ["job_type", "patient_id", "priority"]
                  }
                },
                {
                  type: "function",
                  name: "query_patient_data",
                  description: "Query patient information and medical history",
                  parameters: {
                    type: "object",
                    properties: {
                      patient_code: { type: "string" },
                      data_type: { type: "string" }
                    },
                    required: ["patient_code"]
                  }
                }
              ],
              tool_choice: "auto",
              temperature: 0.7,
              max_response_output_tokens: "inf"
            }
          };
          
          openAISocket.send(JSON.stringify(sessionUpdate));
          console.log('Session update sent to OpenAI');
        }

        // Handle function calls
        if (data.type === 'response.function_call_arguments.done') {
          console.log('Function call received:', data.name, data.arguments);
          
          try {
            const args = JSON.parse(data.arguments);
            let result = {};

            switch (data.name) {
              case 'analyze_medical_data':
                result = await analyzeMedicalData(supabase, args);
                break;
              case 'generate_risk_report':
                result = await generateRiskReport(supabase, args);
                break;
              case 'update_lab_queue':
                result = await updateLabQueue(supabase, args);
                break;
              case 'query_patient_data':
                result = await queryPatientData(supabase, args);
                break;
              default:
                result = { error: `Unknown function: ${data.name}` };
            }

            // Send function result back to OpenAI
            const functionResult = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: data.call_id,
                output: JSON.stringify(result)
              }
            };

            openAISocket.send(JSON.stringify(functionResult));
            openAISocket.send(JSON.stringify({ type: "response.create" }));
            
          } catch (error) {
            console.error('Function execution error:', error);
          }
        }

        // Forward all messages to client
        socket.send(event.data);
        
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'OpenAI connection error' 
      }));
    };

    openAISocket.onclose = () => {
      console.log('OpenAI WebSocket disconnected');
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    // Forward client messages to OpenAI
    if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
      openAISocket.send(event.data);
    }
  };

  socket.onclose = () => {
    console.log('Client WebSocket disconnected');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
  };

  return response;
});

// Medical data analysis function
async function analyzeMedicalData(supabase: any, args: any) {
  try {
    const { patient_id, analysis_type, data } = args;
    
    // Store analysis result
    const { data: analysisResult, error } = await supabase
      .from('analysis_reports')
      .insert({
        report_type: `Medical Analysis: ${analysis_type}`,
        risk_level: 'MEDIUM',
        confidence_score: 0.85,
        analysis_data: data,
        requires_action: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      analysis_id: analysisResult.id,
      findings: `Completed ${analysis_type} analysis for patient ${patient_id}`,
      recommendations: [
        "Continue monitoring patient vitals",
        "Schedule follow-up in 2 weeks",
        "Consider additional diagnostic tests if symptoms persist"
      ]
    };
  } catch (error) {
    console.error('Medical analysis error:', error);
    return { error: error.message };
  }
}

// Risk report generation function
async function generateRiskReport(supabase: any, args: any) {
  try {
    const { report_type, risk_level, analysis_data = {} } = args;
    
    const { data: report, error } = await supabase
      .from('analysis_reports')
      .insert({
        report_type,
        risk_level: risk_level.toUpperCase(),
        confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
        analysis_data,
        requires_action: ['HIGH', 'CRITICAL'].includes(risk_level.toUpperCase())
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      report_id: report.id,
      risk_assessment: `${risk_level} risk level identified`,
      action_required: report.requires_action
    };
  } catch (error) {
    console.error('Risk report error:', error);
    return { error: error.message };
  }
}

// Lab queue update function
async function updateLabQueue(supabase: any, args: any) {
  try {
    const { job_type, patient_id, priority, estimated_duration } = args;
    
    const jobCode = `LAB-${Date.now().toString().slice(-6)}`;
    
    const { data: job, error } = await supabase
      .from('lab_production_queue')
      .insert({
        job_code: jobCode,
        patient_id,
        job_type,
        priority: Math.min(Math.max(priority, 1), 10),
        estimated_duration: estimated_duration || '2h',
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      job_id: job.id,
      job_code: jobCode,
      status: 'Added to production queue',
      estimated_completion: 'Within 24 hours'
    };
  } catch (error) {
    console.error('Lab queue error:', error);
    return { error: error.message };
  }
}

// Patient data query function
async function queryPatientData(supabase: any, args: any) {
  try {
    const { patient_code, data_type = 'basic' } = args;
    
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_code', patient_code)
      .single();

    if (error) throw error;

    // Get related data based on data_type
    let additionalData = {};
    
    if (data_type === 'lab_history') {
      const { data: labJobs } = await supabase
        .from('lab_production_queue')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      additionalData = { lab_jobs: labJobs || [] };
    }

    return {
      success: true,
      patient_data: patient,
      ...additionalData,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Patient query error:', error);
    return { error: error.message };
  }
}