# GENIUS MedicalCor AI Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

Advanced Medical AI Platform with Multi-Agent Architecture for dental/medical implant procedures. Features real-time collaboration, AI-powered risk assessment, and intelligent laboratory automation.

## Features

- **Medical AI Analysis Interface** - Risk assessment, compatibility checks, and surgical planning
- **Real-time Procedure Tracking** - Monitor surgical cases with detailed event logging
- **Smart Lab Cockpit** - Material management, production scheduling, and quality analysis
- **Strategic Operations Panel** - Executive-level KPI monitoring and procurement management
- **Digital Twin 3D Visualization** - Patient visualization with wire-frame models
- **Voice Interface** - Hands-free AI operation for surgical environments
- **Multi-Agent System** - WebSocket-based communication between Medic, Lab, and CEO agents
- **PWA Support** - Installable progressive web app with offline capabilities

## Technology Stack

### Core
- **React 18** with TypeScript for type-safe UI development
- **Vite 5** for lightning-fast builds and HMR
- **Tailwind CSS** with shadcn/ui component library
- **Three.js** with React Three Fiber for 3D visualization

### State Management & Data
- **TanStack React Query** for server state management
- **Zustand** for client state management
- **Supabase** for backend and database
- **Socket.io** for real-time WebSocket communication

### Quality & Testing
- **Vitest** for unit and integration testing with coverage
- **Cypress** for E2E testing
- **ESLint** with TypeScript support
- **Prettier** for code formatting
- **Husky** with lint-staged for pre-commit hooks
- **Commitlint** for conventional commit messages

### Performance & Monitoring
- **Web Vitals** monitoring (CLS, FID, FCP, LCP, TTFB, INP)
- **Code splitting** with lazy loading
- **Bundle analysis** and optimization
- **Gzip/Brotli compression**
- **PWA** with service worker caching

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd genius-med-forge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Development

### Available Scripts

```bash
# Development
npm run dev           # Start development server
npm run preview       # Preview production build

# Building
npm run build         # Production build with type checking
npm run build:dev     # Development build
npm run build:analyze # Build with bundle analysis

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run typecheck     # Run TypeScript type checking

# Testing
npm run test          # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
npm run test:e2e      # Open Cypress E2E tests
npm run test:e2e:headless  # Run Cypress headless

# Validation
npm run validate      # Run all checks (typecheck, lint, test:coverage)
```

### Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # shadcn/ui base components
│   └── *.tsx        # Feature components
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
│   ├── api-client.ts   # Centralized API client with retry logic
│   ├── env.ts          # Environment validation with Zod
│   ├── utils.ts        # General utilities
│   └── web-vitals.ts   # Performance monitoring
├── pages/           # Page components
├── services/        # Backend service integrations
├── store/           # Zustand state stores
├── test/            # Test setup and utilities
└── types/           # TypeScript type definitions
```

### Architecture Highlights

#### Error Handling
- **ErrorBoundary** component for graceful error recovery
- **Centralized API client** with automatic retry and exponential backoff
- **Type-safe error handling** with custom error classes

#### Performance
- **Lazy loading** for routes and heavy components
- **React Query** with optimized caching strategies
- **Code splitting** by vendor and feature
- **Web Vitals** monitoring in development

#### Accessibility
- **Skip links** for keyboard navigation
- **Focus trapping** for modals and dialogs
- **Screen reader announcements** for dynamic content
- **Reduced motion** support

#### Type Safety
- **Strict TypeScript** configuration
- **Zod validation** for runtime type safety
- **No implicit any** or unused variables allowed

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# WebSocket Configuration
VITE_WS_URL=ws://localhost:3001

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_3D_VIEWER=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PWA=true

# Performance
VITE_API_TIMEOUT=30000
VITE_MAX_RETRIES=3
VITE_RETRY_DELAY=1000
```

### Git Hooks

Pre-configured with Husky:
- **pre-commit**: Runs lint-staged (ESLint + Prettier)
- **commit-msg**: Validates commit messages with commitlint

Commit message format (Conventional Commits):
```
feat: add user authentication
fix: resolve memory leak in 3D viewer
docs: update API documentation
perf: optimize bundle size
test: add unit tests for error boundary
```

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

Test files are located alongside source files with `.test.ts` or `.test.tsx` extensions.

### E2E Tests (Cypress)

```bash
# Interactive mode
npm run test:e2e

# Headless mode (CI)
npm run test:e2e:headless
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t genius-med-forge \
  --build-arg VITE_SUPABASE_URL=your-url \
  --build-arg VITE_SUPABASE_ANON_KEY=your-key \
  .

# Run container
docker run -p 80:80 genius-med-forge
```

### Production Build

```bash
# Create optimized build
npm run build

# Preview locally
npm run preview
```

The build includes:
- Minified JavaScript with tree shaking
- Optimized CSS with Tailwind purging
- Gzip and Brotli compressed assets
- Service worker for PWA
- Bundle analysis report (dist/stats.html)

## Performance

### Web Vitals Targets

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8s
- **TTFB** (Time to First Byte): < 800ms

### Bundle Optimization

- Vendor chunking for React, Three.js, charts
- Dynamic imports for heavy components
- Tree shaking and dead code elimination
- Asset compression (Gzip + Brotli)

## Security

- **Non-root Docker user** for container security
- **Security headers** (CSP, X-Frame-Options, etc.)
- **Environment validation** to prevent misconfiguration
- **No hardcoded secrets** - all via environment variables
- **Input sanitization** and validation with Zod

## Contributing

1. Follow the conventional commit format
2. Ensure all tests pass: `npm run validate`
3. Format code before committing: `npm run format`
4. Add tests for new features

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/docs)

## License

Proprietary - GENIUS MedicalCor AI Team

---

Built with advanced medical AI technology for healthcare professionals.
