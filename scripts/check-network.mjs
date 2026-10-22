#!/usr/bin/env node
/**
 * End-to-end privacy check for the built intake page (dist/app).
 *
 * Serves dist/app from 127.0.0.1, drives a local headless Chrome/Chromium over the DevTools
 * protocol, exercises the page (fill, tabs, copy, download, export, import, 360px layout), and
 * fails if the page makes any request outside its own origin, triggers a CSP violation or a
 * page exception, or touches storage or cookies.
 *
 * No dependencies beyond Node.js >= 22 (built-in fetch and WebSocket) and a Chrome or Chromium
 * binary. Set CHROME_PATH to choose the binary; set CHROME_NO_SANDBOX=1 where the Chrome sandbox
 * is unavailable (some Linux CI runners).
 *
 * Usage: npm run check:network   (builds dist/app first)
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(ROOT, "dist", "app");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) throw new Error(`CHROME_PATH does not exist: ${process.env.CHROME_PATH}`);
    return process.env.CHROME_PATH;
  }
  const candidates = {
    win32: [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
  }[process.platform];
  for (const c of candidates ?? []) if (fs.existsSync(c)) return c;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const r = spawnSync("which", [name], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

async function main() {
  if (!fs.existsSync(path.join(APP_DIR, "index.html"))) {
    throw new Error("dist/app/index.html not found: run `vite build --mode app` first (npm run check:network does this).");
  }
  const chromePath = findChrome();
  if (!chromePath) throw new Error("No Chrome/Chromium found. Set CHROME_PATH.");

  // ---------------------------------------------------------------- static server
  const serverLog = [];
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  const server = http.createServer((req, res) => {
    serverLog.push(`${req.method} ${req.url}`);
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(APP_DIR, rel);
    if (!file.startsWith(APP_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;

  // ---------------------------------------------------------------- browser
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "check-network-"));
  const profile = path.join(work, "profile");
  const downloads = path.join(work, "downloads");
  fs.mkdirSync(downloads);
  const args = [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    // Anything other than the local server fails to resolve, so a stray request cannot leave the machine.
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    ...(process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    "about:blank",
  ];
  const chrome = spawn(chromePath, args, { stdio: "ignore" });
  let spawnError = null;
  chrome.on("error", (e) => (spawnError = e));
  let ws = null;
  const cleanup = async () => {
    ws?.close();
    server.close();
    if (chrome.exitCode === null && !spawnError) {
      const exited = new Promise((r) => chrome.once("exit", r));
      chrome.kill();
      await exited;
    }
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  };

  try {
  // Chrome writes "<port>\n<path>" to this file; on Windows it can be locked (EBUSY) or
  // partially written when first seen, so retry until both lines are present.
  const portFile = path.join(profile, "DevToolsActivePort");
  let debugPort = "";
  for (let i = 0; i < 150 && !debugPort && !spawnError; i++) {
    try {
      const [port, wsPath] = fs.readFileSync(portFile, "utf8").split("\n");
      if (port && wsPath) debugPort = port;
    } catch {
      // not there yet, or locked
    }
    if (!debugPort) await sleep(100);
  }
  if (spawnError) throw new Error(`Could not start ${chromePath}: ${spawnError.message}`);
  if (!debugPort) throw new Error("Chrome did not start (no readable DevToolsActivePort).");
  const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();

  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 1;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else events.push(msg);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

  try {
    const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
    const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    for (const d of ["Network.enable", "Log.enable", "Runtime.enable", "Page.enable", "DOM.enable"]) await s(d);
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
    await send("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin });

    const evaluate = async (expression) => {
      const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.result?.exceptionDetails) throw new Error(`evaluate failed: ${expression}\n${JSON.stringify(r.result.exceptionDetails)}`);
      return r.result?.result?.value;
    };
    const waitFor = async (expression, ms = 3000) => {
      for (let t = 0; t < ms; t += 100) {
        if (await evaluate(expression)) return true;
        await sleep(100);
      }
      return false;
    };

    await s("Page.navigate", { url: `${origin}/index.html` });
    check("page rendered", await waitFor(`!!document.querySelector("h1")`));
    check("personal-data warning visible", await evaluate(`document.querySelector('[role=note]')?.textContent.includes("Don't type names")`));

    await evaluate(`(() => {
      const set = (id, v) => {
        const el = document.getElementById(id);
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set("f-incidentId", "INC-CHECK-1");
      set("f-awareness-fiduciaryAwareAt", "2026-10-20T09:00:00");
      set("f-classification-involvesPersonalData", "true");
      set("f-description-nature", "<img src=x onerror=alert(1)> synthetic");
      document.getElementById("f-classification-eventTypes-accidental_disclosure").click();
      set("f-classification-compromises-confidentiality", "true");
    })()`);
    check("form errors clear once the reference is entered", await waitFor(`document.querySelector(".errors").children.length === 0`));
    check("user input rendered as text, not markup", await evaluate(
      `document.querySelectorAll("img").length === 0 && document.querySelector("pre.draft")?.textContent.includes("<img src=x onerror=alert(1)>")`,
    ));

    await evaluate(`(() => { const b = document.getElementById("basis"); b.value = "fiduciary"; b.dispatchEvent(new Event("change")); })()`);
    check("deadline panel computes from the chosen basis", await waitFor(
      `document.querySelector('[aria-labelledby=deadline-title]').textContent.includes("23 Oct 2026, 09:00:00 IST")`,
    ));

    await evaluate(`document.querySelector('[role=tab][aria-selected=true]').focus()`);
    for (const type of ["keyDown", "keyUp"]) {
      await s("Input.dispatchKeyEvent", { type, key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    }
    check("ArrowRight moves to the next draft tab", await waitFor(
      `document.activeElement?.id === "tab-board_initial" && document.activeElement.getAttribute("aria-selected") === "true"`,
    ));

    const clickButton = (label) => evaluate(`[...document.querySelectorAll("button")].find((b) => b.textContent === ${JSON.stringify(label)}).click()`);
    await clickButton("Copy text");
    check("copy reports a status", await waitFor(`/Copied|Couldn't copy|isn't available/.test(document.querySelector(".status").textContent)`));
    await clickButton("Download as a text file");
    await clickButton("Save to file");
    let saved = [];
    for (let t = 0; t < 5000 && saved.length < 2; t += 100) {
      saved = fs.readdirSync(downloads).filter((f) => !f.endsWith(".crdownload"));
      await sleep(100);
    }
    check("draft and record downloaded locally", saved.length === 2, saved.sort().join(", "));

    const exported = saved.find((f) => f.endsWith(".incident.json"));
    if (exported) {
      const { result: { root } } = await s("DOM.getDocument", {});
      const { result: { nodeId } } = await s("DOM.querySelector", { nodeId: root.nodeId, selector: "#import-file" });
      await evaluate(`document.getElementById("f-incidentId").value = "changed"`);
      await s("DOM.setFileInputFiles", { nodeId, files: [path.join(downloads, exported)] });
      check("import restores the exported record", await waitFor(`document.getElementById("f-incidentId").value === "INC-CHECK-1"`));

      const bad = JSON.parse(fs.readFileSync(path.join(downloads, exported), "utf8"));
      bad.principalNames = ["synthetic"];
      const badFile = path.join(work, "bad.incident.json");
      fs.writeFileSync(badFile, JSON.stringify(bad));
      await s("DOM.setFileInputFiles", { nodeId, files: [badFile] });
      check("import rejects an unknown field", await waitFor(`/Couldn't open this file..*principalNames: is not allowed/.test(document.querySelector(".status").textContent)`));
    } else {
      check("import restores the exported record", false, "no exported file");
    }

    check("no localStorage, sessionStorage or cookies", await evaluate(`localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ""`));
    check("no service worker", await evaluate(`navigator.serviceWorker.getRegistrations().then((r) => r.length === 0)`));

    await s("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await sleep(300);
    const [scrollWidth, clientWidth] = await evaluate(`[document.documentElement.scrollWidth, document.documentElement.clientWidth]`);
    check("no horizontal overflow at 360px", scrollWidth <= clientWidth, `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);

    const unlabelled = await evaluate(
      `[...document.querySelectorAll("input, select, textarea")].filter((e) => !e.labels?.length && !e.getAttribute("aria-label")).map((e) => e.id)`,
    );
    check("every input, select and textarea has a label", unlabelled.length === 0, unlabelled.join(", "));

    await sleep(300);

    // ---------------------------------------------------------------- network verdict
    const requests = events
      .filter((e) => e.method === "Network.requestWillBeSent" && e.sessionId === sessionId)
      .map((e) => e.params.request.url);
    // Same-origin page assets, the browser's automatic favicon probe, blob: downloads, and
    // data: URLs (Chrome's built-in date-picker icon is one; CSP blocks data: for page content).
    const allowed = (url) =>
      url.startsWith(`${origin}/`) || url.startsWith("blob:") || url.startsWith("data:");
    const foreign = requests.filter((u) => !allowed(u));
    check("no request outside the page's own origin", foreign.length === 0, foreign.join(", "));
    const unexpectedServer = serverLog.filter((l) => !/^GET \/(index\.html|assets\/[\w.-]+|favicon\.ico)$/.test(l));
    check("server saw only page assets", unexpectedServer.length === 0, unexpectedServer.join(", "));

    const logs = events.filter((e) => e.sessionId === sessionId);
    const csp = logs.filter((e) => e.method === "Log.entryAdded" && /Content Security Policy/i.test(e.params.entry.text));
    check("no CSP violations", csp.length === 0, csp.map((e) => e.params.entry.text).join(" | "));
    const exceptions = logs.filter((e) => e.method === "Runtime.exceptionThrown");
    check("no page exceptions", exceptions.length === 0, exceptions.map((e) => e.params.exceptionDetails.text).join(" | "));

    console.log("Requests made by the page:");
    for (const u of requests) console.log(`  ${u.length > 100 ? `${u.slice(0, 100)}…` : u}`);
    console.log("");
  } finally {
    // Ask Chrome to exit cleanly; cleanup() kills it if it has not exited within 3 s.
    await Promise.race([send("Browser.close"), sleep(3000)]);
    await Promise.race([new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once("exit", r))), sleep(3000)]);
  }

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
  } finally {
    await cleanup();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  },
);
