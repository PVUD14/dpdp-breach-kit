/** Optional development audit. Pass a node_modules directory containing lighthouse and
 * puppeteer-core, a local preview URL, and a Chrome executable. No app dependency is added.
 * Example: node scripts/audit-accessibility.mjs <tools/node_modules> <preview-url> <chrome>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [modules, origin, executablePath] = process.argv.slice(2);
const outputDirectory = path.resolve('artifacts/accessibility');
await fs.mkdir(outputDirectory, { recursive: true });
if (!modules || !origin || !executablePath) throw new Error('Supply tool node_modules, preview URL and Chrome path.');
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Use a local preview URL.');
const { snapshot } = await import(pathToFileURL(path.join(modules, 'lighthouse/core/index.js')).href);
const { default: puppeteer } = await import(pathToFileURL(path.join(modules, 'puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href);
const browser = await puppeteer.launch({ executablePath, headless: true });
const results = [];
try {
  const page = await browser.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(origin);
  const click = label => page.evaluate(label => [...document.querySelectorAll('button')].find(b => b.textContent === label).click(), label);
  for (const state of ['start', 'interview', 'summary', 'response', 'practice', 'mobile-dark']) {
    if (state === 'interview') await click('Start a new incident');
    if (state === 'summary') for (let step = 0; step < 6; step++) await click("I don't know yet");
    if (state === 'response') await click('For your reviewer');
    if (state === 'practice') { await click('Start practice'); await click('Open full incident form'); }
    if (state === 'mobile-dark') {
      await click('Your next steps');
      await page.setViewport({ width: 360, height: 800 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    }
    const report = await snapshot(page, { flags: { onlyCategories: ['accessibility'], formFactor: 'desktop', screenEmulation: { disabled: true } } });
    if (!report) throw new Error('No Lighthouse report returned.');
    const failures = Object.values(report.lhr.audits).filter(a => a.score !== null && a.score < 1).map(a => ({ id: a.id, title: a.title, items: a.details?.items }));
    const result = { state, score: report.lhr.categories.accessibility.score, failures };
    results.push(result);
    console.log(JSON.stringify(result));
    await fs.writeFile(path.join(outputDirectory, `accessibility-${state}.json`), JSON.stringify(report.lhr, null, 2));
    await page.screenshot({ path: path.join(outputDirectory, `response-${state}.png`), fullPage: true });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(outputDirectory, `viewport-${state}.png`) });
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(outputDirectory, 'accessibility-summary.json'), JSON.stringify(results, null, 2));
if (results.some(r => r.failures.length)) process.exitCode = 1;
