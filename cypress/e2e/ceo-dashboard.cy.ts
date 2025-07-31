describe('CEO Dashboard - Strategic Operations', () => {
  beforeEach(() => {
    cy.loginAsCEO();
  });

  it('should display main dashboard components', () => {
    // Verify main navigation
    cy.get('[data-value="strategic"]').click();
    cy.waitForDashboard();

    // Check KPI cards
    cy.get('[data-testid="kpi-dashboard"]').should('be.visible');
    cy.get('[data-testid="kpi-active-procedures"]').should('contain.text', 'Proceduri Active');
    cy.get('[data-testid="kpi-completion-rate"]').should('contain.text', 'Rata Completare');
    cy.get('[data-testid="kpi-efficiency"]').should('contain.text', 'Eficiență Generală');

    // Verify tabs are present
    cy.get('[role="tablist"]').should('be.visible');
    cy.get('[data-value="timeline"]').should('contain', 'Timeline Critic');
    cy.get('[data-value="procurement"]').should('contain', 'Smart Procurement');
    cy.get('[data-value="reports"]').should('contain', 'Risk Reports');
    cy.get('[data-value="analytics"]').should('contain', 'AI Analytics');
  });

  it('should filter risk reports correctly', () => {
    // Navigate to risk reports tab
    cy.get('[data-value="strategic"]').click();
    cy.get('[data-value="reports"]').click();

    // Wait for risk reports to load
    cy.wait('@getRiskReports');

    // Test score filter
    cy.get('[data-testid="risk-score-slider"]').should('be.visible');
    cy.get('[data-testid="risk-score-slider"]').invoke('val', 0.7).trigger('change');

    // Test action required filter
    cy.get('[data-testid="action-required-toggle"]').click();
    cy.get('[data-testid="action-required-toggle"]').should('have.attr', 'data-state', 'on');

    // Test date filters
    cy.get('[data-testid="date-from-picker"]').click();
    cy.get('[data-testid="calendar"]').should('be.visible');
    cy.get('[aria-label="Go to today"]').click();

    // Verify filtered results
    cy.get('[data-testid="risk-report-card"]').should('have.length.at.least', 1);
    
    // Test clear filters
    cy.get('[data-testid="clear-filters-btn"]').click();
    cy.get('[data-testid="risk-score-slider"]').should('have.value', '1');
  });

  it('should show real-time KPI updates', () => {
    cy.get('[data-value="strategic"]').click();
    cy.waitForDashboard();

    // Get initial KPI values
    cy.get('[data-testid="kpi-active-procedures"]').then(($el) => {
      const initialValue = $el.text();
      
      // Simulate real-time update
      cy.simulateAgentMedicEvents();
      
      // Verify KPI updated
      cy.get('[data-testid="kpi-active-procedures"]').should('not.contain', initialValue);
    });
  });

  it('should handle WebSocket connection status', () => {
    cy.get('[data-value="strategic"]').click();
    
    // Check connection indicator
    cy.get('[data-testid="websocket-status"]').should('be.visible');
    cy.get('[data-testid="websocket-status"]').should('contain', 'Conectat');
    
    // Verify real-time badge appears when connected
    cy.get('[data-testid="realtime-badge"]').should('be.visible');
    cy.get('[data-testid="realtime-badge"]').should('contain', 'LIVE');
  });

  it('should navigate between different tabs smoothly', () => {
    cy.get('[data-value="strategic"]').click();
    
    // Test tab navigation
    const tabs = ['timeline', 'procurement', 'reports', 'analytics'];
    
    tabs.forEach(tab => {
      cy.get(`[data-value="${tab}"]`).click();
      cy.get(`[data-value="${tab}"]`).should('have.attr', 'data-state', 'active');
      
      // Verify tab content loads
      cy.get('[data-testid="tab-content"]').should('be.visible');
    });
  });

  it('should display AI analytics and explainable AI', () => {
    cy.get('[data-value="strategic"]').click();
    cy.get('[data-value="analytics"]').click();

    // Check AI performance metrics
    cy.get('[data-testid="ai-performance-card"]').should('be.visible');
    cy.get('[data-testid="prediction-accuracy"]').should('contain', '%');
    cy.get('[data-testid="response-time"]').should('contain', 'ms');

    // Check explainable AI feed
    cy.get('[data-testid="explainable-ai-feed"]').should('be.visible');
    cy.get('[data-testid="ai-decision-explanation"]').should('have.length.at.least', 1);
  });
});