# Repository Guidelines

## Project Structure & Module Organization
- Core React/TypeScript app bootstrapped with Vite; entry at `App.tsx` and routes mapped to page components.
- Feature pages live in `pages/`; shared UI and hooks in `components/` and `contexts/`; cross-cutting helpers and types in `lib/`, `constants.ts`, and `types.ts`.
- API-related helpers reside in `api/` and `services/`; client-only assets sit under `public/`. Production bundles output to `dist/`.
- Scripts for checks and setup live in `scripts/`; long-form docs and content are in `docs/` and `blog/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server with HMR.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the built app locally for QA.
- `npm run check:auth` / `npm run check:supabase`: validate auth and Supabase env config before shipping.

## Coding Style & Naming Conventions
- Use TypeScript with JSX, 2-space indentation, and concise functional components; prefer hooks for state/effects.
- React components and files use PascalCase (e.g., `ProfileCard.tsx`); utilities and hooks use camelCase.
- Keep routes/pages in `pages/`; shared UI in `components/`; avoid duplicating constants; extend `constants.ts` and `types.ts` instead.
- Run `npx tsc --noEmit` to catch type issues before pushing.

## Testing Guidelines
- No repo-wide test suite yet; when adding tests, use Vitest + React Testing Library and colocate as `*.test.tsx` next to the module or in `__tests__/`.
- Focus coverage on data transforms, auth flows, and routing guards; keep tests deterministic and mock network calls.

## Commit & Pull Request Guidelines
- Prefer clear, scoped commits (e.g., `feat: add subscription pricing page`, `fix: correct auth modal state`).
- PRs: include a short summary, linked issue or Task ID, screenshots or recordings for UI changes, and steps to validate locally (`npm run dev` or `npm run preview`).
- Highlight config changes (`.env.local`, Supabase settings) and note any follow-up work needed.

## Security & Configuration Tips
- Copy `.env.local.example` to `.env.local` and set `GEMINI_API_KEY` plus Supabase keys; never commit secrets.
- Run the config check scripts before deploy, and avoid embedding API keys in client-visible code or public assets.
