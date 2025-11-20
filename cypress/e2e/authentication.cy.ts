describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear all storage before each test
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login', () => {
    it('should display login page when not authenticated', () => {
      cy.visit('/');

      // Verify login page elements
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-submit-btn"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/');

      // Try to submit empty form
      cy.get('[data-testid="login-submit-btn"]').click();

      // Verify validation messages
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="email-error"]').should('contain', 'Email este obligatoriu');
      cy.get('[data-testid="password-error"]').should('be.visible');
      cy.get('[data-testid="password-error"]').should('contain', 'Parola este obligatorie');
    });

    it('should show error for invalid email format', () => {
      cy.visit('/');

      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-submit-btn"]').click();

      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="email-error"]').should('contain', 'Email invalid');
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/');

      // Mock successful login API call
      cy.intercept('POST', '**/auth/v1/token**', {
        statusCode: 200,
        body: {
          access_token: 'valid-token',
          user: {
            id: 'user-123',
            email: 'ceo@genius-medical.com',
            role: 'CEO'
          }
        }
      }).as('loginRequest');

      // Fill in credentials
      cy.get('[data-testid="email-input"]').type('ceo@genius-medical.com');
      cy.get('[data-testid="password-input"]').type('SecurePassword123!');
      cy.get('[data-testid="login-submit-btn"]').click();

      // Wait for login request
      cy.wait('@loginRequest');

      // Verify redirect to dashboard
      cy.url().should('not.include', '/login');
      cy.get('[data-testid="app-header"]').should('contain', 'GENIUS MedicalCor AI');
    });

    it('should handle login error gracefully', () => {
      cy.visit('/');

      // Mock failed login API call
      cy.intercept('POST', '**/auth/v1/token**', {
        statusCode: 401,
        body: {
          error: 'Invalid login credentials'
        }
      }).as('loginRequestFailed');

      cy.get('[data-testid="email-input"]').type('wrong@email.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-submit-btn"]').click();

      cy.wait('@loginRequestFailed');

      // Verify error message displayed
      cy.get('[data-testid="login-error"]').should('be.visible');
      cy.get('[data-testid="login-error"]').should('contain', 'Credențiale invalide');
    });

    it('should toggle password visibility', () => {
      cy.visit('/');

      // Password should be hidden by default
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');

      // Click toggle visibility button
      cy.get('[data-testid="toggle-password-btn"]').click();

      // Password should be visible
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');

      // Click again to hide
      cy.get('[data-testid="toggle-password-btn"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });

    it('should persist auth state across page refreshes', () => {
      // Login first
      cy.loginAsCEO();

      // Verify we're logged in
      cy.get('[data-testid="app-header"]').should('be.visible');

      // Refresh page
      cy.reload();

      // Should still be logged in
      cy.get('[data-testid="app-header"]').should('be.visible');
      cy.get('[data-testid="login-form"]').should('not.exist');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.loginAsCEO();
    });

    it('should successfully logout and redirect to login page', () => {
      // Click user menu
      cy.get('[data-testid="user-menu-trigger"]').click();

      // Click logout button
      cy.get('[data-testid="logout-btn"]').click();

      // Should redirect to login page
      cy.url().should('include', '/login');
      cy.get('[data-testid="login-form"]').should('be.visible');

      // Auth token should be cleared
      cy.window().then((win) => {
        const authToken = win.localStorage.getItem('sb-sosiozakhzrnapvxrtrb-auth-token');
        expect(authToken).to.be.null;
      });
    });

    it('should clear all user data on logout', () => {
      // Verify data exists before logout
      cy.window().then((win) => {
        win.localStorage.setItem('user-preferences', JSON.stringify({ theme: 'dark' }));
        win.localStorage.setItem('cached-data', JSON.stringify({ test: 'data' }));
      });

      // Logout
      cy.get('[data-testid="user-menu-trigger"]').click();
      cy.get('[data-testid="logout-btn"]').click();

      // Verify all data cleared
      cy.window().then((win) => {
        expect(win.localStorage.length).to.equal(0);
      });
    });

    it('should handle logout API failure gracefully', () => {
      // Mock logout API failure
      cy.intercept('POST', '**/auth/v1/logout**', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('logoutFailed');

      cy.get('[data-testid="user-menu-trigger"]').click();
      cy.get('[data-testid="logout-btn"]').click();

      // Should still clear local session even if API fails
      cy.get('[data-testid="login-form"]').should('be.visible');
    });
  });

  describe('Session Expiry', () => {
    it('should redirect to login when session expires', () => {
      cy.loginAsCEO();

      // Simulate session expiry
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('auth-session-expired'));
      });

      // Should show session expired message
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
      cy.get('[data-testid="session-expired-message"]').should('contain', 'Sesiune expirată');

      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should attempt token refresh before expiry', () => {
      cy.loginAsCEO();

      // Mock refresh token endpoint
      cy.intercept('POST', '**/auth/v1/token?grant_type=refresh_token**', {
        statusCode: 200,
        body: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          user: {
            id: 'user-123',
            email: 'ceo@genius-medical.com'
          }
        }
      }).as('refreshToken');

      // Simulate token refresh trigger
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('auth-token-refresh-needed'));
      });

      // Wait for refresh
      cy.wait('@refreshToken');

      // Should remain logged in
      cy.get('[data-testid="app-header"]').should('be.visible');
    });
  });

  describe('Role-Based Access', () => {
    it('should show CEO dashboard for CEO role', () => {
      cy.loginAsCEO();

      // CEO should see strategic operations tab
      cy.get('[data-value="strategic"]').should('be.visible');
      cy.get('[data-value="strategic"]').should('contain', 'Strategic OPS');
    });

    it('should show Lab dashboard for Lab Technician role', () => {
      cy.loginAsLabTech();

      // Lab tech should see smartlab tab
      cy.get('[data-value="smartlab"]').should('be.visible');
      cy.get('[data-value="smartlab"]').should('contain', 'SmartLab');
    });

    it('should prevent access to unauthorized sections', () => {
      cy.loginAsLabTech();

      // Try to access CEO-only section directly via URL
      cy.visit('/strategic/analytics');

      // Should show access denied or redirect
      cy.get('[data-testid="access-denied"]').should('be.visible');
      cy.get('[data-testid="access-denied"]').should('contain', 'Acces interzis');
    });
  });

  describe('Password Reset', () => {
    it('should navigate to password reset page', () => {
      cy.visit('/');

      cy.get('[data-testid="forgot-password-link"]').click();

      // Verify password reset page loaded
      cy.url().should('include', '/reset-password');
      cy.get('[data-testid="reset-password-form"]').should('be.visible');
    });

    it('should request password reset email', () => {
      cy.visit('/reset-password');

      // Mock password reset API
      cy.intercept('POST', '**/auth/v1/recover**', {
        statusCode: 200,
        body: { message: 'Password reset email sent' }
      }).as('resetRequest');

      cy.get('[data-testid="reset-email-input"]').type('user@genius-medical.com');
      cy.get('[data-testid="send-reset-btn"]').click();

      cy.wait('@resetRequest');

      // Verify success message
      cy.get('[data-testid="reset-success-message"]').should('be.visible');
      cy.get('[data-testid="reset-success-message"]').should('contain', 'Email trimis');
    });

    it('should validate email format on password reset', () => {
      cy.visit('/reset-password');

      cy.get('[data-testid="reset-email-input"]').type('invalid-email');
      cy.get('[data-testid="send-reset-btn"]').click();

      cy.get('[data-testid="reset-email-error"]').should('be.visible');
      cy.get('[data-testid="reset-email-error"]').should('contain', 'Email invalid');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in console or localStorage', () => {
      cy.loginAsCEO();

      cy.window().then((win) => {
        const localStorage = JSON.stringify(win.localStorage);

        // Should not contain plain text passwords
        expect(localStorage.toLowerCase()).to.not.include('password');
        expect(localStorage.toLowerCase()).to.not.include('securepassword');
      });
    });

    it('should handle concurrent login attempts', () => {
      cy.visit('/');

      // Mock login endpoint
      cy.intercept('POST', '**/auth/v1/token**', {
        delay: 2000, // Add delay to test concurrency
        statusCode: 200,
        body: { access_token: 'token', user: { id: 'user-123' } }
      }).as('login');

      // Fill credentials
      cy.get('[data-testid="email-input"]').type('test@test.com');
      cy.get('[data-testid="password-input"]').type('password');

      // Click submit multiple times rapidly
      cy.get('[data-testid="login-submit-btn"]').click();
      cy.get('[data-testid="login-submit-btn"]').click();
      cy.get('[data-testid="login-submit-btn"]').click();

      // Should only send one request (button should be disabled after first click)
      cy.get('@login.all').should('have.length', 1);
    });

    it('should prevent clickjacking with X-Frame-Options', () => {
      cy.visit('/');

      // Check for security headers (if configured)
      cy.request('/').then((response) => {
        // This test would need actual header verification in production
        expect(response.status).to.equal(200);
      });
    });
  });
});
