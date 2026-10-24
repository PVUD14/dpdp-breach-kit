import type { Incident } from "../core/types";
import { responseAssessment, emptyResponse } from "../core/response";
import { draftTabs, deadlinePanel, labelForPath, progressOf } from "./model";

/** One portable plain-text review package, with a separate JSON backup for reopening. */
export function responsePack(incident: Incident, now: string): string {
  const r = incident.response ?? emptyResponse();
  const a = responseAssessment(incident, now);
  const deadline = deadlinePanel(incident, r.basis, now);
  const progress = progressOf(incident);
  return ["DRAFT RESPONSE PACK — HUMAN REVIEW REQUIRED", r.practice ? "FICTIONAL PRACTICE — DO NOT SEND" : "Incident preparation record",
    `Incident: ${incident.incidentId}`, `Generated: ${now}`, `File schema: ${incident.schemaVersion}; application: 0.2.0`,
    "", "INTERNAL SUMMARY", `What happened: ${incident.description.nature ?? "[NOT PROVIDED]"}`,
    `Affected people (estimate): ${incident.affectedPrincipals.estimatedTotal ?? "[NOT PROVIDED]"}`,
    `Data categories: ${incident.dataCategories.join(", ") || "[NOT PROVIDED]"}`,
    `Preparation status: ${a.status}`, `Answers completed: ${progress.done}/${progress.total} (not a compliance score)`,
    `Containment: ${r.containment}`, `Encryption: ${r.encryption}`, `Notice languages: ${r.noticeLanguages || "[NOT PROVIDED]"}`,
    `Children: ${r.childrenCount ?? "unknown"}; persons with disability: ${r.disabilityCount ?? "unknown"}`,
    `Planned recipients: ${r.guardianRecipients}; joint fiduciaries: ${r.jointFiduciaries}`,
    `Exemption assessment reference: ${r.exemptionAssessment || "[NOT PROVIDED]"}`,
    "", "INCIDENT TIMELINE", `Discovered: ${r.discoveredAt ?? "[NOT PROVIDED]"}`,
    `Organisation aware: ${incident.awareness.fiduciaryAwareAt ?? "[NOT PROVIDED]"}`,
    `Vendor aware: ${incident.awareness.processorAwareAt ?? "[NOT PROVIDED]"}`,
    `Containment started: ${r.containmentStartedAt ?? "[NOT PROVIDED]"}`,
    `Response preparation started: ${r.preparationStartedAt ?? "[NOT PROVIDED]"}`,
    "", "TIMING AND ASSUMPTIONS", `Clock basis: ${r.basis || "not selected"}`, `Reason: ${r.basisReason || "[NOT PROVIDED]"}`,
    deadline.summary, ...deadline.lines.map(l => `${l.label}: ${l.value}`), ...deadline.notes,
    "The 72-hour calculation concerns the detailed Board report; it is not a waiting period for other notices. Verify applicability and current requirements with an adviser.",
    "", "REVIEW CHECKLIST", ...a.missing.map(p => `[ ] Provide: ${labelForPath(p)}`),
    ...a.issues.map(i => `[ ] Resolve: ${i.message}`), ...a.reviewQuestions.map(q => `[ ] ${q}`),
    "[ ] Confirm current requirements, recipients, submission channel, and notice language with a reviewer.",
    `Reviewer role: ${r.reviewerRole || "[NOT PROVIDED]"}`, `Review recorded at: ${r.reviewedAt ?? "[NOT PROVIDED]"}`,
    `Review notes: ${r.reviewNote || "[NOT PROVIDED]"}`, "Review entries are self-reported, not proof of approval.",
    "", "ACTION REGISTER", ...r.actions.map(t => `[${t.status}] ${t.description} | Owner role: ${t.ownerRole || "unassigned"} | Updated: ${t.updatedAt}`),
    "", "ACTIVITY / EVIDENCE REFERENCES (editable record, not a tamper-proof audit trail)", ...r.history.map(h => `${h.at}: ${h.description}`),
    ...draftTabs(incident).flatMap(d => ["", "=".repeat(60), d.label.toUpperCase(), d.text]),
    ...(r.practice ? ["", "PRACTICE DEBRIEF", `Scenario: ${r.practice.scenario}; inject index: ${r.practice.step}`,
      `Unresolved facts: ${a.missing.length}; conflicting answers: ${a.issues.length}`,
      `Actions completed: ${r.actions.filter(t => t.status === "done").length}/${r.actions.length}`,
      "Discuss: What delayed decisions? Who owned each action? What would you change before a real incident?"] : [])
  ].join("\n") + "\n";
}
