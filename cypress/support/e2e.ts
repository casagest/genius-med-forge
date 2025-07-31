// Import commands.js using ES2015 syntax:
import './commands';
import '@testing-library/cypress/add-commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global before hook to setup test environment
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage();
  
  // Set up intercepts for API calls
  cy.intercept('POST', '**/auth/v1/token**', { fixture: 'auth/login.json' }).as('login');
  cy.intercept('GET', '**/rest/v1/analysis_reports**', { fixture: 'api/risk-reports.json' }).as('getRiskReports');
  cy.intercept('GET', '**/rest/v1/active_procedures**', { fixture: 'api/procedures.json' }).as('getProcedures');
  cy.intercept('GET', '**/rest/v1/lab_production_queue**', { fixture: 'api/lab-queue.json' }).as('getLabQueue');

  // Mock WebSocket connections
  cy.window().then((win) => {
    // Stub WebSocket to prevent real connections during tests
    cy.stub(win, 'WebSocket').returns({
      close: cy.stub(),
      send: cy.stub(),
      addEventListener: cy.stub(),
      removeEventListener: cy.stub(),
      readyState: 1, // OPEN
    });
  });
});