# Purchase Assistant

Purchase Assistant helps people decide whether a purchase is worth it by turning upfront price, expected lifespan, usage frequency, and depreciation into practical value metrics. The current app combines an in-browser calculator, multi-item comparison, export tools, signed-in AI assistance, and a purchase journal.

See [PRD.md](PRD.md) for product requirements and [VISION.md](VISION.md) for product direction.

## Current Capabilities

- Value calculator for price, lifespan, uses per week, minutes per use, and yearly depreciation.
- Cost metrics for cost per use, hour, week, month, and year, plus total lifetime uses and estimated retained value.
- Visual analysis with Recharts bar, pie, and timeline charts.
- Multi-item workspace with add, edit, delete, selection, and comparison table flows.
- Import/export for calculator items as JSON, plus JSON/CSV export with calculated metrics.
- Theme selector and calculator metric currency display for GBP, USD, EUR, and JPY.
- Supabase email/password auth.
- Signed-in AI features: natural-language item autofill, conversational purchase advisor, AI comparison analysis, and AI purchase journal review.
- Signed-in purchase journal for actual purchases, satisfaction score, rebuy intent, actual usage, and notes.

## Current Data Behavior

- The main calculator page stores its items in browser `localStorage`.
- Authenticated advisor and journal routes use Supabase data through `usePurchaseItems` and journal queries.
- Supabase tables use the `pa_` prefix and row level security scoped to `auth.uid()`.
- The schema includes some fields that are not fully exposed in the UI yet, including item category, notes, image URL, stored AI conversations, and richer user preferences.

## Tech Stack

- Frontend: Vite, React 18, TypeScript, React Router, TanStack Query
- UI: Tailwind CSS, shadcn/ui, Radix UI, lucide-react, Recharts
- Backend: Supabase Auth, Postgres, Row Level Security, Edge Functions
- AI: Venice AI API through Supabase Edge Functions
- Deployment: Vercel for the frontend, Supabase for database and Edge Functions

## Local Development

### Prerequisites

- Node.js 18+ and npm
- A Supabase project with the database migration applied
- A Venice AI API key if you need to run AI features

### Setup

```sh
npm install
```

Create `.env.local` in the project root:

```sh
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the development server:

```sh
npm run dev
```

Useful commands:

```sh
npm run lint
npm run build
npm run preview
```

## Supabase

The database migration is at [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

Tables:

- `pa_profiles` extends `auth.users` with display name and currency preference.
- `pa_purchase_items` stores authenticated purchase calculator items.
- `pa_purchase_journal` stores logged purchases and reflection data.
- `pa_ai_conversations` is available for stored AI conversation history.
- `pa_user_preferences` is available for user theme, category, budget, and value preference settings.

Set this Supabase Edge Function secret before using AI features:

| Secret | Description |
| --- | --- |
| `VENICE_API_KEY` | Venice AI API key used by all AI Edge Functions |

Edge functions:

| Function | Model | Purpose |
| --- | --- | --- |
| `ai-advisor` | `zai-org-glm-4.7` | Conversational purchase advisor with optional suggested item parameters |
| `ai-parse-input` | `qwen3-4b` | Natural-language purchase description to structured item fields |
| `ai-compare` | `zai-org-glm-4.7` | Concise multi-item comparison analysis |
| `ai-journal-review` | `zai-org-glm-4.7` | Pattern analysis across purchase journal entries |

AI calls are made server-side from Supabase Edge Functions so the Venice API key is not exposed to the browser.

## Deployment

The Vercel configuration builds the Vite app into `dist` and rewrites all routes to `index.html`.

Set these Vercel environment variables:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |

Deploy the Supabase migration and Edge Functions separately from the frontend. Browser clients call the Edge Functions directly.
