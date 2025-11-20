# E2E Testing Guide - GENIUS MedicalCor AI

## Overview

This document provides comprehensive guidance on End-to-End (E2E) testing for the GENIUS MedicalCor AI platform using Cypress.

## Table of Contents

1. [Test Suite Overview](#test-suite-overview)
2. [Setup and Installation](#setup-and-installation)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Structure](#test-structure)
6. [Custom Commands](#custom-commands)
7. [Fixtures](#fixtures)
8. [Best Practices](#best-practices)
9. [Continuous Integration](#continuous-integration)
10. [Troubleshooting](#troubleshooting)

---

## Test Suite Overview

### Current Test Coverage

Our E2E test suite covers 6 major areas:

| Test File | Test Count | Coverage |
|-----------|------------|----------|
| `authentication.cy.ts` | 20+ tests | Login, Logout, Session, Role-based access, Password reset, Security |
| `ceo-dashboard.cy.ts` | 6 tests | Dashboard components, KPIs, Real-time updates, Navigation |
| `lab-technician.cy.ts` | 6 tests | Production queue, Job management, Inventory, Maintenance |
| `agent-integration.cy.ts` | 5 tests | Agent events, WebSocket, Multi-agent, Error handling |
| `medical-ai-interface.cy.ts` | 25+ tests | AI analysis, Voice interface, XAI, Performance metrics |
| `patient-management.cy.ts` | 30+ tests | Patient CRUD, Search, Details, 3D viewer, Export |

**Total: 90+ E2E tests**

### Test Types

- **User Flows**: Complete user journeys (login → task → logout)
- **Integration Tests**: Multi-component interactions
- **Real-time Tests**: WebSocket and live data updates
- **Error Scenarios**: Network failures, timeouts, validation
- **Security Tests**: Input sanitization, authentication, authorization

---

## Setup and Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git repository cloned
- Environment variables configured

### Installation

Cypress is already installed as a dev dependency. If you need to reinstall:

```bash
npm install --save-dev cypress @testing-library/cypress
```

### Environment Setup

1. Create a `.env` file in the project root (if not exists):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENVIRONMENT=test
VITE_LOG_LEVEL=debug
```

2. Verify Cypress configuration:

```bash
cat cypress.config.ts
```

---

## Running Tests

### Interactive Mode (Cypress UI)

Best for development and debugging:

```bash
# Open Cypress Test Runner
npm run cypress:open

# Select E2E Testing
# Choose a browser (Chrome, Firefox, Edge, Electron)
# Click on test files to run
```

### Headless Mode (CI/CD)

Best for automated testing:

```bash
# Run all E2E tests
npm run test:e2e

# Run in Chrome
npm run test:e2e:chrome

# Run with headed browser (see what's happening)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e:specific cypress/e2e/authentication.cy.ts

# Run with different browsers
npm run cypress:run:chrome
npm run cypress:run:firefox
npm run cypress:run:edge
```

### Running Specific Tests

```bash
# Single file
npx cypress run --spec "cypress/e2e/authentication.cy.ts"

# Multiple files
npx cypress run --spec "cypress/e2e/authentication.cy.ts,cypress/e2e/patient-management.cy.ts"

# Specific test (use --grep with tags)
npx cypress run --spec "cypress/e2e/authentication.cy.ts" --env grep="should login"
```

### Running with Video Recording

```bash
# Videos are enabled by default in cypress.config.ts
npm run test:e2e

# Disable videos
npx cypress run --video false

# Find videos in:
ls cypress/videos/
```

---

## Writing Tests

### Test File Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    cy.loginAsCEO();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Sub-feature', () => {
    it('should perform expected action', () => {
      // Arrange
      cy.visit('/page');

      // Act
      cy.get('[data-testid="button"]').click();

      // Assert
      cy.get('[data-testid="result"]').should('contain', 'Success');
    });
  });
});
```

### Test Naming Conventions

✅ **Good:**
```typescript
it('should display validation error for invalid email format', () => {});
it('should successfully create new patient with all required fields', () => {});
it('should handle API timeout gracefully with retry option', () => {});
```

❌ **Bad:**
```typescript
it('test login', () => {});
it('works', () => {});
it('check stuff', () => {});
```

### Using data-testid Attributes

Always use `data-testid` for selecting elements:

```typescript
// ✅ Good - Stable and semantic
cy.get('[data-testid="patient-search-input"]')
cy.get('[data-testid="save-patient-btn"]')

// ❌ Bad - Fragile and implementation-dependent
cy.get('.css-class-name')
cy.get('#dynamic-id-12345')
cy.contains('Click Me')
```

---

## Test Structure

### Directory Layout

```
cypress/
├── e2e/                          # E2E test files
│   ├── authentication.cy.ts
│   ├── ceo-dashboard.cy.ts
│   ├── lab-technician.cy.ts
│   ├── agent-integration.cy.ts
│   ├── medical-ai-interface.cy.ts
│   └── patient-management.cy.ts
├── fixtures/                     # Test data
│   ├── api/
│   │   ├── risk-reports.json
│   │   ├── procedures.json
│   │   ├── lab-queue.json
│   │   ├── patients-list.json
│   │   ├── patient-details.json
│   │   └── patient-procedures.json
│   ├── auth/
│   │   └── login.json
│   └── ai/
│       └── analysis-result-high-risk.json
├── support/                      # Helper files
│   ├── commands.ts              # Custom commands
│   └── e2e.ts                   # Global setup
├── videos/                       # Test recordings (gitignored)
└── screenshots/                  # Failure screenshots (gitignored)
```

---

## Custom Commands

We have several custom commands to simplify testing.

### Authentication Commands

```typescript
// Login as CEO
cy.loginAsCEO();

// Login as Lab Technician
cy.loginAsLabTech();
```

### Dashboard Commands

```typescript
// Wait for dashboard to load completely
cy.waitForDashboard();
```

### Agent Simulation Commands

```typescript
// Simulate AgentMedic sending events
cy.simulateAgentMedicEvents();

// Verify real-time updates occurred
cy.verifyRealtimeUpdates();
```

### Creating New Custom Commands

Edit `cypress/support/commands.ts`:

```typescript
Cypress.Commands.add('customCommand', (param: string) => {
  // Implementation
  cy.log(`Running custom command with ${param}`);
});

// TypeScript declaration
declare global {
  namespace Cypress {
    interface Chainable {
      customCommand(param: string): Chainable<void>;
    }
  }
}
```

---

## Fixtures

Fixtures provide mock data for tests.

### Using Fixtures in Tests

```typescript
// Load fixture in beforeEach
beforeEach(() => {
  cy.fixture('api/risk-reports.json').then((reports) => {
    cy.intercept('GET', '**/rest/v1/analysis_reports**', {
      body: reports
    }).as('getRiskReports');
  });
});

// Load fixture inline
cy.fixture('api/patients-list.json').then((patients) => {
  cy.intercept('GET', '**/rest/v1/patients**', {
    body: patients
  }).as('getPatients');
});
```

### Creating New Fixtures

1. Create JSON file in `cypress/fixtures/`:

```json
// cypress/fixtures/api/new-data.json
{
  "id": "test-id",
  "name": "Test Data",
  "status": "ACTIVE"
}
```

2. Use in tests:

```typescript
cy.fixture('api/new-data.json').then((data) => {
  // Use data
});
```

---

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good - Self-contained
it('should create new patient', () => {
  cy.loginAsCEO();
  cy.visit('/patients');
  cy.get('[data-testid="add-patient-btn"]').click();
  // ... test logic
});

// ❌ Bad - Depends on previous test
it('should edit patient', () => {
  // Assumes patient from previous test exists
  cy.get('[data-testid="edit-btn"]').click();
});
```

### 2. Wait for Elements Correctly

```typescript
// ✅ Good - Implicit wait with assertion
cy.get('[data-testid="modal"]').should('be.visible');

// ✅ Good - Wait for network request
cy.wait('@getPatients');

// ❌ Bad - Arbitrary wait
cy.wait(5000);
```

### 3. Use Proper Assertions

```typescript
// ✅ Good - Specific assertions
cy.get('[data-testid="status"]').should('have.text', 'ACTIVE');
cy.get('[data-testid="list"]').should('have.length', 5);

// ❌ Bad - Vague assertions
cy.get('[data-testid="status"]').should('exist');
```

### 4. Handle Flaky Tests

```typescript
// Retry failed tests
it('should handle flaky API', { retries: 2 }, () => {
  // Test logic
});

// Use proper waits
cy.intercept('POST', '/api/slow').as('slowRequest');
cy.wait('@slowRequest', { timeout: 15000 });
```

### 5. Clean Up State

```typescript
beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

afterEach(() => {
  // Additional cleanup if needed
});
```

### 6. Group Related Tests

```typescript
describe('Patient Management', () => {
  describe('Create Patient', () => {
    it('should validate required fields', () => {});
    it('should create with valid data', () => {});
  });

  describe('Edit Patient', () => {
    it('should update information', () => {});
    it('should prevent invalid updates', () => {});
  });
});
```

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  cypress-run:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        uses: cypress-io/github-action@v6
        with:
          start: npm run preview
          wait-on: 'http://localhost:4173'
          browser: chrome
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-videos
          path: cypress/videos

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

### Local CI Simulation

```bash
# Build the app
npm run build

# Preview built app (in one terminal)
npm run preview

# Run E2E tests (in another terminal)
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem**: Tests fail with timeout errors

**Solutions**:
```typescript
// Increase timeout for specific test
it('slow test', { defaultCommandTimeout: 15000 }, () => {
  // Test logic
});

// Or in cypress.config.ts
export default defineConfig({
  e2e: {
    defaultCommandTimeout: 10000
  }
});
```

#### 2. Element Not Found

**Problem**: `cy.get()` cannot find element

**Solutions**:
```typescript
// Add explicit wait
cy.get('[data-testid="element"]', { timeout: 10000 }).should('exist');

// Wait for API before checking element
cy.wait('@apiRequest');
cy.get('[data-testid="element"]').should('be.visible');

// Use .should() for retry logic
cy.get('[data-testid="dynamic-element"]').should('be.visible');
```

#### 3. Intercept Not Working

**Problem**: `cy.intercept()` not matching requests

**Solutions**:
```typescript
// Check URL pattern
cy.intercept('GET', '**/rest/v1/patients**').as('getPatients'); // Wildcard
cy.intercept('GET', /\/api\/patients/).as('getPatients'); // Regex

// Log intercepted requests
cy.intercept('GET', '**/rest/v1/patients**', (req) => {
  console.log('Intercepted:', req.url);
}).as('getPatients');
```

#### 4. WebSocket Tests Failing

**Problem**: WebSocket connections not mocked properly

**Solution**:
```typescript
beforeEach(() => {
  cy.window().then((win) => {
    cy.stub(win, 'WebSocket').returns({
      close: cy.stub(),
      send: cy.stub(),
      addEventListener: cy.stub(),
      removeEventListener: cy.stub(),
      readyState: 1
    });
  });
});
```

#### 5. TypeScript Errors

**Problem**: Type errors in test files

**Solution**:
```typescript
// Add type reference at top of test file
/// <reference types="cypress" />

// Or check tsconfig.json includes Cypress types
{
  "compilerOptions": {
    "types": ["cypress", "@testing-library/cypress"]
  }
}
```

### Debug Mode

Run tests with debug output:

```bash
# Detailed logging
DEBUG=cypress:* npm run test:e2e

# Pause on debugger statements
it('debug test', () => {
  cy.get('[data-testid="element"]');
  cy.pause(); // Pauses execution
  cy.get('[data-testid="another"]');
});
```

---

## Test Maintenance

### Updating Tests When UI Changes

1. **Update data-testid selectors** in components
2. **Update corresponding test selectors**
3. **Run tests to verify**

### Handling Breaking Changes

1. **Review failing tests** to understand impact
2. **Update fixtures** if API responses changed
3. **Update assertions** if expected behavior changed
4. **Document changes** in test comments

---

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Testing Library Cypress](https://testing-library.com/docs/cypress-testing-library/intro/)
- [Project Testing Docs](./TESTING.md)

---

## Contributing

When adding new E2E tests:

1. ✅ Follow naming conventions
2. ✅ Add `data-testid` to new components
3. ✅ Create fixtures for mock data
4. ✅ Document custom commands
5. ✅ Test in multiple browsers
6. ✅ Ensure tests are independent
7. ✅ Add to this documentation if needed

---

**Last Updated**: November 20, 2024
**Maintained By**: Development Team
**Test Suite Version**: 1.0.0
