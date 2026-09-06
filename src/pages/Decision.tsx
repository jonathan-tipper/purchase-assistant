import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Camera,
  FileText,
  Plus,
  Save,
  Sparkles,
  Trash2,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/features/decisions/WorkspaceContext";
import { Button, Field, NumberField, Notice } from "@/components/Controls";
import OwnershipChart from "@/components/OwnershipChart";
import { localRepository } from "@/services/repository";
import {
  baselineCost,
  decisionSchema,
  markOutcome,
  moneyText,
  newCandidate,
  ownership,
  researchKey,
  verdict,
  type Candidate,
  type Decision as DecisionType,
} from "@/domain/decision";
import {
  extractPurchase,
  imageData,
  researchDecision,
  type Extraction,
} from "@/services/assistant";

export default function Decision() {
  const { id } = useParams();
  const { decisions } = useWorkspace();
  const saved = decisions.find((d) => d.id === id);
  return saved ? (
    <DecisionEditor key={id} initial={saved} />
  ) : (
    <RecoverDecision id={id} />
  );
}
function RecoverDecision({ id }: { id?: string }) {
  const { user } = useAuth();
  const { importAll } = useWorkspace();
  const [guest, setGuest] = useState<DecisionType>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (user)
      localRepository(localStorage)
        .list()
        .then((rows) => {
          if (active) setGuest(rows.find((d) => d.id === id));
        })
        .catch(() => {
          if (active)
            setError(
              "The browser copy could not be read. Its original data has been kept.",
            );
        });
    return () => {
      active = false;
    };
  }, [id, user]);
  return (
    <div className="page empty-state">
      <h1>
        {guest
          ? "Continue with your browser decision."
          : "That decision isn’t in this workspace."}
      </h1>
      <p>
        {guest
          ? `Copy “${guest.title}” to this account to continue. The original stays in this browser. Choose your photo again if you had one open before signing in.`
          : "It may belong to a different account or browser."}
      </p>
      {error && <Notice error>{error}</Notice>}
      {guest && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await importAll([guest]);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Import failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Copy this decision to my account
        </Button>
      )}
      <Link className="button quiet" to="/">
        Back to decisions
      </Link>
    </div>
  );
}
function DecisionEditor({ initial }: { initial: DecisionType }) {
  const { save, decisions, reload, setHasUnsavedChanges } = useWorkspace();
  const { user } = useAuth();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"brief" | "evidence" | "outcome">(
    searchParams.get("section") === "evidence" ? "evidence" : "brief",
  );
  const [image, setImage] = useState<string>();
  const [description, setDescription] = useState("");
  const [extraction, setExtraction] = useState<Extraction>();
  const [busy, setBusy] = useState<"extract" | "research" | null>(null);
  const alive = useRef(true);
  const [checkin, setCheckin] = useState({
    usesPerWeek: initial.usesPerWeek,
    satisfaction: 7,
    wouldBuyAgain: true,
    notes: "",
  });
  const [checkinBaseline, setCheckinBaseline] = useState(checkin);
  const checkinDirty =
    !!draft.snapshot &&
    JSON.stringify(checkin) !== JSON.stringify(checkinBaseline);
  const latestCheckin = useRef(checkin);
  latestCheckin.current = checkin;
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(baseline) || checkinDirty;
  useEffect(() => {
    setHasUnsavedChanges(dirty);
    return () => setHasUnsavedChanges(false);
  }, [dirty, setHasUnsavedChanges]);
  const latest = useRef(draft);
  latest.current = draft;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const selected = draft.candidates.find(
    (c) => c.id === draft.selectedCandidateId,
  )!;
  const parsed = decisionSchema.safeParse(draft);
  const metrics = parsed.success
    ? ownership(selected, draft.horizonYears, draft.usesPerWeek)
    : null;
  const advice = parsed.success
    ? verdict(draft)
    : {
        title: "Check your assumptions.",
        detail:
          "Correct the highlighted input limits before calculating or saving.",
      };
  const patch = (update: Partial<DecisionType>) => {
    setDraft((d) => ({ ...d, ...update }));
    setNotice("");
  };
  const patchCandidate = (id: string, update: Partial<Candidate>) => {
    patch({
      candidates: draft.candidates.map((c) =>
        c.id === id ? { ...c, ...update, provenance: "user" } : c,
      ),
    });
  };
  async function persist(next = draft, submitCheckin = false) {
    const starting = JSON.stringify(draft);
    const startingCheckin = JSON.stringify(checkin);
    const includesCheckin = (checkinDirty || submitCheckin) && !!next.snapshot;
    if (includesCheckin)
      next = {
        ...next,
        checkins: [
          ...next.checkins,
          {
            ...checkin,
            id: crypto.randomUUID(),
            date: new Date().toLocaleDateString("sv-SE"),
          },
        ],
      };
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const saved = await save(decisionSchema.parse(next));
      if (alive.current) {
        setDraft(
          JSON.stringify(latest.current) === starting
            ? saved
            : {
                ...latest.current,
                status:
                  latest.current.status === draft.status
                    ? saved.status
                    : latest.current.status,
                snapshot: latest.current.snapshot ?? saved.snapshot,
                checkins:
                  latest.current.checkins === draft.checkins
                    ? saved.checkins
                    : [
                        ...latest.current.checkins,
                        ...saved.checkins.filter(
                          (c) => !draft.checkins.some((old) => old.id === c.id),
                        ),
                      ],
                revision: saved.revision,
                updatedAt: saved.updatedAt,
              },
        );
        setBaseline(saved);
        if (includesCheckin) {
          const reset = { ...checkin, notes: "" };
          setCheckinBaseline(reset);
          if (JSON.stringify(latestCheckin.current) === startingCheckin)
            setCheckin(reset);
        }
        setNotice(
          JSON.stringify(latest.current) === starting
            ? "Decision saved."
            : "Earlier changes saved. Your newer edits are still unsaved.",
        );
      }
      return (
        JSON.stringify(latest.current) === starting &&
        JSON.stringify(latestCheckin.current) === startingCheckin
      );
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  async function extract() {
    setBusy("extract");
    setError("");
    try {
      const result = await extractPurchase(
        description || selected.sourceUrl || selected.name,
        image,
      );
      if (alive.current) setExtraction(result);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function research() {
    if (!parsed.success) return;
    setBusy("research");
    setError("");
    const submitted = structuredClone(draft);
    try {
      const result = await researchDecision(submitted);
      if (alive.current) {
        setDraft((d) => ({ ...d, research: result }));
        setTab("evidence");
        setNotice(
          "Research is ready. Review its sources, then save it with your decision.",
        );
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Research failed.");
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  function applyExtraction() {
    if (!extraction) return;
    if (
      extraction.currency !== draft.currency &&
      draft.candidates.some((c) => c.price !== null)
    ) {
      setError(
        `The source uses ${extraction.currency}; this decision uses ${draft.currency}. No amounts were converted. Start a separate decision for another currency.`,
      );
      return;
    }
    const next = {
      ...draft,
      title: extraction.name,
      currency: extraction.currency,
      candidates: draft.candidates.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              name: extraction.name,
              price: extraction.price ?? c.price,
              lifespanYears: extraction.lifespanYears ?? c.lifespanYears,
              resaleValue: Math.min(
                c.resaleValue,
                extraction.price ?? c.price ?? 0,
              ),
              provenance: "ai" as const,
            }
          : c,
      ),
      usesPerWeek: extraction.usesPerWeek ?? draft.usesPerWeek,
    };
    const valid = decisionSchema.safeParse(next);
    if (!valid.success) {
      setError(
        "The extracted values do not form a valid scenario. Please enter them manually.",
      );
      return;
    }
    setDraft(valid.data);
    setExtraction(undefined);
    setImage(undefined);
    setNotice("Suggested fields applied. Check the assumptions before saving.");
  }
  const similar = decisions.filter(
    (d) =>
      d.id !== draft.id &&
      d.category === draft.category &&
      d.checkins.length > 0,
  );
  const historical = similar.map((d) => ({
    title: d.title,
    predicted: d.snapshot?.usesPerWeek ?? d.usesPerWeek,
    actual: d.checkins[d.checkins.length - 1].usesPerWeek,
  }));
  return (
    <div className="page decision-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        All decisions
      </Link>
      <div className="decision-title">
        <div>
          <span className="eyebrow">YOUR DECISION BRIEF</span>
          <h1>{draft.title}</h1>
          <span className={`status-chip ${draft.status}`}>
            {draft.status === "passed" ? "Decided against" : draft.status}
          </span>
        </div>
        <div className="save-actions">
          <span role="status">{dirty ? "Unsaved changes" : "Saved"}</span>
          <Button
            onClick={() => void persist()}
            disabled={saving || !parsed.success || !dirty}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save decision"}
          </Button>
        </div>
      </div>
      {blocker.state === "blocked" && (
        <Notice>
          <strong>You have unsaved changes.</strong>
          <div className="button-row">
            <Button
              onClick={async () => {
                if (await persist()) blocker.proceed();
              }}
            >
              Save and leave
            </Button>
            <Button tone="quiet" onClick={() => blocker.reset()}>
              Keep editing
            </Button>
            <Button tone="danger" onClick={() => blocker.proceed()}>
              Discard changes
            </Button>
          </div>
        </Notice>
      )}
      {error && (
        <Notice error>
          {error}
          <Button
            tone="quiet"
            onClick={async () => {
              if (
                !window.confirm(
                  "Reload the saved version and discard these unsaved changes?",
                )
              )
                return;
              const rows = await reload();
              const stored = rows?.find((d) => d.id === draft.id);
              if (stored) {
                setDraft(stored);
                setBaseline(stored);
                setError("");
              }
            }}
          >
            Reload saved version
          </Button>
        </Notice>
      )}
      {notice && <Notice>{notice}</Notice>}
      {!parsed.success && (
        <Notice error>
          {parsed.error.issues
            .map((i) => i.message)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(" · ")}
        </Notice>
      )}
      <nav className="tabbar" aria-label="Decision sections">
        {(["brief", "evidence", "outcome"] as const).map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t === "brief"
              ? "The decision"
              : t === "evidence"
                ? "Evidence & AI"
                : "What happened"}
            {t === "evidence" && draft.research && (
              <span>{draft.research.evidence.length}</span>
            )}
          </button>
        ))}
      </nav>
      {tab === "brief" && (
        <div className="brief-layout">
          <div className="brief-main">
            <section className="paper-section">
              <div className="section-top">
                <span className="step-number">01</span>
                <div>
                  <h2>Make it about your life.</h2>
                  <p>
                    Two questions worth answering before looking at the numbers.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <Field label="What should this help you do?">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={draft.need}
                    onChange={(e) => patch({ need: e.target.value })}
                    placeholder="The practical difference it would make…"
                  />
                </Field>
                <Field label="What would you do instead?">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={draft.alternative}
                    onChange={(e) => patch({ alternative: e.target.value })}
                    placeholder="Keep what I have, borrow, repair, buy used…"
                  />
                </Field>
              </div>
              <details className="context-details">
                <summary>
                  Decision details <ChevronDown size={16} />
                </summary>
                <div className="form-grid">
                  <Field label="Decision name">
                    <input
                      value={draft.title}
                      maxLength={120}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </Field>
                  <Field label="Category">
                    <select
                      value={draft.category}
                      onChange={(e) =>
                        patch({
                          category: e.target.value as DecisionType["category"],
                        })
                      }
                    >
                      <option value="home">Home equipment</option>
                      <option value="technology">Technology</option>
                      <option value="hobby">Hobbies & activities</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field
                    label="Currency"
                    hint="Amounts are not converted. Use one currency for this decision."
                  >
                    <select
                      value={draft.currency}
                      onChange={(e) => {
                        if (
                          draft.candidates.some((c) => c.price !== null) &&
                          !window.confirm(
                            "This changes the currency label, not the amounts. Have you entered all amounts in the new currency?",
                          )
                        )
                          return;
                        patch({
                          currency: e.target.value as DecisionType["currency"],
                        });
                      }}
                    >
                      {["GBP", "USD", "EUR", "JPY"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </details>
            </section>
            <section className="paper-section">
              <div className="section-top">
                <span className="step-number">02</span>
                <div>
                  <h2>Check the assumptions.</h2>
                  <p>
                    Starting values are placeholders, not predictions. Change
                    what doesn’t fit.
                  </p>
                </div>
              </div>
              <div className="assumption-grid">
                <NumberField
                  label="Realistic uses each week"
                  value={draft.usesPerWeek}
                  max={100}
                  onChange={(v) => patch({ usesPerWeek: v ?? 0 })}
                />
                <NumberField
                  label="Compare over (years)"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={draft.horizonYears}
                  onChange={(v) => patch({ horizonYears: v ?? 0 })}
                />
                <NumberField
                  label={`Alternative cost per use (${draft.currency})`}
                  value={draft.baselinePerUseCost}
                  onChange={(v) => patch({ baselinePerUseCost: v ?? 0 })}
                  hint="Only spending this purchase would actually replace."
                />
                <NumberField
                  label={`Alternative fixed cost / year (${draft.currency})`}
                  value={draft.baselineAnnualCost}
                  onChange={(v) => patch({ baselineAnnualCost: v ?? 0 })}
                  hint="Leave at zero if keeping what you have costs nothing."
                />
              </div>
              {historical.length > 0 && (
                <div className="history-note">
                  <BookIcon />
                  <div>
                    <strong>A note from your own experience</strong>
                    {historical.slice(0, 2).map((h) => (
                      <p key={h.title}>
                        For {h.title}, you expected {h.predicted} uses/week and
                        later recorded {h.actual}. These are individual
                        observations, not a forecast.
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section className="paper-section">
              <div className="section-heading">
                <div className="section-top">
                  <span className="step-number">03</span>
                  <div>
                    <h2>Your options.</h2>
                    <p>Same job. Same currency. Same comparison period.</p>
                  </div>
                </div>
                <Button
                  tone="quiet"
                  disabled={draft.candidates.length >= 3}
                  onClick={() =>
                    patch({
                      candidates: [
                        ...draft.candidates,
                        newCandidate("Another option"),
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  Add option
                </Button>
              </div>
              <div className="candidate-list">
                {draft.candidates.map((c, index) => (
                  <details
                    key={c.id}
                    open={c.id === selected.id}
                    className={`candidate ${c.id === selected.id ? "selected" : ""}`}
                    onToggle={() => {}}
                  >
                    <summary>
                      <span className="candidate-number">0{index + 1}</span>
                      <strong>{c.name}</strong>
                      <span>
                        {c.price === null
                          ? "Add price"
                          : moneyText(c.price, draft.currency)}
                      </span>
                      <ChevronDown size={16} />
                    </summary>
                    <div className="candidate-body">
                      <div className="candidate-toolbar">
                        <span className="provenance">
                          {c.provenance === "ai"
                            ? "AI suggestion · please check"
                            : c.provenance === "legacy"
                              ? "Imported · check resale assumption"
                              : c.provenance === "starter"
                                ? "Starting assumptions"
                                : "Your assumptions"}
                        </span>
                        <div className="button-row">
                          <Button
                            tone="quiet"
                            onClick={() => patch({ selectedCandidateId: c.id })}
                            disabled={c.id === selected.id}
                          >
                            <Check size={14} />
                            {c.id === selected.id ? "Selected" : "Select"}
                          </Button>
                          {draft.candidates.length > 1 && (
                            <Button
                              tone="quiet"
                              aria-label={`Remove ${c.name}`}
                              onClick={() =>
                                patch({
                                  candidates: draft.candidates.filter(
                                    (i) => i.id !== c.id,
                                  ),
                                  selectedCandidateId:
                                    c.id === selected.id
                                      ? draft.candidates.find(
                                          (i) => i.id !== c.id,
                                        )!.id
                                      : selected.id,
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="form-grid">
                        <Field label="Option name">
                          <input
                            value={c.name}
                            maxLength={120}
                            onChange={(e) =>
                              patchCandidate(c.id, { name: e.target.value })
                            }
                          />
                        </Field>
                        <NumberField
                          label={`Purchase price (${draft.currency})`}
                          value={c.price}
                          onChange={(v) => patchCandidate(c.id, { price: v })}
                        />
                        <NumberField
                          label="Useful life (years)"
                          min={0.5}
                          max={30}
                          value={c.lifespanYears}
                          onChange={(v) =>
                            patchCandidate(c.id, { lifespanYears: v ?? 0 })
                          }
                        />
                        <NumberField
                          label={`Resale at end of useful life (${draft.currency})`}
                          value={c.resaleValue}
                          max={c.price ?? 1_000_000}
                          onChange={(v) =>
                            patchCandidate(c.id, { resaleValue: v ?? 0 })
                          }
                        />
                        <NumberField
                          label={`Running & maintenance / year (${draft.currency})`}
                          value={c.annualCost}
                          onChange={(v) =>
                            patchCandidate(c.id, { annualCost: v ?? 0 })
                          }
                        />
                        <NumberField
                          label={`Consumables per use (${draft.currency})`}
                          value={c.perUseCost}
                          onChange={(v) =>
                            patchCandidate(c.id, { perUseCost: v ?? 0 })
                          }
                        />
                        <Field
                          label="Product link"
                          hint="A saved link is not a verified source."
                        >
                          <input
                            type="url"
                            value={c.sourceUrl}
                            placeholder="https://…"
                            onChange={(e) =>
                              patchCandidate(c.id, {
                                sourceUrl: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
            {parsed.success && (
              <section className="paper-section">
                <h2>Compare the ownership costs.</h2>
                <p className="muted">
                  These figures compare cost, not suitability or quality.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Net ownership</th>
                        <th>Per use</th>
                        <th>Replacements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.candidates.map((c) => {
                        const m = ownership(
                          c,
                          draft.horizonYears,
                          draft.usesPerWeek,
                        );
                        return (
                          <tr
                            key={c.id}
                            className={
                              c.id === selected.id ? "selected-row" : ""
                            }
                          >
                            <th>{c.name}</th>
                            <td>
                              {moneyText(m?.netCost ?? null, draft.currency)}
                            </td>
                            <td>
                              {moneyText(m?.costPerUse ?? null, draft.currency)}
                            </td>
                            <td>{m?.replacements ?? "Not available"}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <th>{draft.alternative || "Your alternative"}</th>
                        <td>
                          {moneyText(baselineCost(draft), draft.currency)}
                        </td>
                        <td>
                          {moneyText(
                            draft.usesPerWeek
                              ? baselineCost(draft) /
                                  (draft.usesPerWeek * 52 * draft.horizonYears)
                              : null,
                            draft.currency,
                          )}
                        </td>
                        <td>As entered</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
          <aside className="brief-aside">
            <div className="verdict-panel">
              <span className="eyebrow">WHAT THE NUMBERS SAY</span>
              <h2>{advice.title}</h2>
              <p>{advice.detail}</p>
              <div className="big-metric">
                <span>Estimated net ownership</span>
                <strong>
                  {moneyText(metrics?.netCost ?? null, draft.currency)}
                </strong>
                <small>
                  over {draft.horizonYears} years · after estimated resale
                </small>
              </div>
              <div className="mini-metrics">
                <div>
                  <span>Per use</span>
                  <strong>
                    {moneyText(metrics?.costPerUse ?? null, draft.currency)}
                  </strong>
                </div>
                <div>
                  <span>Cash outlay</span>
                  <strong>
                    {moneyText(metrics?.cashCost ?? null, draft.currency)}
                  </strong>
                </div>
              </div>
              <div className="verdict-caveat">
                A cost comparison based on your inputs, not a product
                recommendation.
              </div>
            </div>
            {metrics && parsed.success && (
              <>
                <OwnershipChart decision={draft} candidate={selected} />
                <section className="sensitivity">
                  <span className="eyebrow">CHALLENGE THE ASSUMPTION</span>
                  <h3>What if you use it half as often?</h3>
                  <p>
                    The estimated cost per use becomes{" "}
                    <strong>
                      {moneyText(
                        ownership(
                          selected,
                          draft.horizonYears,
                          draft.usesPerWeek / 2,
                        )?.costPerUse ?? null,
                        draft.currency,
                      )}
                    </strong>
                    .
                  </p>
                  <Button
                    tone="quiet"
                    disabled={draft.usesPerWeek === 0}
                    onClick={() =>
                      patch({ usesPerWeek: draft.usesPerWeek / 2 })
                    }
                  >
                    Try that scenario <ArrowRightIcon />
                  </Button>
                </section>
              </>
            )}
            <button
              className="research-invitation"
              onClick={() => setTab("evidence")}
            >
              <Sparkles size={21} />
              <span>
                <strong>Look beyond the numbers</strong>
                <small>Read a photo. Research the trade-offs.</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
            <details className="formula-note">
              <summary>How these numbers work</summary>
              <p>
                Purchase costs + running costs + consumables − resale proceeds.
                Useful life shorter than the comparison period includes
                replacement purchases. Remaining value follows a straight line
                from price to your end-of-life resale estimate. Year zero has no
                cost-per-use figure. No separate depreciation cost is added.
              </p>
            </details>
          </aside>
        </div>
      )}
      {tab === "evidence" && (
        <div className="evidence-layout">
          <section className="paper-section">
            <span className="eyebrow">CAPTURE & CLARIFY</span>
            <h2>A photo can save a lot of typing.</h2>
            <p>
              Read a shelf label, product screenshot or receipt. AI proposes
              fields for you to review; it can’t establish reliability or
              authenticity from an image.
            </p>
            <Field label="Purchase description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Paste product details or describe what is visible in the photo."
              />
            </Field>
            <label className="image-upload">
              <Camera size={24} />
              <span>
                {image ? "Replace image" : "Choose a photo or screenshot"}
              </span>
              <small>JPEG, PNG or WebP · up to 3 MB</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setImage(await imageData(file));
                    setError("");
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Image could not be read.",
                    );
                  }
                  e.target.value = "";
                }}
              />
            </label>
            {image && (
              <div className="image-preview">
                <img
                  src={image}
                  alt="Your purchase image, ready for extraction"
                />
                <Button tone="quiet" onClick={() => setImage(undefined)}>
                  Remove image
                </Button>
              </div>
            )}
            <p className="privacy-inline">
              When you choose “Read purchase”, this image and description are
              sent to Venice AI for processing. Images are not saved in your
              decision. Avoid including personal receipt details you don’t need.
            </p>
            {user ? (
              <Button onClick={() => void extract()} disabled={!!busy}>
                <Sparkles size={16} />
                {busy === "extract"
                  ? "Reading your purchase…"
                  : "Read purchase"}
              </Button>
            ) : (
              <Link
                className="button primary"
                to={`/auth?next=${encodeURIComponent(`/decisions/${draft.id}`)}`}
              >
                Sign in to use AI
              </Link>
            )}
            {extraction && (
              <div className="extraction-preview">
                <span className="eyebrow">REVIEW BEFORE APPLYING</span>
                <h3>{extraction.name}</h3>
                <dl>
                  <div>
                    <dt>Price</dt>
                    <dd>{moneyText(extraction.price, extraction.currency)}</dd>
                  </div>
                  <div>
                    <dt>Useful life</dt>
                    <dd>
                      {extraction.lifespanYears === null
                        ? "Not specified"
                        : `${extraction.lifespanYears} years`}
                    </dd>
                  </div>
                  <div>
                    <dt>Uses per week</dt>
                    <dd>{extraction.usesPerWeek ?? "Not specified"}</dd>
                  </div>
                </dl>
                <p>{extraction.notes}</p>
                {extraction.questions.map((q) => (
                  <p key={q}>Check: {q}</p>
                ))}
                <div className="button-row">
                  <Button onClick={applyExtraction}>
                    Apply suggested fields
                  </Button>
                  <Button tone="quiet" onClick={() => setExtraction(undefined)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </section>
          <section className="paper-section">
            <span className="eyebrow">AI RESEARCH PREVIEW</span>
            <h2>Get a second perspective.</h2>
            <p>
              AI finds relevant product information and explains the trade-offs with source links. Ownership costs come from your editable scenario.
            </p>
            <p className="muted">
              Your decision inputs are sent to Venice. Search queries use
              product details. Personal check-ins stay out of web research.
            </p>
            {user ? (
              <Button
                onClick={() => void research()}
                disabled={!!busy || !parsed.success}
              >
                <Sparkles size={16} />
                {busy === "research"
                  ? "Researching sources…"
                  : "Research this decision"}
              </Button>
            ) : (
              <p>
                <Link
                  to={`/auth?next=${encodeURIComponent(`/decisions/${draft.id}`)}`}
                >
                  Sign in for sourced research
                </Link>
                . The manual brief works without an account.
              </p>
            )}
            <div className="research-boundaries">
              <Check size={15} />
              <span>
                No checkout or automatic changes. Review sources and save what’s
                useful.
              </span>
            </div>
            {draft.research && (
              <div className="research-result">
                {draft.research.inputKey !== researchKey(draft) && (
                  <Notice>
                    This research was made for earlier assumptions. Run it again
                    before relying on it.
                  </Notice>
                )}
                <span className="eyebrow">
                  AI PERSPECTIVE ·{" "}
                  {new Date(draft.research.createdAt).toLocaleDateString(
                    "en-GB",
                  )}
                </span>
                <p className="research-summary">{draft.research.summary}</p>
                {draft.research.considerations.length > 0 && (
                  <>
                    <h3>Trade-offs to consider</h3>
                    <ul>
                      {draft.research.considerations.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                {draft.research.questions.length > 0 && (
                  <>
                    <h3>What could change the answer?</h3>
                    <ul>
                      {draft.research.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
                <h3>Claims and their sources</h3>
                {draft.research.claims.length === 0 ? (
                  <p>No source-backed product claims were returned.</p>
                ) : (
                  draft.research.claims.map((c, i) => (
                    <p key={i}>
                      {c.text}{" "}
                      {c.sourceIds.map((id) => {
                        const e = draft.research!.evidence.find(
                          (e) => e.id === id,
                        );
                        return e ? (
                          <a
                            key={id}
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            [{id}]
                          </a>
                        ) : null;
                      })}
                    </p>
                  ))
                )}
                <h3>Evidence to inspect</h3>
                <p className="tiny">
                  Search excerpts, not a full-page verification. Confirm
                  variant, price and availability with the seller.
                </p>
                {draft.research.evidence.map((e) => (
                  <div className="source-card" key={e.id}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      {e.title}
                      <ExternalLink size={14} />
                    </a>
                    <p>{e.excerpt}</p>
                    <small>
                      {new URL(e.url).hostname} · retrieved{" "}
                      {new Date(e.retrievedAt).toLocaleDateString("en-GB")}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {tab === "outcome" && (
        <div className="outcome-layout">
          <section className="paper-section">
            <span className="eyebrow">CLOSE THE LOOP</span>
            <h2>What did you decide?</h2>
            <p>
              Waiting or deciding against a purchase can be a good outcome too.
              Marking a purchase saves a snapshot of the selected option and its
              forecast.
            </p>
            <div className="outcome-buttons">
              {(["bought", "deferred", "passed", "returned"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    tone={draft.status === s ? "primary" : "quiet"}
                    disabled={saving || !parsed.success}
                    onClick={() => {
                      try {
                        const next = markOutcome(draft, s);
                        void persist(next);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not record outcome.",
                        );
                      }
                    }}
                  >
                    {s === "bought"
                      ? "I bought it"
                      : s === "deferred"
                        ? "I’m waiting"
                        : s === "passed"
                          ? "I decided against it"
                          : "I returned it"}
                  </Button>
                ),
              )}
            </div>
            {draft.snapshot && (
              <div className="snapshot">
                <h3>The forecast you saved</h3>
                <p>
                  {draft.snapshot.candidate.name} ·{" "}
                  {moneyText(
                    draft.snapshot.candidate.price,
                    draft.snapshot.currency,
                  )}{" "}
                  · {draft.snapshot.usesPerWeek} uses/week ·{" "}
                  {draft.snapshot.horizonYears} years
                </p>
                <small>
                  Recorded{" "}
                  {new Date(draft.snapshot.date).toLocaleDateString("en-GB")}.
                  Later scenario edits won’t rewrite this snapshot.
                </small>
              </div>
            )}
          </section>
          {draft.snapshot && (
            <section className="paper-section">
              <span className="eyebrow">A QUICK REALITY CHECK</span>
              <h2>How is it working out?</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void persist(draft, true);
                }}
              >
                <div className="form-grid">
                  <NumberField
                    label="Actual uses per week"
                    value={checkin.usesPerWeek}
                    max={100}
                    onChange={(v) =>
                      setCheckin({ ...checkin, usesPerWeek: v ?? 0 })
                    }
                  />
                  <NumberField
                    label="Satisfaction (1–10)"
                    value={checkin.satisfaction}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(v) =>
                      setCheckin({ ...checkin, satisfaction: v ?? 0 })
                    }
                  />
                </div>
                <Field label="A note for your future self">
                  <textarea
                    value={checkin.notes}
                    onChange={(e) =>
                      setCheckin({ ...checkin, notes: e.target.value })
                    }
                    rows={3}
                    maxLength={2000}
                  />
                </Field>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkin.wouldBuyAgain}
                    onChange={(e) =>
                      setCheckin({
                        ...checkin,
                        wouldBuyAgain: e.target.checked,
                      })
                    }
                  />
                  I would buy this again
                </label>
                <Button
                  type="submit"
                  disabled={saving || draft.checkins.length >= 60}
                >
                  Save check-in
                </Button>
              </form>
            </section>
          )}
          {draft.checkins.length > 0 && (
            <section className="paper-section">
              <h2>Your observations</h2>
              {draft.checkins
                .slice()
                .reverse()
                .map((c) => (
                  <article className="checkin" key={c.id}>
                    <div>
                      <strong>{c.usesPerWeek} uses/week</strong>
                      <span>
                        {c.satisfaction}/10 satisfaction ·{" "}
                        {c.wouldBuyAgain
                          ? "Would buy again"
                          : "Would not buy again"}
                      </span>
                    </div>
                    <p>{c.notes || "No note added."}</p>
                    <small>{c.date}</small>
                    <Button
                      tone="quiet"
                      onClick={() =>
                        patch({
                          checkins: draft.checkins.filter((i) => i.id !== c.id),
                        })
                      }
                    >
                      Remove from draft
                    </Button>
                  </article>
                ))}
              <p className="tiny">
                Removed observations are only deleted when you save the
                decision.
              </p>
            </section>
          )}
        </div>
      )}
      <div className="mobile-save">
        <Button
          disabled={saving || !dirty || !parsed.success}
          onClick={() => void persist()}
        >
          <Save size={16} />
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}
function BookIcon() {
  return <FileText size={20} />;
}
