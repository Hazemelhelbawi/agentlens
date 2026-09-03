"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AnalyzeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("https://example.com");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      router.push(`/report/${data.id}`);
    } catch {
      setError("Unable to reach the analyzer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        name="url"
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        aria-label="Website URL"
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Analyzing…" : "Analyze"}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
