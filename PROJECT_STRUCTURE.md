# Project Structure Overview

## Current production (2026-11-05)

- `cloudflare/worker.ts` is the only current production API entry point, compiled into `dist/_worker.js` for Pages advanced mode.
- `cloudflare/auth.ts`, `account.ts`, `generation.ts`, `payments.ts`, `history.ts`, and `media.ts` own identity, credits, generation, Creem transactions, history, and private R2 access.
- `database/d1/` contains the active SQLite migrations and atomic credit/payment triggers.
- Browser services use same-origin APIs and HttpOnly sessions. No Supabase SDK is included in the production bundle.
- `scripts/cloudflare/` contains migration, deployment checks, and explicit acceptance tools. Sensitive snapshots, sessions, test images and payment URLs stay under ignored `.migration/`.
- `HANDOFF.MD` and `docs/cloudflare-native-migration.md` describe the current deployment and verification boundaries.

The following notes describe the earlier Supabase/Vercel implementation retained for historical comparison. Those server files are not included in the current Pages Worker.

## Entry Points and Routing
- `index.tsx` mounts the React application root and renders `<App />` inside `React.StrictMode` for additional runtime checks.
- `App.tsx` sets up the `BrowserRouter`, global authentication provider, scroll restoration, Google One Tap integration, and defines routes for home, history, FAQ, blog (list/detail), pricing, subscription management, and terms/privacy pages.

## Context and Shared Infrastructure
- `contexts/AuthContext.tsx` centralizes Supabase authentication state, Google OAuth flows, auth modal visibility, and migration of anonymous history data once users sign in.
- `lib/supabase.ts` initializes the Supabase client from environment variables and is reused across services and contexts.

## UI Composition
- `components/` contains reusable UI elements such as the global `AuthModal`, `GoogleOneTap` login helper, `Layout` wrapper, hero CTA tooling, and upgrade prompts.
- `pages/` houses page-level React components (home, history, FAQ, blog list/detail, pricing, subscription, terms/privacy) that compose the layout and feature flows for routing targets.

## Services and Business Logic
- `services/` provides client-side orchestration for headshot generation, uploads, payments, subscriptions, watermarks, and image processing. Secure variants (e.g., `geminiService.secure.ts`, `nanoBananaAPI.secure.ts`) wrap backend calls while shared helpers manage quota checks, storage, and upload flows.

## Serverless API Routes
- `api/gemini.ts` exposes a Vercel function that proxies Gemini content generation for tips and descriptions using a server-side API key.
- `api/creem/` includes payment-related routes for creating payment intents and processing webhooks.
- `api/nanoBanana.ts` proxies image-generation requests to the Nano Banana service.

## Data and Configuration Assets
- `database/` stores Supabase SQL schema files, migrations for quota/subscription changes, and row-level security policies.
- `public/` contains static assets (blog content, reference templates, well-known files) served directly by Vite.
- `scripts/` hosts utility checks for auth and Supabase configuration validation run via `npm run check:*` scripts.
