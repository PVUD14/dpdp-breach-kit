/**
 * Inline SVG icons and the welcome illustration, drawn from simple shapes and built with
 * createElementNS (no markup strings, no image files, no network). All are decorative and
 * hidden from assistive technology; colours come from CSS classes so dark mode follows.
 */

const NS = "http://www.w3.org/2000/svg";

type Shape = [tag: string, attrs: Record<string, string>];

export function svg(tag: string, attrs: Record<string, string> = {}, ...children: SVGElement[]): SVGElement {
  const node = document.createElementNS(NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

const p = (d: string): Shape => ["path", { d }];
const c = (cx: number, cy: number, r: number): Shape => ["circle", { cx: String(cx), cy: String(cy), r: String(r) }];
const r = (x: number, y: number, w: number, h: number, rx = 2): Shape => [
  "rect",
  { x: String(x), y: String(y), width: String(w), height: String(h), rx: String(rx) },
];

const ICONS = {
  info: [c(12, 12, 9), p("M12 11v5"), p("M12 8h.01")],
  clock: [c(12, 12, 9), p("M12 7v5l3 2")],
  shield: [p("M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"), p("M9 12l2 2 4-4")],
  alert: [p("M12 4l9 16H3z"), p("M12 10v4"), p("M12 17h.01")],
  file: [p("M6 3h8l4 4v14H6z"), p("M14 3v4h4"), p("M9 12h6"), p("M9 16h6")],
  database: [["ellipse", { cx: "12", cy: "6", rx: "7", ry: "3" }], p("M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"), p("M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3")],
  users: [c(9, 8, 3), p("M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"), c(17, 9, 2.5), p("M16 14.2c2.9.4 5 2.8 5 5.8")],
  checklist: [r(4, 4, 16, 16, 3), p("M8 9l1.5 1.5L12 8"), p("M14 9h3"), p("M8 15l1.5 1.5L12 14"), p("M14 15h3")],
  chat: [p("M4 5h16v11H9l-5 4z"), p("M8 10h8")],
  hourglass: [p("M7 3h10"), p("M7 21h10"), p("M8 3c0 5 8 6 8 9s-8 4-8 9"), p("M16 3c0 5-8 6-8 9s8 4 8 9")],
  send: [p("M4 12l16-8-6 16-3-7z"), p("M11 13l9-9")],
  scale: [p("M12 4v16"), p("M8 20h8"), p("M5 8h14"), p("M5 8l-3 6h6z"), p("M19 8l-3 6h6z")],
  upload: [p("M12 15V4"), p("M7 9l5-5 5 5"), p("M4 15v4h16v-4")],
  download: [p("M12 4v11"), p("M7 10l5 5 5-5"), p("M4 15v4h16v-4")],
  refresh: [p("M20 11a8 8 0 1 0-2.3 5.7"), p("M20 4v7h-7")],
  copy: [r(8, 8, 12, 12, 2), p("M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3")],
  calendar: [r(4, 5, 16, 15, 2), p("M4 10h16"), p("M9 3v4"), p("M15 3v4")],
  check: [c(12, 12, 9), p("M8 12l3 3 5-6")],
  help: [c(12, 12, 9), p("M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"), p("M12 17h.01")],
  lock: [r(5, 11, 14, 10, 2), p("M8 11V8a4 4 0 0 1 8 0v3")],
  arrowDown: [p("M12 5v14"), p("M6 13l6 6 6-6")],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, className = ""): SVGElement {
  return svg(
    "svg",
    {
      viewBox: "0 0 24 24",
      class: `icon ${className}`.trim(),
      "aria-hidden": "true",
      focusable: "false",
    },
    ...ICONS[name].map(([tag, attrs]) => svg(tag, attrs)),
  );
}

/** A circular progress ring; update it with setRing(). */
export function ring(): SVGElement {
  const radius = 18;
  const length = (2 * Math.PI * radius).toFixed(2);
  return svg(
    "svg",
    { viewBox: "0 0 44 44", class: "ring", "aria-hidden": "true", focusable: "false" },
    svg("circle", { cx: "22", cy: "22", r: String(radius), class: "ring-track" }),
    svg("circle", {
      cx: "22",
      cy: "22",
      r: String(radius),
      class: "ring-fill",
      "stroke-dasharray": length,
      "stroke-dashoffset": length,
      transform: "rotate(-90 22 22)",
    }),
  );
}

export function setRing(node: SVGElement, fraction: number): void {
  const fill = node.querySelector(".ring-fill");
  if (!fill) return;
  const length = Number(fill.getAttribute("stroke-dasharray"));
  const f = Math.max(0, Math.min(1, fraction));
  fill.setAttribute("stroke-dashoffset", (length * (1 - f)).toFixed(2));
  node.classList.toggle("ring-late", f >= 1);
  node.classList.toggle("ring-near", f >= 0.75 && f < 1);
}

/** Welcome illustration: a draft document, a protective shield and a ticking clock. */
export function heroIllustration(): SVGElement {
  return svg(
    "svg",
    { viewBox: "0 0 240 170", class: "hero-art", "aria-hidden": "true", focusable: "false" },
    svg("circle", { cx: "132", cy: "88", r: "74", class: "art-blob" }),
    svg("circle", { cx: "206", cy: "30", r: "5", class: "art-dot art-dot-1" }),
    svg("circle", { cx: "40", cy: "128", r: "4", class: "art-dot art-dot-2" }),
    svg("circle", { cx: "214", cy: "136", r: "3", class: "art-dot art-dot-3" }),
    svg(
      "g",
      { class: "art-doc" },
      svg("rect", { x: "70", y: "34", width: "92", height: "116", rx: "10", class: "art-paper" }),
      svg("rect", { x: "84", y: "54", width: "54", height: "7", rx: "3.5", class: "art-line art-line-strong" }),
      svg("rect", { x: "84", y: "70", width: "64", height: "6", rx: "3", class: "art-line" }),
      svg("rect", { x: "84", y: "84", width: "46", height: "6", rx: "3", class: "art-line" }),
      svg("rect", { x: "84", y: "100", width: "60", height: "12", rx: "6", class: "art-chip" }),
      svg("rect", { x: "84", y: "120", width: "38", height: "6", rx: "3", class: "art-line" }),
    ),
    svg(
      "g",
      { class: "art-shield" },
      svg("path", { d: "M176 66l28 12v19c0 18-12 33-28 39-16-6-28-21-28-39V78z", class: "art-shield-body" }),
      svg("path", { d: "M164 100l8 8 15-17", class: "art-shield-tick" }),
    ),
    svg(
      "g",
      { class: "art-clock" },
      svg("circle", { cx: "62", cy: "46", r: "22", class: "art-clock-face" }),
      svg("path", { d: "M62 46V31", class: "art-hand art-hand-min" }),
      svg("path", { d: "M62 46l9 5", class: "art-hand art-hand-hour" }),
      svg("circle", { cx: "62", cy: "46", r: "2.5", class: "art-hub" }),
    ),
  );
}
