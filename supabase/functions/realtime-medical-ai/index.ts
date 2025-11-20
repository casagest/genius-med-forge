import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('RealtimeMedicalAI');

serve(async (req) => {
  logger.debug(`${req.method} request received`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    logger.info('Creating realtime session');

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: `You are GENIUS MedicalCor AI, an advanced medical AI assistant integrated into a medical cockpit system. You help medical professionals with:

- Real-time surgical guidance and procedure monitoring
- Patient vital signs analysis and alerts
- Medical decision support and recommendations
- Laboratory results interpretation
- Emergency response coordination
- Drug interaction warnings and dosage calculations

You have access to patient data, lab results, and real-time vital signs. Always prioritize patient safety and provide clear, actionable medical guidance. Be concise but thorough in critical situations.

Current context: You are integrated into the Medical Cockpit interface where doctors can monitor patients and procedures in real-time.`
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', { status: response.status, errorText });
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    logger.info("Realtime session created successfully", { sessionId: data.id });

    return createJsonResponse(req, data);
  } catch (error) {
    logger.error("Request processing failed", error);
    return createErrorResponse(req, error, 500);
  }
});
