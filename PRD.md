# Product Requirements Document: Purchase Assistant

## Source of Truth

This PRD documents the intended product behavior for the current repository state. It was authored from the codebase and existing README because no prior PRD or equivalent product requirements document existed.

If a future GitHub issue, linked spec, or ADR intentionally changes product behavior, that artifact should supersede or update this PRD.

## Product Summary

Purchase Assistant is a decision-support tool for people who want to buy more deliberately. It helps users translate purchase assumptions into cost-per-use, cost-per-time, depreciation, and satisfaction signals, then reflect on whether prior purchases delivered value.

The product should make a purchase feel less like a one-time price check and more like a lightweight ownership decision.

## Problem

Consumers often compare purchases by sticker price, brand, or review scores, but the true value of an item depends on how often it will be used, how long it will last, how quickly it loses value, and whether similar past purchases were satisfying.

Without a simple way to model those tradeoffs, users can overbuy premium items, underinvest in high-use items, or repeat regret patterns.

## Target Users

- Deliberate consumers comparing expensive or recurring purchase decisions.
- Budget-conscious users who want to understand total ownership value before buying.
- Reflective shoppers who want to learn from past purchase satisfaction and usage.
- Users who want AI help estimating purchase assumptions but still need transparent numbers.

## Goals

- Help users estimate the practical value of a potential purchase before buying.
- Make tradeoffs visible across price, lifespan, usage, and depreciation.
- Support multiple purchase candidates in one comparison workspace.
- Let signed-in users reflect on actual purchase outcomes over time.
- Keep AI as decision support, not as an opaque final decision maker.

## Non-Goals

- The product is not a marketplace, checkout, or affiliate product.
- The product is not a financial advisor or credit recommendation tool.
- The product does not currently track live prices, stock, coupons, warranties, or resale listings.
- The product does not currently import transactions from banks, email receipts, or merchants.
- The product does not currently guarantee cross-device sync for the main calculator page.

## Current Functional Requirements

### Calculator

- Users can create and edit purchase items with name, price, expected lifespan, uses per week, minutes per use, and yearly depreciation rate.
- The calculator must show cost per use, cost per hour, cost per week, cost per month, cost per year, total lifetime uses, depreciation amounts, and estimated retained value.
- Users can add, select, and delete items.
- At least one purchase item must remain in the calculator.
- Guest users can use the calculator without an account.
- The current main calculator page persists items in browser `localStorage`.

### Visual Analysis

- The app must visualize cost breakdowns and value retention for the active item.
- The app must show a cost-over-time timeline for remaining value, cost per use, and cost per hour.

### Comparison

- Users can compare multiple saved items side by side.
- Users can select which items are included in the comparison.
- Items are sorted by cost-per-use efficiency in the comparison table.
- Signed-in users can request AI comparison analysis for two or more selected items.

### Import and Export

- Users can export raw calculator items as JSON.
- Users can export calculator items plus calculated metrics as JSON or CSV.
- Users can import calculator items from a valid JSON file matching the `PurchaseItem` shape.

### Authentication

- Users can sign up and sign in with Supabase email/password authentication.
- Users can continue as guests from the auth screen.
- Advisor and journal routes require sign-in.
- Signed-in features call Supabase with the user's authenticated session.

### AI Assistance

- Signed-in users can describe a purchase in natural language and have the app auto-fill calculator fields.
- Signed-in users can chat with an AI purchase advisor.
- The advisor can return suggested item parameters that the user can add to their item set.
- Signed-in users can request AI comparison analysis from selected calculator items.
- Signed-in users can request AI journal insights.
- AI calls must run through Supabase Edge Functions so the Venice API key stays server-side.
- AI responses should remain advisory and should expose or preserve the underlying purchase assumptions.

### Purchase Journal

- Signed-in users can log actual purchases with name, purchase date, actual price, satisfaction score, notes, rebuy intent, and actual uses per week.
- Signed-in users can view journal entries ordered by purchase date.
- Signed-in users can request AI analysis of journal patterns.

### Preferences and Presentation

- Users can choose light, dark, or system theme.
- The calculator metric display supports GBP, USD, EUR, and JPY.
- The app includes mobile bottom navigation for Calculator, Advisor, and Journal.
- The app includes PWA metadata and icons.

## Data Requirements

- `pa_profiles` stores account profile metadata.
- `pa_purchase_items` stores authenticated purchase items.
- `pa_purchase_journal` stores purchase reflection entries.
- `pa_ai_conversations` exists for AI conversation storage.
- `pa_user_preferences` exists for richer user preferences.
- All Supabase tables must use RLS policies scoped to the authenticated user.

## Success Measures

No analytics implementation is present in the repository. Product success should be validated with measures such as:

- Calculator completion rate for new purchase evaluations.
- Number of compared items per decision.
- Import/export usage for retention and portability.
- Signed-in conversion rate from guest usage.
- Journal entry creation and repeat reflection rate.
- User-reported confidence before and after using the tool.
- Reduction in repeat regret patterns over time.

## Risks and Constraints

- AI estimates may be wrong or overly confident, so the UI should keep assumptions editable.
- The current calculator page and authenticated Supabase item storage are not fully unified.
- Currency handling is not consistent across every UI surface.
- The schema contains capabilities not yet exposed in product flows.
- There are no visible automated tests or AI evals in the repository.
- Product behavior was inferred from the codebase, not confirmed through stakeholder interviews or user research.

## Product Gaps to Resolve

- Decide whether the main calculator should remain local-first or become Supabase-synced for signed-in users.
- Clarify the intended migration behavior from guest `localStorage` items to authenticated storage.
- Validate authenticated item ID handling against the `uuid` database schema before promising account-level item sync.
- Decide whether stored AI conversations are in scope and, if so, define retention, deletion, and privacy behavior.
- Decide whether category, notes, image URL, monthly budget, and value priorities should become user-facing features.
- Add or document product analytics and success instrumentation.
- Add a committed `.env.example` if onboarding new developers is important.
