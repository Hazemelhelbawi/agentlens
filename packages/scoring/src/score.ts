import type {
  Category,
  CategoryScore,
  Finding,
  Grade,
  Recommendation,
} from "@agentlens/shared";
import { CATEGORIES, CATEGORY_META, gradeFromScore } from "@agentlens/shared";

export interface ScoreBreakdown {
  score: number;
  grade: Grade;
  categories: CategoryScore[];
  recommendations: Recommendation[];
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

export function scoreFindings(findings: Finding[]): ScoreBreakdown {
  const categories: CategoryScore[] = CATEGORIES.map((id) => {
    const meta = CATEGORY_META[id];
    return {
      id,
      name: meta.name,
      emoji: meta.emoji,
      score: categoryScore(findings, id),
      weight: meta.weight,
    };
  });

  const weighted = categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0);
  const score = clamp(Math.round(weighted), 0, 100);

  const recommendations: Recommendation[] = findings
    .filter((f) => f.recommendation && (f.severity === "critical" || f.severity === "warning" || f.severity === "info"))
    .filter((f) => f.severity !== "pass")
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

  return {
    score,
    grade: gradeFromScore(score),
    categories,
    recommendations,
  };
}

export function failUnder(score: number, threshold: number): boolean {
  return score < threshold;
}
