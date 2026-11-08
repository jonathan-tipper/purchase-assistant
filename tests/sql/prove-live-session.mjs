// Disposable in-memory Postgres only. Never connects to a configured database.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const fixtureRoot = process.env.PURCHASE_SQL_FIXTURE_ROOT;
if (!fixtureRoot)
  throw new Error(
    "Set PURCHASE_SQL_FIXTURE_ROOT to a separate test-only installation of @electric-sql/pglite@0.5.15.",
  );
const require = createRequire(resolve(fixtureRoot, "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const pkg = JSON.parse(
  await readFile(
    resolve(fixtureRoot, "node_modules/@electric-sql/pglite/package.json"),
    "utf8",
  ),
);
assert.equal(pkg.version, "0.5.15");
const migration = await readFile(
  new URL(
    "../../supabase/migrations/20261108104748_purchase_live_session_admission.sql",
    import.meta.url,
  ),
  "utf8",
);
const db = new PGlite();
const checks = [];
const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const live = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const expired = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const future = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function check(name, run) {
  await run();
  checks.push({ name, passed: true });
}
async function allowed(session, owner) {
  return (
    await db.query(
      "select public.pa_has_live_session($1::uuid,$2::uuid) as allowed",
      [session, owner],
    )
  ).rows[0].allowed;
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    revoke all on schema auth from public;
    create table auth.sessions(id uuid primary key, user_id uuid not null, not_after timestamptz);
    revoke all on auth.sessions from public, anon, authenticated, service_role;
    insert into auth.sessions values
      ('${live}','${user}',null),
      ('${expired}','${user}',now()-interval '1 minute'),
      ('${future}','${user}',now()+interval '1 day');
  `);
  await db.exec(migration);
  await check(
    "The actual migration executes on the Postgres engine",
    async () =>
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from pg_proc where proname='pa_has_live_session'",
          )
        ).rows[0].n,
        1,
      ),
  );
  await check(
    "Helper uses security definer and an empty search path",
    async () => {
      const p = (
        await db.query(
          "select prosecdef,proconfig from pg_proc where oid='public.pa_has_live_session(uuid,uuid)'::regprocedure",
        )
      ).rows[0];
      assert.equal(p.prosecdef, true);
      assert.ok(p.proconfig.includes('search_path=""'));
    },
  );
  for (const role of ["anon", "authenticated"]) {
    await check(`${role} has no execute privilege`, async () =>
      assert.equal(
        (
          await db.query(
            "select has_function_privilege($1,'public.pa_has_live_session(uuid,uuid)','EXECUTE') as allowed",
            [role],
          )
        ).rows[0].allowed,
        false,
      ),
    );
    await check(`${role} cannot execute the helper`, async () => {
      await db.exec(`set role ${role}`);
      try {
        await assert.rejects(allowed(live, user), { code: "42501" });
      } finally {
        await db.exec("reset role");
      }
    });
  }
  await check("Only service_role receives execute access", async () =>
    assert.equal(
      (
        await db.query(
          "select has_function_privilege('service_role','public.pa_has_live_session(uuid,uuid)','EXECUTE') as allowed",
        )
      ).rows[0].allowed,
      true,
    ),
  );
  await db.exec("set role service_role");
  await check("Service role can verify a live owned session", async () =>
    assert.equal(await allowed(live, user), true),
  );
  await check("A different user cannot borrow the session", async () =>
    assert.equal(await allowed(live, other), false),
  );
  await check("An expired session is rejected", async () =>
    assert.equal(await allowed(expired, user), false),
  );
  await check("A future bounded session is accepted", async () =>
    assert.equal(await allowed(future, user), true),
  );
  await check("A missing session is rejected", async () =>
    assert.equal(await allowed(other, user), false),
  );
  await check("Null session or owner is rejected", async () => {
    assert.equal(await allowed(null, user), false);
    assert.equal(await allowed(live, null), false);
  });
  await check(
    "Service role cannot directly read private Auth session rows",
    async () => {
      await assert.rejects(db.query("select * from auth.sessions"), {
        code: "42501",
      });
    },
  );
  await db.exec("reset role");
  await db.query("delete from auth.sessions where id=$1::uuid", [live]);
  await db.exec("set role service_role");
  await check(
    "Deleting a revoked session prevents further admission",
    async () => assert.equal(await allowed(live, user), false),
  );
  await db.exec("reset role");
  const report = {
    engine: "PGlite in-memory Postgres",
    package: "@electric-sql/pglite",
    version: pkg.version,
    postgres_version: (await db.query("select version() as version")).rows[0]
      .version,
    migration: "20261108104748_purchase_live_session_admission.sql",
    migration_sha256: createHash("sha256").update(migration).digest("hex"),
    checks,
    limit:
      "Synthetic in-memory schema/roles exercise actual SQL and execute permissions; not a hosted Supabase migration, HTTP Data API or production proof.",
  };
  const output = new URL(
    "../../docs/evidence/shared-session-sql-report.json",
    import.meta.url,
  );
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      engine: report.engine,
      version: pkg.version,
      passed: checks.length,
      failed: 0,
      report: "docs/evidence/shared-session-sql-report.json",
    }),
  );
} finally {
  await db.close();
}
