# Repository Guidelines for Agentic Coding

This document provides comprehensive guidelines for agents operating in this repository.

## Project Overview

A professional headshot AI application built with React 19, TypeScript, and Vite. Uses Supabase for backend services and Gemini API for AI-powered image processing.

## Build, Test, and Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start Vite dev server with HMR on port 3000 |
| `npm run build` | Create production bundle in `dist/` |
| `npm run preview` | Serve production build locally for QA |
| `npm run check:auth` | Validate auth configuration (tsx scripts/check-auth-config.ts) |
| `npm run check:supabase` | Validate Supabase environment config (tsx scripts/check-supabase.ts) |
| `npx tsc --noEmit` | Run TypeScript compiler check without emitting files |

For single test execution, this project uses Vitest when tests are added. Run tests with:
- `npx vitest run` - Run all tests once
- `npx vitest run <file>` - Run specific test file
- `npx vitest run --reporter=verbose` - Verbose output

## Project Structure

```
root/
├── App.tsx              # App entry point with routing
├── index.tsx            # React DOM entry point
├── pages/               # Route/page components (Home, Checkout, etc.)
├── components/          # Shared UI components (Button, Card, Modal, etc.)
├── contexts/            # React contexts (AuthContext, etc.)
├── lib/                 # Utility functions and cross-cutting helpers
├── api/                 # API client helpers and endpoints
├── services/            # Business logic services
├── utils/               # Helper utilities
├── constants.ts         # Global constants (avoid duplication, extend instead)
├── types.ts             # TypeScript type definitions
├── scripts/             # Build/check scripts (check-auth-config.ts, check-supabase.ts)
├── docs/                # Documentation
├── blog/                # Blog content
└── public/              # Static assets
```

## Code Style Guidelines

### TypeScript & Typing
- Use TypeScript for all new code; enable strict mode checks
- Define interfaces for complex objects; use `type` for unions/primitives
- Avoid `any`; use `unknown` when type is uncertain, then narrow with type guards
- Export types from `types.ts` for shared use across modules

### React Components
- Use functional components with hooks exclusively
- Components use PascalCase (e.g., `ProfileCard.tsx`, `UserAvatar.tsx`)
- Keep components focused; extract reusable logic into custom hooks
- Use proper TypeScript props typing: `interface Props { title: string; onClick?: () => void }`

### Naming Conventions
| Pattern | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `Navigation.tsx` |
| Hooks | camelCase with "use" prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Files | Match exported default name | `CheckoutForm.tsx` → exports `CheckoutForm` |

### Imports and Organization
- Use absolute imports with `@/` alias (configured in vite.config.ts and tsconfig.json)
- Order imports: React → external libraries → internal components/utils → types/styles
- Use named exports for multiple exports; default export for single primary export
- Avoid relative imports beyond one level (`../../`); prefer `@/components/Button`

### Formatting and Style
- 2-space indentation for JSX and TypeScript
- Use semicolons consistently
- Prefer arrow functions for callbacks and short functions
- Use template literals over string concatenation
- No commented-out code; remove or use TODO comments: `// TODO: [ticket] description`

### Error Handling
- Use try/catch with async/await; always handle promise rejections
- Create typed error objects for domain errors
- Display user-friendly error messages in UI; log technical details to console/devtools
- Never expose internal error details that could reveal implementation to users
- Use ErrorBoundary components for uncaught component errors

### State Management
- Use `useState` for local component state
- Use `useContext` for global app state (auth, theme, etc.)
- Prefer multiple specific contexts over one large context
- Memoize expensive computations with `useMemo`; memoize callbacks with `useCallback`

### Data Fetching
- Create typed API response interfaces
- Handle loading, error, and success states explicitly
- Cancel in-flight requests on component unmount using AbortController
- Never commit API keys or secrets; use environment variables from `.env.local`

### Testing Guidelines
- When adding tests, use Vitest + React Testing Library
- Place tests adjacent to source files: `Component.test.tsx` next to `Component.tsx`
- Or use `__tests__/` folder for integration tests
- Focus on: data transforms, auth flows, routing guards, critical business logic
- Keep tests deterministic; mock network calls and external services
- Aim for meaningful assertions over comprehensive coverage

### Security Best Practices
- Copy `.env.local.example` to `.env.local` and set required keys
- Never commit secrets, API keys, or credentials
- Validate all user inputs on both client and server
- Sanitize data before rendering to prevent XSS
- Use parameterized queries for database operations
- Run `npm run check:auth` and `npm run check:supabase` before deployment

## Git Workflow

### Commit Messages
Use conventional commits with scope:
- `feat(pages): add subscription pricing page`
- `fix(auth): correct login redirect loop`
- `refactor(api): streamline image upload handler`
- `docs: update API documentation`

### Pull Requests
- Title: Clear, concise summary of change
- Body: Summary, linked issue/task ID, screenshots/recordings for UI changes
- Steps to validate: `npm run dev` or `npm run preview`
- Highlight config changes (`.env.local`, Supabase settings)
- Note any follow-up work needed

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite bundler configuration with React plugin and path alias |
| `tsconfig.json` | TypeScript compiler options (ES2022, JSX, paths) |
| `package.json` | Dependencies and npm scripts |
| `.env.local` | Local environment variables (not committed) |
| `.env.local.example` | Template for required environment variables |

## Getting Started

1. Run `npm install` to install dependencies
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `GEMINI_API_KEY` - For AI image processing
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` - For backend services
3. Run `npm run dev` to start development server
4. Open http://localhost:3000 in browser

## Additional Resources

- See `CLAUDE.md` for detailed architecture and implementation guidance
- See `CREEM_SETUP.md` for payment integration setup
- See README.md for quick start reference
