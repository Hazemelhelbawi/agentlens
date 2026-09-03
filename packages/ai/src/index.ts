import type { AnalysisResult, Finding } from "@agentlens/shared";

/**
 * Optional AI layer. The core analyzer never calls this.
 * Providers must explain existing findings — they must not invent scores.
 */
export interface AIProvider {
  explainFinding(finding: Finding, result: AnalysisResult): Promise<string>;
  generateRecommendations(result: AnalysisResult): Promise<string[]>;
  generateLlmsTxt(result: AnalysisResult): Promise<string>;
  generateStructuredData(result: AnalysisResult): Promise<string>;
}

export type AIProviderName = "none" | "openai" | "anthropic";

export interface AIProviderOptions {
  provider?: AIProviderName;
  apiKey?: string;
  model?: string;
}

export class AINotConfiguredError extends Error {
  constructor(provider: string) {
    super(
      `AI provider "${provider}" is not configured. AgentLens analysis does not require an AI API key. Pass an apiKey only if you want optional explanations of existing findings.`,
    );
    this.name = "AINotConfiguredError";
  }
}

export class NoneProvider implements AIProvider {
  async explainFinding(finding: Finding): Promise<string> {
    return finding.description;
  }

  async generateRecommendations(result: AnalysisResult): Promise<string[]> {
    return result.recommendations.map((r) => r.description);
  }

  async generateLlmsTxt(result: AnalysisResult): Promise<string> {
    return `# ${new URL(result.url).hostname}\n> Generated from AgentLens findings without an LLM.\n`;
  }

  async generateStructuredData(result: AnalysisResult): Promise<string> {
    return JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: result.url,
        name: new URL(result.url).hostname,
      },
      null,
      2,
    );
  }
}

async function postJson(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`AI provider request failed (${response.status})`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: Array<{ text?: string }>;
  };
  const fromOpenAi = data.choices?.[0]?.message?.content;
  const fromAnthropic = data.content?.[0]?.text;
  return (fromOpenAi ?? fromAnthropic ?? "").trim();
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gpt-4o-mini",
  ) {}

  private prompt(instruction: string, payload: unknown): Promise<string> {
    return postJson("https://api.openai.com/v1/chat/completions", this.apiKey, {
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You explain AgentLens heuristic findings. Never invent scores or claim official ranking from OpenAI, Google, or Anthropic.",
        },
        { role: "user", content: `${instruction}\n\n${JSON.stringify(payload)}` },
      ],
    });
  }

  explainFinding(finding: Finding, result: AnalysisResult): Promise<string> {
    return this.prompt("Explain this existing finding in one short paragraph.", {
      url: result.url,
      finding,
    });
  }

  generateRecommendations(result: AnalysisResult): Promise<string[]> {
    return this.prompt(
      "Rewrite the existing recommendations more clearly. Return a JSON array of strings. Do not add new issues.",
      result.recommendations,
    ).then((text) => {
      try {
        const parsed = JSON.parse(text) as unknown;
        return Array.isArray(parsed) ? parsed.map(String) : result.recommendations.map((r) => r.description);
      } catch {
        return result.recommendations.map((r) => r.description);
      }
    });
  }

  generateLlmsTxt(result: AnalysisResult): Promise<string> {
    return this.prompt("Draft an llms.txt from this analysis. Do not invent pages that were not observed.", {
      url: result.url,
      findings: result.findings.map((f) => f.title),
    });
  }

  generateStructuredData(result: AnalysisResult): Promise<string> {
    return this.prompt("Draft JSON-LD WebSite/Organization markup from this analysis. Return JSON only.", {
      url: result.url,
    });
  }
}

export class AnthropicProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "claude-3-5-haiku-latest",
  ) {}

  private prompt(instruction: string, payload: unknown): Promise<string> {
    return postJson("https://api.anthropic.com/v1/messages", this.apiKey, {
      model: this.model,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `${instruction}\n\n${JSON.stringify(payload)}`,
        },
      ],
    });
  }

  explainFinding(finding: Finding, result: AnalysisResult): Promise<string> {
    return this.prompt("Explain this existing finding in one short paragraph.", {
      url: result.url,
      finding,
    });
  }

  async generateRecommendations(result: AnalysisResult): Promise<string[]> {
    return result.recommendations.map((r) => r.description);
  }

  generateLlmsTxt(result: AnalysisResult): Promise<string> {
    return this.prompt("Draft an llms.txt from this analysis.", { url: result.url });
  }

  generateStructuredData(result: AnalysisResult): Promise<string> {
    return this.prompt("Draft JSON-LD from this analysis. Return JSON only.", { url: result.url });
  }
}

export function createAIProvider(options: AIProviderOptions = {}): AIProvider {
  const provider = options.provider ?? "none";
  if (provider === "none") return new NoneProvider();
  if (!options.apiKey) throw new AINotConfiguredError(provider);
  if (provider === "openai") return new OpenAIProvider(options.apiKey, options.model);
  if (provider === "anthropic") return new AnthropicProvider(options.apiKey, options.model);
  throw new AINotConfiguredError(provider);
}
