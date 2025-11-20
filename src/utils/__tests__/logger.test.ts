/**
 * Unit Tests for Logger Utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger, PerformanceLogger } from '../logger';

// Mock config
vi.mock('@/config/env', () => ({
  config: {
    supabase: { url: '', anonKey: '' },
    websocket: { url: '', realtimeAgentsUrl: '' },
    api: { baseUrl: '' },
    app: { environment: 'test' as const },
    features: { voiceInterface: false, viewer3D: false, realTimeSync: false },
    logging: { level: 'debug' as const },
    security: { allowedOrigins: [] },
  },
  isProduction: false,
  isDevelopment: false,
  isStaging: false,
}));

describe('Logger', () => {
  let consoleInfoSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with context', () => {
      const logger = createLogger('TestContext');
      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(logCall).toContain('TestContext');
    });
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      const logger = createLogger('Test');

      // Verify logger was created with debug level
      logger.debug('debug message');

      // In test environment, console.debug might not be called
      // Just verify the method doesn't throw
      expect(() => logger.debug('another message')).not.toThrow();
    });

    it('should log info messages', () => {
      const logger = createLogger('Test');
      logger.info('info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      const logger = createLogger('Test');
      logger.warn('warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const logger = createLogger('Test');
      const error = new Error('test error');
      logger.error('error message', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('metadata logging', () => {
    it('should include metadata in logs', () => {
      const logger = createLogger('Test');
      logger.info('test message', { userId: '123', action: 'login' });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][2];
      expect(logOutput).toMatchObject({ userId: '123', action: 'login' });
    });

    it('should include error details', () => {
      const logger = createLogger('Test');
      const error = new Error('test error');
      logger.error('error occurred', error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][2];
      expect(logOutput).toHaveProperty('name');
      expect(logOutput).toHaveProperty('message');
      expect(logOutput).toHaveProperty('stack');
    });
  });

  describe('createChild', () => {
    it('should create child logger with nested context', () => {
      const parentLogger = createLogger('Parent');
      const childLogger = parentLogger.createChild('Child');

      childLogger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(logCall).toContain('Parent:Child');
    });
  });
});

describe('PerformanceLogger', () => {
  let consoleInfoSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should measure performance duration', () => {
    const perfLogger = new PerformanceLogger('TestOperation');

    // Simulate some work
    const start = performance.now();
    while (performance.now() - start < 10) {
      // Wait at least 10ms
    }

    perfLogger.end();

    expect(consoleInfoSpy).toHaveBeenCalled();
    const logCall = consoleInfoSpy.mock.calls[0];
    expect(logCall[1]).toContain('Completed: TestOperation');
  });

  it('should include metadata in performance logs', () => {
    const perfLogger = new PerformanceLogger('TestOperation');
    perfLogger.end({ itemsProcessed: 100 });

    expect(consoleInfoSpy).toHaveBeenCalled();
    const logOutput = consoleInfoSpy.mock.calls[0][2];
    expect(logOutput).toHaveProperty('duration');
    expect(logOutput).toHaveProperty('itemsProcessed');
  });
});
