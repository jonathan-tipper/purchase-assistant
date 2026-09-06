/** Explicit live integration test. Creates/deletes its own Auth fixture; never emails or uses a real person's account. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  coffeeExample,
  newDecision,
  decisionSchema,
} from "../supabase/functions/_shared/domain.ts";
const ref = process.argv[process.argv.indexOf("--project-ref") + 1];
if (
  !process.argv.includes("--run-live") ||
  !process.argv.includes("--project-ref") ||
  !/^[a-z]{20}$/.test(ref ?? "")
)
  throw new Error(
    "Usage: node scripts/live-smoke.mjs --run-live --project-ref <project-ref>. This uses paid provider calls within the normal quota.",
  );
let keys;
try {
  keys = JSON.parse(
    execFileSync(
      "supabase",
      ["projects", "api-keys", "--project-ref", ref, "-o", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
} catch {
  throw new Error(
    "Could not read project keys through the authenticated Supabase CLI.",
  );
}
const admin = keys.find((k) => k.name === "service_role")?.api_key;
const anon = keys.find((k) => k.name === "anon")?.api_key;
if (!admin || !anon)
  throw new Error(
    "The authenticated Supabase CLI must have access to the project keys.",
  );
const base = `https://${ref}.supabase.co`;
const email = `purchase-assistant-qa-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomUUID() + crypto.randomUUID();
const report = {
  date: new Date().toISOString(),
  results: [],
  checks: {},
  cleanup: false,
};
let userId;
async function call(
  path,
  { key = anon, token = key, method = "GET", body, headers = {} } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(path.includes("/functions/") ? 120000 : 15000),
  });
  const text = await r.text();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    value = text;
  }
  return { status: r.status, ok: r.ok, value };
}
function check(ok, message) {
  if (!ok) throw new Error(message);
}
try {
  const created = await call("/auth/v1/admin/users", {
    key: admin,
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Purchase Assistant temporary QA" },
    },
  });
  check(
    created.ok && created.value.id,
    `Could not create test fixture (${created.status})`,
  );
  userId = created.value.id;
  const login = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  check(
    login.ok && login.value.access_token,
    `Test sign-in failed (${login.status})`,
  );
  const token = login.value.access_token;
  report.results.push({ step: "authenticated-session", passed: true });
  const decision = {
    ...newDecision("Synthetic API persistence test"),
    revision: 1,
  };
  const saved = await call("/rest/v1/pa_decisions", {
    token,
    method: "POST",
    body: { id: decision.id, user_id: userId, revision: 1, payload: decision },
    headers: { Prefer: "return=representation" },
  });
  check(saved.ok, `Cloud insert failed (${saved.status})`);
  const loaded = await call(
    `/rest/v1/pa_decisions?id=eq.${decision.id}&select=payload`,
    { token },
  );
  check(
    loaded.ok && decisionSchema.safeParse(loaded.value[0]?.payload).success,
    "Cloud round-trip failed",
  );
  report.results.push({ step: "cloud-document-round-trip", passed: true });
  const run = async (action, body) => {
    const started = Date.now();
    const result = await call("/functions/v1/decision-assistant", {
      token,
      method: "POST",
      body: { action, requestId: crypto.randomUUID(), ...body },
    });
    report.results.push({
      step: action,
      image: !!body.image,
      status: result.status,
      elapsedMs: Date.now() - started,
      result: result.value,
    });
    return result;
  };
  if (!process.argv.includes("--research-only")) {
    const textResult = await run("extract", {
      description:
        "Acme Quiet 200 headphones cost £249. I expect to use them 5 times each week. No lifespan is specified.",
    });
    const imageResult = await run("extract", {
      description:
        "Read only the explicit facts on this synthetic product label.",
      image: `data:image/png;base64,${readFileSync(new URL("../tests/fixtures/purchase-label.png", import.meta.url)).toString("base64")}`,
    });
    const textFields = textResult.value?.extraction;
    const imageFields = imageResult.value?.extraction;
    report.checks.textFacts =
      textResult.status === 200 &&
      textFields?.price === 249 &&
      textFields?.currency === "GBP" &&
      textFields?.usesPerWeek === 5 &&
      textFields?.lifespanYears === null;
    report.checks.imageFacts =
      imageResult.status === 200 &&
      imageFields?.price === 249 &&
      imageFields?.currency === "GBP" &&
      imageFields?.usesPerWeek === null &&
      imageFields?.lifespanYears === null;
  }
  const d = coffeeExample();
  d.title = "Sage Bambino Plus for home coffee";
  d.candidates[0].name = "Sage Bambino Plus SES500 UK";
  d.candidates[0].price = 399;
  d.candidates[0].sourceUrl =
    "https://www.sageappliances.com/en-gb/product/bes500";
  const researchResult = await run("research", { decision: d });
  const research = researchResult.value?.research;
  report.checks.researchContract =
    researchResult.status === 200 &&
    research?.evidence?.length > 0 &&
    research.claims.every((c) =>
      c.sourceIds.every((id) => research.evidence.some((e) => e.id === id)),
    );
  const ledger = await call(
    `/rest/v1/pa_ai_runs?user_id=eq.${userId}&select=action,units,status,provider_calls,input_tokens,output_tokens`,
    { key: admin },
  );
  report.ledger = ledger.value;
} finally {
  if (userId) {
    try {
      const removed = await call(`/auth/v1/admin/users/${userId}`, {
        key: admin,
        method: "DELETE",
      });
      report.cleanup = removed.ok;
    } catch {
      report.cleanup = false;
    }
    if (!report.cleanup) report.cleanupUserId = userId;
  }
  console.log(JSON.stringify(report, null, 2));
}
if (
  !report.cleanup ||
  Object.values(report.checks).some((v) => !v) ||
  report.results.some((r) => r.status && r.status !== 200)
)
  process.exitCode = 1;
