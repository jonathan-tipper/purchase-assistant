import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Camera,
  Link2,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import {
  newDecision,
  coffeeExample,
  moneyText,
  type Decision,
} from "@/domain/decision";
import { storedCurrency } from "@/domain/portability";
import { useWorkspace } from "@/features/decisions/WorkspaceContext";
import { Button, Notice } from "@/components/Controls";
export default function Home() {
  const { decisions, save } = useWorkspace();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function create(d: Decision, photo = false) {
    setBusy(true);
    setError("");
    try {
      await save(d);
      navigate(`/decisions/${d.id}${photo ? "?section=evidence" : ""}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start this decision.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page home-page">
      <div className="page-eyebrow">ROOM FOR A BETTER DECISION</div>
      <div className="home-heading">
        <h1>
          Worth buying?
          <br />
          <em>Let’s think it through.</em>
        </h1>
        <p>
          From “I quite like that” to a decision you understand.
          <br className="desktop-only" /> A little context. Clearer numbers.
          Your call.
        </p>
      </div>
      <div className="capture-layout">
        <section className="capture-panel" aria-labelledby="capture-title">
          <div className="section-top">
            <span className="step-number">01</span>
            <h2 id="capture-title">What are you considering?</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void create(
                newDecision(description, storedCurrency(localStorage)),
              );
            }}
          >
            <label className="sr-only" htmlFor="capture">
              Describe a purchase or paste a product link
            </label>
            <textarea
              id="capture"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="A coffee machine. A better pair of headphones. That thing you’ve had 12 tabs open about…"
              rows={4}
            />
            <div className="capture-footer">
              <span>
                <Link2 size={15} />A product link works too
              </span>
              <Button type="submit" disabled={busy || !description.trim()}>
                Start a decision <ArrowRight size={17} />
              </Button>
            </div>
          </form>
          <div className="capture-tools">
            <Button
              tone="quiet"
              disabled={busy}
              onClick={() =>
                void create(
                  newDecision(
                    "Product from a photo",
                    storedCurrency(localStorage),
                  ),
                  true,
                )
              }
            >
              <Camera size={17} />
              Start with a photo
            </Button>
            <span>Image reading is available after sign-in.</span>
          </div>
          {error && <Notice error>{error}</Notice>}
        </section>
        <aside className="example-panel">
          <span className="eyebrow">TRY A WORKED EXAMPLE</span>
          <h2>
            A £600 coffee machine.
            <br />A £3.50 daily habit.
          </h2>
          <p>
            The useful question is how many café visits it actually replaces.
          </p>
          <div className="example-equation">
            <span>
              4<span>replaced visits / week</span>
            </span>
            <ArrowRight size={22} />
            <span>
              1<span>assumption to challenge</span>
            </span>
          </div>
          <Button
            tone="quiet"
            disabled={busy}
            onClick={() => void create(coffeeExample())}
          >
            Explore the example <ArrowUpRight size={16} />
          </Button>
          <small>Illustrative numbers, not product research.</small>
        </aside>
      </div>
      <div className="process-strip">
        <span>
          <Camera size={17} />
          <strong>Capture</strong> the possibility
        </span>
        <span>
          <SlidersHorizontal size={17} />
          <strong>Check</strong> the assumptions
        </span>
        <span>
          <Check size={17} />
          <strong>Keep</strong> what you learn
        </span>
      </div>
      <section className="saved-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR SHORTLIST</span>
            <h2>Your saved decisions</h2>
          </div>
          <span className="count-label">
            {decisions.filter((d) => d.status === "considering").length}{" "}
            considering
          </span>
        </div>
        {decisions.length === 0 ? (
          <div className="empty-shelf">
            <Plus size={24} />
            <div>
              <h3>Your first decision starts above.</h3>
              <p>
                No account needed. Your work stays in this browser until you
                choose to import it.
              </p>
            </div>
          </div>
        ) : (
          <div className="decision-grid">
            {decisions
              .slice()
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((d) => {
                const c = d.candidates.find(
                  (c) => c.id === d.selectedCandidateId,
                )!;
                return (
                  <Link
                    className="decision-card"
                    key={d.id}
                    to={`/decisions/${d.id}`}
                  >
                    <div>
                      <span className={`status-chip ${d.status}`}>
                        {d.status === "passed" ? "Decided against" : d.status}
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                    <h3>{d.title}</h3>
                    <p>{d.need || "A few assumptions to check."}</p>
                    <footer>
                      <span>
                        {c.price === null
                          ? "Price to confirm"
                          : moneyText(c.price, d.currency)}
                      </span>
                      <span>
                        {d.candidates.length}{" "}
                        {d.candidates.length === 1 ? "option" : "options"}
                      </span>
                    </footer>
                  </Link>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
