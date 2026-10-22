#!/usr/bin/env node
/**
 * Runs Vitest from a working directory whose Windows drive letter is upper case.
 *
 * With a lower-case drive letter ("e:\repo"), Vitest resolves the same files under two path
 * spellings and loads its runner twice, so every test file fails at its first `describe` with
 * "Cannot read properties of undefined (reading 'config')" and "no tests". The mismatch happens
 * before vite.config.ts is read, so it cannot be fixed there. This launcher restarts Vitest
 * with the drive letter normalised; on other platforms it only passes the arguments through.
 *
 * Usage: node scripts/run-vitest.mjs [vitest args]   (npm test runs `... run`)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.platform === "win32" ? process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase()) : process.cwd();
const vitest = path.join(cwd, "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
