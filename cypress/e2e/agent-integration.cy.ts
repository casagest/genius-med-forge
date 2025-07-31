describe('Agent Integration & Real-time Updates', () => {
  it('should handle AgentMedic events and update both dashboards', () => {
    // Start with CEO dashboard
    cy.loginAsCEO();
    cy.get('[data-value="strategic"]').click();
    cy.waitForDashboard();

    // Get initial state
    cy.get('[data-testid="kpi-active-procedures"]').then(($el) => {
      const initialProcedures = parseInt($el.text().match(/\d+/)?.[0] || '0');

      // Simulate AgentMedic sending procedure start event
      cy.simulateAgentMedicEvents();

      // Verify CEO dashboard updates
      cy.verifyRealtimeUpdates();
      
      // Check that active procedures increased
      cy.get('[data-testid="kpi-active-procedures"]').should('contain', (initialProcedures + 1).toString());
      
      // Verify new procedure appears in timeline
      cy.get('[data-value="timeline"]').click();
      cy.get('[data-testid="procedure-case-001"]').should('exist');
      cy.get('[data-testid="procedure-case-001"]').should('contain', 'case-001');
    });

    // Switch to Lab Technician view
    cy.loginAsLabTech();
    cy.get('[data-value="smartlab"]').click();
    cy.waitForDashboard();

    // Verify same event updated lab queue
    cy.get('[data-testid="queue-item-case-001"]').should('exist');
    cy.get('[data-testid="queue-item-case-001"]').within(() => {
      cy.get('[data-testid="case-id"]').should('contain', 'case-001');
      cy.get('[data-testid="job-status"]').should('contain', 'PENDING');
      cy.get('[data-testid="priority-badge"]').should('be.visible');
    });

    // Verify materials were allocated
    cy.get('[data-testid="inventory-section"]').within(() => {
      cy.get('[data-testid="allocated-materials"]').should('contain', 'case-001');
    });
  });

  it('should handle multiple concurrent agent events', () => {
    cy.loginAsCEO();
    cy.get('[data-value="strategic"]').click();

    // Simulate multiple events rapidly
    const events = [
      { type: 'start_surgery', caseId: 'case-001' },
      { type: 'material_request', caseId: 'case-002' },
      { type: 'procedure_complete', caseId: 'case-003' },
    ];

    events.forEach((event, index) => {
      cy.window().then((win) => {
        const mockEvent = {
          type: 'medic:procedure_update',
          data: {
            eventType: event.type,
            caseId: event.caseId,
            appointmentId: `test-appt-${index + 1}`,
            timestamp: new Date().toISOString(),
          }
        };
        
        win.dispatchEvent(new CustomEvent('websocket-message', {
          detail: mockEvent
        }));
      });
    });

    // Wait for all updates to process
    cy.wait(2000);

    // Verify all events were processed
    events.forEach(event => {
      cy.get(`[data-testid="procedure-${event.caseId}"]`).should('exist');
    });

    // Check KPIs reflect all changes
    cy.get('[data-testid="kpi-active-procedures"]').should('contain', '3');
  });

  it('should handle WebSocket reconnection', () => {
    cy.loginAsCEO();
    cy.get('[data-value="strategic"]').click();

    // Verify initial connection
    cy.get('[data-testid="websocket-status"]').should('contain', 'Conectat');

    // Simulate connection loss
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('websocket-disconnected'));
    });

    // Verify disconnection indicator
    cy.get('[data-testid="websocket-status"]').should('contain', 'Reconectare');
    cy.get('[data-testid="connection-warning"]').should('be.visible');

    // Simulate reconnection
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('websocket-connected'));
    });

    // Verify reconnection
    cy.get('[data-testid="websocket-status"]').should('contain', 'Conectat');
    cy.get('[data-testid="connection-warning"]').should('not.exist');
  });

  it('should sync data between multiple browser tabs', () => {
    // This test simulates multiple tabs by using localStorage events
    cy.loginAsCEO();
    cy.get('[data-value="strategic"]').click();

    // Simulate data change from another tab
    cy.window().then((win) => {
      const newData = {
        kpis: {
          activeProcedures: 5,
          completionRate: 0.95,
          efficiency: 0.88
        },
        timestamp: new Date().toISOString()
      };
      
      // Simulate storage event from another tab
      win.dispatchEvent(new StorageEvent('storage', {
        key: 'realtime-kpis',
        newValue: JSON.stringify(newData),
        oldValue: null,
        storageArea: win.localStorage
      }));
    });

    // Verify UI updates with new data
    cy.get('[data-testid="kpi-active-procedures"]').should('contain', '5');
    cy.get('[data-testid="kpi-completion-rate"]').should('contain', '95%');
    cy.get('[data-testid="kpi-efficiency"]').should('contain', '88%');
  });

  it('should handle error states gracefully', () => {
    cy.loginAsCEO();
    cy.get('[data-value="strategic"]').click();

    // Simulate API error
    cy.intercept('GET', '**/rest/v1/analysis_reports**', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getReportsError');

    cy.get('[data-value="reports"]').click();
    cy.wait('@getReportsError');

    // Verify error handling
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Eroare la încărcarea rapoartelor');
    
    // Verify retry functionality
    cy.get('[data-testid="retry-btn"]').should('be.visible');
    cy.get('[data-testid="retry-btn"]').click();
    
    // Mock successful retry
    cy.intercept('GET', '**/rest/v1/analysis_reports**', { fixture: 'api/risk-reports.json' }).as('getReportsSuccess');
    cy.wait('@getReportsSuccess');
    
    // Verify data loads after retry
    cy.get('[data-testid="risk-report-card"]').should('have.length.at.least', 1);
    cy.get('[data-testid="error-message"]').should('not.exist');
  });
});