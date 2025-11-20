# Testing Guide

## Running Tests

This project uses Vitest for unit and integration testing.

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
src/
├── repositories/
│   ├── __tests__/
│   │   ├── PatientRepository.test.ts
│   │   └── MaterialRepository.test.ts
│   ├── BaseRepository.ts
│   ├── PatientRepository.ts
│   └── MaterialRepository.ts
└── test/
    └── setup.ts
```

### Writing Tests

#### Repository Tests

Repository tests demonstrate the testability benefits of the repository pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientRepository } from '../PatientRepository';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('PatientRepository', () => {
  let repository: PatientRepository;

  beforeEach(() => {
    repository = new PatientRepository();
  });

  it('should find patient by ID', async () => {
    // Arrange
    const mockPatient = { id: '123', name: 'John Doe' };

    // Act
    const result = await repository.findById('123');

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockPatient);
    }
  });
});
```

#### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

### Coverage Goals

- **Repositories:** 90%+ coverage
- **Utilities:** 90%+ coverage
- **Components:** 70%+ coverage
- **Overall:** 80%+ coverage

### Mock Patterns

#### Mocking Supabase

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    }),
  },
}));
```

#### Mocking Logger

```typescript
vi.mock('@/utils/logger', () => ({
  logger: {
    createChild: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));
```

### Best Practices

1. **Arrange-Act-Assert:** Follow AAA pattern
2. **One assertion per test:** Keep tests focused
3. **Descriptive names:** Use "should..." naming convention
4. **Mock external dependencies:** Isolate units under test
5. **Test error cases:** Don't just test happy paths
6. **Use factories:** Create test data factories for complex objects

### Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main/develop branches
- Pre-commit hooks (optional)

### Troubleshooting

#### Import.meta errors
The test setup mocks `import.meta.env` - see `src/test/setup.ts`

#### Module resolution errors
Check `vitest.config.ts` for path aliases

#### Type errors
Ensure TypeScript is configured correctly in `tsconfig.json`

### Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
