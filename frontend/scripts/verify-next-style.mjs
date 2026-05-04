#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const postcssConfig = path.join(root, "postcss.config.mjs");
const globalsCss = path.join(root, "src", "app", "globals.css");
const staticCssDir = path.join(root, ".next", "static", "css");

function fail(message) {
  console.error(`[verify-next-style] ${message}`);
  process.exit(1);
}

const postcss = existsSync(postcssConfig) ? readFileSync(postcssConfig, "utf8") : "";
const globals = existsSync(globalsCss) ? readFileSync(globalsCss, "utf8") : "";

if (!postcss.includes("@tailwindcss/postcss")) {
  fail("postcss.config.mjs must use @tailwindcss/postcss.");
}
if (!globals.includes('@import "tailwindcss"') && !globals.includes("@import 'tailwindcss'")) {
  fail('src/app/globals.css must import "tailwindcss".');
}
if (!existsSync(staticCssDir)) {
  fail(".next/static/css does not exist. Run npm run build first.");
}

const css = readdirSync(staticCssDir)
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(path.join(staticCssDir, file), "utf8"))
  .join("\n");

for (const token of [".flex", ".grid", ".rounded-2xl", ".text-sm", ".bg-transparent"]) {
  if (!css.includes(token)) {
    fail(`built CSS is missing Tailwind utility ${token}.`);
  }
}

console.log("[verify-next-style] Tailwind/PostCSS config and built CSS utilities look good.");
