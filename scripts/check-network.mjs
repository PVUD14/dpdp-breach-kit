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
const BASE_PATH = process.env.CHECK_BASE_PATH ?? "";
if (BASE_PATH && !/^\/[a-zA-Z0-9_-]+$/.test(BASE_PATH)) throw new Error("CHECK_BASE_PATH must be a single /repository-name prefix.");
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
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".pdf": "application/pdf" };
  const server = http.createServer((req, res) => {
    serverLog.push(`${req.method} ${req.url}`);
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (BASE_PATH && !pathname.startsWith(`${BASE_PATH}/`)) {
      res.writeHead(404); res.end(); return;
    }
    const rel = pathname.slice(BASE_PATH.length).replace(/^\/+/, "") || "index.html";
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

    await s("Page.navigate", { url: `${origin}${BASE_PATH}/index.html` });
    check("page rendered", await waitFor(`!!document.querySelector("h1")`));
    check("brand image loads from the served path", await waitFor(`document.querySelector('img.brand-logo')?.naturalWidth > 0`));
    check("personal-data warning visible", await evaluate(`document.querySelector('[role=note]')?.textContent.includes("Don't type names")`));
    check("start screen hides the long form", await evaluate(`document.querySelector('main').hidden`));
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Start a new incident').click()`);
    check("guided interview starts with plain-language choices", await evaluate(`document.getElementById('wizard-heading').textContent === 'What happened?' && document.querySelectorAll('.incident-choice').length === 6`));
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Open full incident form').click()`);
    check('opening full form transfers focus to its heading', await evaluate(`document.activeElement.id === 'form-title'`));

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
    await evaluate(`(() => { const field = document.getElementById('f-incidentId'); field.focus(); field.value = ''; field.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    check('invalid reference keeps the current editor and error visible', await evaluate(`document.querySelector('#app').dataset.view === 'reviewer' && !document.querySelector('main').hidden && document.querySelector('.response-launch').hidden && document.querySelector('.errors').children.length > 0 && document.activeElement.id === 'f-incidentId'`));
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Your next steps').click()`);
    check('invalid summary has a recovery action instead of going blank', await evaluate(`!document.querySelector('.beginner-overview').hidden && document.querySelector('.beginner-overview').textContent.includes('One answer needs checking')`));
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Return to the answer').click()`);
    check('recovery focuses the validation errors', await evaluate(`document.activeElement.classList.contains('errors') && !document.querySelector('main').hidden`));
    await evaluate(`(() => { const field = document.getElementById('f-incidentId'); field.value = 'INC-CHECK-1'; field.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    check("user input rendered as text, not markup", await evaluate(
      `document.querySelectorAll("img").length === 1 && document.querySelector("img.brand-logo")?.getAttribute("src") === "./brand/breach-guide-logo.png" && !document.querySelector("img[onerror]") && document.querySelector("pre.draft")?.textContent.includes("<img src=x onerror=alert(1)>")`,
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

    // Exercise version 2 response state and the full interview using synthetic values only.
    await evaluate(`window.confirm = () => true`);
    const setResponse = async (id, value) => evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await setResponse('f-response-containment', 'contained');
    await setResponse('f-response-accessActive', 'yes');
    check('contradictory containment is surfaced', await evaluate(`document.querySelector('.response-dashboard').textContent.includes('unauthorised access is still active')`));
    await setResponse('f-response-reviewerRole', 'Legal adviser');
    await setResponse('f-response-reviewNote', 'Synthetic review recorded');
    await clickButton('Record review of current answers');
    check('review is recorded', await evaluate(`document.querySelector('.response-dashboard').textContent.includes('Review recorded for current answers')`));
    await setResponse('f-response-noticeLanguages', 'English');
    check('later edits invalidate review', await evaluate(`document.querySelector('.response-dashboard').textContent.includes('Human review pending')`));
    await setResponse('new-action', 'Confirm affected data');
    await setResponse('new-action-owner', 'IT');
    await clickButton('Add action');
    check('new action is announced', await evaluate(`document.querySelector('.status').textContent.includes('Action added: Confirm affected data')`));
    check('response action appears', await evaluate(`document.querySelector('.response-task').textContent.includes('Confirm affected data')`));
    await clickButton('Download response pack');
    check('response pack download is announced', await evaluate(`document.querySelector('.status').textContent.includes('Response pack download requested')`));
    for (let t = 0; t < 3000 && !fs.readdirSync(downloads).some(f => f.endsWith('.response-pack.txt')); t += 100) await sleep(100);
    const packName = fs.readdirSync(downloads).find(f => f.endsWith('.response-pack.txt'));
    const pack = packName ? fs.readFileSync(path.join(downloads, packName), 'utf8') : '';
    check('response pack contains summary, action register and review checklist', ['INTERNAL SUMMARY', 'ACTION REGISTER', 'REVIEW CHECKLIST', 'Confirm affected data'].every(s => pack.includes(s)));
    await evaluate(`(() => { const f = document.getElementById('f-incidentId'); f.value = 'INC-RESPONSE-CHECK'; f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await clickButton('Save to file');
    const responseFile = path.join(downloads, 'INC-RESPONSE-CHECK.incident.json');
    for (let t = 0; t < 3000 && !fs.existsSync(responseFile); t += 100) await sleep(100);
    check('version 2 backup preserves actions and clock basis', fs.existsSync(responseFile) && (() => { const data = JSON.parse(fs.readFileSync(responseFile, 'utf8')); return data.schemaVersion === 2 && data.response.basis === 'fiduciary' && data.response.actions[0]?.description === 'Confirm affected data'; })());
    await clickButton('Start a new incident');
    await evaluate(`(() => { const f = document.getElementById('f-description-nature'); f.value = 'Synthetic guided incident'; f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    for (let step = 1; step < 6; step++) await clickButton('Continue');
    await clickButton('See my response plan');
    check('interview completion focuses the beginner overview', await evaluate(`document.activeElement.id === 'beginner-overview-title'`));
    check('six-step interview preserves answers', await evaluate(`document.getElementById('f-description-nature').value === 'Synthetic guided incident'`));
    check('beginner sees three next steps without legal clock choices', await evaluate(`document.querySelectorAll('.next-step-cards > li').length === 3 && document.querySelector('main').hidden && document.querySelector('.response-clocks').hidden && document.querySelector('.response-details').hidden`));
    await clickButton('Save summary for review');
    for (let t = 0; t < 3000 && !fs.readdirSync(downloads).some(f => f.endsWith('.summary.txt')); t += 100) await sleep(100);
    const summaryName = fs.readdirSync(downloads).find(f => f.endsWith('.summary.txt'));
    check('beginner summary downloads recorded facts for handoff', summaryName && fs.readFileSync(path.join(downloads, summaryName), 'utf8').includes('Synthetic guided incident'));
    await clickButton('Review my answers');
    const backupsBefore = fs.readdirSync(downloads).filter(f => f.endsWith('.incident.json')).length;
    await clickButton('Save and continue later');
    for (let t = 0; t < 3000 && fs.readdirSync(downloads).filter(f => f.endsWith('.incident.json')).length <= backupsBefore; t += 100) await sleep(100);
    check('guided answers can be saved before finishing', fs.readdirSync(downloads).filter(f => f.endsWith('.incident.json')).length > backupsBefore);
    for (let step = 0; step < 6; step++) await clickButton("I don't know yet");
    check('unknown answers can complete the guide without invented facts', await evaluate(`document.querySelector('#app').dataset.view === 'summary' && document.getElementById('f-description-nature').value === '' && document.getElementById('basis').value === '' && document.querySelector('.beginner-facts').textContent.includes('Not known yet')`));
    await clickButton('For your reviewer');
    check('reviewer view deliberately reveals technical controls', await evaluate(`!document.querySelector('main').hidden && !document.querySelector('.response-clocks').hidden && document.querySelector('.beginner-overview').hidden`));
    await clickButton('Start practice');
    check('practice starts at first inject', await evaluate(`document.querySelector('.response-practice').textContent.includes('FICTIONAL PRACTICE') && document.querySelectorAll('.response-practice li').length === 1`));
    await clickButton('Reveal next update');
    check('practice update receives focus for reading', await evaluate(`document.activeElement.id === 'practice-current-update'`));
    check('practice reveals one additional inject', await evaluate(`document.querySelectorAll('.response-practice li').length === 2`));
    check('practice drafts are clearly labelled', await evaluate(`document.querySelector('.draft').textContent.includes('FICTIONAL PRACTICE')`));
    await clickButton('Open full incident form');
    await clickButton('Save to file');
    const practiceName = await evaluate(`document.getElementById('f-incidentId').value + '.incident.json'`);
    const practiceFile = path.join(downloads, practiceName);
    for (let t = 0; t < 3000 && !fs.existsSync(practiceFile); t += 100) await sleep(100);
    const { result: { root: updatedRoot } } = await s('DOM.getDocument', {});
    const { result: { nodeId: importNode } } = await s('DOM.querySelector', { nodeId: updatedRoot.nodeId, selector: '#import-file' });
    await s('DOM.setFileInputFiles', { nodeId: importNode, files: [responseFile] });
    check('reopening restores task controls and clock selection', await waitFor(`document.getElementById('basis').value === 'fiduciary' && document.querySelector('.response-task')?.textContent.includes('Confirm affected data') && document.querySelector('.response-practice').hidden`));
    await s('DOM.setFileInputFiles', { nodeId: importNode, files: [practiceFile] });
    check('practice progress survives reopening', await waitFor(`!document.querySelector('.response-practice').hidden && document.querySelectorAll('.response-practice li').length === 2`));
    await evaluate(`document.querySelector('.response-launch button').focus()`);
    let keyboardOk = true;
    for (let i = 0; i < 30; i++) {
      await s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      keyboardOk &&= await evaluate(`!!document.activeElement && !document.activeElement.closest('[hidden]')`);
    }
    check('keyboard Tab traversal avoids hidden controls', keyboardOk);
    const focusableCount = await evaluate(`(() => {
      window.__focusTargets = [...document.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex="0"]')].filter(e => {
        if (e.disabled || e.tabIndex < 0 || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return false;
        for (let p = e.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open && !p.querySelector(':scope > summary')?.contains(e)) return false;
        return true;
      });
      window.__focusTargets[0].focus(); return window.__focusTargets.length;
    })()`);
    const reached = new Set([0]);
    for (let i = 0; i < focusableCount * 4 && reached.size < focusableCount; i++) {
      await s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      const index = await evaluate('window.__focusTargets.indexOf(document.activeElement)');
      if (index >= 0) reached.add(index);
    }
    const unreached = await evaluate(`window.__focusTargets.filter((e, i) => !${JSON.stringify([...reached])}.includes(i)).map(e => e.id || e.textContent.slice(0, 80))`);
    check('all visible controls are reachable by keyboard', reached.size === focusableCount, unreached.join(', '));
    check('timer panels are not live regions', await evaluate(`!document.querySelector('[aria-labelledby=deadline-title]').closest('[aria-live]') && !document.querySelector('[aria-labelledby=elapsed-title]').closest('[aria-live]')`));
    await clickButton('Start over');
    check('explicit reset returns to the start screen', await evaluate(`document.querySelector('#app').dataset.view === 'landing' && !document.querySelector('.response-launch').hidden && document.querySelector('main').hidden`));
    check('empty reset does not retain an unsaved-changes warning', await evaluate(`(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return !event.defaultPrevented; })()`));
    await evaluate(`document.querySelector('a[download="Breach-Guide-SOP.pdf"]').click()`);
    const guideFile = path.join(downloads, 'Breach-Guide-SOP.pdf');
    for (let t = 0; t < 5000 && !fs.existsSync(guideFile); t += 100) await sleep(100);
    check('public PDF downloads from the served path', fs.existsSync(guideFile) && fs.readFileSync(guideFile).subarray(0, 5).toString() === '%PDF-');
    if (process.env.CAPTURE_RESPONSE_UI === '1') {
      await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await evaluate(`document.querySelector('.response-dashboard').scrollIntoView({block:'start'})`);
      const shot = await s('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ROOT, 'dist', 'response-workspace.png'), Buffer.from(shot.result.data, 'base64'));
    }

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
    const unexpectedServer = serverLog.filter((l) => !/^GET \/(index\.html|assets\/[\w.-]+|favicon\.ico|brand\/breach-guide-logo\.png|guide\/Breach-Guide-SOP\.pdf)$/.test(BASE_PATH ? l.replace(`GET ${BASE_PATH}/`, "GET /") : l));
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
