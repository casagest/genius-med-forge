import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('TextToSpeech');

// Input validation schemas
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const VALID_MODELS = ['tts-1', 'tts-1-hd'];
const MAX_TEXT_LENGTH = 4096;

function validateInput(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }
  
  const { text, voice = 'alloy', model = 'tts-1' } = data;
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required and must be a non-empty string');
  }
  
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }
  
  if (!VALID_VOICES.includes(voice)) {
    throw new Error(`Invalid voice. Must be one of: ${VALID_VOICES.join(', ')}`);
  }
  
  if (!VALID_MODELS.includes(model)) {
    throw new Error(`Invalid model. Must be one of: ${VALID_MODELS.join(', ')}`);
  }
  
  // Sanitize text input
  const sanitizedText = text.replace(/[<>]/g, '').trim();
  
  return { text: sanitizedText, voice, model };
}

serve(async (req) => {
  logger.debug(`${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const requestBody = await req.json();
    const { text, voice, model } = validateInput(requestBody);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    logger.info('Generating voice response', { textLength: text.length, voice, model });

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: text,
        voice: voice, // alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3',
        speed: 1.0
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate speech');
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    return createJsonResponse(req, {
      audioContent: base64Audio,
      format: 'mp3',
      voice: voice
    });
  } catch (error) {
    logger.error('Request processing failed', error);
    return createErrorResponse(req, error, 400);
  }
});