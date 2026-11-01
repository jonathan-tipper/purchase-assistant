/**
 * Only inspect claims after Auth has verified this exact bearer and returned the
 * user UUID. Identity scopes do not grant access to this app's paid assistant.
 * Purchase Assistant currently supports direct sessions, with no OAuth client.
 */
export function allowsDirectAppToken(
  authorization: string,
  verifiedUserId: string,
  supabaseUrl: string,
): boolean {
  if (!authorization.startsWith("Bearer ") || !verifiedUserId) return false;
  const parts = authorization.slice(7).split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;
  try {
    const payload = parts[1];
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length > 65_536)
      return false;
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      (character) => character.charCodeAt(0),
    );
    const claims: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!claims || typeof claims !== "object" || Array.isArray(claims))
      return false;
    const token = claims as Record<string, unknown>;
    const audience = token.aud;
    const authenticatedAudience =
      audience === "authenticated" ||
      (Array.isArray(audience) &&
        audience.every((entry) => typeof entry === "string") &&
        audience.includes("authenticated"));
    return (
      token.sub === verifiedUserId &&
      token.iss === `${supabaseUrl.replace(/\/+$/, "")}/auth/v1` &&
      authenticatedAudience &&
      token.role === "authenticated" &&
      token.client_id == null
    );
  } catch {
    return false;
  }
}
