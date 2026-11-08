import { describe, expect, it } from "vitest";
import { allowsAppToken } from "../supabase/functions/_shared/auth-policy";

const user = "11111111-1111-4111-8111-111111111111";
const project = "https://auth.example.test";
const direct = {
  sub: user,
  iss: project + "/auth/v1",
  aud: "authenticated",
  role: "authenticated",
};
function bearer(payload: unknown) {
  const encoded = btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `Bearer synthetic-header.${encoded}.synthetic-signature`;
}

describe("verified app-client boundary", () => {
  it("admits only the explicitly registered Purchase client while preserving direct sessions", () => {
    const client = "purchase-client-25";
    expect(
      allowsAppToken(
        bearer({ ...direct, client_id: client }),
        user,
        project,
        client,
      ),
    ).toBe(true);
    expect(
      allowsAppToken(
        bearer({ ...direct, client_id: "learn-client" }),
        user,
        project,
        client,
      ),
    ).toBe(false);
    expect(
      allowsAppToken(
        bearer({ ...direct, client_id: client }),
        user,
        project,
        "",
      ),
    ).toBe(false);
    expect(
      allowsAppToken(
        bearer({ ...direct, client_id: client }),
        "other-user",
        project,
        client,
      ),
    ).toBe(false);
    expect(allowsAppToken(bearer(direct), user, project, client)).toBe(true);
    expect(
      allowsAppToken(bearer({ ...direct, client_id: "" }), user, project, ""),
    ).toBe(false);
  });
  it("accepts absent/null clients and authenticated array audiences", () => {
    expect(allowsAppToken(bearer(direct), user, project)).toBe(true);
    expect(
      allowsAppToken(bearer({ ...direct, client_id: null }), user, project),
    ).toBe(true);
    expect(
      allowsAppToken(
        bearer({ ...direct, aud: ["authenticated"] }),
        user,
        project + "/",
      ),
    ).toBe(true);
  });
  it.each(
    ["learn-client", "taste-client", "", false, 0, [], {}].map((value) => [
      value,
    ]),
  )("rejects every non-null OAuth client claim %j", (clientId) => {
    expect(
      allowsAppToken(
        bearer({
          ...direct,
          client_id: clientId,
          scope: "openid email profile",
          user_metadata: { client_id: null },
        }),
        user,
        project,
      ),
    ).toBe(false);
  });
  it.each(
    [
      null,
      [],
      "value",
      1,
      {},
      { ...direct, sub: "another-user" },
      { ...direct, iss: "https://other-project.example/auth/v1" },
      { ...direct, aud: "anon" },
      { ...direct, aud: ["authenticated", 1] },
      { ...direct, role: "anon" },
    ].map((value) => [value]),
  )("rejects malformed or mismatched claims %j", (claims) => {
    expect(allowsAppToken(bearer(claims), user, project)).toBe(false);
  });
  it.each([
    "",
    "Bearer opaque-token",
    "Bearer header.!!!.signature",
    "Bearer header.e30.",
    "Basic header.e30.signature",
  ])("fails closed for invalid bearer encoding %s", (header) => {
    expect(allowsAppToken(header, user, project)).toBe(false);
  });
});
