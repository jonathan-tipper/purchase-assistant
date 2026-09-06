import {
  baselineCost,
  moneyText,
  ownership,
  type Decision,
  type Candidate,
} from "@/domain/decision";
export default function OwnershipChart({
  decision: d,
  candidate: c,
}: {
  decision: Decision;
  candidate: Candidate;
}) {
  const points = Array.from({ length: 25 }, (_, i) => {
    const years = (d.horizonYears * i) / 24;
    return {
      years,
      cost: ownership(c, years, d.usesPerWeek)?.netCost ?? 0,
      baseline: baselineCost(d, d.usesPerWeek, years),
    };
  });
  const max = Math.max(1, ...points.flatMap((p) => [p.cost, p.baseline]));
  const line = (key: "cost" | "baseline") =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${45 + (i / 24) * 490},${160 - (p[key] / max) * 125}`,
      )
      .join(" ");
  return (
    <figure className="ownership-chart">
      <figcaption>
        <strong>Ownership over time</strong>
        <span>Estimated net cost, after resale</span>
      </figcaption>
      <svg
        viewBox="0 0 570 205"
        role="img"
        aria-label={`Estimated costs over ${d.horizonYears} years. ${c.name}: ${moneyText(points[24].cost, d.currency)}. Alternative: ${moneyText(points[24].baseline, d.currency)}.`}
      >
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1="45"
              y1={160 - n * 125}
              x2="535"
              y2={160 - n * 125}
              className="chart-grid"
            />
            <text x="40" y={164 - n * 125} textAnchor="end">
              {new Intl.NumberFormat("en-GB", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(max * n)}
            </text>
          </g>
        ))}
        <path d={line("baseline")} className="chart-baseline" />
        <path d={line("cost")} className="chart-option" />
        <text x="45" y="185">
          Now
        </text>
        <text x="535" y="185" textAnchor="end">
          {d.horizonYears} years
        </text>
        <text x="45" y="17">
          {d.currency}
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i />
          {c.name}
        </span>
        <span>
          <i />
          Your alternative
        </span>
      </div>
    </figure>
  );
}
