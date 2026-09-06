# Decision workspace build

## User and outcome

People considering durable purchases need a quick, understandable decision and a way to learn whether it worked out.

## Product promise

Capture a purchase, check the assumptions, compare ownership scenarios and record the outcome.

## Scope

Replace disconnected calculator/advisor/journal pages with one decision workspace. Preserve guest data and provide explicit account import, typed cloud storage with concurrency checks, image/text extraction, bounded sourced research, deterministic ownership maths, comparison, outcomes, export and recovery states. Secure or retire all old AI endpoints.

## Non-goals

Checkout, broad financial advice, background monitoring, transaction/email permissions, an exhaustive product catalogue, claims of verified AI facts.

## Existing stack and constraints

React/Vite and Supabase remain. Shared Supabase project: additive pa_ tables only, owner-scoped RLS, no changes to unrelated apps. No raw photos in localStorage or decision records. No automatic guest data deletion.

## Critical journey

Guest creates a manual or example decision → edits two useful questions and assumptions → compares up to three candidates → saves → optionally signs in/imports → extracts a screenshot or researches with AI → reviews and applies suggestions → records a decision and dated ownership check-in → exports.

## Required states

Empty, loading, local-only, signed-in, explicit import, dirty draft, save error, conflict, AI unavailable, quota exceeded, unverified sources, stale analysis, no usage, missing product price, sparse history.

## Design direction

A calm decision notebook: warm paper, dark ink, forest-green actions, generous editorial type and compact numerical tables. One persistent navigation. No decorative dashboard metrics. The first useful action should be obvious; evidence and assumptions should remain inspectable.

## Architecture boundaries

Shared pure domain schema and calculation functions; repository adapters for browser/cloud persistence; one bounded server AI pipeline; images and source text are untrusted. Model output proposes drafts and never changes saved data automatically. Common horizon, explicit currency, no double-counted depreciation.

## Plan

1. Domain, persistence, migration and tests.
2. Capture, editable brief, comparison, outcomes and responsive UI.
3. Authenticated multimodal extraction/research, atomic quotas, old endpoint retirement.
4. Type/lint/test/build checks, browser checks, data/security verification, docs and delivery.

## Acceptance criteria

First save creates one decision. Existing guest data survives migration. Dirty drafts never disappear silently. Account switching clears visible account data. Invalid/zero inputs never create non-finite metrics. Candidate costs share a horizon and currency. AI requires a real user and a budget reservation. AI suggestions require explicit application. Sources distinguish supplied URLs from retrieved evidence. Outcome snapshots remain unchanged by later edits. Cross-user RLS and optimistic concurrency have tests.

## Selected skills

product-build-orchestrator, product-experience-direction, polished-ui-implementation, react-next-frontend-engineering, supabase, security-and-privacy-review, browser-and-visual-qa, product-release-readiness.
