import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (pkg: string) =>
  fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@agentlens/shared": src("shared"),
      "@agentlens/crawler": fileURLToPath(new URL("../../packages/crawler/src/parse.ts", import.meta.url)),
      "@agentlens/analyzer": src("analyzer"),
      "@agentlens/scoring": src("scoring"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "happy-dom",
  },
});
