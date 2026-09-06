import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { cloudClient, supabase } from "@/integrations/supabase/client";
import { AuthContext } from "./auth-context";
// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from "./auth-context";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let changed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (alive) {
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive && !changed) {
          setUser(data.session?.user ?? null);
          setError(
            error
              ? "Your session could not be restored. Please sign in again."
              : null,
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          setError(
            "Account services are unavailable. Your browser workspace is still available.",
          );
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  async function signOut() {
    const { error } = await cloudClient().auth.signOut();
    if (error) throw error;
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
