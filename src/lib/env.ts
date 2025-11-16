import { z } from "zod";

const envSchema = z.object({
  // Supabase Configuration
  VITE_SUPABASE_URL: z
    .string()
    .url("Invalid Supabase URL")
    .default("https://sosiozakhzrnapvxrtrb.supabase.co"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required").default(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2lvemFraHpybmFwdnhydHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzIzODcsImV4cCI6MjA2MjcwODM4N30.MjKC0kc7lGG3nfUU4-rqw_O5-TnDnN6fUJhQJhq3JuA"
  ),

  // WebSocket Configuration
  VITE_WS_URL: z.string().url().optional().default("ws://localhost:3001"),

  // Application Configuration
  VITE_APP_NAME: z.string().default("GENIUS MedicalCor AI"),
  VITE_APP_VERSION: z.string().default("1.0.0"),
  VITE_APP_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Feature Flags
  VITE_ENABLE_VOICE: z.coerce.boolean().default(true),
  VITE_ENABLE_3D_VIEWER: z.coerce.boolean().default(true),
  VITE_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  VITE_ENABLE_PWA: z.coerce.boolean().default(true),

  // Performance Configuration
  VITE_API_TIMEOUT: z.coerce.number().positive().default(30000),
  VITE_MAX_RETRIES: z.coerce.number().nonnegative().default(3),
  VITE_RETRY_DELAY: z.coerce.number().nonnegative().default(1000),

  // Security Configuration
  VITE_CSP_NONCE: z.string().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

function getEnvConfig(): EnvConfig {
  const rawEnv = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    VITE_APP_ENV: import.meta.env.MODE,
    VITE_ENABLE_VOICE: import.meta.env.VITE_ENABLE_VOICE,
    VITE_ENABLE_3D_VIEWER: import.meta.env.VITE_ENABLE_3D_VIEWER,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    VITE_ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA,
    VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
    VITE_MAX_RETRIES: import.meta.env.VITE_MAX_RETRIES,
    VITE_RETRY_DELAY: import.meta.env.VITE_RETRY_DELAY,
    VITE_CSP_NONCE: import.meta.env.VITE_CSP_NONCE,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error(`Environment validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const env = getEnvConfig();

// Type-safe environment variable access
export const config = {
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  websocket: {
    url: env.VITE_WS_URL,
  },
  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
    env: env.VITE_APP_ENV,
    isDev: env.VITE_APP_ENV === "development",
    isProd: env.VITE_APP_ENV === "production",
    isTest: env.VITE_APP_ENV === "test",
  },
  features: {
    voice: env.VITE_ENABLE_VOICE,
    viewer3D: env.VITE_ENABLE_3D_VIEWER,
    analytics: env.VITE_ENABLE_ANALYTICS,
    pwa: env.VITE_ENABLE_PWA,
  },
  performance: {
    apiTimeout: env.VITE_API_TIMEOUT,
    maxRetries: env.VITE_MAX_RETRIES,
    retryDelay: env.VITE_RETRY_DELAY,
  },
} as const;

export type Config = typeof config;
