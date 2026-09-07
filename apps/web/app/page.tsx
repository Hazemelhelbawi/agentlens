import Link from "next/link";
import { AnalyzeForm } from "@/components/analyze-form";
import { ThemeToggle } from "@/components/theme-toggle";

const PIPELINE = ["Website", "Crawler", "Analyzer", "Rules", "Score", "Recommendations"];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="font-semibold tracking-tight">
          AgentLens
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link href="https://github.com/Hazemelhelbawi/agentlens" className="hover:text-ink">
            GitHub
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Developer audit
        </p>
        <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          AI Agent Readiness
          <span className="block text-muted">for your website.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-center text-muted">
          Analyze how easily AI agents, LLMs, crawlers and automated systems can understand your
          website.
        </p>

        <div className="mt-10 rounded-2xl border border-line bg-raised p-6 shadow-card">
          <AnalyzeForm />
        </div>

        <ol className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
          {PIPELINE.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-line bg-raised px-2.5 py-1 font-mono text-ink">
                {step}
              </span>
              {index < PIPELINE.length - 1 ? <span aria-hidden>↓</span> : null}
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-xs text-muted">
          Deterministic heuristics. No AI API key. Not an official ranking from any search engine or
          model provider.
        </p>
      </main>
    </div>
  );
}
