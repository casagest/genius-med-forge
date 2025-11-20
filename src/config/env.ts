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
  // Skip validation if import.meta is not available (e.g., in test environments)
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return;
  }

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

// Validate environment on module load (skip in test/CI environments)
const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
const isDevelopmentMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

if (!isTestMode) {
  try {
    validateEnv();
  } catch (error) {
    // In development, log warning but don't crash to allow graceful degradation
    if (isDevelopmentMode) {
      console.warn('⚠️ Environment validation warning:', error instanceof Error ? error.message : error);
      console.warn('The application may not function correctly without proper environment variables.');
    } else {
      // In production, fail fast
      throw error;
    }
  }
}

/**
 * Application configuration object
 * All environment variables are accessed through this centralized configuration
 * Safe to use in test environments - provides defaults
 */
const getEnvValue = (key: string, defaultValue: string = ''): string => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return defaultValue;
  }
  return import.meta.env[key] || defaultValue;
};

export const config: EnvironmentConfig = {
  supabase: {
    url: getEnvValue('VITE_SUPABASE_URL'),
    anonKey: getEnvValue('VITE_SUPABASE_ANON_KEY'),
  },
  websocket: {
    url: getEnvValue('VITE_WEBSOCKET_URL', 'ws://localhost:3001'),
    realtimeAgentsUrl: getEnvValue('VITE_REALTIME_AGENTS_URL'),
  },
  api: {
    baseUrl: getEnvValue('VITE_API_BASE_URL'),
  },
  app: {
    environment: (getEnvValue('VITE_ENVIRONMENT', 'development') as EnvironmentConfig['app']['environment']),
  },
  features: {
    voiceInterface: parseBoolean(getEnvValue('VITE_ENABLE_VOICE_INTERFACE'), true),
    viewer3D: parseBoolean(getEnvValue('VITE_ENABLE_3D_VIEWER'), true),
    realTimeSync: parseBoolean(getEnvValue('VITE_ENABLE_REAL_TIME_SYNC'), true),
  },
  logging: {
    level: (getEnvValue('VITE_LOG_LEVEL', 'info') as EnvironmentConfig['logging']['level']),
  },
  security: {
    allowedOrigins: parseArray(
      getEnvValue('VITE_ALLOWED_ORIGINS'),
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
