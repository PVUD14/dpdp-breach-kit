#!/usr/bin/env node
/**
 * Verifies the official source PDFs against the hashes recorded in docs/requirements.md §1.
 *
 * The PDFs are not committed (see .gitignore and docs/source/SOURCES.md). Recomputes the SHA-256
 * of every *.pdf in docs/source/ and compares it with the recorded value.
 *
 * Exit codes:
 *   0  all recorded sources present and matching
 *   1  a hash mismatch, or a PDF with no recorded hash
 *   2  sources not downloaded: prints each missing file's URL and expected SHA-256
 *   3  docs/requirements.md §1 could not be read
 *
 * Usage: npm run verify:sources            (or: node scripts/verify-sources.mjs --root <repo dir>)
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateSources, parseSourcesTable } from "./verify-sources-lib.mjs";

const rootArg = process.argv.indexOf("--root");
const ROOT =
  rootArg > 0 && process.argv[rootArg + 1]
    ? path.resolve(process.argv[rootArg + 1])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "docs", "source");

let rows;
try {
  rows = parseSourcesTable(fs.readFileSync(path.join(ROOT, "docs", "requirements.md"), "utf8"));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(3);
}

const present = new Map();
if (fs.existsSync(SOURCE_DIR)) {
  for (const e of fs.readdirSync(SOURCE_DIR, { withFileTypes: true })) {
    if (e.isFile() && e.name.toLowerCase().endsWith(".pdf")) {
      present.set(e.name, createHash("sha256").update(fs.readFileSync(path.join(SOURCE_DIR, e.name))).digest("hex"));
    }
  }
}

const { code, lines } = evaluateSources(rows, present);
console.log(lines.join("\n"));
process.exit(code);
