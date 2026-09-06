import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/features/decisions/WorkspaceContext";
import {
  exportCSV,
  exportJSON,
  parseImport,
  storedCurrency,
} from "@/domain/portability";
import type { Decision } from "@/domain/decision";
import { localRepository, readLegacyCloud } from "@/services/repository";
import { download } from "@/services/download";
import { Button, Notice } from "@/components/Controls";
export default function Workspace() {
  const { user } = useAuth();
  const { decisions, importAll, remove } = useWorkspace();
  const [pending, setPending] = useState<Decision[] | null>(null);
  const [guest, setGuest] = useState<Decision[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    localRepository(localStorage)
      .list()
      .then((d) => {
        if (active) setGuest(d);
      })
      .catch(() => {
        if (active)
          setError(
            "The browser workspace could not be read. Its data has been kept.",
          );
      });
    return () => {
      active = false;
    };
  }, [user]);
  async function apply() {
    if (!pending) return;
    setBusy(true);
    setError("");
    const count = pending.filter(
      (d) => !decisions.some((i) => i.id === d.id),
    ).length;
    try {
      await importAll(pending);
      setPending(null);
      setNotice(
        `${count} new decisions imported. Existing decisions and original data were kept.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page workspace-page">
      <span className="eyebrow">A WORKSPACE YOU CONTROL</span>
      <h1>Your data. Your decisions.</h1>
      <p className="page-intro">
        {user
          ? "You’re using your account workspace. Browser decisions are only copied here when you choose."
          : "You’re using this browser. Sign in when you want an account workspace and AI assistance."}
      </p>
      {error && <Notice error>{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      <div className="workspace-grid">
        <section className="paper-section">
          <Download size={23} />
          <h2>Take your decisions with you.</h2>
          <p>
            A JSON backup includes scenarios, source links, research and
            outcomes. CSV contains a simple candidate summary.
          </p>
          <div className="button-row">
            <Button
              tone="quiet"
              onClick={() =>
                download("purchase-assistant.json", exportJSON(decisions))
              }
            >
              Export full JSON
            </Button>
            <Button
              tone="quiet"
              onClick={() =>
                download(
                  "purchase-assistant.csv",
                  exportCSV(decisions),
                  "text/csv;charset=utf-8",
                )
              }
            >
              Export CSV
            </Button>
          </div>
        </section>
        <section className="paper-section">
          <Upload size={23} />
          <h2>Bring earlier work in.</h2>
          <p>
            Import a new workspace export or an old calculator JSON file.
            Imports add decisions; they never overwrite matching IDs.
          </p>
          <label className="file-button button quiet">
            Choose JSON file
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setError("");
                try {
                  if (f.size > 20_000_000)
                    throw new Error("Choose a file smaller than 20 MB.");
                  setPending(
                    parseImport(await f.text(), storedCurrency(localStorage)),
                  );
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Invalid import.",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </section>
        {user && (
          <section className="paper-section">
            <h2>Your browser decisions</h2>
            <p>
              {guest.length} decisions are stored in this browser. Importing
              keeps the original browser copy.
            </p>
            <Button
              tone="quiet"
              disabled={!guest.length}
              onClick={() => setPending(guest)}
            >
              Review browser import
            </Button>
          </section>
        )}
        {user && (
          <section className="paper-section">
            <h2>Previous account data</h2>
            <p>
              Recover items from the original calculator. Original journal
              records can be downloaded separately so their details remain
              intact.
            </p>
            <Button
              tone="quiet"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const legacy = await readLegacyCloud(
                    storedCurrency(localStorage),
                  );
                  setPending(legacy.decisions);
                  download(
                    "previous-purchase-journal.json",
                    JSON.stringify(legacy.journal, null, 2),
                  );
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not load previous data.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Review previous items & export journal
            </Button>
          </section>
        )}
        {!user && (
          <section className="paper-section">
            <h2>Keep an account workspace.</h2>
            <p>
              Sign in for cloud storage, image extraction and sourced AI
              research. Your browser data will stay here until you explicitly
              import it.
            </p>
            <Link className="button primary" to="/auth?next=/workspace">
              Sign in
            </Link>
          </section>
        )}
      </div>
      {pending && (
        <section className="import-review paper-section">
          <span className="eyebrow">REVIEW THE IMPORT</span>
          <h2>{pending.length} decisions found.</h2>
          <p>
            {
              pending.filter((d) => !decisions.some((i) => i.id === d.id))
                .length
            }{" "}
            are new to this workspace. Matching IDs are skipped.
          </p>
          <ul>
            {pending.slice(0, 12).map((d) => (
              <li key={d.id}>{d.title}</li>
            ))}
          </ul>
          {pending.length > 12 && <p>And {pending.length - 12} more.</p>}
          <div className="button-row">
            <Button
              disabled={busy || !pending.length}
              onClick={() => void apply()}
            >
              Import without replacing
            </Button>
            <Button tone="quiet" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}
      <section className="paper-section">
        <h2>Delete a saved decision</h2>
        <p>
          Export a backup first if you might need it again. Deleting an account
          copy leaves any original browser or legacy copy intact.
        </p>
        {decisions.map((d) => (
          <div className="section-heading" key={d.id}>
            <span>{d.title}</span>
            <Button
              tone="danger"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Permanently delete “${d.title}” from this workspace?`,
                  )
                )
                  return;
                setBusy(true);
                try {
                  await remove(d);
                  setNotice("Decision deleted from this workspace.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Deletion failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </section>
      <section id="privacy" className="privacy-section">
        <ShieldCheck size={25} />
        <h2>Privacy, without the small-print hunt.</h2>
        <div className="form-grid">
          <div>
            <h3>Storage</h3>
            <p>
              Guest decisions stay in this browser’s local storage. They are
              visible to anyone using the same browser profile. Account
              decisions are stored in Supabase with ownership policies. Signing
              out does not erase your browser workspace.
            </p>
            <h3>Photos</h3>
            <p>
              Photos stay in memory while you work. Choosing “Read purchase”
              sends the image to Venice AI. Images are not included in saved
              decisions or exports. Remove unnecessary personal details before
              uploading.
            </p>
          </div>
          <div>
            <h3>Research</h3>
            <p>
              Choosing “Research this decision” sends the decision’s scenario
              and needs to Venice AI. Product search queries use Venice’s search
              service. Sources and model responses can be wrong. Check the
              seller’s page before buying.
            </p>
            <h3>History</h3>
            <p>
              Saved check-ins can inform the local usage reminder. They are not
              sent to web research. Remove individual check-ins in the decision
              editor, then save. Keep a JSON backup before clearing browser
              data. Account deletion across this shared service is not automated
              in this release.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
