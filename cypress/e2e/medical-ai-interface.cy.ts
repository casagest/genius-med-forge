describe('Medical AI Interface', () => {
  beforeEach(() => {
    cy.loginAsCEO();
    cy.get('[data-value="medic"]').click();
    cy.waitForDashboard();
  });

  describe('AI Input and Analysis', () => {
    it('should display AI interface components', () => {
      // Verify main components are visible
      cy.get('[data-testid="medical-ai-interface"]').should('be.visible');
      cy.get('[data-testid="patient-input-form"]').should('be.visible');
      cy.get('[data-testid="ai-analysis-panel"]').should('be.visible');
      cy.get('[data-testid="ai-recommendations"]').should('be.visible');
    });

    it('should accept patient medical data input', () => {
      // Fill in patient data
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="patient-name-input"]').type('Ion Popescu');
      cy.get('[data-testid="procedure-type-select"]').select('Implant dentar');

      // Add medical history
      cy.get('[data-testid="add-medical-history-btn"]').click();
      cy.get('[data-testid="medical-condition-input"]').type('Diabet zaharat tip 2');
      cy.get('[data-testid="condition-severity-select"]').select('Controlat');
      cy.get('[data-testid="save-condition-btn"]').click();

      // Verify data was added
      cy.get('[data-testid="medical-history-item"]').should('contain', 'Diabet zaharat tip 2');
    });

    it('should trigger AI analysis and display results', () => {
      // Mock AI analysis endpoint
      cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
        statusCode: 200,
        body: {
          risk_score: 0.75,
          risk_level: 'HIGH',
          risk_factors: [
            {
              factor: 'Istoric medical complex',
              weight: 0.35,
              description: 'Pacient cu diabet zaharat tip 2'
            },
            {
              factor: 'Complexitate procedură',
              weight: 0.30,
              description: 'Implant cu grefă osoasă necesară'
            }
          ],
          recommendations: [
            'Consultație pre-operatorie extinsă',
            'Monitorizare glicemie 24h pre și post-operator',
            'Protocol antibiotic profilactic modificat'
          ],
          confidence: 0.92,
          processing_time_ms: 245
        }
      }).as('aiAnalysis');

      // Fill minimal data and submit
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="procedure-type-select"]').select('Implant dentar');
      cy.get('[data-testid="analyze-btn"]').click();

      // Wait for AI analysis
      cy.wait('@aiAnalysis');

      // Verify results displayed
      cy.get('[data-testid="ai-analysis-result"]').should('be.visible');
      cy.get('[data-testid="risk-score-display"]').should('contain', '75%');
      cy.get('[data-testid="risk-level-badge"]').should('contain', 'HIGH');
      cy.get('[data-testid="risk-level-badge"]').should('have.class', 'risk-high');
    });

    it('should display risk factors with explanations', () => {
      // Trigger analysis (using helper command or fixture)
      cy.fixture('ai/analysis-result-high-risk.json').then((analysisResult) => {
        cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
          body: analysisResult
        }).as('aiAnalysis');
      });

      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();
      cy.wait('@aiAnalysis');

      // Check risk factors section
      cy.get('[data-testid="risk-factors-section"]').should('be.visible');
      cy.get('[data-testid="risk-factor-item"]').should('have.length.at.least', 1);

      // Verify each risk factor shows details
      cy.get('[data-testid="risk-factor-item"]').first().within(() => {
        cy.get('[data-testid="factor-name"]').should('be.visible');
        cy.get('[data-testid="factor-weight"]').should('be.visible');
        cy.get('[data-testid="factor-description"]').should('be.visible');
      });

      // Test expand/collapse of detailed explanation
      cy.get('[data-testid="risk-factor-item"]').first().click();
      cy.get('[data-testid="factor-detailed-explanation"]').should('be.visible');
    });

    it('should show AI confidence score', () => {
      cy.fixture('ai/analysis-result-high-risk.json').then((analysisResult) => {
        cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
          body: analysisResult
        }).as('aiAnalysis');
      });

      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();
      cy.wait('@aiAnalysis');

      // Verify confidence score displayed
      cy.get('[data-testid="ai-confidence-score"]').should('be.visible');
      cy.get('[data-testid="ai-confidence-score"]').should('contain', '92%');

      // Check confidence indicator
      cy.get('[data-testid="confidence-indicator"]').should('have.class', 'confidence-high');
    });

    it('should provide actionable recommendations', () => {
      cy.fixture('ai/analysis-result-high-risk.json').then((analysisResult) => {
        cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
          body: analysisResult
        }).as('aiAnalysis');
      });

      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();
      cy.wait('@aiAnalysis');

      // Verify recommendations section
      cy.get('[data-testid="ai-recommendations"]').should('be.visible');
      cy.get('[data-testid="recommendation-item"]').should('have.length.at.least', 1);

      // Each recommendation should have action button
      cy.get('[data-testid="recommendation-item"]').first().within(() => {
        cy.get('[data-testid="recommendation-text"]').should('be.visible');
        cy.get('[data-testid="accept-recommendation-btn"]').should('be.visible');
        cy.get('[data-testid="dismiss-recommendation-btn"]').should('be.visible');
      });

      // Test accepting a recommendation
      cy.get('[data-testid="accept-recommendation-btn"]').first().click();
      cy.get('[data-testid="recommendation-accepted-badge"]').should('be.visible');
    });
  });

  describe('Voice Interface Integration', () => {
    it('should enable voice input for patient data', () => {
      // Check voice button is present
      cy.get('[data-testid="voice-input-btn"]').should('be.visible');

      // Mock microphone permission
      cy.window().then((win) => {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
          getTracks: () => [],
          getAudioTracks: () => [],
          getVideoTracks: () => []
        });
      });

      // Start voice input
      cy.get('[data-testid="voice-input-btn"]').click();

      // Verify recording indicator
      cy.get('[data-testid="recording-indicator"]').should('be.visible');
      cy.get('[data-testid="recording-indicator"]').should('contain', 'Ascultare...');
    });

    it('should transcribe voice to text', () => {
      // Mock voice-to-text endpoint
      cy.intercept('POST', '**/functions/v1/voice-to-text**', {
        statusCode: 200,
        body: {
          transcript: 'Pacient Ion Popescu, cod P123456, diabet zaharat tip 2',
          confidence: 0.95
        }
      }).as('voiceToText');

      cy.get('[data-testid="voice-input-btn"]').click();

      // Simulate voice input end
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('voice-input-complete', {
          detail: { audioData: 'mock-audio-data' }
        }));
      });

      cy.wait('@voiceToText');

      // Verify transcript populated fields
      cy.get('[data-testid="patient-name-input"]').should('have.value', 'Ion Popescu');
      cy.get('[data-testid="patient-code-input"]').should('have.value', 'P123456');
    });

    it('should handle voice input errors', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects(new Error('Permission denied'));
      });

      cy.get('[data-testid="voice-input-btn"]').click();

      // Verify error message
      cy.get('[data-testid="voice-error-message"]').should('be.visible');
      cy.get('[data-testid="voice-error-message"]').should('contain', 'microfon');
    });
  });

  describe('Real-time AI Feedback', () => {
    it('should show live AI suggestions as user types', () => {
      // Mock real-time suggestion endpoint
      cy.intercept('POST', '**/functions/v1/ai-suggestions**', {
        statusCode: 200,
        body: {
          suggestions: [
            'Verificați istoric alergii',
            'Considerați consultație cardiolog'
          ]
        }
      }).as('aiSuggestions');

      // Type in medical history
      cy.get('[data-testid="medical-history-textarea"]').type('Pacient cu hipertensiune');

      // Wait for debounced AI request
      cy.wait(1000);
      cy.wait('@aiSuggestions');

      // Verify suggestions displayed
      cy.get('[data-testid="ai-suggestion"]').should('be.visible');
      cy.get('[data-testid="ai-suggestion"]').should('contain', 'Verificați istoric alergii');
    });

    it('should highlight potential drug interactions', () => {
      // Add medication
      cy.get('[data-testid="add-medication-btn"]').click();
      cy.get('[data-testid="medication-input"]').type('Warfarin');
      cy.get('[data-testid="save-medication-btn"]').click();

      // Mock interaction check
      cy.intercept('POST', '**/functions/v1/check-interactions**', {
        statusCode: 200,
        body: {
          interactions: [
            {
              severity: 'HIGH',
              message: 'Atenție: Warfarin + Aspirină poate crește riscul de sângerare'
            }
          ]
        }
      }).as('interactionCheck');

      // Add another medication
      cy.get('[data-testid="add-medication-btn"]').click();
      cy.get('[data-testid="medication-input"]').type('Aspirină');
      cy.get('[data-testid="save-medication-btn"]').click();

      cy.wait('@interactionCheck');

      // Verify warning displayed
      cy.get('[data-testid="interaction-warning"]').should('be.visible');
      cy.get('[data-testid="interaction-warning"]').should('have.class', 'severity-high');
      cy.get('[data-testid="interaction-warning"]').should('contain', 'sângerare');
    });

    it('should update risk score dynamically', () => {
      // Get initial risk score
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();

      cy.get('[data-testid="risk-score-display"]').then(($score) => {
        const initialScore = parseFloat($score.text());

        // Add high-risk condition
        cy.get('[data-testid="add-medical-history-btn"]').click();
        cy.get('[data-testid="medical-condition-input"]').type('Antecedente AVC');
        cy.get('[data-testid="save-condition-btn"]').click();

        // Trigger re-analysis
        cy.get('[data-testid="re-analyze-btn"]').click();

        // Risk score should increase
        cy.get('[data-testid="risk-score-display"]').should(($newScore) => {
          const newScore = parseFloat($newScore.text());
          expect(newScore).to.be.greaterThan(initialScore);
        });
      });
    });
  });

  describe('Explainable AI (XAI)', () => {
    it('should provide decision explanation', () => {
      // Trigger analysis
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();

      // Open explanation modal
      cy.get('[data-testid="explain-decision-btn"]').click();

      // Verify explanation modal
      cy.get('[data-testid="xai-modal"]').should('be.visible');
      cy.get('[data-testid="xai-decision-tree"]').should('be.visible');
      cy.get('[data-testid="xai-feature-importance"]').should('be.visible');
    });

    it('should show feature importance visualization', () => {
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();
      cy.get('[data-testid="explain-decision-btn"]').click();

      // Verify feature importance chart
      cy.get('[data-testid="feature-importance-chart"]').should('be.visible');

      // Check that features are listed
      cy.get('[data-testid="feature-item"]').should('have.length.at.least', 3);

      // Verify each feature shows importance score
      cy.get('[data-testid="feature-item"]').first().within(() => {
        cy.get('[data-testid="feature-name"]').should('be.visible');
        cy.get('[data-testid="importance-bar"]').should('be.visible');
        cy.get('[data-testid="importance-percentage"]').should('be.visible');
      });
    });

    it('should allow what-if analysis', () => {
      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();

      // Open what-if tool
      cy.get('[data-testid="what-if-analysis-btn"]').click();
      cy.get('[data-testid="what-if-panel"]').should('be.visible');

      // Modify a parameter
      cy.get('[data-testid="modify-age-input"]').clear().type('45');
      cy.get('[data-testid="recalculate-btn"]').click();

      // Verify updated prediction
      cy.get('[data-testid="what-if-new-risk-score"]').should('be.visible');
      cy.get('[data-testid="risk-score-comparison"]').should('be.visible');
    });
  });

  describe('AI Performance Metrics', () => {
    it('should display AI model performance stats', () => {
      // Navigate to AI analytics
      cy.get('[data-value="strategic"]').click();
      cy.get('[data-value="analytics"]').click();

      // Verify AI performance metrics
      cy.get('[data-testid="ai-performance-card"]').should('be.visible');
      cy.get('[data-testid="model-accuracy"]').should('be.visible');
      cy.get('[data-testid="prediction-accuracy"]').should('contain', '%');
      cy.get('[data-testid="avg-response-time"]').should('contain', 'ms');
      cy.get('[data-testid="total-predictions"]').should('be.visible');
    });

    it('should show prediction history', () => {
      cy.get('[data-value="strategic"]').click();
      cy.get('[data-value="analytics"]').click();

      // Access prediction history
      cy.get('[data-testid="prediction-history-tab"]').click();

      // Verify history table
      cy.get('[data-testid="prediction-history-table"]').should('be.visible');
      cy.get('[data-testid="prediction-row"]').should('have.length.at.least', 1);

      // Check row details
      cy.get('[data-testid="prediction-row"]').first().within(() => {
        cy.get('[data-testid="prediction-timestamp"]').should('be.visible');
        cy.get('[data-testid="prediction-result"]').should('be.visible');
        cy.get('[data-testid="prediction-confidence"]').should('be.visible');
      });
    });

    it('should allow filtering prediction history', () => {
      cy.get('[data-value="strategic"]').click();
      cy.get('[data-value="analytics"]').click();
      cy.get('[data-testid="prediction-history-tab"]').click();

      // Filter by risk level
      cy.get('[data-testid="filter-risk-level"]').select('HIGH');

      // Verify filtered results
      cy.get('[data-testid="prediction-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="risk-level-badge"]').should('contain', 'HIGH');
      });

      // Filter by date range
      cy.get('[data-testid="date-filter-from"]').type('2024-11-01');
      cy.get('[data-testid="date-filter-to"]').type('2024-11-30');
      cy.get('[data-testid="apply-date-filter"]').click();

      // Results should be within date range
      cy.get('[data-testid="prediction-row"]').should('have.length.at.least', 1);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate required fields before analysis', () => {
      // Try to analyze without required data
      cy.get('[data-testid="analyze-btn"]').click();

      // Verify validation messages
      cy.get('[data-testid="patient-code-error"]').should('be.visible');
      cy.get('[data-testid="patient-code-error"]').should('contain', 'obligatoriu');
    });

    it('should handle AI service timeout', () => {
      cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
        delay: 15000,
        statusCode: 408,
        body: { error: 'Request timeout' }
      }).as('aiTimeout');

      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();

      // Verify timeout handling
      cy.get('[data-testid="ai-error-message"]').should('be.visible');
      cy.get('[data-testid="ai-error-message"]').should('contain', 'timeout');
      cy.get('[data-testid="retry-analysis-btn"]').should('be.visible');
    });

    it('should show loading state during analysis', () => {
      cy.intercept('POST', '**/functions/v1/realtime-medical-ai**', {
        delay: 2000,
        statusCode: 200,
        body: { risk_score: 0.5 }
      }).as('aiAnalysis');

      cy.get('[data-testid="patient-code-input"]').type('P123456');
      cy.get('[data-testid="analyze-btn"]').click();

      // Verify loading indicator
      cy.get('[data-testid="ai-loading-spinner"]').should('be.visible');
      cy.get('[data-testid="analyze-btn"]').should('be.disabled');

      cy.wait('@aiAnalysis');

      // Loading should disappear
      cy.get('[data-testid="ai-loading-spinner"]').should('not.exist');
      cy.get('[data-testid="analyze-btn"]').should('not.be.disabled');
    });

    it('should sanitize user inputs', () => {
      // Try to inject script
      cy.get('[data-testid="patient-name-input"]').type('<script>alert("xss")</script>');
      cy.get('[data-testid="analyze-btn"]').click();

      // Verify script tags removed/escaped
      cy.get('[data-testid="patient-name-input"]').should(($input) => {
        const value = $input.val() as string;
        expect(value).to.not.include('<script>');
      });
    });
  });
});
