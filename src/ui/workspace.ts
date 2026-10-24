import type { Incident } from "../core/types";
import { responseAssessment, type ResponseState } from "../core/response";
import { nowIso, labelForPath, safeFilename, progressOf, isoToLocalIst, localIstToIso } from "./model";
import { responsePack } from "./responsePack";
import { beginnerHandoff, beginnerSteps } from "./beginner";

const scenarioFiles = import.meta.glob<string>("../../docs/tabletop/scenario-*.md", { query: "?raw", import: "default", eager: true });
export const scenarios = Object.entries(scenarioFiles).sort(([a], [b]) => a.localeCompare(b)).map(([path, text]) => ({
  id: path.split("/").pop()!, title: text.split("\n")[0]!.replace(/^# /, "").trim(),
  background: text.split("## Background")[1]?.split("## Injects")[0]?.trim() ?? "",
  injects: [...text.matchAll(/^\| (T\+[^|]+)\| ([^|]+)\|/gm)].map(m => ({
    label: m[1]!.trim(), hours: Number(/T\+(\d+)/.exec(m[1]!)?.[1] ?? 0), text: m[2]!.trim()
  }))
}));

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); n.textContent = text;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
function button(text: string, act: () => void): HTMLButtonElement {
  const b = node("button", text, { type: "button", class: "secondary" }); b.addEventListener("click", act); return b;
}
export function practiceNow(response: ResponseState): string {
  const p = response.practice;
  if (!p) return nowIso(Date.now());
  const scenario = scenarios.find(s => s.id === p.scenario);
  const hours = scenario?.injects[p.step]?.hours ?? 0;
  return nowIso(Date.parse(p.startedAt) + hours * 3_600_000);
}

export function mountWorkspace(root: HTMLElement, api: {
  incident: () => Incident | null; response: () => ResponseState; changed: () => void;
  start: (practice: ResponseState["practice"]) => void; open: () => void;
  save: (name: string, text: string, type: string) => void; say: (text: string) => void;
  focus: (path: string) => void;
  isReviewer: () => boolean; hasSession: () => boolean; editAnswers: () => void; openReviewer: () => void;
}) {
  const launcher = node("section", "", { class: "card response-launch", "aria-label": "Start your response" });
  launcher.append(node("p", "NO TECHNICAL OR LEGAL KNOWLEDGE NEEDED", { class: "eyebrow" }), node("h2", "Start with what you know."), node("p", "Six simple questions. You can say “I don't know” at any point."));
  const startButton = button("Start a new incident", () => api.start(null)); startButton.className = "primary";
  launcher.append(startButton, button("Import an existing incident", api.open));
  const select = node("select", "", { id: "practice-scenario" });
  for (const s of scenarios) select.append(node("option", s.title, { value: s.id }));
  const practiceOptions = node("details", "", { class: "practice-options" });
  practiceOptions.append(node("summary", "Just exploring? Try a fictional example."), node("label", "Choose a fictional practice scenario", { for: select.id }), select,
    button("Start practice", () => api.start({ scenario: select.value, step: 0, startedAt: nowIso(Date.now()) })));
  launcher.append(practiceOptions);
  const practice = node("section", "", { class: "card response-practice", "aria-label": "Practice exercise" });
  const dashboard = node("section", "", { class: "card response-dashboard", "aria-label": "Response overview" });
  const beginner = node("section", "", { class: "beginner-overview", "aria-label": "Your next steps" });
  const details = node("section", "", { class: "card response-details", "aria-label": "Response decisions and actions" });
  const guidedSlot = node("section", "", { class: "card guided-interview", "aria-label": "Guided incident interview" });
  const clockSlot = node("section", "", { class: "response-clocks", "aria-label": "Incident timing" });
  const backup = node("p", "Changes stay in memory. Export a backup before closing.", { class: "backup-status" });
  root.append(launcher, backup, practice, guidedSlot, beginner, dashboard, clockSlot, details);
  let guided = false;
  guidedSlot.hidden = true;
  let lastExport: string | null = null;
  let dirty = false;
  function markDirty() {
    dirty = true;
    backup.textContent = `Unexported changes. ${lastExport ? `Last export requested: ${lastExport}. ` : ""}Export a backup before closing.`;
  }
  function exported() {
    dirty = false; lastExport = nowIso(Date.now());
    backup.textContent = `Export requested at ${lastExport}. Check your downloads to confirm the file was saved.`;
  }
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  function change(description: string) {
    const r = api.response();
    r.reviewedAt = null;
    r.history.push({ at: practiceNow(r), description });
    markDirty(); api.changed();
  }
  function control(key: keyof ResponseState, label: string, options?: [string, string][], count = false, time = false) {
    const id = `f-response-${key}`;
    const wrap = node("div", "", { class: "field" });
    const input = options ? node("select", "", { id }) : node("input", "", { id, type: time ? "datetime-local" : count ? "number" : "text", ...(count || time ? { step: "1" } : {}), ...(count ? { min: "0" } : {}) });
    if (options) for (const [value, title] of options) input.append(node("option", title, { value }));
    input.value = String(api.response()[key] ?? "");
    if (time && api.response()[key]) input.value = isoToLocalIst(String(api.response()[key]));
    input.addEventListener("change", () => {
      if (!input.checkValidity()) {
        input.reportValidity();
        api.say(`Invalid value for ${label.toLowerCase()}. The previous recorded value has been restored.`);
        input.value = String(api.response()[key] ?? "");
        if (time && api.response()[key]) input.value = isoToLocalIst(String(api.response()[key]));
        return;
      }
      const r = api.response();
      if (time && input.value && !localIstToIso(input.value)) { api.say("Enter a valid date and time in IST."); return; }
      Object.assign(r, { [key]: time ? (input.value ? localIstToIso(input.value) : null) : count ? (input.value === "" ? null : Number(input.value)) : input.value });
      change(`Updated ${label.toLowerCase()}.`);
    });
    wrap.append(node("label", label, { for: id }), input); return wrap;
  }
  function renderDetails() {
    const r = api.response();
    const unknown: [string, string][] = [["unknown", "Not sure yet"], ["yes", "Yes"], ["no", "No"]];
    const fields = node("div", "", { class: "fields" });
    fields.append(
      control("containment", "Is the incident still active?", [["unknown", "Not sure yet"], ["active", "Yes — containment in progress"], ["contained", "No — contained"]]),
      control("discoveredAt", "First discovery (IST)", undefined, false, true),
      control("containmentStartedAt", "Containment started (IST)", undefined, false, true),
      control("preparationStartedAt", "Response preparation started (IST)", undefined, false, true),
      control("accessActive", "Is unauthorised access still active?", unknown),
      control("encryption", "Was the affected data encrypted?", [["unknown", "Not sure yet"], ["encrypted", "Encrypted"], ["not_encrypted", "Not encrypted"]]),
      control("noticeLanguages", "Planned notice languages"), control("childrenCount", "Affected children (count)", undefined, true),
      control("disabilityCount", "Affected persons with disability (count)", undefined, true),
      control("guardianRecipients", "Planned notice recipients", [["unknown", "Needs review"], ["principals", "Affected people"], ["guardians", "Parents / lawful guardians"], ["both", "Both"]]),
      control("jointFiduciaries", "Are several organisations responsible for this data?", unknown),
      control("exemptionAssessment", "Exemption assessment reference / outcome notes (no personal details)"),
      control("basisReason", "Why did you choose this clock start?"),
      control("reviewerRole", "Reviewer role (for example legal adviser; no name)"),
      control("reviewNote", "Review notes / evidence reference (no personal details)")
    );
    const review = button("Record review of current answers", () => {
      if (!api.incident() || !r.reviewerRole.trim() || !r.reviewNote.trim()) { api.say("Enter a reviewer role and review notes, and resolve invalid inputs first."); return; }
      r.reviewedAt = practiceNow(r); r.history.push({ at: r.reviewedAt, description: "Review of current answers recorded by role: " + r.reviewerRole });
      markDirty(); api.changed(); api.say("Review recorded. Later edits will require a fresh review.");
    });
    const tasks = node("div");
    for (const task of r.actions) {
      const row = node("div", "", { class: "response-task" });
      const status = node("select", "", { id: `task-${task.id}` });
      for (const [value, label] of [["pending", "Pending"], ["in_progress", "In progress"], ["done", "Done"]]) status.append(node("option", label!, { value: value! }));
      status.value = task.status;
      status.addEventListener("change", () => { task.status = status.value as typeof task.status; task.updatedAt = practiceNow(r); change(`Action ${task.description}: ${task.status}.`); renderDetails(); document.getElementById(status.id)?.focus(); api.say(`Action updated: ${task.description}. Status: ${task.status.replaceAll("_", " ")}.`); });
      row.append(node("label", `${task.description} — ${task.ownerRole || "Unassigned role"}`, { for: status.id }), status); tasks.append(row);
    }
    const description = node("input", "", { id: "new-action", type: "text", maxlength: "1000" });
    const owner = node("input", "", { id: "new-action-owner", type: "text", maxlength: "100" });
    const add = button("Add action", () => {
      if (!description.value.trim()) { api.say("Describe the action first."); description.focus(); return; }
      r.actions.push({ id: crypto.randomUUID(), description: description.value.trim(), ownerRole: owner.value.trim(), status: "pending", updatedAt: practiceNow(r) });
      const added = description.value.trim();
      change("Added action: " + added); renderDetails(); document.getElementById("new-action")?.focus(); api.say(`Action added: ${added}.`);
    });
    const history = node("details", "", { class: "response-history" }); history.append(node("summary", `Activity / evidence log (${r.history.length})`));
    const log = node("ol"); for (const item of r.history) log.append(node("li", `${item.at}: ${item.description}`)); history.append(log);
    details.replaceChildren(node("h2", "Response decisions and actions"), node("p", "Use counts, role names and general descriptions. Review entries and activity history are self-reported."), fields,
      review, node("h3", "Action register"), tasks, node("label", "Next action or evidence reference", { for: description.id }), description,
      node("label", "Owner role (no personal name)", { for: owner.id }), owner, add, history);
  }
  function render() {
    const r = api.response(); const incident = api.incident();
    launcher.hidden = api.hasSession();
    backup.hidden = !api.hasSession();
    const history = details.querySelector(".response-history");
    if (history) {
      const entries = node("ol");
      for (const item of r.history) entries.append(node("li", `${item.at}: ${item.description}`));
      history.replaceChildren(node("summary", `Activity / evidence log (${r.history.length})`), entries);
    }
    practice.hidden = !r.practice;
    if (r.practice) {
      const p = r.practice; const s = scenarios.find(s => s.id === p.scenario);
      if (s && s.injects[p.step]) {
        const injects = node("ol");
        for (const i of s.injects.slice(0, p.step + 1)) injects.append(node("li", `${i.label}: ${i.text}`));
        const next = button("Reveal next update", () => { p.step++; change(`Practice advanced to ${s.injects[p.step]!.label}.`); document.getElementById("practice-current-update")?.focus(); });
        next.disabled = p.step >= s.injects.length - 1;
        const background = node("details"); background.append(node("summary", "Read the scenario background"), node("p", s.background.replaceAll("*", "")));
        const revealed = node("details"); revealed.append(node("summary", "All updates revealed so far"), injects);
        practice.replaceChildren(node("h2", "FICTIONAL PRACTICE — DO NOT SEND"), node("h3", s.title), background,
          node("h4", `Current update: ${s.injects[p.step]!.label}`, { id: "practice-current-update", tabindex: "-1" }), node("p", s.injects[p.step]!.text),
          node("p", "This is a practice clock. It moves forward only when you reveal the next update. Add new facts to your answers as you learn them."), revealed, next,
          node("p", next.disabled ? "Exercise complete. Export the response pack for your debrief and unresolved questions." : "Discuss the new facts before advancing."));
      } else practice.replaceChildren(node("p", "This saved practice scenario or step is unavailable. Its recorded data remains in the exported incident."));
    }
    details.hidden = !incident || guided || !api.isReviewer();
    dashboard.hidden = !incident || guided || !api.isReviewer();
    clockSlot.hidden = !incident || guided || !api.isReviewer();
    beginner.hidden = !api.hasSession() || guided || api.isReviewer();
    if (!incident) {
      beginner.replaceChildren(node("h2", "One answer needs checking", { id: "beginner-overview-title", tabindex: "-1" }),
        node("p", "A value in the detailed record is incomplete or invalid. Your answers are still here. Return to the reviewer view to correct it."), button("Return to the answer", api.openReviewer));
      return;
    }
    const steps = node("ol", "", { class: "next-step-cards" });
    for (const [index, step] of beginnerSteps(incident).entries()) {
      const item = node("li");
      item.append(node("span", `0${index + 1}`, { class: "step-number", "aria-hidden": "true" }), node("h3", step.title), node("p", step.body), node("p", step.role, { class: "step-owner" })); steps.append(item);
    }
    const recorded = node("dl", "", { class: "beginner-facts" });
    for (const [label, value] of [["What you noticed", incident.description.nature ?? "Not known yet"], ["Information involved", incident.dataCategories.join(", ") || "Not known yet"], ["People possibly affected", String(incident.affectedPrincipals.estimatedTotal ?? "Not known yet")]]) {
      const pair = node("div"); pair.append(node("dt", label!), node("dd", value!)); recorded.append(pair);
    }
    const summarySave = button("Save summary for review", () => { api.save(`${safeFilename(incident.incidentId)}.summary.txt`, beginnerHandoff(incident), "text/plain"); api.say("Summary download requested. Share it with your manager or reviewer using your usual secure channel."); });
    summarySave.className = "primary";
    beginner.replaceChildren(node("p", "YOUR NEXT STEPS", { class: "eyebrow" }), node("h2", "You have a place to start.", { id: "beginner-overview-title", tabindex: "-1" }),
      node("p", "You don't need to solve this on your own. These are the people to involve and the information to keep."), steps,
      node("section", "", { class: "handoff-card" }));
    beginner.lastElementChild!.append(node("h3", "A simple summary to hand over"), recorded, summarySave, button("Review my answers", api.editAnswers),
      node("p", "The summary contains your answers and open questions. It does not send a report or contact anyone."));
    const reviewerLink = node("details", "", { class: "reviewer-explainer" });
    reviewerLink.append(node("summary", "Helping someone with the legal or technical review?"), node("p", "The reviewer view includes the full record, timing assumptions, draft notices and action register. DPDP is India's Digital Personal Data Protection law. Your reviewer checks whether it applies to this incident."), button("Open reviewer view", api.openReviewer));
    beginner.append(reviewerLink);
    const assessment = responseAssessment(incident, practiceNow(r));
    const progress = progressOf(incident);
    const missing = node("ul");
    for (let i = 0; i < assessment.missing.length; i++) missing.append(node("li"));
    [...missing.children].forEach((li, i) => li.append(button("Provide: " + labelForPath(assessment.missing[i]!), () => api.focus(assessment.missing[i]!))));
    const issues = node("ul"); for (const issue of assessment.issues) { const li = node("li"); li.append(button(issue.message, () => api.focus(issue.path))); issues.append(li); }
    const questions = node("ul"); for (const q of assessment.reviewQuestions) questions.append(node("li", q));
    const timeline = node("ol");
    const events = [{ at: incident.description.occurredAt, label: "Incident occurred" }, { at: incident.awareness.fiduciaryAwareAt, label: "Organisation became aware" },
      { at: r.discoveredAt, label: "First discovered" }, { at: r.containmentStartedAt, label: "Containment started" }, { at: r.preparationStartedAt, label: "Response preparation started" },
      { at: incident.awareness.processorAwareAt, label: "Vendor became aware" }, ...incident.noticesSent.map(n => ({ at: n.sentAt, label: `${n.kind} sent (recorded)` })),
      ...r.history.map(h => ({ at: h.at, label: h.description }))].filter(e => e.at !== null).sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!));
    for (const e of events) timeline.append(node("li", `${e.at} — ${e.label}`));
    const timelineDetails = node("details"); timelineDetails.append(node("summary", "Incident timeline"), timeline);
    const missingDetails = node("details"); missingDetails.append(node("summary", `${assessment.missing.length} missing facts — open to review`), missing);
    const nextSteps = node("ul");
    if (!r.basis) { const li = node("li"); li.append(button("Choose whose awareness starts the report clock", () => document.getElementById("basis")?.focus())); nextSteps.append(li); }
    if (!r.basisReason.trim()) { const li = node("li"); li.append(button("Record why you chose the clock start", () => document.getElementById("f-response-basisReason")?.focus())); nextSteps.append(li); }
    if (r.containment === "unknown" || r.containment === "active") nextSteps.append(node("li", "Confirm containment with the incident-response team and record the actions taken."));
    if (!assessment.reviewed) nextSteps.append(node("li", "Arrange review of facts, recipients, legal questions and the submission channel."));
    dashboard.replaceChildren(node("h2", assessment.status, { id: "response-overview-title", tabindex: "-1" }), node("p", `${progress.done} of ${progress.total} draft answers complete. This measures preparation, not legal compliance.`),
      node("p", `Actions: ${r.actions.filter(t => t.status === "done").length}/${r.actions.length} complete. ${assessment.reviewed ? "Review recorded for current answers." : "Human review pending."}`),
      button("Download response pack", () => { api.save(`${safeFilename(incident.incidentId)}${r.practice ? ".PRACTICE" : ""}.response-pack.txt`, responsePack(incident, practiceNow(r)), "text/plain"); api.say("Response pack download requested. Check your downloads to confirm it was saved."); }),
      node("p", "Includes all three draft notices, internal summary, timing assumptions, missing information, review checklist, and action history. Export the JSON backup separately to reopen your work."),
      node("h3", "Next actions"), nextSteps, node("h3", "What needs attention"), issues, missingDetails, node("h3", "Questions for your adviser"), questions, timelineDetails);
  }
  return { render, renderDetails, markDirty, exported, guidedSlot, clockSlot,
    setGuided: (value: boolean) => { guided = value; guidedSlot.hidden = !value; },
    dirty: () => dirty, reset: () => { lastExport = null; dirty = false; backup.textContent = "Changes stay in memory. Export a backup before closing."; } };
}
