import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
type Auth = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  shared: boolean;
  sharedEnabled: boolean;
  startSharedSignIn: (next: string) => Promise<void>;
  completeSharedSignIn: (url: string) => Promise<string>;
};
export const AuthContext = createContext<Auth | undefined>(undefined);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth provider missing");
  return value;
}
