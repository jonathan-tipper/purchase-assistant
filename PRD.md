# Purchase Assistant product requirements

## Decision and scope

The September 2026 build replaces the separate calculator, advisor and journal with a persistent decision brief. The user approved a more ambitious direction using vision, language models and a simple research agent. This PRD supersedes the earlier document that described the calculator implementation.

The initial audience is people comparing durable home equipment, technology and hobby purchases. The desired outcome is an understandable decision, including waiting, buying used, repairing or deciding against the purchase. Purchase conversion is not the success measure.

## Critical flow

1. Describe the purchase, paste a product link, choose a photo path or open the clearly labelled worked example.
2. Save a decision with a UUID. Ask what it should do and what the person would do instead.
3. Review realistic use, comparison period, running costs, useful life and resale. Unknown prices remain unknown. Starting assumptions are explicitly labelled.
4. Compare up to 3 candidates in one currency and over one horizon. Show net ownership, cash outlay, per-use cost and replacements. Allow a half-use scenario.
5. Optionally sign in and explicitly import the guest decision. Photo/text extraction proposes fields. Research combines a calculated conditional cost conclusion with sourced product claims and decision questions. Applying fields and saving research are separate deliberate actions.
6. Record buying, waiting, passing or returning. Buying freezes the selected option and forecast. Later notes record usage, satisfaction and rebuy intent.
7. Return to those observations on a future decision; export or delete the record when appropriate.

## Behaviour requirements

| Area         | Requirement                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calculation  | Pure shared code computes purchase plus running and consumable costs minus resale. Include replacements only when the horizon extends beyond useful life. Interpolate remaining value linearly. Do not add depreciation again.       |
| Missing data | No invented price. Zero usage produces no cost-per-use figure. Invalid, negative, non-finite or excessive inputs prevent calculation/save.                                                                                           |
| Currency     | GBP, USD, EUR and JPY stored per decision. Relabelling currency never implies conversion. AI extraction cannot silently switch an existing priced scenario to another currency.                                                      |
| Persistence  | Guest and account repositories share the same versioned document. Revision conflicts block stale writes. Draft edits and check-in notes trigger navigation guards. Late save responses preserve newer edits.                         |
| Import       | Validate first, preview counts, then add without overwriting matching IDs. Keep legacy and guest originals. Stable IDs make account re-import idempotent.                                                                            |
| Extraction   | JPEG/PNG/WebP under 3 MB, matching signature, explicit facts only, missing numerical facts null, up to 3 questions. Do not claim to read a linked page.                                                                              |
| Research     | Server validates the authenticated user, reserves quota atomically, makes at most 4 paid calls, limits search to 2 queries and returns at most 6 sources. No product URL fetching, arbitrary tool execution or checkout.             |
| Evidence     | HTTPS links, retrieval dates, excerpts, claims referencing returned source IDs. Invalid citations fail closed. Old research becomes visibly stale when scenario inputs change. Citation existence is not proof that a claim is true. |
| Privacy      | Images remain in memory. Show provider disclosure before submission. Check-ins are excluded from web/model research context. Account data clears from view when the account changes.                                                 |
| Outcomes     | Forecast snapshots survive later edits. Individual check-ins and whole decisions can be deleted from the current workspace.                                                                                                          |
| Resilience   | Auth, cloud, storage, provider and quota failures have explicit states. AI failure never prevents manual editing.                                                                                                                    |

## Deliberate exclusions

No checkout, transaction imports, price watches, push/email reminders, automatic product catalogue, financial profiling, autonomous purchases or broad account deletion on the shared Supabase service. No claim of offline cloud editing or live realtime synchronisation. Account changes are loaded on opening/reloading the workspace; revision checks protect against conflicting writes.

The former cost-per-hour and depreciation charts are retired. The supported calculation is now ownership cost on a common horizon. Original minutes-per-use data remains in the retained legacy copy; the new model does not use it.

## Success measures to validate

There is no analytics instrumentation yet. For an initial observed pilot, measure time to a saved useful brief, whether participants correct unrealistic assumptions, whether sources answer their actual question and whether their final decision changes for an understandable reason. Record unexpected data loss, fabricated prices and misleading citations as failures.

Recruit 5 to 10 people considering real purchases before adding more features. Ask for a short follow-up after ownership. A good session can end with “I’ll keep what I have”. Avoid success metrics tied to amount spent or affiliate conversion.

## Release boundary

Automated tests cover domain behaviour, storage and AI service contracts; SQL checks cover owner isolation and quotas. A signed-in synthetic smoke test covers provider availability and basic extraction. Broader model quality, email recovery and cross-device browser sessions still need evaluation. The AI UI is labelled a preview until that evidence exists. See the release record for checks actually completed.
