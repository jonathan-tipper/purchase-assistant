import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Notice } from "@/components/Controls";

export default function SuiteCallback() {
  const { completeSharedSignIn } = useAuth();
  const navigate = useNavigate();
  const original = useRef(window.location.href);
  const completion = useRef<Promise<string> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    // Remove the one-use code before rendering navigation or loading app data.
    window.history.replaceState(null, "", "/auth/suite/callback");
    completion.current ??= completeSharedSignIn(original.current);
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
  }, [completeSharedSignIn, navigate]);
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
