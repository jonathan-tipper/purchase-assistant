import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { cloudClient, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Field, Notice } from "@/components/Controls";
export default function Auth() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const raw = params.get("next") || "/";
  const next =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")
      ? raw
      : "/";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "recovery">(
    params.get("mode") === "recovery" ? "recovery" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (user && mode !== "recovery") navigate(next, { replace: true });
  }, [user, mode, navigate, next]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const c = cloudClient();
      if (mode === "login") {
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (mode === "signup") {
        const { error } = await c.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth?next=/workspace",
          },
        });
        if (error) throw error;
        setNotice("Check your email to confirm your account.");
      }
      if (mode === "reset") {
        const { error } = await c.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth?mode=recovery",
        });
        if (error) throw error;
        setNotice(
          "If there is an account for that address, you’ll receive a reset link.",
        );
      }
      if (mode === "recovery") {
        const { error } = await c.auth.updateUser({ password });
        if (error) throw error;
        setNotice("Password updated.");
        navigate("/workspace");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account service unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Back to your decisions
      </Link>
      <div className="auth-panel">
        <Compass size={32} />
        <span className="eyebrow">PURCHASE ASSISTANT</span>
        <h1>
          {mode === "reset"
            ? "Get back in."
            : mode === "recovery"
              ? "A fresh password."
              : "Keep your thinking together."}
        </h1>
        <p>
          An account workspace for your decisions, image reading and sourced
          research. Guest items are imported only when you choose.
        </p>
        {!supabase && (
          <Notice>
            Account services aren’t configured here. The browser workspace still
            works.
          </Notice>
        )}
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {mode !== "reset" && mode !== "recovery" && (
          <div className="tabbar">
            <button
              aria-current={mode === "login" ? "page" : undefined}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              aria-current={mode === "signup" ? "page" : undefined}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>
        )}
        <form onSubmit={submit}>
          {mode !== "recovery" && (
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          {mode !== "reset" && (
            <Field label="Password">
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? undefined : 10}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" disabled={busy || !supabase}>
            {busy
              ? "Working…"
              : mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Update password"}
          </Button>
        </form>
        {mode === "login" && (
          <Button tone="quiet" onClick={() => setMode("reset")}>
            Forgot your password?
          </Button>
        )}
        <Link to="/">Continue in this browser</Link>
      </div>
    </div>
  );
}
