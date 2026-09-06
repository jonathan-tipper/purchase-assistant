import { createContext, useContext } from "react";
import type { Decision } from "@/domain/decision";
type Workspace = {
  decisions: Decision[];
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean) => void;
  remove: (d: Decision) => Promise<void>;
  reload: () => Promise<Decision[] | undefined>;
  save: (d: Decision) => Promise<Decision>;
  importAll: (d: Decision[]) => Promise<void>;
};
export const Context = createContext<Workspace | null>(null);
export function useWorkspace() {
  const c = useContext(Context);
  if (!c) throw new Error("Workspace provider missing");
  return c;
}
