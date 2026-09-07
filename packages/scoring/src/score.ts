import type {
  AnalysisInsights,
  Category,
  CategoryScore,
  Finding,
  Grade,
  Recommendation,
  ScoreBreakdownRow,
} from "@agentlens/shared";
import { CATEGORIES, CATEGORY_META, GRADE_LABELS, gradeFromScore } from "@agentlens/shared";

export interface ScoreBreakdown {
  score: number;
  grade: Grade;
  categories: CategoryScore[];
  recommendations: Recommendation[];
  breakdown: ScoreBreakdownRow[];
  insights: AnalysisInsights;
  findings: Finding[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function categoryScore(findings: Finding[], category: Category): number {
  const items = findings.filter((f) => f.category === category);
  if (items.length === 0) return 0;
  const earned = items.reduce((sum, f) => sum + f.score, 0);
  const max = items.reduce((sum, f) => sum + f.maxScore, 0);
  if (max <= 0) return 0;
  return clamp(Math.round((earned / max) * 100), 0, 100);
}

function overallFrom(findings: Finding[]): number {
  const weighted = CATEGORIES.reduce((sum, id) => {
    return sum + categoryScore(findings, id) * CATEGORY_META[id].weight;
  }, 0);
  return clamp(Math.round(weighted), 0, 100);
}

export function projectScore(findings: Finding[], passIds: string[]): number {
  const projected = findings.map((finding) =>
    passIds.includes(finding.id)
      ? { ...finding, score: finding.maxScore, severity: "pass" as const }
      : finding,
  );
  return overallFrom(projected);
}

export function attachScoreImpact(findings: Finding[]): Finding[] {
  const base = overallFrom(findings);
  return findings.map((finding) => {
    if (finding.severity === "pass" || finding.score === finding.maxScore) {
      return { ...finding, scoreImpact: 0 };
    }
    return { ...finding, scoreImpact: projectScore(findings, [finding.id]) - base };
  });
}

function buildBreakdown(findings: Finding[], categories: CategoryScore[]): ScoreBreakdownRow[] {
  return categories.map((category) => {
    const checks = findings
      .filter((f) => f.category === category.id)
      .map((f) => ({
        id: f.id,
        title: f.title,
        score: f.score,
        maxScore: f.maxScore,
        severity: f.severity,
      }));
    return {
      id: category.id,
      name: category.name,
      weight: category.weight,
      score: category.score,
      points: Math.round(category.score * category.weight * 10) / 10,
      checks,
    };
  });
}

function gradeNarrative(score: number, grade: Grade): string {
  const label = GRADE_LABELS[grade];
  if (score >= 90) {
    return `Your website scored ${score}/100 (${label}). Machine-readable systems can generally interpret the page structure with only minor gaps.`;
  }
  if (score >= 75) {
    return `Your website scored ${score}/100 (${label}). It is generally accessible to machine-readable systems, but several improvements could make it easier for AI agents to understand and navigate.`;
  }
  if (score >= 60) {
    return `Your website scored ${score}/100 (${label}). Core crawl signals are present, but missing metadata, structure, or structured data may limit how agents interpret the site.`;
  }
  if (score >= 40) {
    return `Your website scored ${score}/100 (${label}). Multiple technical gaps reduce how reliably fetch-based agents and crawlers can understand this site.`;
  }
  return `Your website scored ${score}/100 (${label}). Foundational crawl, content, or structure signals are missing or blocked.`;
}

function buildInsights(
  findings: Finding[],
  categories: CategoryScore[],
  score: number,
  grade: Grade,
): AnalysisInsights {
  const ranked = [...categories].sort((a, b) => b.score - a.score);
  const strongest = ranked.filter((c) => c.score >= 75).slice(0, 3).map((c) => c.name);
  const weakest = [...ranked].reverse().filter((c) => c.score < 80).slice(0, 3).map((c) => c.name);

  const topActions = findings
    .filter((f) => f.severity === "critical" || f.severity === "warning")
    .slice()
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2, pass: 3 };
      const severityDelta = order[a.severity] - order[b.severity];
      if (severityDelta !== 0) return severityDelta;
      return (b.scoreImpact ?? 0) - (a.scoreImpact ?? 0);
    })
    .slice(0, 3)
    .map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      scoreImpact: f.scoreImpact ?? 0,
      affectedPages: f.affectedPages?.length ?? 1,
    }));

  return {
    summary: gradeNarrative(score, grade),
    strongest: strongest.length > 0 ? strongest : ranked.slice(0, 2).map((c) => c.name),
    weakest: weakest.length > 0 ? weakest : ranked.slice(-2).map((c) => c.name),
    topActions,
  };
}

export function scoreFindings(findings: Finding[]): ScoreBreakdown {
  const withImpact = attachScoreImpact(findings);

  const categories: CategoryScore[] = CATEGORIES.map((id) => {
    const meta = CATEGORY_META[id];
    return {
      id,
      name: meta.name,
      emoji: meta.emoji,
      score: categoryScore(withImpact, id),
      weight: meta.weight,
    };
  });

  const score = overallFrom(withImpact);

  const recommendations: Recommendation[] = withImpact
    .filter((f) => f.recommendation && f.severity !== "pass")
    .map((f) => ({
      id: f.id,
      title: f.title,
      description: f.recommendation ?? f.description,
      category: f.category,
      severity: f.severity,
    }));

  recommendations.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, pass: 3 };
    return order[a.severity] - order[b.severity];
  });

  const grade = gradeFromScore(score);

  return {
    score,
    grade,
    categories,
    recommendations,
    breakdown: buildBreakdown(withImpact, categories),
    insights: buildInsights(withImpact, categories, score, grade),
    findings: withImpact,
  };
}

export function failUnder(score: number, threshold: number): boolean {
  return score < threshold;
}
