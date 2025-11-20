/**
 * Secure CORS Configuration for Supabase Edge Functions
 *
 * Provides environment-aware CORS headers with proper origin validation
 * Replaces the insecure wildcard (*) CORS configuration
 */

/**
 * Allowed origins based on environment
 * In production, only specific domains should be allowed
 */
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Default allowed origins for development
  return [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    'https://sosiozakhzrnapvxrtrb.supabase.co',
  ];
};

/**
 * Validates if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Gets CORS headers for a given request
 * Returns origin-specific headers instead of wildcard
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Only set origin if it's in the allowed list
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // Fallback to first allowed origin for development
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.length > 0) {
      headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
    }
  }

  return headers;
}

/**
 * Handles CORS preflight requests
 */
export function handleCorsPreflightRequest(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * Creates a JSON response with CORS headers
 */
export function createJsonResponse(
  request: Request,
  data: unknown,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(request),
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Creates an error response with CORS headers
 */
export function createErrorResponse(
  request: Request,
  error: string | Error,
  status: number = 400
): Response {
  const errorMessage = error instanceof Error ? error.message : error;

  return createJsonResponse(
    request,
    {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    },
    status
  );
}
