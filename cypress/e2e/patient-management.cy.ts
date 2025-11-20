describe('Patient Management', () => {
  beforeEach(() => {
    cy.loginAsCEO();
  });

  describe('Patient List and Search', () => {
    beforeEach(() => {
      // Mock patients list endpoint
      cy.intercept('GET', '**/rest/v1/patients**', {
        fixture: 'api/patients-list.json'
      }).as('getPatients');

      cy.get('[data-value="patients"]').click();
      cy.wait('@getPatients');
    });

    it('should display patient list', () => {
      // Verify patients table visible
      cy.get('[data-testid="patients-table"]').should('be.visible');
      cy.get('[data-testid="patient-row"]').should('have.length.at.least', 1);

      // Verify table columns
      cy.get('[data-testid="table-header-code"]').should('contain', 'Cod Pacient');
      cy.get('[data-testid="table-header-name"]').should('contain', 'Nume');
      cy.get('[data-testid="table-header-age"]').should('contain', 'Vârstă');
      cy.get('[data-testid="table-header-status"]').should('contain', 'Status');
    });

    it('should search patients by name', () => {
      cy.get('[data-testid="patient-search-input"]').type('Popescu');

      // Verify filtered results
      cy.get('[data-testid="patient-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'Popescu');
      });
    });

    it('should search patients by code', () => {
      cy.get('[data-testid="patient-search-input"]').type('P123456');

      // Should find specific patient
      cy.get('[data-testid="patient-row"]').should('have.length', 1);
      cy.get('[data-testid="patient-row"]').should('contain', 'P123456');
    });

    it('should filter patients by status', () => {
      cy.get('[data-testid="status-filter"]').select('ACTIVE');

      // All visible patients should be active
      cy.get('[data-testid="patient-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="status-badge"]').should('contain', 'ACTIV');
      });
    });

    it('should sort patients by different columns', () => {
      // Sort by name ascending
      cy.get('[data-testid="table-header-name"]').click();

      // Verify sorting
      cy.get('[data-testid="patient-name"]').then(($names) => {
        const names = Array.from($names).map(el => el.textContent || '');
        const sortedNames = [...names].sort();
        expect(names).to.deep.equal(sortedNames);
      });

      // Sort by name descending
      cy.get('[data-testid="table-header-name"]').click();

      cy.get('[data-testid="patient-name"]').then(($names) => {
        const names = Array.from($names).map(el => el.textContent || '');
        const sortedNames = [...names].sort().reverse();
        expect(names).to.deep.equal(sortedNames);
      });
    });

    it('should paginate through patient list', () => {
      // Check pagination controls
      cy.get('[data-testid="pagination-info"]').should('be.visible');
      cy.get('[data-testid="pagination-next"]').should('be.visible');

      // Go to next page
      cy.get('[data-testid="pagination-next"]').click();

      // Verify page changed
      cy.get('[data-testid="pagination-current"]').should('contain', '2');

      // Verify different patients loaded
      cy.get('[data-testid="patient-row"]').should('exist');
    });
  });

  describe('Patient Details View', () => {
    it('should open patient detail view', () => {
      cy.intercept('GET', '**/rest/v1/patients**', { fixture: 'api/patients-list.json' }).as('getPatients');
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.wait('@getPatients');

      // Click on first patient
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Verify detail view opened
      cy.get('[data-testid="patient-detail-panel"]').should('be.visible');
      cy.get('[data-testid="patient-detail-name"]').should('be.visible');
      cy.get('[data-testid="patient-detail-code"]').should('be.visible');
    });

    it('should display complete patient information', () => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Verify all sections present
      cy.get('[data-testid="patient-personal-info"]').should('be.visible');
      cy.get('[data-testid="patient-medical-history"]').should('be.visible');
      cy.get('[data-testid="patient-procedures"]').should('be.visible');
      cy.get('[data-testid="patient-medications"]').should('be.visible');
      cy.get('[data-testid="patient-allergies"]').should('be.visible');
    });

    it('should show patient medical history timeline', () => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Open medical history tab
      cy.get('[data-testid="tab-medical-history"]').click();

      // Verify timeline visible
      cy.get('[data-testid="medical-timeline"]').should('be.visible');
      cy.get('[data-testid="timeline-event"]').should('have.length.at.least', 1);

      // Check timeline event details
      cy.get('[data-testid="timeline-event"]').first().within(() => {
        cy.get('[data-testid="event-date"]').should('be.visible');
        cy.get('[data-testid="event-type"]').should('be.visible');
        cy.get('[data-testid="event-description"]').should('be.visible');
      });
    });

    it('should display patient risk assessment', () => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Check risk assessment section
      cy.get('[data-testid="patient-risk-assessment"]').should('be.visible');
      cy.get('[data-testid="overall-risk-score"]').should('be.visible');
      cy.get('[data-testid="risk-factors-list"]').should('be.visible');
    });

    it('should show patient procedures history', () => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');
      cy.intercept('GET', '**/rest/v1/procedures?patient_id=patient-123**', { fixture: 'api/patient-procedures.json' }).as('getPatientProcedures');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Open procedures tab
      cy.get('[data-testid="tab-procedures"]').click();
      cy.wait('@getPatientProcedures');

      // Verify procedures list
      cy.get('[data-testid="procedure-item"]').should('have.length.at.least', 1);

      // Check procedure details
      cy.get('[data-testid="procedure-item"]').first().within(() => {
        cy.get('[data-testid="procedure-date"]').should('be.visible');
        cy.get('[data-testid="procedure-type"]').should('be.visible');
        cy.get('[data-testid="procedure-status"]').should('be.visible');
      });
    });
  });

  describe('Add New Patient', () => {
    it('should open new patient form', () => {
      cy.get('[data-value="patients"]').click();

      cy.get('[data-testid="add-patient-btn"]').click();

      // Verify form opened
      cy.get('[data-testid="new-patient-form"]').should('be.visible');
      cy.get('[data-testid="patient-form-title"]').should('contain', 'Pacient Nou');
    });

    it('should validate required fields', () => {
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="add-patient-btn"]').click();

      // Try to submit empty form
      cy.get('[data-testid="save-patient-btn"]').click();

      // Verify validation errors
      cy.get('[data-testid="name-error"]').should('be.visible');
      cy.get('[data-testid="birthdate-error"]').should('be.visible');
      cy.get('[data-testid="phone-error"]').should('be.visible');
    });

    it('should successfully create new patient', () => {
      cy.intercept('POST', '**/rest/v1/patients**', {
        statusCode: 201,
        body: {
          id: 'new-patient-id',
          patient_code: 'P999999',
          name: 'Test Patient'
        }
      }).as('createPatient');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="add-patient-btn"]').click();

      // Fill in form
      cy.get('[data-testid="patient-name-input"]').type('Test Patient');
      cy.get('[data-testid="patient-birthdate-input"]').type('1980-05-15');
      cy.get('[data-testid="patient-phone-input"]').type('0712345678');
      cy.get('[data-testid="patient-email-input"]').type('test@example.com');
      cy.get('[data-testid="patient-address-input"]').type('Str. Test, Nr. 1, București');

      // Add medical history
      cy.get('[data-testid="add-medical-condition-btn"]').click();
      cy.get('[data-testid="condition-name-input"]').type('Hipertensiune');
      cy.get('[data-testid="condition-notes-input"]').type('Sub tratament');
      cy.get('[data-testid="save-condition-btn"]').click();

      // Add allergies
      cy.get('[data-testid="add-allergy-btn"]').click();
      cy.get('[data-testid="allergy-substance-input"]').type('Penicilină');
      cy.get('[data-testid="allergy-severity-select"]').select('MODERATE');
      cy.get('[data-testid="save-allergy-btn"]').click();

      // Submit form
      cy.get('[data-testid="save-patient-btn"]').click();
      cy.wait('@createPatient');

      // Verify success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
      cy.get('[data-testid="success-toast"]').should('contain', 'Pacient adăugat cu succes');

      // Verify redirected to patient details
      cy.get('[data-testid="patient-detail-panel"]').should('be.visible');
      cy.get('[data-testid="patient-detail-code"]').should('contain', 'P999999');
    });

    it('should auto-generate patient code', () => {
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="add-patient-btn"]').click();

      // Patient code field should be auto-populated
      cy.get('[data-testid="patient-code-display"]').should('not.be.empty');
      cy.get('[data-testid="patient-code-display"]').should('match', /P\d{6}/);
    });

    it('should validate phone number format', () => {
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="add-patient-btn"]').click();

      // Enter invalid phone number
      cy.get('[data-testid="patient-phone-input"]').type('123');
      cy.get('[data-testid="save-patient-btn"]').click();

      // Verify validation error
      cy.get('[data-testid="phone-error"]').should('be.visible');
      cy.get('[data-testid="phone-error"]').should('contain', 'format invalid');
    });

    it('should validate email format', () => {
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="add-patient-btn"]').click();

      // Enter invalid email
      cy.get('[data-testid="patient-email-input"]').type('invalid-email');
      cy.get('[data-testid="save-patient-btn"]').click();

      // Verify validation error
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="email-error"]').should('contain', 'Email invalid');
    });
  });

  describe('Edit Patient', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/patients**', { fixture: 'api/patients-list.json' }).as('getPatients');
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.wait('@getPatients');
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');
    });

    it('should open edit form', () => {
      cy.get('[data-testid="edit-patient-btn"]').click();

      // Verify form opened with existing data
      cy.get('[data-testid="edit-patient-form"]').should('be.visible');
      cy.get('[data-testid="patient-name-input"]').should('not.have.value', '');
    });

    it('should update patient information', () => {
      cy.intercept('PATCH', '**/rest/v1/patients/patient-123**', {
        statusCode: 200,
        body: { id: 'patient-123', name: 'Updated Name' }
      }).as('updatePatient');

      cy.get('[data-testid="edit-patient-btn"]').click();

      // Update phone number
      cy.get('[data-testid="patient-phone-input"]').clear().type('0799999999');

      // Update address
      cy.get('[data-testid="patient-address-input"]').clear().type('New Address 123');

      // Save changes
      cy.get('[data-testid="save-changes-btn"]').click();
      cy.wait('@updatePatient');

      // Verify success
      cy.get('[data-testid="success-toast"]').should('contain', 'actualizat');
    });

    it('should add new medical condition to existing patient', () => {
      cy.get('[data-testid="tab-medical-history"]').click();
      cy.get('[data-testid="add-medical-condition-btn"]').click();

      cy.get('[data-testid="condition-name-input"]').type('Diabet zaharat tip 2');
      cy.get('[data-testid="diagnosis-date-input"]').type('2024-11-20');
      cy.get('[data-testid="condition-notes-input"]').type('Nou diagnosticat');
      cy.get('[data-testid="save-condition-btn"]').click();

      // Verify condition added
      cy.get('[data-testid="medical-condition-item"]').should('contain', 'Diabet zaharat tip 2');
    });

    it('should remove medical condition', () => {
      cy.get('[data-testid="tab-medical-history"]').click();

      // Find a condition and remove it
      cy.get('[data-testid="medical-condition-item"]').first().within(() => {
        cy.get('[data-testid="remove-condition-btn"]').click();
      });

      // Confirm deletion
      cy.get('[data-testid="confirm-delete-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-delete-btn"]').click();

      // Verify condition removed
      cy.get('[data-testid="success-toast"]').should('contain', 'șters');
    });

    it('should update medications list', () => {
      cy.get('[data-testid="tab-medications"]').click();
      cy.get('[data-testid="add-medication-btn"]').click();

      cy.get('[data-testid="medication-name-input"]').type('Metformin');
      cy.get('[data-testid="medication-dosage-input"]').type('500mg');
      cy.get('[data-testid="medication-frequency-select"]').select('2x/zi');
      cy.get('[data-testid="save-medication-btn"]').click();

      // Verify medication added
      cy.get('[data-testid="medication-item"]').should('contain', 'Metformin');
    });
  });

  describe('Patient 3D Viewer', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');
    });

    it('should open 3D dental viewer', () => {
      cy.get('[data-testid="open-3d-viewer-btn"]').click();

      // Verify 3D viewer loaded
      cy.get('[data-testid="patient-3d-viewer"]').should('be.visible');
      cy.get('[data-testid="3d-canvas"]').should('be.visible');
    });

    it('should display dental chart with procedure markers', () => {
      cy.get('[data-testid="open-3d-viewer-btn"]').click();

      // Verify dental chart visible
      cy.get('[data-testid="dental-chart"]').should('be.visible');

      // Verify procedure markers
      cy.get('[data-testid="tooth-marker"]').should('have.length.at.least', 1);

      // Check marker colors indicate status
      cy.get('[data-testid="tooth-marker-completed"]').should('exist');
      cy.get('[data-testid="tooth-marker-planned"]').should('exist');
    });

    it('should allow rotating 3D model', () => {
      cy.get('[data-testid="open-3d-viewer-btn"]').click();

      // Test rotation controls
      cy.get('[data-testid="rotate-left-btn"]').click();
      cy.get('[data-testid="rotate-right-btn"]').click();
      cy.get('[data-testid="rotate-up-btn"]').click();
      cy.get('[data-testid="rotate-down-btn"]').click();

      // Verify viewer still visible (no crashes)
      cy.get('[data-testid="3d-canvas"]').should('be.visible');
    });

    it('should zoom in and out of 3D model', () => {
      cy.get('[data-testid="open-3d-viewer-btn"]').click();

      // Test zoom controls
      cy.get('[data-testid="zoom-in-btn"]').click();
      cy.get('[data-testid="zoom-out-btn"]').click();
      cy.get('[data-testid="reset-view-btn"]').click();

      // Verify viewer functional
      cy.get('[data-testid="3d-canvas"]').should('be.visible');
    });

    it('should show tooth details on click', () => {
      cy.get('[data-testid="open-3d-viewer-btn"]').click();

      // Click on a tooth
      cy.get('[data-testid="tooth-marker"]').first().click();

      // Verify tooth details panel
      cy.get('[data-testid="tooth-details-panel"]').should('be.visible');
      cy.get('[data-testid="tooth-number"]').should('be.visible');
      cy.get('[data-testid="tooth-status"]').should('be.visible');
      cy.get('[data-testid="tooth-procedures-history"]').should('be.visible');
    });
  });

  describe('Export and Print', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');
    });

    it('should export patient data to PDF', () => {
      cy.get('[data-testid="export-menu-trigger"]').click();
      cy.get('[data-testid="export-pdf-btn"]').click();

      // Verify download initiated (check for toast or file download)
      cy.get('[data-testid="success-toast"]').should('contain', 'export');
    });

    it('should print patient record', () => {
      // Stub print dialog
      cy.window().then((win) => {
        cy.stub(win, 'print');
      });

      cy.get('[data-testid="print-patient-btn"]').click();

      // Verify print was called
      cy.window().its('print').should('be.called');
    });

    it('should export patient list to CSV', () => {
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="export-patients-list-btn"]').click();
      cy.get('[data-testid="export-csv-option"]').click();

      // Verify export initiated
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });

  describe('Patient Deactivation', () => {
    it('should deactivate patient account', () => {
      cy.intercept('GET', '**/rest/v1/patients/patient-123**', { fixture: 'api/patient-details.json' }).as('getPatientDetails');
      cy.intercept('PATCH', '**/rest/v1/patients/patient-123**', {
        statusCode: 200,
        body: { id: 'patient-123', status: 'INACTIVE' }
      }).as('deactivatePatient');

      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="patient-row"]').first().click();
      cy.wait('@getPatientDetails');

      // Open patient menu
      cy.get('[data-testid="patient-menu-trigger"]').click();
      cy.get('[data-testid="deactivate-patient-btn"]').click();

      // Confirm deactivation
      cy.get('[data-testid="confirm-deactivation-modal"]').should('be.visible');
      cy.get('[data-testid="deactivation-reason-select"]').select('Patient moved');
      cy.get('[data-testid="confirm-deactivate-btn"]').click();

      cy.wait('@deactivatePatient');

      // Verify success
      cy.get('[data-testid="success-toast"]').should('contain', 'dezactivat');
    });

    it('should reactivate deactivated patient', () => {
      cy.intercept('PATCH', '**/rest/v1/patients/patient-inactive**', {
        statusCode: 200,
        body: { id: 'patient-inactive', status: 'ACTIVE' }
      }).as('reactivatePatient');

      // Find inactive patient
      cy.get('[data-value="patients"]').click();
      cy.get('[data-testid="status-filter"]').select('INACTIVE');

      cy.get('[data-testid="patient-row"]').first().click();
      cy.get('[data-testid="reactivate-patient-btn"]').click();

      // Confirm reactivation
      cy.get('[data-testid="confirm-reactivation-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-reactivate-btn"]').click();

      cy.wait('@reactivatePatient');

      // Verify success
      cy.get('[data-testid="success-toast"]').should('contain', 'reactivat');
    });
  });
});
