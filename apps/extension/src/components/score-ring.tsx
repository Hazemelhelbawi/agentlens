import { GRADE_LABELS, type Grade } from "@agentlens/shared";

export function ScoreRing({ score, grade }: { score: number; grade: Grade }) {
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const label = GRADE_LABELS[grade];
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Score ${score} out of 100, ${label}`}>
      <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle
        cx="56"
        cy="56"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={reduce ? offset : circ}
        transform="rotate(-90 56 56)"
      >
        {reduce ? null : (
          <animate attributeName="stroke-dashoffset" from={String(circ)} to={String(offset)} dur="0.7s" fill="freeze" />
        )}
      </circle>
      <text x="56" y="52" textAnchor="middle" fill="var(--ink)" fontSize="22" fontWeight="700">
        {score}
      </text>
      <text x="56" y="68" textAnchor="middle" fill="var(--muted)" fontSize="10">
        /100
      </text>
      <text x="56" y="82" textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="600">
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
