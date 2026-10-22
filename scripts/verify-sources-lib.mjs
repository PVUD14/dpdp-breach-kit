/**
 * Pure logic for scripts/verify-sources.mjs: parse the docs/requirements.md §1 "Sources" table and
 * decide the outcome for a set of present files. No file system or hashing here, so it is
 * unit-tested directly (tests/verify-sources.test.ts).
 *
 * Exit codes: 0 all recorded sources present and matching; 1 a hash mismatch, or a PDF in
 * docs/source/ with no recorded hash; 2 sources not downloaded (one or more recorded files absent,
 * nothing mismatched). The CLI uses 3 when the table cannot be read.
 */

/** Rows of the §1 table: | `file` | document | identifier | URL | downloaded | pages | `sha256` | */
export function parseSourcesTable(markdown) {
  const start = markdown.indexOf("## 1. Sources");
  if (start < 0) throw new Error('docs/requirements.md has no "## 1. Sources" section');
  const end = markdown.indexOf("\n## ", start + 1);
  const rows = [];
  for (const line of markdown.slice(start, end < 0 ? undefined : end).split(/\r?\n/)) {
    if (!line.startsWith("| `")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 7) throw new Error(`unexpected column count in sources row: ${line}`);
    const [file, document, identifier, url, downloaded, pages, sha] = cells;
    const sha256 = sha.replace(/`/g, "");
    if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`bad SHA-256 in sources row: ${line}`);
    rows.push({ file: file.replace(/`/g, ""), document, identifier, url, downloaded, pages, sha256 });
  }
  if (rows.length === 0) throw new Error("no file/SHA-256 rows found in docs/requirements.md §1");
  return rows;
}

/**
 * @param rows   parsed §1 rows
 * @param present map of PDF file name in docs/source/ to its actual SHA-256
 */
export function evaluateSources(rows, present) {
  const lines = [];
  const recorded = new Map(rows.map((r) => [r.file, r]));
  let failures = 0;

  for (const [name, actual] of [...present].sort(([a], [b]) => a.localeCompare(b))) {
    const row = recorded.get(name);
    if (!row) {
      lines.push(`FAIL  ${name}: no SHA-256 recorded in docs/requirements.md §1 (actual ${actual})`);
      failures++;
    } else if (row.sha256 !== actual) {
      lines.push(`FAIL  ${name}: MISMATCH`, `      recorded ${row.sha256}`, `      actual   ${actual}`);
      failures++;
    } else {
      lines.push(`PASS  ${name}  ${actual}`);
    }
  }

  const missing = rows.filter((r) => !present.has(r.file));
  if (missing.length) {
    lines.push("", failures ? "Also missing:" : "sources not downloaded", "");
    for (const r of missing) {
      lines.push(`MISSING  ${r.file}`, `         url      ${r.url}`, `         sha256   ${r.sha256}`);
    }
    if (!failures) {
      lines.push("", "Download each file from its official URL into docs/source/, then run `npm run verify:sources` again.");
    }
  }

  const code = failures ? 1 : missing.length ? 2 : 0;
  lines.push("", `${present.size} file(s) present, ${rows.length} recorded, ${failures} failure(s), ${missing.length} missing`);
  return { code, lines };
}
