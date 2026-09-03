import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (pkg: string) =>
  fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@agentlens/shared": src("shared"),
      "@agentlens/crawler": src("crawler"),
      "@agentlens/analyzer": src("analyzer"),
      "@agentlens/scoring": src("scoring"),
      "@agentlens/core": src("core"),
      "@agentlens/ai": src("ai"),
    },
  },
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "action/src/**/*.test.ts",
      "cli/src/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "apps/**"],
    environment: "node",
    testTimeout: 15_000,
  },
});
