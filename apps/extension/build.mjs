import { mkdir, cp, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import * as esbuild from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");
const pkg = (name) => join(root, "../../packages", name, "src/index.ts");

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const cx = (size - 1) / 2;
  const outer = size * 0.36;
  const inner = size * 0.22;
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cx;
      const d = Math.sqrt(dx * dx + dy * dy);
      const o = y * stride + 1 + x * 4;
      let r = 20;
      let g = 22;
      let b = 28;
      if (d < outer && d > inner) {
        r = 59;
        g = 130;
        b = 246;
      } else if (d <= inner) {
        r = 236;
        g = 236;
        b = 239;
      }
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function writeIcons() {
  const dir = join(dist, "icons");
  await mkdir(dir, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await writeFile(join(dir, `icon${size}.png`), png(size));
  }
}

const alias = {
  "@agentlens/shared": pkg("shared"),
  "@agentlens/scoring": pkg("scoring"),
  "@agentlens/analyzer": pkg("analyzer"),
  "@agentlens/crawler": join(root, "../../packages/crawler/src/parse.ts"),
};

const common = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.DEBUG": "undefined",
  },
  alias,
  logLevel: "info",
};

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  const popupHtml = await readFile(join(root, "src/popup/index.html"), "utf8");
  const reportHtml = await readFile(join(root, "src/report/index.html"), "utf8");
  await writeFile(join(dist, "popup.html"), popupHtml);
  await writeFile(join(dist, "report.html"), reportHtml);
  await cp(join(root, "src/popup/styles.css"), join(dist, "styles.css"));
  await writeFile(
    join(dist, "manifest.json"),
    JSON.stringify(
      {
        manifest_version: 3,
        name: "AgentLens",
        version: "0.1.0",
        description: "See your website through an AI agent's eyes.",
        action: {
          default_title: "AgentLens",
          default_popup: "popup.html",
          default_icon: {
            16: "icons/icon16.png",
            32: "icons/icon32.png",
            48: "icons/icon48.png",
          },
        },
        background: {
          service_worker: "background.js",
          type: "module",
        },
        permissions: ["activeTab", "scripting"],
        icons: {
          16: "icons/icon16.png",
          32: "icons/icon32.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png",
        },
      },
      null,
      2,
    ),
  );
  await writeIcons();
}

async function buildOnce() {
  await copyStatic();
  await esbuild.build({
    ...common,
    entryPoints: {
      popup: join(root, "src/popup/main.tsx"),
      report: join(root, "src/report/main.tsx"),
    },
    outdir: dist,
    format: "iife",
    jsx: "automatic",
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(root, "src/background/index.ts")],
    outfile: join(dist, "background.js"),
    format: "esm",
    platform: "browser",
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(root, "src/content/index.ts")],
    outfile: join(dist, "content.js"),
    format: "iife",
    platform: "browser",
  });

  const background = await readFile(join(dist, "background.js"), "utf8");
  if (background.includes("node:dns") || background.includes("assertSafeDestination")) {
    throw new Error("Extension background bundle pulled in Node crawler code. Check imports.");
  }
}

if (watch) {
  await copyStatic();
  const ctx1 = await esbuild.context({
    ...common,
    entryPoints: {
      popup: join(root, "src/popup/main.tsx"),
      report: join(root, "src/report/main.tsx"),
    },
    outdir: dist,
    format: "iife",
    jsx: "automatic",
  });
  const ctx2 = await esbuild.context({
    ...common,
    entryPoints: [join(root, "src/background/index.ts")],
    outfile: join(dist, "background.js"),
    format: "esm",
    platform: "browser",
  });
  const ctx3 = await esbuild.context({
    ...common,
    entryPoints: [join(root, "src/content/index.ts")],
    outfile: join(dist, "content.js"),
    format: "iife",
    platform: "browser",
  });
  await Promise.all([ctx1.watch(), ctx2.watch(), ctx3.watch()]);
  console.log("Watching extension… load apps/extension/dist in chrome://extensions");
} else {
  await buildOnce();
}
