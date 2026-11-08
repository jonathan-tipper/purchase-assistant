import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Notice } from "@/components/Controls";

export default function SuiteCallback() {
  const { completeSharedSignIn, user, loading, shared } = useAuth();
  const navigate = useNavigate();
  const original = useRef(window.location.href);
  const completer = useRef(completeSharedSignIn);
  const completion = useRef<Promise<string> | null>(null);
  const scrubbed = useRef(false);
  const cleanCallback = useRef(
    original.current === window.location.origin + "/auth/suite/callback",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    // Scrub once, preserving Router's history index/key. Auth restoration can
    // rerender this route while its destination is still loading.
    if (!scrubbed.current) {
      window.history.replaceState(
        window.history.state,
        "",
        "/auth/suite/callback",
      );
      scrubbed.current = true;
    }
    // A clean revisit has no response to exchange. Wait for AuthProvider's
    // verified restoration; any query/fragment still requires full completion.
    if (cleanCallback.current) {
      if (loading) return;
      if (shared && user) navigate("/workspace", { replace: true });
      else setError("Sign in again, or continue in this browser.");
      return;
    }
    completion.current ??= completer.current(original.current);
    completion.current
      .then((next) => {
        if (active) navigate(next, { replace: true });
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "This sign-in could not be completed. Start again.",
          );
      });
    return () => {
      active = false;
    };
  }, [loading, navigate, shared, user]);
  return (
    <div className="auth-page">
      <section className="auth-panel" aria-label="Purchase Assistant sign-in">
        <span className="eyebrow">JONATHANTIPPER.COM</span>
        <h1>{error ? "Sign in again." : "Returning to your decisions."}</h1>
        {error ? (
          <>
            <Notice error>{error}</Notice>
            <Link to="/auth">Start sign-in again</Link>
            <Link to="/">Continue in this browser</Link>
          </>
        ) : (
          <p role="status">Completing your Purchase Assistant sign-in…</p>
        )}
      </section>
    </div>
  );
}
