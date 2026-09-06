import { NavLink, Outlet, Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Sun,
  Moon,
  Settings2,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/features/decisions/WorkspaceContext";
import { download } from "@/services/download";
import { Button, Notice } from "./Controls";
export default function Shell() {
  const { user, signOut, error: authError } = useAuth();
  const { theme, setTheme } = useTheme();
  const { loading, error, reload, hasUnsavedChanges } = useWorkspace();
  const [logoutError, setLogoutError] = useState("");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Purchase Assistant home">
          <span className="brand-symbol">
            <Compass size={24} />
          </span>
          <span>
            Purchase
            <br />
            <strong>Assistant</strong>
          </span>
        </Link>
        <div className="sidebar-caption">A little more considered.</div>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <Compass size={18} />
            Decisions
          </NavLink>
          <NavLink to="/outcomes">
            <BookOpen size={18} />
            Your outcomes
          </NavLink>
          <NavLink to="/workspace">
            <Settings2 size={18} />
            Your workspace
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <p>
            Better assumptions.
            <br />
            Fewer regrets.
          </p>
          <span className="tiny">Your decisions belong to you.</span>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="storage-status">
            <i />
            {user ? "Account workspace" : "Saved in this browser"}
          </span>
          <div className="topbar-actions">
            <Button
              tone="quiet"
              aria-label={
                theme === "dark" ? "Use light theme" : "Use dark theme"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            {user ? (
              <Button
                tone="quiet"
                onClick={async () => {
                  try {
                    if (
                      hasUnsavedChanges &&
                      !window.confirm(
                        "Sign out and discard your unsaved changes?",
                      )
                    )
                      return;
                    await signOut();
                  } catch {
                    setLogoutError("Sign out failed. Please retry.");
                  }
                }}
              >
                <LogOut size={16} />
                Sign out
              </Button>
            ) : (
              <Link className="text-link" to="/auth">
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <main id="main">
          {(authError || logoutError) && (
            <Notice error>{logoutError || authError}</Notice>
          )}
          {loading ? (
            <div className="loading-state" role="status">
              Opening your workspace…
            </div>
          ) : error ? (
            <div className="empty-state">
              <h1>Your workspace could not be opened.</h1>
              <Notice error>{error}</Notice>
              <Button onClick={() => void reload()}>Retry loading</Button>
              {!user && (
                <Button
                  tone="quiet"
                  onClick={() =>
                    download(
                      "purchase-assistant-recovery.json",
                      JSON.stringify(
                        {
                          current: localStorage.getItem("pa.decisions.v1"),
                          previous: localStorage.getItem("purchaseValueItems"),
                          currency: localStorage.getItem("userCurrency"),
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  Download browser recovery copy
                </Button>
              )}
              <p>
                For local data, export the original browser storage before
                clearing it.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>Buy with a clearer head.</span>
          <Link to="/workspace#privacy">Privacy & data</Link>
        </footer>
      </div>
    </div>
  );
}
