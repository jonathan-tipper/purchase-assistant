import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { sharedAccount, supabase } from "@/integrations/supabase/client";
import {
  ACCOUNT_EVENT,
  ACCOUNT_SOURCE_KEY,
} from "@/integrations/suite/account";
import { verifiedAppTokenClaims } from "../../supabase/functions/_shared/auth-policy";
import { AuthContext } from "./auth-context";
// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from "./auth-context";

async function accountUser() {
  if (sharedAccount.source() !== "suite") {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.user ?? null;
  }
  const token = await sharedAccount.accessToken();
  if (!token) return null;
  const response = await fetch(`${sharedAccount.supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: sharedAccount.publishableKey,
    },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status))
      await sharedAccount.clearSessionIfCurrent(token);
    throw new Error("Sign in again to restore your account workspace.");
  }
  const user = (await response.json()) as User;
  if (
    !user.id ||
    !verifiedAppTokenClaims(
      `Bearer ${token}`,
      user.id,
      sharedAccount.supabaseUrl,
      sharedAccount.clientId,
    )
  ) {
    await sharedAccount.clearSessionIfCurrent(token);
    throw new Error("This session was not issued for Purchase Assistant.");
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    !!supabase || sharedAccount.source() === "suite",
  );
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const restoring = useRef<Promise<User | null> | null>(null);
  const restore = useCallback(() => {
    if (restoring.current) return restoring.current;
    const current = ++generation.current;
    const attempt = (async () => {
      try {
        const restored = await accountUser();
        if (current === generation.current) {
          setUser(restored);
          setError(null);
        }
        return current === generation.current ? restored : null;
      } catch {
        if (current === generation.current) {
          setUser(null);
          setError(
            "Your account session could not be restored. Sign in again, or continue in this browser.",
          );
        }
        return null;
      } finally {
        if (current === generation.current) setLoading(false);
      }
    })();
    restoring.current = attempt;
    void attempt.finally(() => {
      if (restoring.current === attempt) restoring.current = null;
    });
    return attempt;
  }, []);

  useEffect(() => {
    void restore();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (sharedAccount.source() !== "legacy") return;
      ++generation.current;
      restoring.current = null;
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);
    }).data.subscription;
    const changed = () => {
      ++generation.current;
      restoring.current = null;
      void restore();
    };
    const focus = () => {
      void restore();
    };
    const storage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === ACCOUNT_SOURCE_KEY ||
        event.key.startsWith("pa-account:")
      )
        changed();
    };
    window.addEventListener(ACCOUNT_EVENT, changed);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    const cancelRestores = () => {
      ++generation.current;
      restoring.current = null;
    };
    return () => {
      cancelRestores();
      subscription?.unsubscribe();
      window.removeEventListener(ACCOUNT_EVENT, changed);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
    };
  }, [restore]);

  async function signOut() {
    ++generation.current;
    restoring.current = null;
    try {
      if (sharedAccount.source() === "suite") await sharedAccount.signOut();
      else {
        const result = await supabase?.auth.signOut({ scope: "local" });
        if (result?.error) throw result.error;
      }
    } finally {
      setUser(null);
      setLoading(false);
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signOut,
        shared: sharedAccount.source() === "suite",
        sharedEnabled: sharedAccount.enabled,
        async startSharedSignIn(next) {
          window.location.assign(await sharedAccount.begin(next));
        },
        async completeSharedSignIn(url) {
          const next = await sharedAccount.complete(url);
          if (!(await restore()))
            throw new Error(
              "Your account could not be verified. Start sign-in again or continue in this browser.",
            );
          return next;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
