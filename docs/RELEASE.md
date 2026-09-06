# September 2026 decision workspace release

## Product judgement

The original calculator established a useful idea, but the separate local calculator, cloud advisor and journal prevented a coherent decision flow. The new build makes a saved brief the central record. It supports the intended direction through vision extraction, bounded research, editable ownership scenarios and a feedback loop.

This is a working first product slice. It is suitable for continued development and a controlled manual pilot. The AI integration remains a preview pending broader real-world quality evaluation.

## Audit findings and disposition

| Finding from the original app                          | Change and evidence                                                                                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public anon JWT reached paid AI handlers               | New function calls the Auth user endpoint before reservation or provider work. Live anon probe returns 401. All 4 old endpoints now return 410 and contain no provider calls. |
| No per-user or global AI budget                        | Atomic service-only reservation ledger, 12 user/120 global daily units, finite requests and max 4 paid calls per research. SQL tests cover quotas and duplicate IDs.          |
| Calculator IDs incompatible with cloud UUIDs           | Shared UUID document contract; legacy conversion; explicit imports; `(user_id,id)` identity.                                                                                  |
| Local and account data disconnected                    | Shared repository contract and a deliberate guest-to-account handover. Original data retained.                                                                                |
| Autofill values overwritten by state updates           | Single validated proposal application. Component test verifies name/price/life/use values stay together and are not saved automatically.                                      |
| Depreciation model inconsistent and zero inputs unsafe | One shared ownership formula, explicit resale, common horizon and replacement cycles. Unit tests cover boundaries and unknown/zero values.                                    |
| Draft changes lost through navigation                  | Router and unload guards, sign-out confirmation for dirty drafts, pending check-in protection and late-save handling. Component/browser checks exercise the path.             |
| No purchase forecast to compare with actual use        | Frozen outcome snapshot and dated check-ins.                                                                                                                                  |
| Unvalidated imports and unsafe spreadsheet cells       | Versioned validation, capacity bounds, preview before import and formula-neutralised quoted CSV.                                                                              |
| Duplicate desktop/mobile UI and hidden AI navigation   | One responsive navigation and evidence inside each decision. Native controls and smaller dependencies.                                                                        |
| Mutable search paths on pa_ trigger functions          | Explicit search paths and revoked direct client execution.                                                                                                                    |
| No repeatable automated checks                         | Unit/service/component tests, strict type checks, lint, production build, Deno checks and CI.                                                                                 |

Original source state was `8e98030` on main, with no uncommitted work. The earlier audit report outside the repository contains the detailed pre-change findings; this record tracks their implementation disposition.

## Verification completed

- 52 automated tests passed across domain/portability, guest persistence, server AI contracts and editor behaviour.
- TypeScript app/config checks, ESLint and Vite production build passed.
- Deno checked the deployed Edge Function entrypoint and shared modules.
- Transactional SQL checks passed in the connected Supabase project: cross-user read/insert/update/delete, owner writes, revision conflicts, service-only reservation access, duplicate request rejection, user/global quotas, kill switch and workspace capacity. Fixtures and test quota settings rolled back.
- Live `decision-assistant` request with the public anon key returned 401. Four retired handlers returned 410. No model call was required for those probes.
- Signed-in live smoke passed against deployed function version 9: Auth, cloud round-trip, text extraction (6.7 seconds), synthetic-label vision (10.0 seconds), and cited research (19.3 seconds, 4 provider calls). See [AI-EVALUATION.md](AI-EVALUATION.md) for defects found, fixes and remaining quality limits.
- Browser checks exercised the guest example, changed assumptions, save-and-leave guard, reopened persisted values, bought snapshot and saved actual-use note. Desktop and 390 px mobile screens were inspected.
- Dependency audit reported 0 vulnerabilities after upgrades and removal of unused packages.

## Hosting checks

GitHub CI and Vercel preview deployment passed for this change. A compiled local browser run also loaded the decision flow without console errors. Node 24 is selected consistently in CI and hosting configuration.

Cloudflare Pages is also connected to this repository. Its check failed on the original `8e98030` main commit and on this branch. Adding the shared Node runtime selector did not clear it. The build log requires a Cloudflare login that is unavailable in this session, so the cause remains unverified. This is an unresolved pre-existing integration, not a passing deployment. [Latest inspected Cloudflare build](https://dash.cloudflare.com/?to=/458fb17574c6877e79f9720c01e02d0e/pages/view/purchase-assistant/97725a6b-8dfc-47db-89c8-744a0bec5922).

## Material limits

- Real-world photo quality, email confirmation/recovery and a two-device browser session have not been exercised. The signed-in synthetic smoke test is narrower than that evaluation.
- Search returns excerpts, not a full-page verification. Exact variant, current price and availability still need source inspection.
- Account mode is online. There is no offline write queue, live cross-device subscription, scheduled follow-up or background research.
- No product analytics or paid-user evidence exists yet. The next product test is whether real buyers find the brief useful.
- Deleting a new record does not delete its legacy/browser recovery copies. Whole-account erasure across the shared backend is not automated.
- The shared Supabase project still has its pre-existing leaked-password protection notice and notices belonging to other apps. No project-wide auth or unrelated app policies were changed.

## Retirement

The old calculator components, Radix/shadcn wrappers, charts, advisor chat and journal screens were removed. Old routes redirect into the new workspace. Their AI handlers are explicit retirement responses. Original SQL tables remain intentionally for recovery; their unused fields are not promises of current functionality. There is one npm lockfile and no Bun lockfile.

See [OPERATIONS.md](OPERATIONS.md) for deployment/rollback and [AI-EVALUATION.md](AI-EVALUATION.md) for the remaining live evaluation.
