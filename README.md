# Purchase Assistant

A decision workspace for considered purchases. Capture a product, question the assumptions, compare ownership costs, review AI evidence and record what happened afterwards.

The manual product works without an account. Sign in for account storage, image/text extraction and sourced research. The AI path is a preview pending broader quality evaluation; it never saves or changes purchase assumptions without user action.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Without environment variables, the guest workspace still works. Copy `.env.example` to `.env.local` and fill in the Supabase URL and public anon key for account features. Never put `VENICE_API_KEY` or a Supabase service-role key in a `VITE_` variable.

```sh
npm run check   # lint, strict type checks, tests and production build
npm run test:watch
npm run preview
```

CI runs the same checks and type-checks the Edge Function with Deno. The committed SQL integration test runs separately against a Supabase database and rolls back its fixtures.

## What is built

- Text, price and link capture, plus an explicit worked example.
- A saved decision brief with needs, alternatives and editable assumptions.
- Up to 3 candidate products compared over one period and currency.
- Purchase, running, consumable, replacement and resale costs, with a sensitivity scenario.
- Optional photo/text extraction with review before applying suggested fields.
- A bounded research workflow: plan, up to 2 searches, then a perspective with source links. Search excerpts are labelled as incomplete evidence; changing the scenario marks old research stale.
- Bought, waiting, decided-against and returned outcomes. Purchase forecasts stay frozen while later check-ins record actual use and satisfaction.
- Guest storage, explicit account import, optimistic save conflicts, JSON/CSV export, validated imports and decision deletion.
- Responsive light/dark presentation, keyboard controls, navigation guards and recovery/error states.

## Architecture

React 18, TypeScript, Vite, React Router, Zod and Supabase. Native controls and a small SVG chart replace the previous component/chart dependencies.

| Boundary                                                      | Location                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Shared schema and deterministic calculations                  | `supabase/functions/_shared/domain.ts`, re-exported by `src/domain/decision.ts` |
| Guest/cloud repositories and legacy import                    | `src/services/repository.ts`, `src/domain/portability.ts`                       |
| Decision UI                                                   | `src/pages/Decision.tsx`                                                        |
| AI request validation, auth, quota and provider orchestration | `supabase/functions/_shared/assistant.ts`                                       |
| Behaviour and admission tests                                 | `tests/`                                                                        |
| Database isolation, concurrency and quota tests               | `supabase/tests/decision_security.sql`                                          |

## Data and limits

Guest decisions use `pa.decisions.v1` in localStorage. The first load converts legacy `purchaseValueItems` once and keeps that original key as a recovery copy. Signing in opens a separate account workspace; copying browser decisions requires an explicit import. Deletion affects only the selected workspace copy.

Account decisions use `pa_decisions`, with owner-scoped RLS and revisions. Identity is `(user_id, id)`, so importing the same portable decision into another account does not collide. Decisions support up to 60 check-ins, a 90 KB validated document and 200 decisions per workspace. Full imports accept up to 20 MB. Browser storage capacity can be lower; failed saves leave the draft visible.

Original `pa_purchase_items` and `pa_purchase_journal` remain available for explicit recovery. Other legacy tables remain as historical data. The new app does not write to them. Raw photos stay in memory and are excluded from storage and export.

## Backend and deployment

The frontend builds to `dist`; Vercel serves the SPA routes. Database migrations and Edge Functions deploy separately. See [docs/OPERATIONS.md](docs/OPERATIONS.md) for deployment order, usage limits, verification and rollback.

Product intent: [PRD.md](PRD.md), [VISION.md](VISION.md). Audit and release evidence: [docs/RELEASE.md](docs/RELEASE.md). AI evaluation cases: [docs/AI-EVALUATION.md](docs/AI-EVALUATION.md).
