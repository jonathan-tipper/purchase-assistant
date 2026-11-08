/**
 * Only inspect claims after Auth has verified this exact bearer and returned the
 * user UUID. Identity scopes do not grant access to this app's paid assistant.
 * Legacy direct sessions remain valid. Shared sessions must belong to Purchase's
 * exact deployment-configured client, never another suite application's client.
 */
export function verifiedAppTokenClaims(
  authorization: string,
  verifiedUserId: string,
  supabaseUrl: string,
  registeredClientId = "",
): { sessionId: string | null; clientId: string | null } | null {
  if (!authorization.startsWith("Bearer ") || !verifiedUserId) return null;
  const parts = authorization.slice(7).split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  try {
    const payload = parts[1];
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length > 65_536)
      return null;
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      (character) => character.charCodeAt(0),
    );
    const claims: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!claims || typeof claims !== "object" || Array.isArray(claims))
      return null;
    const token = claims as Record<string, unknown>;
    const audience = token.aud;
    const authenticatedAudience =
      audience === "authenticated" ||
      (Array.isArray(audience) &&
        audience.every((entry) => typeof entry === "string") &&
        audience.includes("authenticated"));
    const validClient =
      token.client_id == null ||
      (typeof token.client_id === "string" &&
        /^[A-Za-z0-9_-]{8,100}$/.test(registeredClientId) &&
        token.client_id === registeredClientId);
    if (!(
      token.sub === verifiedUserId &&
      token.iss === `${supabaseUrl.replace(/\/+$/, "")}/auth/v1` &&
      authenticatedAudience &&
      token.role === "authenticated" &&
      validClient
    ))
      return null;
    return {
      clientId: typeof token.client_id === "string" ? token.client_id : null,
      sessionId:
        typeof token.session_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          token.session_id,
        )
          ? token.session_id
          : null,
    };
  } catch {
    return null;
  }
}

export function allowsAppToken(
  authorization: string,
  verifiedUserId: string,
  supabaseUrl: string,
  registeredClientId = "",
) {
  return (
    verifiedAppTokenClaims(
      authorization,
      verifiedUserId,
      supabaseUrl,
      registeredClientId,
    ) !== null
  );
}
