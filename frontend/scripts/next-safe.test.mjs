#!/usr/bin/env node
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(path.join(tmpdir(), "morfoschools-next-safe-"));
const tempFrontend = path.join(tempRoot, "frontend");

mkdirSync(path.join(tempFrontend, "scripts"), { recursive: true });
mkdirSync(path.join(tempFrontend, "src", "app"), { recursive: true });
mkdirSync(path.join(tempFrontend, ".next", "server", "chunks"), { recursive: true });
writeFileSync(path.join(tempFrontend, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n');
writeFileSync(path.join(tempFrontend, "src", "app", "globals.css"), '@import "tailwindcss";\n');
writeFileSync(path.join(tempFrontend, "scripts", "next-safe.mjs"), readFileSync(path.join(repoRoot, "scripts", "next-safe.mjs"), "utf8"));

const result = spawnSync(process.execPath, ["scripts/next-safe.mjs", "dev", "--help"], {
  cwd: tempFrontend,
  env: { ...process.env, PATH: `${path.join(repoRoot, "node_modules", ".bin")}:${process.env.PATH}` },
  encoding: "utf8",
});

if (existsSync(path.join(tempFrontend, ".next"))) {
  console.error("next-safe dev should remove stale .next before starting Next.js");
  console.error(result.stdout);
  console.error(result.stderr);
  rmSync(tempRoot, { recursive: true, force: true });
  process.exit(1);
}

rmSync(tempRoot, { recursive: true, force: true });
console.log("[next-safe.test] dev command removes stale .next before startup.");
