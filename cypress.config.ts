import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshot: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
  env: {
    SUPABASE_URL: 'https://sosiozakhzrnapvxrtrb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2lvemFraHpybmFwdnhydHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzY4NTgsImV4cCI6MjA2OTU1Mjg1OH0.IawV0L49n590JCMDZ1Fy9KzcxMKRb6HHyudanZBQRP0'
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});