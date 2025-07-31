/// <reference types="cypress" />

// Custom commands for GENIUS MedicalCor AI testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as CEO user
       */
      loginAsCEO(): Chainable<void>;
      
      /**
       * Login as Lab Technician
       */
      loginAsLabTech(): Chainable<void>;
      
      /**
       * Wait for dashboard to load completely
       */
      waitForDashboard(): Chainable<void>;
      
      /**
       * Simulate AgentMedic sending events
       */
      simulateAgentMedicEvents(): Chainable<void>;
      
      /**
       * Check real-time data updates
       */
      verifyRealtimeUpdates(): Chainable<void>;
    }
  }
}

// CEO Login command
Cypress.Commands.add('loginAsCEO', () => {
  cy.visit('/');
  
  // Mock authentication state
  cy.window().then((win) => {
    win.localStorage.setItem('sb-sosiozakhzrnapvxrtrb-auth-token', JSON.stringify({
      access_token: 'mock-ceo-token',
      user: {
        id: 'ceo-user-id',
        email: 'ceo@genius-medical.com',
        role: 'CEO'
      }
    }));
  });
  
  cy.reload();
  cy.get('[data-testid="app-header"]').should('contain', 'GENIUS MedicalCor AI');
});

// Lab Technician Login command
Cypress.Commands.add('loginAsLabTech', () => {
  cy.visit('/');
  
  // Mock authentication state
  cy.window().then((win) => {
    win.localStorage.setItem('sb-sosiozakhzrnapvxrtrb-auth-token', JSON.stringify({
      access_token: 'mock-labtech-token',
      user: {
        id: 'labtech-user-id',
        email: 'tech@genius-medical.com',
        role: 'LAB_TECHNICIAN'
      }
    }));
  });
  
  cy.reload();
  cy.get('[data-testid="app-header"]').should('contain', 'GENIUS MedicalCor AI');
});

// Wait for dashboard to load
Cypress.Commands.add('waitForDashboard', () => {
  cy.get('[data-testid="dashboard-loaded"]', { timeout: 10000 }).should('exist');
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

// Simulate AgentMedic events
Cypress.Commands.add('simulateAgentMedicEvents', () => {
  cy.window().then((win) => {
    // Simulate WebSocket message from AgentMedic
    const mockEvent = {
      type: 'medic:procedure_update',
      data: {
        eventType: 'start_surgery',
        appointmentId: 'test-appt-123',
        caseId: 'case-001',
        patientEta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDurationMinutes: 90,
      }
    };
    
    // Trigger custom event to simulate WebSocket message
    win.dispatchEvent(new CustomEvent('websocket-message', {
      detail: mockEvent
    }));
  });
});

// Verify real-time updates
Cypress.Commands.add('verifyRealtimeUpdates', () => {
  // Check that KPIs are updated
  cy.get('[data-testid="kpi-active-procedures"]').should('contain', '1');
  
  // Check that new procedures appear
  cy.get('[data-testid="procedure-case-001"]').should('exist');
  
  // Verify timeline updates
  cy.get('[data-testid="procedure-timeline"]').should('contain', 'În curs');
});