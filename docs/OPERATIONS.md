# Operations

## Configuration

Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Both are public client configuration. No configuration is needed for guest use.

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Set `VENICE_API_KEY` as a server secret. Optional server overrides are `PA_TEXT_MODEL`, `PA_VISION_MODEL`, `PA_RESEARCH_MODEL` and `PA_AI_ENABLED=false`.

The default model is `qwen3-vl-235b-a22b` for text, images and research synthesis; each role can be overridden separately. It is listed in [Venice's model catalogue](https://docs.venice.ai/models/overview). Check support and deprecations before changing them. The standalone [search API is experimental](https://docs.venice.ai/api-reference/endpoint/augment/search), so failures must remain a normal product state.

## Build runtime

`.node-version` selects Node.js 24 for environments that do not read `package.json` engines. GitHub CI uses the same file; Vercel's project is configured for Node 24. The repository also has a Cloudflare Pages integration. Its [build image configuration](https://developers.cloudflare.com/pages/configuration/build-image/) reads `.node-version`; older images otherwise default to Node 18, which cannot run this Vite version.

## Deployment order

1. Run `npm ci` and `npm run check`.
2. Review/apply the committed Supabase migrations in order. This repository shares a Supabase project with unrelated applications; do not reset or overwrite the project to deploy this app.
3. Run `supabase/tests/decision_security.sql` as an administrative transaction. It inserts synthetic users and decisions, tests roles/quotas, then rolls everything back. A failure must abort and roll back the whole transaction.
4. Deploy `decision-assistant` with `deno.json`, `deno.lock` and both shared TypeScript modules, JWT verification enabled.
5. Deploy the four legacy handlers as the committed 410 responses. They must not call Venice.
6. Deploy the frontend through Vercel. Ensure auth redirect allowlists cover `/auth?mode=recovery` and the authorised production/local origins. Do not use broad wildcard production redirects.
7. Probe the new endpoint with no user session and the public anon key; both must return 401 without a paid call. Old endpoints must return 410 for an accepted public JWT.
8. Complete the signed-in smoke/evaluation in `AI-EVALUATION.md` before describing the AI preview as validated.

The September migrations were applied using the Supabase connector; committed version filenames match the recorded remote migration versions. Never reapply them under a different name/version.

## Usage and budget

`pa_ai_limits` is a service-only singleton. Defaults: 12 units per user per UTC day and 120 global units per UTC day. Extraction reserves 1 unit; research reserves 4. A reservation is charged even if the provider fails. Duplicate request IDs cannot reserve twice. A locked database row serialises admission checks and prevents concurrent requests from exceeding the allowance.

One research run makes at most 4 provider calls: one plan, up to 2 searches and one synthesis. Planning/extraction request at most 1,600 output tokens; synthesis requests 1,200. Extraction/planning calls have a 25-second timeout and synthesis has 45 seconds, each search 12 seconds. Authentication, quota and ledger requests also have finite timeouts. No automatic retries or recursive tool loops. Photo payloads are capped at 3 MB; structured context and source excerpts have separate limits.

The executor uses only the first 2 proposed searches even if the planner returns extra suggestions. The model supplies cited claims and questions; the cost conclusion comes from the shared ownership calculation, with inputs labelled as assumptions. Provider schema failures expose only stage and validation paths, never raw provider content.

These are admission/call limits, not an exact monetary cap. Image input tokenisation, search charges and provider pricing can change. Set a provider-side spending limit as well. `pa_ai_runs` stores owner, action, status, reserved units, provider call count and reported text token totals, without prompts or images. A failed final ledger write leaves the reservation charged.

To stop paid calls, set `enabled=false` on the `pa_ai_limits` singleton, or set `PA_AI_ENABLED=false`. Manual decisions remain available. Changing global project authentication settings affects other apps and needs separate scope.

## Data recovery and deletion

Keep backups before any manual data maintenance. Guest recovery uses the original `purchaseValueItems` key and the new `pa.decisions.v1` key. The error screen offers a raw recovery download; it is a diagnostic backup, not a normal import file. Standard full JSON exports can be imported through the workspace UI.

Legacy account items remain in `pa_purchase_items`; old journals can be exported separately. Imports never overwrite matching decision IDs. Deleting a new decision does not remove an original guest/legacy copy. Cross-service account erasure is not automated.

## Rollback

Prefer disabling AI while leaving the manual workspace available. A frontend rollback must keep the additive tables and original data. Rolling back to the old UI will leave its AI features unavailable because the unsafe endpoints now return 410. Do not restore the vulnerable provider handlers merely to make old buttons work. Fix forward or deploy a guest-only frontend if needed.

## Known service notices

The service-only `pa_ai_limits` and `pa_ai_runs` tables intentionally have RLS enabled with no client policies. Their advisory notices are expected. See [Supabase's explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The shared project has leaked-password protection disabled. That was observed before this build; other app settings were left alone. Review [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) when scheduling a project-wide auth change.

## Reproduce the live smoke test

With Node 24 and a Supabase CLI login authorised to administer this project:

```sh
node scripts/live-smoke.mjs --run-live --project-ref <project-ref>
```

This explicitly runs paid calls within the normal admission limits. It creates a synthetic email-confirmed test account through the Auth admin API, signs it in, checks a cloud round-trip, extracts text and the committed synthetic label, and researches a named coffee machine. It sends no email and does not use an existing person's account. The script reads keys into memory through the CLI and never prints them. It deletes its own test account in `finally`; if cleanup fails, the report includes the fixture ID for administrative removal.

Use `--research-only` when investigating the research path. Retain the redacted JSON report. Deleting the synthetic user also removes its app rows and usage ledger rows; provider charges still apply. The script is not part of automatic CI. A passing smoke test establishes that the integration works for these cases, not broad product accuracy.
