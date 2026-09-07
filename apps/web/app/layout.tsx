import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentLens — AI agent readiness for your website",
  description:
    "Deterministic audit of crawlability, structured data, semantic HTML, and machine readability. No AI API key required.",
};

const themeScript = `try{var t=localStorage.getItem("agentlens-theme");if(t==="light")document.documentElement.classList.remove("dark");else document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans antialiased text-ink">{children}</body>
    </html>
  );
}
