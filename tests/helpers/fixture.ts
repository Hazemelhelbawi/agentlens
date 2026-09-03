import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function fixture(relativePath: string): string {
  return readFileSync(join(root, "fixtures", relativePath), "utf8");
}
