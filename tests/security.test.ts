import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import css from "../src/ui/styles.css?raw";

/**
 * Static guards for the privacy and security requirements. A DOM test environment would need a
 * new dependency, so these scan the sources instead; the built bundle is scanned separately.
 */
const sources = import.meta.glob<string>("../src/**/*.ts", { query: "?raw", import: "default", eager: true });

/** Source with comments removed, so prose in comments cannot trip or hide a match. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const NETWORK_OR_STORAGE = [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket/,
  /EventSource/,
  /sendBeacon/,
  /serviceWorker/,
  /localStorage/,
  /sessionStorage/,
  /indexedDB/,
  /document\.cookie/,
  /\bimport\s*\(/,
  /https?:\/\//,
  /new\s+(Shared)?Worker\b/,
  /\.src\s*=/,
];

const UNSAFE_HTML_OR_EVAL = [
  /innerHTML/,
  /outerHTML/,
  /insertAdjacentHTML/,
  /document\.write/,
  /\beval\s*\(/,
  /new\s+Function\b/,
  /setTimeout\s*\(\s*["'`]/,
  /setInterval\s*\(\s*["'`]/,
  /createContextualFragment/,
  /DOMParser/,
];

const DOM_GLOBALS = [/\bdocument\./, /\bwindow\./, /\bnavigator\./, /\bHTMLElement\b/, /\bnew Blob\b/, /createObjectURL/];

describe("source guards", () => {
  const files = Object.entries(sources);

  it("finds the sources", () => {
    expect(files.length).toBeGreaterThan(15);
    expect(Object.keys(sources)).toContain("../src/ui/app.ts");
  });

  it("makes no network, storage, cookie or worker calls anywhere in src", () => {
    // The SVG namespace is an identifier for createElementNS, never fetched; allow exactly that string.
    const strip = (t: string) => code(t).replaceAll('"http://www.w3.org/2000/svg"', '""');
    for (const [file, text] of files) {
      for (const pattern of NETWORK_OR_STORAGE) expect(strip(text), `${file} ${pattern}`).not.toMatch(pattern);
    }
  });

  it("never renders HTML strings or evaluates code", () => {
    for (const [file, text] of files) {
      for (const pattern of UNSAFE_HTML_OR_EVAL) expect(code(text), `${file} ${pattern}`).not.toMatch(pattern);
    }
  });

  it("keeps core and generators free of DOM access", () => {
    const noStrings = (t: string) => t.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
    for (const [file, text] of files.filter(([f]) => /src\/(core|generators)\//.test(f))) {
      for (const pattern of DOM_GLOBALS) expect(noStrings(code(text)), `${file} ${pattern}`).not.toMatch(pattern);
    }
  });

  it("keeps the library entry free of UI code", () => {
    expect(sources["../src/index.ts"]).not.toMatch(/ui\//);
  });
});

describe("index.html", () => {
  const csp = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? "";
  const directives = Object.fromEntries(
    csp.split(";").map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([name, ...values]) => [name, values]),
  );

  it("declares a CSP restricted to 'self' with network fetches disabled", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
    for (const d of ["script-src", "style-src", "img-src", "font-src"]) expect(directives[d], d).toEqual(["'self'"]);
    for (const d of ["connect-src", "worker-src", "manifest-src", "frame-src", "object-src", "base-uri", "form-action"]) {
      expect(directives[d], d).toEqual(["'none'"]);
    }
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https?:|data:|blob:|\*/);
  });

  it("puts the CSP before any script or stylesheet", () => {
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script"));
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<link"));
  });

  it("has no inline scripts, inline styles, handlers or external URLs", () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBe(1);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/\bsrc="\.\//);
      expect(body?.trim()).toBe("");
    }
    expect(html).not.toMatch(/<style\b|\sstyle=|\son[a-z]+=/i);
    expect(html).not.toMatch(/https?:\/\//);
  });
});

describe("styles.css", () => {
  it("loads no fonts, images or other resources", () => {
    expect(css).not.toMatch(/@import|url\(|@font-face/);
  });
});
