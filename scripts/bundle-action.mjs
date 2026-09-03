import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["action/src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "action/dist/index.cjs",
  target: "node20",
  minify: true,
  logLevel: "info",
});
