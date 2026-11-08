# jonathantipper.com shared sign-in

Purchase Assistant keeps its guest workspace and existing All Apps identities.
Shared sign-in uses the central account pages, a separately registered public
OAuth client and an app-owned session. It does not copy the main site's cookies,
merge users, or upload guest decisions automatically.

## Configuration and ordered rollout

The prepared public client ID is `7bbabfb4-bf84-4e90-a6eb-ee8877ac5e77`.
Its exact production callback is
`https://buyornot.jonathantipper.com/auth/suite/callback`. The central trusted
registry entry uses stable slug `purchase-assistant`. Registration alone does not
enable consent or database access.

1. Deploy the accepting callback and keep `VITE_SHARED_AUTH_ENABLED=false` until
   central consent, data boundaries and the Edge handler have been reviewed.
2. Apply `20261108104748_purchase_live_session_admission.sql`. Its helper reads
   only the named user/session pair and is executable only by `service_role`.
   Browser users cannot inspect Auth sessions or call this helper.
3. Deploy the `decision-assistant` Edge handler with `PA_SHARED_AUTH_CLIENT_ID`
   set to the prepared client ID. Legacy direct sessions remain supported;
   another app's client token remains denied before body, quota or provider work.
   A live-session check rejects revoked sessions before paid execution.
4. Add the same exact client/callback to the central website's trusted registry.
   Enable only Purchase's owner-scoped resources in the private data registry:

   | Schema/resource              | Allowed methods                | Purpose                  |
   | ---------------------------- | ------------------------------ | ------------------------ |
   | `public.pa_decisions`        | GET, HEAD, POST, PATCH, DELETE | Existing owner decisions |
   | `public.pa_purchase_items`   | GET, HEAD                      | Explicit legacy import   |
   | `public.pa_purchase_journal` | GET, HEAD                      | Explicit legacy import   |

   Retain all existing ownership policies and suite restrictive guards. There is
   no browser access to quota ledgers, paid admission RPCs or other apps' data.

5. Set the production browser variables below, run controlled end-to-end and
   negative access checks, then enable the shared entry point.

| Variable                        | Value/purpose                                      |
| ------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Existing All Apps project origin                   |
| `VITE_SUPABASE_ANON_KEY`        | Existing publishable/anon key; never a service key |
| `VITE_SHARED_AUTH_CLIENT_ID`    | Prepared public client ID above                    |
| `VITE_SHARED_AUTH_REDIRECT_URI` | Exact registered callback above                    |
| `VITE_SHARED_AUTH_ENABLED`      | Explicit `true` after the rollout gates pass       |
| Edge `PA_SHARED_AUTH_CLIENT_ID` | Same exact client ID; unset rejects OAuth clients  |

A preview deployment cannot use the production callback on a different origin.
An isolated local proof needs its own exact loopback callback and registered test
client. Never use a wildcard callback or point a preview at production data to
make a check pass.

## Session and compatibility behaviour

The vendored adapter is copied from the central site's
`integrations/suite-client.mjs`. It binds state, S256 PKCE, callback, expiry and
the local return path to a per-tab transaction. OAuth refresh uses
`/auth/v1/oauth/token` with this app's client ID; the ordinary Supabase SDK does
not receive or refresh the shared session. The data client receives the adapter's
current bearer through the supported `accessToken` callback.

Shared credentials live only on this app's origin under the `pa-account`
namespace. The sticky `pa.account.source.v1` selector prevents shared local
sign-out from reviving an older legacy SDK session. Existing legacy credentials
are retained separately for compatibility. Cross-tab storage/focus events
refresh the displayed account without changing guest data.

Blocked or failed account-source storage fails closed rather than reviving a
cached legacy account. A rejected identity check removes only the token it
actually verified; a delayed response cannot erase a newer completed login or
cancel an outstanding sign-in transaction. Transient provider failures retain
the session for a later retry.

The callback removes its one-use query before app navigation, completes only
once under React StrictMode and verifies the user before opening the account
workspace. Auth routes use no-store, no-referrer and noindex headers. Query and
fragment returns remain local; canonicalised network-path redirects and auth
callback loops are rejected.

The existing `/auth` and `/auth?mode=recovery` routes keep accepting previously
issued direct-session/PKCE recovery callbacks. With shared entry enabled, new
sign-in/account creation goes through the central account service. Recovery and
account-management links also use the central site. Retire the legacy accepting
paths only after the actual outstanding-link/session compatibility window.

The retained legacy recovery form uses its existing direct SDK policy. It does
not implement the central site's session-bound recovery grant or claim equivalent
fresh-reauthentication enforcement. New shared recovery requests use the central
route; retirement of the legacy form remains a separate compatibility decision.

“Sign out here” ends this app's shared session and requests local refresh-token
revocation. It does not clear another origin's cookies. Suite-wide sign-out is
available in the central Account page. Already-issued access JWTs retain their
configured lifetime; the paid assistant independently checks that its Auth
session still exists before reserving quota or calling the provider.

Guest data stays in `pa.decisions.v1`. Existing explicit guest/legacy import,
record revision checks, ownership and account UUIDs remain unchanged. Shared
sign-in does not grant a larger paid allowance or bypass admission controls.

## Verification and rollback

Record real central login/consent/callback, reuse from another connected app,
password/email recovery, safe decision deep links, refreshed/rotated credentials,
concurrent tabs and local/suite logout. Use disposable accounts to verify own CRUD
and legacy import; another user/client and a revoked session must fail before
paid execution. Do not use customer records or incur paid provider calls merely
to test authentication admission.

The automated tests cover OAuth transport/rotation, state/replay failures,
entry-disabled callback compatibility, sticky sign-out, rendered entry/recovery
states, callback scrubbing, StrictMode and server client/session admission. They
do not establish production delivery or migration on their own.

For a disposable SQL permission proof without a hosted project, install
`@electric-sql/pglite@0.5.15` into a separate `/tmp` fixture and run:

```sh
npm install --prefix /tmp/purchase-sql-fixture --save-exact @electric-sql/pglite@0.5.15
PURCHASE_SQL_FIXTURE_ROOT=/tmp/purchase-sql-fixture node tests/sql/prove-live-session.mjs
```

This executes the actual migration and role, owner, expiry and revocation checks
on an in-memory Postgres engine, then closes it. It is not the hosted Supabase
migration/permission proof. The redacted result is in
`docs/evidence/shared-session-sql-report.json`. PGlite is test-only and is not an
application dependency.

Rollback first disables `VITE_SHARED_AUTH_ENABLED` and rebuilds, retaining the
client configuration, callback and accepting API/data permissions for existing
sessions through the compatibility window. The previous direct login remains
available. Do not delete users, guest workspaces, owner records or old callbacks
as rollback. Remove new grants only under a separately reviewed shutdown after
outstanding sessions can no longer depend on them.
