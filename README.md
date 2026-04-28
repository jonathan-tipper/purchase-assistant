# Purchase Assistant

A purchase value calculator and journal that helps you make smarter buying decisions. Evaluate items by cost-per-use, lifespan, and depreciation — with an AI advisor to help you think through purchases before you make them.

## Features

- **Value calculator** — enter price, lifespan, usage frequency, and depreciation to see real cost-per-use and cost-per-year
- **Item comparison** — compare multiple items side-by-side with AI-generated analysis
- **AI advisor** — conversational assistant to help research and evaluate purchases
- **Purchase journal** — log past purchases with satisfaction scores and usage data
- **AI journal review** — pattern analysis across your purchase history
- **Guest mode** — calculator works without an account; AI features and journal require sign-in

## Tech stack

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Supabase (auth, database, edge functions)
- **AI**: Venice AI API (GLM-4.7 for reasoning, Qwen3-4b for fast extraction)
- **Deployment**: Vercel (frontend) + Supabase Edge Functions (serverless backend)

## Local development

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (or use the shared All Apps project)

### Setup

```sh
# Clone the repo
git clone https://github.com/tech-back-ctrl/purchase-assistant.git
cd purchase-assistant

# Install dependencies
npm install

# Copy env vars and fill in your Supabase project credentials
cp .env.example .env.local
# Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start the dev server
npm run dev
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/publishable key |

### Supabase edge function secrets

Set these in the Supabase dashboard under Edge Functions → Secrets:

| Secret | Description |
|--------|-------------|
| `VENICE_API_KEY` | Venice AI API key for all AI features |

## Database

All tables use the `pa_` prefix in the `public` schema to isolate this app from others sharing the same Supabase project:

- `pa_profiles` — extends `auth.users` with display name and currency preference
- `pa_purchase_items` — items in the value calculator
- `pa_purchase_journal` — logged past purchases with satisfaction data
- `pa_ai_conversations` — stored AI conversation history
- `pa_user_preferences` — per-user theme and preference settings

All tables have RLS policies scoped to `auth.uid()`. The migration is at [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).

## Edge functions

Four Supabase edge functions handle all AI features server-side (keeping the Venice API key out of the browser):

| Function | Model | Purpose |
|----------|-------|---------|
| `ai-advisor` | GLM-4.7 | Conversational purchase advisor |
| `ai-parse-input` | Qwen3-4b | Natural language → structured item parameters |
| `ai-compare` | GLM-4.7 | Multi-item comparison analysis |
| `ai-journal-review` | GLM-4.7 | Purchase pattern analysis |

## Deployment

The frontend deploys to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your Vercel project settings.

Edge functions are deployed to Supabase and called directly from the browser — they do not go through Vercel.
