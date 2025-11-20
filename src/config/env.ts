/**
 * Environment Configuration
 * Centralized configuration management for environment variables
 * Provides type-safe access to environment variables with validation
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  websocket: {
    url: string;
    realtimeAgentsUrl: string;
  };
  api: {
    baseUrl: string;
  };
  app: {
    environment: 'development' | 'staging' | 'production';
  };
  features: {
    voiceInterface: boolean;
    viewer3D: boolean;
    realTimeSync: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  security: {
    allowedOrigins: string[];
  };
}

/**
 * Validates that required environment variables are present
 */
function validateEnv(): void {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

/**
 * Parses boolean environment variables
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parses comma-separated string into array
 */
function parseArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Validate environment on module load
if (import.meta.env.MODE !== 'test') {
  validateEnv();
}

/**
 * Application configuration object
 * All environment variables are accessed through this centralized configuration
 */
export const config: EnvironmentConfig = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  websocket: {
    url: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
    realtimeAgentsUrl: import.meta.env.VITE_REALTIME_AGENTS_URL || '',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  },
  app: {
    environment: (import.meta.env.VITE_ENVIRONMENT as EnvironmentConfig['app']['environment']) || 'development',
  },
  features: {
    voiceInterface: parseBoolean(import.meta.env.VITE_ENABLE_VOICE_INTERFACE, true),
    viewer3D: parseBoolean(import.meta.env.VITE_ENABLE_3D_VIEWER, true),
    realTimeSync: parseBoolean(import.meta.env.VITE_ENABLE_REAL_TIME_SYNC, true),
  },
  logging: {
    level: (import.meta.env.VITE_LOG_LEVEL as EnvironmentConfig['logging']['level']) || 'info',
  },
  security: {
    allowedOrigins: parseArray(
      import.meta.env.VITE_ALLOWED_ORIGINS,
      ['http://localhost:5173', 'http://localhost:8080']
    ),
  },
};

/**
 * Checks if the application is running in production
 */
export const isProduction = config.app.environment === 'production';

/**
 * Checks if the application is running in development
 */
export const isDevelopment = config.app.environment === 'development';

/**
 * Checks if the application is running in staging
 */
export const isStaging = config.app.environment === 'staging';

export default config;
