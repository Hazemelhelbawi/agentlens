import Link from "next/link";
import { AnalyzeForm } from "@/components/analyze-form";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-16">
      <p className="mb-6 text-center font-mono text-sm text-muted">
        <Link href="https://github.com/hazemelhelbawi/agentlens" className="hover:text-ink">
          GitHub
        </Link>
        {" · "}
        <Link href="https://github.com/hazemelhelbawi/agentlens/blob/main/action.yml" className="hover:text-ink">
          Action
        </Link>
      </p>
      <div className="rounded-xl border border-line bg-raised p-8">
        <p className="text-center text-3xl" aria-hidden>
          🤖
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">AgentLens</h1>
        <p className="mt-3 text-center text-lg text-muted">
          See how AI agents see
          <br />
          your website.
        </p>
        <p className="mx-auto mt-4 max-w-sm text-center text-sm text-muted">
          Analyze the machine-readability, technical structure and AI readiness of any website.
        </p>
        <div className="mt-8">
          <AnalyzeForm />
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Deterministic heuristics. No AI API key required.
      </p>
    </main>
  );
}
