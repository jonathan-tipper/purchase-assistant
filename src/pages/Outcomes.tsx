import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useWorkspace } from "@/features/decisions/WorkspaceContext";
export default function Outcomes() {
  const { decisions } = useWorkspace();
  const outcomes = decisions.filter((d) => d.status !== "considering");
  return (
    <div className="page">
      <span className="eyebrow">LEARN FROM REAL LIFE</span>
      <h1>What happened next.</h1>
      <p className="page-intro">
        The purchase is only half the story. Keep a few honest observations for
        the next decision.
      </p>
      {outcomes.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={32} />
          <h2>No outcomes recorded yet.</h2>
          <p>
            Open a decision and choose “What happened” to record buying, waiting
            or deciding against it.
          </p>
          <Link className="button primary" to="/">
            Go to your decisions
          </Link>
        </div>
      ) : (
        <div className="outcomes-list">
          {outcomes.map((d) => {
            const last = d.checkins[d.checkins.length - 1];
            return (
              <Link
                className="outcome-card"
                to={`/decisions/${d.id}`}
                key={d.id}
              >
                <div>
                  <span className={`status-chip ${d.status}`}>
                    {d.status === "passed" ? "Decided against" : d.status}
                  </span>
                  <h2>{d.title}</h2>
                  <p>
                    {last
                      ? `${last.usesPerWeek} actual uses/week · ${last.satisfaction}/10 satisfaction`
                      : "No check-in yet. Add one when you have something useful to say."}
                  </p>
                  {d.snapshot && last && (
                    <small>
                      Originally expected {d.snapshot.usesPerWeek} uses/week.{" "}
                      {last.wouldBuyAgain
                        ? "You would buy it again."
                        : "You would not buy it again."}
                    </small>
                  )}
                </div>
                <ArrowUpRight size={21} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
