/**
 * Test Setup File
 *
 * Global setup for all tests
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock import.meta.env for tests
vi.stubGlobal('import', {
  meta: {
    env: {
      MODE: 'test',
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_ENVIRONMENT: 'test',
      VITE_LOG_LEVEL: 'error',
    },
  },
});
