import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cloudRepository, localRepository } from "@/services/repository";
import type { Decision } from "@/domain/decision";
import { Context } from "./context";
// eslint-disable-next-line react-refresh/only-export-components
export { useWorkspace } from "./context";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const repository = useMemo(
    () => (userId ? cloudRepository(userId) : localRepository(localStorage)),
    [userId],
  );
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await repository.list();
      if (active.current && ticket === generation.current) setDecisions(rows);
      return rows;
    } catch {
      if (active.current && ticket === generation.current)
        setError(
          "Your saved decisions could not be loaded. Retry before making changes. Your original data has been kept.",
        );
    } finally {
      if (active.current && ticket === generation.current) setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function save(d: Decision) {
    if (error) throw new Error("Reload your workspace before saving.");
    const saved = await repository.save(d);
    if (active.current)
      setDecisions((prev) => [saved, ...prev.filter((i) => i.id !== d.id)]);
    return saved;
  }
  async function importAll(items: Decision[]) {
    if (error) throw new Error("Reload before importing.");
    await repository.importAll(items);
    await reload();
  }
  async function remove(d: Decision) {
    await repository.remove(d);
    if (active.current)
      setDecisions((prev) => prev.filter((i) => i.id !== d.id));
  }
  return (
    <Context.Provider
      value={{
        decisions,
        loading,
        error,
        reload,
        save,
        importAll,
        remove,
        hasUnsavedChanges,
        setHasUnsavedChanges,
      }}
    >
      {children}
    </Context.Provider>
  );
}
