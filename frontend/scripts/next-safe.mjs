#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const command = process.argv[2];
const args = process.argv.slice(3);
const nextDir = path.join(root, ".next");

function removeNext(reason) {
  if (existsSync(nextDir)) {
    console.log(`[next-safe] removing .next (${reason})`);
    rmSync(nextDir, { recursive: true, force: true });
  }
}

function assertTailwindPostcss() {
  const postcssConfig = path.join(root, "postcss.config.mjs");
  const globalsCss = path.join(root, "src", "app", "globals.css");
  const postcss = existsSync(postcssConfig) ? readFileSync(postcssConfig, "utf8") : "";
  const globals = existsSync(globalsCss) ? readFileSync(globalsCss, "utf8") : "";

  if (!postcss.includes("@tailwindcss/postcss")) {
    console.error("[next-safe] Missing @tailwindcss/postcss in postcss.config.mjs. Tailwind utilities will not be generated.");
    process.exit(1);
  }
  if (!globals.includes('@import "tailwindcss"') && !globals.includes("@import 'tailwindcss'")) {
    console.error('[next-safe] Missing @import "tailwindcss" in src/app/globals.css.');
    process.exit(1);
  }
}

if (!["dev", "build", "start"].includes(command)) {
  console.error("Usage: node scripts/next-safe.mjs <dev|build|start> [...next args]");
  process.exit(1);
}

assertTailwindPostcss();

if (command === "dev") {
  removeNext("avoid stale production chunks in dev server");
  process.env.NODE_ENV = "development";
}

if (command === "build") {
  removeNext("clean production build");
  process.env.NODE_ENV = "production";
}

const nextBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const result = spawnSync(nextBin, [command, ...args], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
