import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing voice command...');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en'); // Medical commands in English
    formData.append('prompt', 'Medical procedure voice commands: start procedure, add complication, record measurement, end procedure, vital signs');

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription result:', result);

    // Process medical command with context
    const transcription = result.text.toLowerCase();
    const medicalContext = await processMedicalCommand(transcription, openaiApiKey);

    return new Response(
      JSON.stringify({ 
        text: result.text,
        medical_context: medicalContext,
        confidence: result.confidence || 0.95
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processMedicalCommand(transcription: string, apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a medical AI assistant processing voice commands during surgery. 
            Analyze the voice command and return JSON with: command_type, action, parameters, urgency (1-5), confidence (0-1).
            
            Command types: start_procedure, end_procedure, record_measurement, add_complication, emergency_alert, vital_check.
            
            Examples:
            "Start the procedure" -> {"command_type": "start_procedure", "action": "begin_surgery", "urgency": 4}
            "Patient heart rate is 85" -> {"command_type": "record_measurement", "action": "vital_signs", "parameters": {"heart_rate": 85}, "urgency": 2}`
          },
          {
            role: 'user',
            content: `Process this medical voice command: "${transcription}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
    });

    if (response.ok) {
      const data = await response.json();
      try {
        return JSON.parse(data.choices[0].message.content);
      } catch {
        return {
          command_type: 'unknown',
          action: 'process_manually',
          transcription: transcription,
          urgency: 2,
          confidence: 0.7
        };
      }
    }
  } catch (error) {
    console.error('Error processing medical command:', error);
  }

  return {
    command_type: 'unknown',
    action: 'process_manually',
    transcription: transcription,
    urgency: 2,
    confidence: 0.5
  };
}