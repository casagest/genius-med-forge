describe('Lab Technician Dashboard - Production Queue', () => {
  beforeEach(() => {
    cy.loginAsLabTech();
  });

  it('should display lab production queue', () => {
    // Navigate to SmartLab tab
    cy.get('[data-value="smartlab"]').click();
    cy.waitForDashboard();

    // Verify production queue is visible
    cy.get('[data-testid="production-queue"]').should('be.visible');
    cy.get('[data-testid="queue-header"]').should('contain', 'Coadă Producție');

    // Check queue items
    cy.wait('@getLabQueue');
    cy.get('[data-testid="queue-item"]').should('have.length.at.least', 1);
  });

  it('should mark job as completed', () => {
    cy.get('[data-value="smartlab"]').click();
    cy.wait('@getLabQueue');

    // Find first pending job
    cy.get('[data-testid="queue-item"]').first().within(() => {
      // Verify job is in pending state
      cy.get('[data-testid="job-status"]').should('contain', 'PENDING');
      
      // Click start button
      cy.get('[data-testid="start-job-btn"]').click();
      
      // Job should now be in progress
      cy.get('[data-testid="job-status"]').should('contain', 'IN_PROGRESS');
      
      // Complete the job
      cy.get('[data-testid="complete-job-btn"]').click();
    });

    // Verify completion modal appears
    cy.get('[data-testid="completion-modal"]').should('be.visible');
    cy.get('[data-testid="quality-check"]').check();
    cy.get('[data-testid="notes-input"]').type('Job completed successfully');
    cy.get('[data-testid="confirm-completion-btn"]').click();

    // Verify job status updated
    cy.get('[data-testid="queue-item"]').first().within(() => {
      cy.get('[data-testid="job-status"]').should('contain', 'COMPLETED');
    });
  });

  it('should display real-time queue updates', () => {
    cy.get('[data-value="smartlab"]').click();
    cy.wait('@getLabQueue');

    // Get initial queue count
    cy.get('[data-testid="queue-counter"]').then(($counter) => {
      const initialCount = parseInt($counter.text());

      // Simulate new job added by AgentMedic
      cy.simulateAgentMedicEvents();

      // Verify queue counter updated
      cy.get('[data-testid="queue-counter"]').should('contain', (initialCount + 1).toString());
      
      // Verify new job appears in queue
      cy.get('[data-testid="queue-item-case-001"]').should('exist');
    });
  });

  it('should show material inventory status', () => {
    cy.get('[data-value="smartlab"]').click();

    // Check inventory section
    cy.get('[data-testid="inventory-section"]').should('be.visible');
    cy.get('[data-testid="material-item"]').should('have.length.at.least', 1);

    // Verify material details
    cy.get('[data-testid="material-item"]').first().within(() => {
      cy.get('[data-testid="material-name"]').should('be.visible');
      cy.get('[data-testid="stock-level"]').should('be.visible');
      cy.get('[data-testid="stock-status"]').should('be.visible');
    });

    // Check low stock alerts
    cy.get('[data-testid="low-stock-alert"]').should('be.visible');
  });

  it('should filter and sort production queue', () => {
    cy.get('[data-value="smartlab"]').click();
    cy.wait('@getLabQueue');

    // Test priority filter
    cy.get('[data-testid="priority-filter"]').select('HIGH');
    cy.get('[data-testid="queue-item"]').each(($el) => {
      cy.wrap($el).find('[data-testid="priority-badge"]').should('contain', 'HIGH');
    });

    // Test status filter
    cy.get('[data-testid="status-filter"]').select('PENDING');
    cy.get('[data-testid="queue-item"]').each(($el) => {
      cy.wrap($el).find('[data-testid="job-status"]').should('contain', 'PENDING');
    });

    // Test sorting
    cy.get('[data-testid="sort-dropdown"]').select('priority-desc');
    
    // Verify items are sorted by priority
    cy.get('[data-testid="priority-badge"]').then(($badges) => {
      const priorities = Array.from($badges).map(el => el.textContent);
      const sortedPriorities = [...priorities].sort().reverse();
      expect(priorities).to.deep.equal(sortedPriorities);
    });
  });

  it('should handle equipment maintenance alerts', () => {
    cy.get('[data-value="smartlab"]').click();

    // Check maintenance alerts section
    cy.get('[data-testid="maintenance-alerts"]').should('be.visible');
    
    // Verify maintenance item details
    cy.get('[data-testid="maintenance-item"]').first().within(() => {
      cy.get('[data-testid="equipment-name"]').should('be.visible');
      cy.get('[data-testid="maintenance-type"]').should('be.visible');
      cy.get('[data-testid="due-date"]').should('be.visible');
    });

    // Test acknowledge maintenance alert
    cy.get('[data-testid="acknowledge-maintenance-btn"]').first().click();
    cy.get('[data-testid="maintenance-modal"]').should('be.visible');
    cy.get('[data-testid="maintenance-notes"]').type('Maintenance scheduled');
    cy.get('[data-testid="confirm-maintenance-btn"]').click();
  });
});