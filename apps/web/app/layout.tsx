import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentLens — See how AI agents see your website",
  description:
    "GitHub-first heuristic analyzer for crawlability, structured data, semantic HTML, and machine readability. No AI API key required.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans antialiased">{children}</body>
    </html>
  );
}
