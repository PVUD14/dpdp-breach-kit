/**
 * DOM layer for the intake page. All content is set with textContent / attributes; no
 * innerHTML, eval, network, storage or cookies. State lives in memory only.
 */
import {
  BASIS_OPTIONS,
  GROUPS,
  REPEATS,
  USE_LABELS,
  checklistPanel,
  commencementHeadline,
  commencementPanel,
  deadlinePanel,
  draftTabs,
  elapsedPanel,
  emptyFormState,
  emptyRow,
  exportIncident,
  formToIncident,
  incidentToForm,
  labelForPath,
  parseIncidentFile,
  progressOf,
  type Basis,
  type DraftTab,
  type FieldSpec,
  type FormState,
  type PanelVM,
  type RepeatSpec,
  type RowFieldSpec,
} from "./model";
import type { Incident } from "../core/types";
import { emptyResponse } from "../core/response";
import { mountWorkspace, practiceNow } from "./workspace";
import { icon, ring, setRing, type IconName } from "./icons";
import { DATA_CHOICES, INCIDENT_CHOICES } from "./beginner";

const GROUP_ICONS: Record<string, IconName> = {
  incident: "info",
  awareness: "clock",
  classification: "shield",
  description: "file",
  data: "database",
  principals: "users",
  mitigation: "checklist",
  contact: "chat",
  extension: "hourglass",
  "classification.exemptionClaims": "scale",
  noticesSent: "send",
};

const PD_WARNING =
  "Don't type names, phone numbers, email addresses, ID numbers or any other personal details. " +
  "Use numbers (like \"250 customers\") and general descriptions instead.";

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function idFor(path: string): string {
  return `f-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
}

interface AppState {
  form: FormState;
  basis: Basis;
  incident: Incident | null;
  activeTab: number;
  /** Set when the user switches draft tab, so only that render animates the panel in. */
  tabChanged: boolean;
}

export function mountApp(root: HTMLElement): void {
  const state: AppState = { form: emptyFormState(), basis: "", incident: null, activeTab: 0, tabChanged: false };
  state.form.response = emptyResponse();
  let wizardStep = -1;
  let reviewer = false;
  let hasSession = false;
  let previousAnswers = "";
  const wizardPaths = [
    ["description.nature"], ["awareness.fiduciaryAwareAt"],
    ["dataCategories"], ["affectedPrincipals.estimatedTotal"], [], ["mitigation.implemented"]
  ];
  const wizardTitles = ["What happened?", "When did you find out?", "What data may be involved?", "How many people may be affected?", "Is the incident still active?", "What have you done so far?"];
  const workspaceRoot = el("div", { class: "response-workspace" });

  // ------------------------------------------------------------ static frame

  const status = el("p", { class: "status", role: "status", "aria-live": "polite" });
  // Commencement: one-line status in the header area; details expand on demand.
  const commencementSummary = el("summary", { class: "banner-summary" });
  const commencementBody = el("div", { class: "banner-body", "aria-labelledby": "commencement-title" });
  const commencement = el("details", { class: "banner" }, commencementSummary, commencementBody);
  const formEl = el("form", { class: "intake", "aria-labelledby": "form-title", novalidate: "" });
  const errorsBox = el("div", { class: "errors", "aria-live": "polite", tabindex: "-1" });
  const checklistBox = el("section", { class: "card panel", "aria-labelledby": "checklist-title" });
  const basisSelect = el("select", { id: "basis", "aria-describedby": "basis-help" });
  for (const o of BASIS_OPTIONS) basisSelect.append(el("option", { value: o.value }, o.label));
  const deadlineBox = el("section", { class: "card panel", "aria-labelledby": "deadline-title" });
  const elapsedBox = el("section", { class: "card panel", "aria-labelledby": "elapsed-title" });
  const draftsBox = el("section", { class: "card drafts", id: "drafts", "aria-labelledby": "drafts-title" });

  const importInput = el("input", { type: "file", id: "import-file", accept: ".json,application/json", class: "visually-hidden" });
  const importLabel = el("label", { for: "import-file", class: "button ghost" }, icon("upload"), "Open a saved file…");
  const exportButton = el("button", { type: "button", class: "secondary" }, icon("download"), "Save to file");
  const resetButton = el("button", { type: "button", class: "ghost" }, icon("refresh"), "Start over");

  // Progress: how many of the answers the checks and drafts need are filled in.
  const progressText = el("p", { class: "progress-text", "aria-live": "polite" });
  const progressFill = el("div", { class: "progress-fill" });
  const progressBar = el("div", { class: "progress-bar", "aria-hidden": "true" }, progressFill);
  const progressBox = el("div", { class: "progress" }, progressText, progressBar);

  const step = (n: string, name: IconName, title: string, text: string) =>
    el(
      "li",
      { class: "step" },
      el("span", { class: "step-icon" }, icon(name)),
      el("span", { class: "step-text" }, el("strong", {}, `${n} ${title}`), el("span", {}, text)),
    );

  root.replaceChildren(
    el(
      "header",
      { class: "app-header" },
      el(
        "div",
        { class: "app-header-inner" },
        el(
          "div",
          { class: "brand" },
          el("img", { class: "brand-logo", src: "./brand/breach-guide-logo.png", alt: "", width: "1347", height: "1553" }),
          el(
            "div",
            {},
            el("h1", { class: "visually-hidden" }, "Breach guide"),
            el("p", { class: "subtitle" }, "A little clarity when information may be at risk"),
          ),
        ),
        el("span", { class: "pill privacy-pill" }, icon("lock"), "Your answers stay on this device"),
      ),
    ),
    el(
      "div",
      { class: "page" },
      el(
        "section",
        { class: "hero", "aria-label": "How this works" },
        el(
          "div",
          { class: "hero-copy" },
          el("p", { class: "eyebrow" }, "ONE STEP AT A TIME"),
          el("h2", { class: "hero-title" }, "Something happened.", el("br"), el("em", {}, "Let's work through it.")),
          el(
            "p",
            { class: "hero-lead" },
            "Lost a device? Sent information to the wrong person? Not sure what went wrong? Start here. We'll help you organise what you know and work out who can help.",
          ),
          el(
            "ol",
            { class: "steps" },
            step("1.", "file", "Tell your story", "Everyday words are enough."),
            step("2.", "checklist", "Get your next steps", "See who can help and what to keep."),
            step("3.", "users", "Hand it over", "Take a clear summary to your reviewer."),
          ),
        ),
      ),
      el(
        "div",
        { class: "warning", role: "note", "aria-label": "Personal data warning" },
        el("span", { class: "warning-icon" }, icon("lock")),
        el(
          "p",
          {},
          el("strong", {}, "No personal details, please. "),
          PD_WARNING,
          " Nothing you type leaves this page or is saved. Use \"Save to file\" to keep your work.",
        ),
      ),
      commencement,
      el(
        "div",
        { class: "toolbar main-toolbar", role: "group", "aria-label": "Open, save or start over" },
        importInput,
        importLabel,
        exportButton,
        resetButton,
        el("a", { href: "#drafts", class: "skip-link" }, "Jump to the draft notices", icon("arrowDown")),
      ),
      status,
      workspaceRoot,
      el(
        "main",
        { class: "layout" },
        el(
          "div",
          { class: "form-column" },
          el("div", { class: "column-head" }, el("h2", { id: "form-title", tabindex: "-1" }, "1. Tell us what happened"), progressBox),
          formEl,
        ),
        el(
          "div",
          { class: "panel-column" },
          el("div", { class: "column-head" }, el("h2", {}, "2. Results and draft notices")),
          errorsBox,
          checklistBox,
          el(
            "div",
            { class: "card panel basis-card" },
            el("label", { for: "basis", class: "with-icon" }, el("span", { class: "panel-icon" }, icon("clock")), "Start the 72-hour clock from"),
            basisSelect,
            el("p", { id: "basis-help", class: "help" }, "The law doesn't say which time to use. Choose one and write down why."),
          ),
          deadlineBox,
          elapsedBox,
          draftsBox,
        ),
      ),
    ),
  );

  root.append(el("footer", { class: "app-footer" },
    el("p", {}, "Free community draft aid, not a government service or legal advice. Use fictional information for demos."),
    el("p", {}, "The app does not transmit your answers. A website host may receive standard page-request metadata. Save a JSON backup before closing."),
    el("a", { href: "./guide/Breach-Guide-SOP.pdf", download: "Breach-Guide-SOP.pdf" }, "Download the visual getting-started guide (PDF)")));
  const privacyNote = root.querySelector<HTMLElement>(".warning")!;
  const privacyExplanation = privacyNote.querySelector("p")!;
  privacyNote.replaceChildren(el("details", {}, el("summary", {}, "Keep personal details out of this guide"), privacyExplanation));
  const mainContent = root.querySelector("main")!;
  const formColumn = root.querySelector(".form-column")!;
  mainContent.hidden = true;
  const workspace = mountWorkspace(workspaceRoot, {
    incident: () => state.incident,
    response: () => state.form.response!,
    changed: () => { state.basis = state.form.response!.basis; basisSelect.value = state.basis; recompute(); },
    open: () => importInput.click(), save: saveFile, say,
    isReviewer: () => reviewer,
    hasSession: () => hasSession,
    editAnswers: () => { reviewer = false; wizardStep = 0; renderForm(); workspace.render(); document.getElementById("wizard-heading")?.focus(); },
    openReviewer: () => setReviewer(true),
    start: practice => {
      if (workspace.dirty() && !window.confirm("Start over? Unexported answers will be lost. Cancel to export first.")) return;
      hasSession = true;
      state.form = emptyFormState(); state.form.response = emptyResponse(); state.form.response.practice = practice;
      state.form.response.preparationStartedAt = practiceNow(state.form.response);
      state.form.response.history.push({ at: state.form.response.preparationStartedAt, description: practice ? "Started fictional exercise." : "Started response preparation." });
      mainContent.hidden = false;
      state.form.values["incidentId"] = `${practice ? "PRACTICE" : "INC"}-${Date.now()}`;
      state.basis = ""; basisSelect.value = ""; wizardStep = 0; reviewer = false; workspace.reset(); workspace.markDirty();
      renderForm(); workspace.renderDetails(); recompute();
      document.getElementById("wizard-heading")?.focus();
    },
    focus: path => {
      wizardStep = -1; reviewer = true; renderForm();
      const aliases: Record<string, string> = { "classification.compromises": "classification.compromises.confidentiality" };
      const resolvedPath = path.startsWith("noticesSent[") ? "noticesSent" : (aliases[path] ?? path);
      const target = document.getElementById(idFor(resolvedPath)) ??
        formEl.querySelector<HTMLElement>(path.startsWith("noticesSent") ? ".row input, .row select" : "fieldset input");
      target?.focus(); target?.scrollIntoView({ block: "center" });
    }
  });
  const modes = el("nav", { class: "mode-switcher", "aria-label": "Choose your workspace" });
  const simpleMode = el("button", { type: "button" }, "Your next steps");
  const reviewerMode = el("button", { type: "button" }, "For your reviewer");
  simpleMode.addEventListener("click", () => setReviewer(false));
  reviewerMode.addEventListener("click", () => setReviewer(true));
  modes.append(simpleMode, reviewerMode);
  root.querySelector(".page")!.insertBefore(modes, workspaceRoot);
  function setReviewer(value: boolean): void {
    reviewer = value; wizardStep = -1; renderForm(); recompute();
    if (value && !state.incident) errorsBox.focus();
    else document.getElementById(value ? "response-overview-title" : "beginner-overview-title")?.focus();
  }
  function updateMode(): void {
    const started = hasSession;
    root.dataset["view"] = !started ? "landing" : wizardStep >= 0 ? "guide" : reviewer ? "reviewer" : "summary";
    mainContent.hidden = !started || wizardStep >= 0 || !reviewer;
    commencement.hidden = !started || !reviewer || wizardStep >= 0;
    modes.hidden = !started || wizardStep >= 0;
    simpleMode.setAttribute("aria-pressed", String(!reviewer)); reviewerMode.setAttribute("aria-pressed", String(reviewer));
  }
  workspace.clockSlot.append(root.querySelector(".basis-card")!, deadlineBox, elapsedBox);
  formEl.addEventListener("input", () => { state.form.response!.reviewedAt = null; workspace.markDirty(); workspace.render(); });
  formEl.addEventListener("change", () => { state.form.response!.reviewedAt = null; workspace.markDirty(); workspace.render(); });

  // ------------------------------------------------------------ form rendering

  function sectionIcon(name: IconName | undefined): Node {
    return name ? el("span", { class: "section-icon" }, icon(name)) : document.createTextNode("");
  }

  function labelFor(id: string, text: string, needed: boolean): HTMLLabelElement {
    const label = el("label", { for: id }, text);
    if (needed) label.append(" ", el("span", { class: "req", "aria-hidden": "true" }, "*"));
    return label;
  }

  /** Help text plus small tags for "needed for" and "no personal data"; read as one description. */
  function fieldHelp(id: string, help: string, neededFor: readonly string[], freeText: boolean): HTMLElement | null {
    const tags: HTMLElement[] = [];
    if (neededFor.length) {
      tags.push(el("span", { class: "visually-hidden" }, "Needed for: "));
      for (const u of neededFor) tags.push(el("span", { class: "tag" }, USE_LABELS[u as keyof typeof USE_LABELS]));
    }
    if (freeText) tags.push(el("span", { class: "tag tag-warn" }, "No personal details"));
    if (!help && !tags.length) return null;
    const wrap = el("div", { id, class: "field-help" });
    if (help) wrap.append(el("p", { class: "help" }, help));
    if (tags.length) wrap.append(el("p", { class: "tags" }, ...tags));
    return wrap;
  }

  const WIDE_KINDS = new Set(["text", "textarea", "list", "listNullable", "enumSet"]);

  function fieldControl(f: FieldSpec): HTMLElement {
    const id = idFor(f.path);
    const helpId = `${id}-help`;
    const help = fieldHelp(helpId, f.help ?? "", f.neededFor, f.freeText === true);
    const describedBy = help ? { "aria-describedby": helpId } : {};
    const wrap = el("div", { class: WIDE_KINDS.has(f.kind) ? "field field-wide" : "field" });
    const value = state.form.values[f.path] ?? "";

    if (f.kind === "enumSet") {
      const fs = el("fieldset", { id, tabindex: "-1", class: "checks", ...describedBy }, el("legend", {}, f.label));
      if (f.neededFor.length) fs.firstElementChild?.append(" ", el("span", { class: "req", "aria-hidden": "true" }, "*"));
      for (const o of f.options ?? []) {
        const cid = `${id}-${o.value}`;
        const box = el("input", { type: "checkbox", id: cid, value: o.value });
        box.checked = (state.form.sets[f.path] ?? []).includes(o.value);
        box.addEventListener("change", () => {
          const set = new Set(state.form.sets[f.path] ?? []);
          if (box.checked) set.add(o.value);
          else set.delete(o.value);
          state.form.sets[f.path] = [...set];
          recompute();
        });
        fs.append(el("div", { class: "check" }, box, el("label", { for: cid }, o.label)));
      }
      wrap.append(fs);
      if (help) wrap.append(help);
      return wrap;
    }

    wrap.append(labelFor(id, f.label, f.neededFor.length > 0));
    let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    switch (f.kind) {
      case "tristate":
      case "select": {
        const select = el("select", { id, ...describedBy });
        for (const o of f.options ?? []) select.append(el("option", { value: o.value }, o.label));
        control = select;
        break;
      }
      case "datetime":
        control = el("input", { id, type: "datetime-local", step: "1", ...describedBy });
        break;
      case "count":
        control = el("input", { id, type: "text", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", ...describedBy });
        break;
      case "text":
        control = el("input", { id, type: "text", autocomplete: "off", spellcheck: "false", ...describedBy });
        break;
      default:
        control = el("textarea", { id, rows: f.kind === "textarea" ? "2" : "3", autocomplete: "off", ...describedBy });
    }
    control.value = value;
    control.addEventListener("input", () => {
      state.form.values[f.path] = control.value;
      recompute();
    });
    wrap.append(control);

    if (f.kind === "listNullable") {
      const nid = `${id}-none`;
      const none = el("input", { type: "checkbox", id: nid });
      none.checked = state.form.none[f.path] ?? false;
      none.addEventListener("change", () => {
        state.form.none[f.path] = none.checked;
        recompute();
      });
      wrap.append(el("div", { class: "check check-inline" }, none, el("label", { for: nid }, "None")));
    }
    if (help) wrap.append(help);
    return wrap;
  }

  function rowControl(spec: RepeatSpec, index: number, f: RowFieldSpec): HTMLElement {
    const id = idFor(`${spec.path}-${index}-${f.key}`);
    const row = state.form.rows[spec.path][index]!;
    const label = el("label", { for: id }, f.label);
    let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (f.kind === "select") {
      control = el("select", { id });
      for (const o of f.options ?? []) control.append(el("option", { value: o.value }, o.label));
    } else if (f.kind === "datetime") {
      control = el("input", { id, type: "datetime-local", step: "1" });
    } else if (f.kind === "count") {
      control = el("input", { id, type: "text", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off" });
    } else {
      control = el("textarea", { id, rows: "2", autocomplete: "off" });
    }
    control.value = row[f.key] ?? "";
    control.addEventListener("input", () => {
      row[f.key] = control.value;
      recompute();
    });
    return el("div", { class: f.kind === "textarea" ? "field field-wide" : "field" }, label, control);
  }

  function repeatGroup(spec: RepeatSpec): HTMLElement {
    const helpId = idFor(`${spec.path}-help`);
    const legend = el("legend", {}, sectionIcon(GROUP_ICONS[spec.path]), spec.legend);
    if (spec.neededFor.length) legend.append(" ", el("span", { class: "req", "aria-hidden": "true" }, "*"));
    const fs = el("fieldset", { id: idFor(spec.path), tabindex: "-1", class: "card group", "aria-describedby": helpId }, legend);
    fs.append(fieldHelp(helpId, spec.help, spec.neededFor, false)!);
    state.form.rows[spec.path].forEach((_, i) => {
      const remove = el("button", { type: "button", class: "ghost danger" }, `Remove ${spec.itemLabel.toLowerCase()} ${i + 1}`);
      remove.addEventListener("click", () => {
        state.form.rows[spec.path].splice(i, 1);
        renderForm();
        recompute();
        say(`${spec.itemLabel} ${i + 1} removed.`);
      });
      fs.append(
        el(
          "div",
          { class: "row", role: "group", "aria-label": `${spec.itemLabel} ${i + 1}` },
          el("div", { class: "row-head" }, el("p", { class: "row-title" }, `${spec.itemLabel} ${i + 1}`), remove),
          el("div", { class: "fields" }, ...spec.row.map((f) => rowControl(spec, i, f))),
        ),
      );
    });
    const add = el("button", { type: "button", class: "secondary" }, `+ Add ${spec.itemLabel.toLowerCase()}`);
    add.addEventListener("click", () => {
      state.form.rows[spec.path].push(emptyRow(spec));
      renderForm();
      recompute();
      const n = state.form.rows[spec.path].length - 1;
      document.getElementById(idFor(`${spec.path}-${n}-${spec.row[0]!.key}`))?.focus();
    });
    fs.append(add);
    return fs;
  }

  function renderForm(): void {
    formEl.setAttribute("aria-labelledby", wizardStep >= 0 ? "wizard-heading" : "form-title");
    workspace.setGuided(wizardStep >= 0);
    if (wizardStep >= 0) workspace.guidedSlot.append(formEl);
    else formColumn.append(formEl);
    updateMode();
    if (wizardStep >= 0) {
      const heading = el("h2", { id: "wizard-heading", tabindex: "-1" }, wizardTitles[wizardStep]!);
      const explanations = ["Choose the closest description. You don't need to know the technical cause.",
        "When did someone at your organisation first notice the problem? An approximate time you can confirm is helpful. Use Indian Standard Time (IST).",
        "Choose the kinds of information that might be involved. Don't enter anyone's actual details.",
        "An estimate is fine. For example, 20 customers or 5 employees. Leave this unknown if you haven't found out yet.",
        "Has someone confirmed that the immediate problem has stopped? If you don't know, that's a useful answer too.",
        "For example: “I told my manager” or “Our IT team is checking it.” Describe actions, not people's names."];
      const fields = GROUPS.flatMap(g => g.fields).filter(f => wizardPaths[wizardStep]!.includes(f.path)).map(f => fieldControl({ ...f, neededFor: [], help: "" }));
      if (wizardStep === 0) {
        const choices = el("div", { class: "incident-choices", role: "group", "aria-label": "What did you notice?" });
        for (const choice of INCIDENT_CHOICES) {
          const value = choice.title === "I'm not sure what happened" ? "" : choice.title;
          const choose = el("button", { type: "button", class: "incident-choice", "aria-pressed": String(state.form.values["description.nature"] === value) }, el("strong", {}, choice.title), el("span", {}, choice.detail));
          choose.addEventListener("click", () => {
            state.form.values["description.nature"] = value;
            const input = document.getElementById(idFor("description.nature")) as HTMLTextAreaElement | null; if (input) input.value = value;
            for (const b of choices.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === choose));
            recompute();
          }); choices.append(choose);
        }
        const optional = el("details", { class: "optional-detail" }, el("summary", {}, "Add a little detail (optional)"), ...fields);
        fields.splice(0, fields.length, choices, optional);
      }
      if (wizardStep === 2) {
        const choices = el("fieldset", { class: "data-choices" }, el("legend", { class: "visually-hidden" }, "Information that might be involved"));
        const existing = (state.form.values["dataCategories"] ?? "").split("\n").filter(Boolean);
        for (const [index, label] of [...new Set([...DATA_CHOICES, ...existing])].entries()) {
          const box = el("input", { type: "checkbox", id: `data-choice-${index}` }); box.checked = existing.includes(label);
          box.addEventListener("change", () => {
            const selected = new Set((state.form.values["dataCategories"] ?? "").split("\n").filter(Boolean));
            if (box.checked) selected.add(label); else selected.delete(label);
            state.form.values["dataCategories"] = [...selected].join("\n"); recompute();
          }); choices.append(el("label", { for: box.id, class: "choice-row" }, box, el("span", {}, label)));
        }
        fields.splice(0, fields.length, choices);
      }
      if (wizardStep === 4) {
        const active = el("select", { id: "wizard-containment" });
        for (const [value, title] of [["unknown", "Not sure yet"], ["active", "Yes — still active"], ["contained", "No — contained"]]) active.append(el("option", { value: value! }, title!));
        active.value = state.form.response!.containment;
        active.addEventListener("change", () => { state.form.response!.containment = active.value as "unknown" | "active" | "contained"; recompute(); });
        fields.push(el("div", { class: "field" }, el("label", { for: active.id }, "Is the incident still active?"), active));
      }
      const back = el("button", { type: "button", class: "secondary" }, "Back"); back.disabled = wizardStep === 0;
      back.addEventListener("click", () => { wizardStep--; renderForm(); document.getElementById("wizard-heading")?.focus(); });
      const next = el("button", { type: "button", class: "primary" }, wizardStep === 5 ? "See my response plan" : "Continue");
      const full = el("button", { type: "button", class: "ghost reviewer-shortcut" }, "Open full incident form");
      full.addEventListener("click", () => { reviewer = true; wizardStep = -1; renderForm(); workspace.renderDetails(); workspace.render(); document.getElementById("form-title")?.focus(); });
      next.addEventListener("click", () => {
        const validation = formToIncident(state.form);
        if (validation.errors.length) { recompute(); say("Correct the highlighted answer before continuing."); errorsBox.scrollIntoView({ block: "center" }); return; }
        wizardStep = wizardStep === 5 ? -1 : wizardStep + 1;
        renderForm(); workspace.renderDetails(); recompute();
        if (wizardStep >= 0) document.getElementById("wizard-heading")?.focus();
        else { document.getElementById("beginner-overview-title")?.focus(); say("Your next steps are ready. You can save a summary to share with someone who can help."); }
      });
      const unknown = el("button", { type: "button", class: "ghost unknown-answer" }, "I don't know yet");
      const saveProgress = el("button", { type: "button", class: "ghost save-progress" }, "Save and continue later");
      saveProgress.addEventListener("click", () => exportButton.click());
      unknown.addEventListener("click", () => {
        for (const path of wizardPaths[wizardStep]!) { state.form.values[path] = ""; if (path in state.form.none) state.form.none[path] = false; }
        if (wizardStep === 4) state.form.response!.containment = "unknown";
        next.click();
      });
      const progress = el("ol", { class: "interview-progress", "aria-label": "Interview progress" });
      for (let i = 0; i < 6; i++) progress.append(el("li", { class: i <= wizardStep ? "reached" : "", ...(i === wizardStep ? { "aria-current": "step" } : {}) }, el("span", { class: "visually-hidden" }, `Step ${i + 1}`)));
      formEl.replaceChildren(el("p", { class: "eyebrow" }, `STEP ${wizardStep + 1} OF 6`), progress, heading, el("p", { class: "question-help" }, explanations[wizardStep]!), errorsBox, ...fields, el("div", { class: "interview-actions" }, back, next), el("div", { class: "interview-secondary" }, unknown, saveProgress),
        el("details", { class: "reviewer-shortcut-wrap" }, el("summary", {}, "Already handling the technical or legal review?"), full));
      return;
    }
    root.querySelector(".panel-column")!.insertBefore(errorsBox, checklistBox);
    const groups: HTMLElement[] = [
      el(
        "p",
        { class: "form-intro" },
        "Fill in what you know. Leave anything you don't know yet blank — it will show as [NOT PROVIDED] in the drafts so you can add it later. Questions marked ",
        el("span", { class: "req" }, "*"),
        " are needed for the drafts.",
      ),
    ];
    for (const g of GROUPS) {
      const fs = el("fieldset", { class: "card group" }, el("legend", {}, sectionIcon(GROUP_ICONS[g.id]), g.legend));
      if (g.help) fs.append(el("p", { class: "help group-help" }, g.help));
      fs.append(el("div", { class: "fields" }, ...g.fields.map(fieldControl)));
      groups.push(fs);
      if (g.id === "classification") groups.push(repeatGroup(REPEATS[0]!));
    }
    groups.push(repeatGroup(REPEATS[1]!));
    formEl.replaceChildren(...groups);
  }

  // ------------------------------------------------------------ panels

  /** Replaces a container's children, keeping any <details> that the user had opened. */
  function replaceKeepingOpen(box: HTMLElement, ...children: Child[]): void {
    const open = [...box.querySelectorAll("details")].map((d) => d.open);
    box.replaceChildren(...children);
    box.querySelectorAll("details").forEach((d, i) => {
      if (open[i]) d.open = true;
    });
  }

  const VALUE_CLASS: Record<string, string> = { Yes: "val val-yes", No: "val val-no", "Not sure yet": "val val-unknown" };

  /** Restarts a short CSS animation on an element whose content just changed. */
  function flash(node: Element, className: string): void {
    node.classList.remove(className);
    void node.getBoundingClientRect();
    node.classList.add(className);
  }

  function panelHeading(id: string, title: string, name?: IconName): HTMLElement {
    return el("h3", { id, class: "with-icon" }, name ? el("span", { class: "panel-icon" }, icon(name)) : "", title);
  }

  /**
   * Renders a panel. When only the text changes (the once-a-second clock, or a new answer), the
   * existing elements are updated in place, so entry animations do not replay and changed
   * values can animate; a structural change rebuilds the panel.
   */
  function renderPanel(
    box: HTMLElement,
    idBase: string,
    vm: PanelVM,
    opts: { icon?: IconName; layout?: "rows" | "stacked" } = {},
  ): void {
    const layout = opts.layout ?? "rows";
    const shape = JSON.stringify([opts.icon, vm.title, vm.lines.map((l) => l.label), vm.notes, Boolean(vm.meter), layout]);
    if (box.dataset["shape"] === shape) {
      updatePanel(box, vm);
      return;
    }
    box.dataset["shape"] = shape;

    const list = el("dl", { class: layout === "rows" ? "kv" : "kv kv-stacked" });
    for (const l of vm.lines) {
      list.append(
        el("div", { class: "kv-row" }, el("dt", {}, l.label), el("dd", {}, el("span", { class: VALUE_CLASS[l.value] ?? "", "data-role": "value" }, l.value))),
      );
    }
    const summary = el("p", { class: `summary tone-${vm.tone}`, "data-role": "summary" }, vm.summary);
    const children: Child[] = [panelHeading(`${idBase}-title`, vm.title, opts.icon)];
    if (vm.meter) {
      const meterRing = ring();
      setRing(meterRing, vm.meter.fraction);
      children.push(
        el(
          "div",
          { class: "meter-row" },
          el("div", { class: "meter" }, meterRing, el("span", { class: "meter-caption", "data-role": "caption" }, vm.meter.caption)),
          summary,
        ),
      );
    } else {
      children.push(summary);
    }
    if (vm.lines.length) children.push(list);
    if (vm.notes.length) {
      children.push(
        el(
          "details",
          {},
          el("summary", {}, `Open legal questions (${vm.notes.length})`),
          el("ul", {}, ...vm.notes.map((n) => el("li", {}, n))),
        ),
      );
    }
    replaceKeepingOpen(box, ...children);
  }

  function updatePanel(box: HTMLElement, vm: PanelVM): void {
    const summary = box.querySelector('[data-role="summary"]');
    if (summary) {
      if (summary.textContent !== vm.summary) summary.textContent = vm.summary;
      summary.className = `summary tone-${vm.tone}`;
    }
    box.querySelectorAll('[data-role="value"]').forEach((node, i) => {
      const value = vm.lines[i]?.value ?? "";
      if (node.textContent === value) return;
      node.textContent = value;
      node.className = VALUE_CLASS[value] ?? "";
      if (node.className) flash(node, "pop");
    });
    const meterRing = box.querySelector<SVGElement>(".ring");
    if (meterRing && vm.meter) setRing(meterRing, vm.meter.fraction);
    const caption = box.querySelector('[data-role="caption"]');
    if (caption && vm.meter && caption.textContent !== vm.meter.caption) caption.textContent = vm.meter.caption;
  }

  function placeholderPanel(box: HTMLElement, id: string, title: string, name: IconName): void {
    delete box.dataset["shape"];
    box.replaceChildren(panelHeading(`${id}-title`, title, name), el("p", { class: "summary" }, "Fix the problems shown above to see this."));
  }

  function renderTimePanels(): void {
    const now = practiceNow(state.form.response!);
    const head = commencementHeadline(now);
    const headKey = `${head.reached}|${head.text}`;
    if (commencementSummary.dataset["key"] !== headKey) {
      commencementSummary.dataset["key"] = headKey;
      commencementSummary.replaceChildren(
        el("span", { class: "banner-icon" }, icon("calendar")),
        el("span", { class: head.reached ? "pill pill-ok" : "pill" }, head.reached ? "In force" : "Not in force yet"),
        el("span", { class: "banner-text" }, head.text),
        el("span", { class: "banner-more" }, "More"),
      );
    }
    renderPanel(commencementBody, "commencement", commencementPanel(now), { layout: "stacked" });
    if (state.incident) {
      renderPanel(deadlineBox, "deadline", deadlinePanel(state.incident, state.basis, now), { icon: "hourglass" });
      renderPanel(elapsedBox, "elapsed", elapsedPanel(state.incident, state.basis, now), { icon: "clock" });
    } else {
      placeholderPanel(deadlineBox, "deadline", "Deadline for the detailed report to the Board (72 hours)", "hourglass");
      placeholderPanel(elapsedBox, "elapsed", "Time since you found out", "clock");
    }
  }

  // ------------------------------------------------------------ drafts

  function renderDrafts(): void {
    const heading = el("h2", { id: "drafts-title", class: "with-icon" }, el("span", { class: "panel-icon" }, icon("file")), "Draft notices");
    if (!state.incident) {
      draftsBox.replaceChildren(
        heading,
        el(
          "div",
          { class: "empty-state" },
          el("span", { class: "empty-icon" }, icon("file")),
          el("p", {}, "Your draft notices will appear here. Fix the problems shown above first."),
        ),
      );
      return;
    }
    const tabs = draftTabs(state.incident);
    state.activeTab = Math.min(state.activeTab, tabs.length - 1);
    const tablist = el("div", { role: "tablist", "aria-label": "Drafts" });
    const buttons = tabs.map((t, i) => {
      const selected = i === state.activeTab;
      const b = el(
        "button",
        {
          type: "button",
          role: "tab",
          id: `tab-${t.kind}`,
          "aria-controls": `tabpanel-${t.kind}`,
          "aria-selected": String(selected),
          tabindex: selected ? "0" : "-1",
        },
        t.label,
      );
      if (t.missingFields.length) {
        b.append(
          " ",
          el("span", { class: "count", "aria-label": `${t.missingFields.length} not provided` }, String(t.missingFields.length)),
        );
      }
      b.addEventListener("click", () => selectTab(i));
      b.addEventListener("keydown", (e) => {
        const last = tabs.length - 1;
        const keys: Record<string, number> = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
        const next = keys[e.key];
        if (next !== undefined) {
          e.preventDefault();
          selectTab(next);
        }
      });
      return b;
    });
    tablist.append(...buttons);
    const panel = draftPanel(tabs[state.activeTab]!);
    if (state.tabChanged) {
      panel.classList.add("tab-enter");
      state.tabChanged = false;
    }
    replaceKeepingOpen(draftsBox, heading, tablist, panel);
  }

  function selectTab(i: number): void {
    state.tabChanged = state.activeTab !== i;
    state.activeTab = i;
    renderDrafts();
    workspace.render();
    document.querySelector<HTMLElement>(`[role="tab"][aria-selected="true"]`)?.focus();
  }

  function draftPanel(t: DraftTab): HTMLElement {
    const copy = el("button", { type: "button", class: "primary" }, icon("copy"), "Copy text");
    copy.addEventListener("click", () => {
      if (!navigator.clipboard) {
        say("Copying isn't available here. Select the text and copy it yourself.");
        return;
      }
      navigator.clipboard.writeText(t.text).then(
        () => say(`Copied the "${t.label}" draft.`),
        () => say("Couldn't copy. Select the text and copy it yourself."),
      );
    });
    const download = el("button", { type: "button", class: "secondary" }, icon("download"), "Download as a text file");
    download.addEventListener("click", () => {
      saveFile(t.filename, t.text, "text/plain;charset=utf-8");
      say(`Downloaded ${t.filename} to your computer.`);
    });
    const missing = t.missingFields.length
      ? el(
          "div",
          { class: "callout callout-warn" },
          el("p", {}, el("strong", {}, `${t.missingFields.length} thing(s) still missing`), " — they show as [NOT PROVIDED] in the draft. Fill them in on the left:"),
          el("p", { class: "tags" }, ...t.missingFields.map((f) => el("span", { class: "tag tag-warn" }, labelForPath(f.replace(/\[.*$/, ""))))),
        )
      : el("div", { class: "callout callout-ok" }, el("p", {}, "Everything this draft needs is filled in."));
    return el(
      "div",
      { role: "tabpanel", id: `tabpanel-${t.kind}`, "aria-labelledby": `tab-${t.kind}`, class: "tabpanel" },
      el("p", { class: "draft-purpose" }, t.purpose),
      el("div", { class: "toolbar" }, copy, download),
      missing,
      el(
        "p",
        { class: "help draft-note" },
        "The draft below uses the wording from the rules. Before sending: fill in every [NOT PROVIDED], put it in your own words if needed, and delete the reference notes and the checklist at the end.",
      ),
      el(
        "details",
        {},
        el("summary", {}, `Open legal questions for this draft (${t.ambiguities.length})`),
        el("ul", {}, ...t.ambiguities.map((a) => el("li", {}, `${a.id}: ${a.reason}`))),
      ),
      el("pre", { class: "draft", tabindex: "0", "aria-label": `${t.label} draft text, including the checklist to review before sending` }, t.text),
    );
  }

  // ------------------------------------------------------------ recompute

  function recompute(preserveReview = false): void {
    updateMode();
    const answers = JSON.stringify([state.form.values, state.form.sets, state.form.none, state.form.rows]);
    if (!preserveReview && previousAnswers && answers !== previousAnswers) {
      state.form.response!.reviewedAt = null;
      workspace.markDirty();
    }
    previousAnswers = answers;
    const result = formToIncident(state.form);
    state.incident = result.incident;
    if (result.errors.length) {
      errorsBox.replaceChildren(
        el("h3", {}, `Please fix ${result.errors.length} thing(s) first`),
        el(
          "ul",
          {},
          ...result.errors.map((e) => {
            const target = document.getElementById(idFor(e.path));
            const text = `${labelForPath(e.path)}: ${e.message}`;
            if (!target) return el("li", {}, text);
            const link = el("a", { href: `#${target.id}` }, text);
            link.addEventListener("click", (ev) => {
              ev.preventDefault();
              target.focus();
            });
            return el("li", {}, link);
          }),
        ),
      );
      placeholderPanel(checklistBox, "checklist", "Is this a data breach?", "shield");
    } else {
      errorsBox.replaceChildren();
      const vm = checklistPanel(state.incident!);
      const statusIcon: IconName = vm.tone === "warn" ? "alert" : vm.tone === "ok" ? "check" : "help";
      renderPanel(checklistBox, "checklist", vm, { icon: statusIcon });
    }
    renderProgress();
    renderTimePanels();
    renderDrafts();
    workspace.render();
  }

  function renderProgress(): void {
    if (!state.incident) {
      progressBox.classList.add("progress-idle");
      progressText.textContent = "Add a reference for this incident to start.";
      progressFill.style.width = "0%";
      return;
    }
    const { done, total } = progressOf(state.incident);
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressBox.classList.remove("progress-idle");
    progressBox.classList.toggle("progress-complete", done === total);
    progressText.textContent = done === total ? `All ${total} answers filled in` : `${done} of ${total} answers filled in`;
    // CSSOM property (not a style attribute), which the page's CSP allows.
    progressFill.style.width = `${pct}%`;
  }

  // ------------------------------------------------------------ files

  function saveFile(filename: string, text: string, type: string): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el("a", { href: url, download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function say(message: string): void {
    status.textContent = message;
  }

  exportButton.addEventListener("click", () => {
    if (!state.incident) {
      say("Please fix the problems shown above before saving.");
      return;
    }
    const { filename, text } = exportIncident(state.incident);
    saveFile(filename, text, "application/json");
    workspace.exported();
    say(`Saved ${filename} to your computer. Use "Open a saved file" to continue later.`);
  });

  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file) return;
    if (file.size > 1_000_000) { say("This file is too large (over 1 MB)."); return; }
    if (workspace.dirty() && !window.confirm("Replace the current incident? Export first if you want to keep unexported changes.")) return;
    file.text().then((text) => {
      const r = parseIncidentFile(text, file.size);
      if (!r.ok) {
        say(`Couldn't open this file. It may not be a file saved from this page, or it was changed. Details: ${r.errors.slice(0, 5).join("; ")}${r.errors.length > 5 ? ` (+${r.errors.length - 5} more)` : ""}`);
        return;
      }
      state.form = incidentToForm(r.incident);
      hasSession = true;
      mainContent.hidden = false;
      state.form.response ??= emptyResponse();
      state.basis = state.form.response.basis; basisSelect.value = state.basis; wizardStep = -1;
      workspace.reset();
      if (r.incident.schemaVersion === 1) workspace.markDirty();
      workspace.renderDetails();
      renderForm();
      recompute(true);
      say(`Opened ${file.name}.${r.incident.schemaVersion === 1 ? " Upgraded to version 2 in memory; your original file is unchanged. Export to save response tracking." : ""}`);
    }, () => say("Couldn't read that file."));
  });

  resetButton.addEventListener("click", () => {
    if (workspace.dirty() && !window.confirm("Clear the current incident? Unexported changes will be lost.")) return;
    hasSession = false; reviewer = false; previousAnswers = "";
    state.form = emptyFormState();
    state.form.response = emptyResponse(); state.basis = ""; basisSelect.value = ""; wizardStep = -1;
    workspace.reset(); workspace.renderDetails();
    renderForm();
    recompute();
    say("Started over with an empty form.");
  });

  basisSelect.addEventListener("change", () => {
    state.basis = basisSelect.value as Basis;
    state.form.response!.basis = state.basis; state.form.response!.reviewedAt = null;
    workspace.markDirty(); recompute();
  });

  renderForm();
  workspace.renderDetails();
  recompute();
  setInterval(renderTimePanels, 1000);
}
