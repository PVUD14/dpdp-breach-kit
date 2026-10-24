import type { Incident } from "./types";
import type { AwarenessBasis } from "./deadline";
import { evaluateBreachChecklist } from "./checklist";
import { generateBoardReports } from "../generators/boardReports";
import { generateDataPrincipalNotice } from "../generators/dataPrincipalNotice";

export interface ResponseAction {
  id: string;
  description: string;
  ownerRole: string;
  status: "pending" | "in_progress" | "done";
  updatedAt: string;
}
export interface ResponseState {
  basis: AwarenessBasis | "";
  basisReason: string;
  containment: "unknown" | "active" | "contained";
  discoveredAt: string | null;
  containmentStartedAt: string | null;
  preparationStartedAt: string | null;
  accessActive: "unknown" | "yes" | "no";
  encryption: "unknown" | "encrypted" | "not_encrypted";
  noticeLanguages: string;
  childrenCount: number | null;
  disabilityCount: number | null;
  guardianRecipients: "unknown" | "principals" | "guardians" | "both";
  jointFiduciaries: "unknown" | "yes" | "no";
  exemptionAssessment: string;
  reviewerRole: string;
  reviewedAt: string | null;
  reviewNote: string;
  actions: ResponseAction[];
  history: { at: string; description: string }[];
  practice: { scenario: string; step: number; startedAt: string } | null;
}
export function emptyResponse(): ResponseState {
  return { basis: "", basisReason: "", containment: "unknown", discoveredAt: null, containmentStartedAt: null, preparationStartedAt: null, accessActive: "unknown", encryption: "unknown",
    noticeLanguages: "", childrenCount: null, disabilityCount: null, guardianRecipients: "unknown",
    jointFiduciaries: "unknown", exemptionAssessment: "", reviewerRole: "", reviewedAt: null, reviewNote: "",
    actions: [], history: [], practice: null };
}
export interface ResponseIssue { path: string; message: string }
export function responseAssessment(incident: Incident, now: string) {
  const r = incident.response ?? emptyResponse();
  const board = generateBoardReports(incident);
  const missing = [...new Set([...generateDataPrincipalNotice(incident).missingFields,
    ...board.initial.missingFields, ...board.detailed.missingFields])];
  const issues: ResponseIssue[] = [];
  if (r.containment === "contained" && r.accessActive === "yes") issues.push({ path: "response.containment", message: "Containment is marked complete, but unauthorised access is still active. Review both answers." });
  const total = incident.affectedPrincipals.estimatedTotal;
  if (total !== null) {
    for (const [path, count] of Object.entries(incident.affectedPrincipals)) {
      if (count !== null && count > total) issues.push({ path: `affectedPrincipals.${path}`, message: "This count exceeds the estimated total. Confirm the counts." });
    }
    if ((r.childrenCount ?? 0) > total || (r.disabilityCount ?? 0) > total) issues.push({ path: "response.childrenCount", message: "An affected group count exceeds the total." });
  }
  for (const [path, at] of Object.entries(incident.awareness)) {
    if (typeof at === "string" && Date.parse(at) > Date.parse(now)) issues.push({ path: `awareness.${path}`, message: "This awareness time is in the future relative to the incident clock." });
  }
  if (incident.description.occurredAt && incident.awareness.fiduciaryAwareAt && Date.parse(incident.description.occurredAt) > Date.parse(incident.awareness.fiduciaryAwareAt)) issues.push({ path: "description.occurredAt", message: "The incident is recorded as occurring after your organisation became aware. Check the timeline." });
  const reviewQuestions: string[] = [];
  if ((r.childrenCount ?? 0) > 0 || (r.disabilityCount ?? 0) > 0 || r.guardianRecipients !== "unknown") reviewQuestions.push("AMB-19: Confirm who should receive notices for children or persons with disability, and which channel to use. The tool does not choose recipients.");
  if (r.jointFiduciaries === "yes") reviewQuestions.push("AMB-20: Agree who prepares and sends notices when several organisations act as fiduciaries. The tool does not assign legal responsibility.");
  if (r.encryption !== "unknown") reviewQuestions.push("AMB-05: Encryption is recorded as context; it does not automatically remove the need to consider notices.");
  if (incident.classification.exemptionClaims.length) reviewQuestions.push("AMB-15: Have an adviser assess each exemption claim. A recorded assessment does not change the checklist's legal-determination outcome.");
  const decision = evaluateBreachChecklist(incident);
  const reviewed = Boolean(r.reviewerRole.trim() && r.reviewedAt && r.reviewNote.trim());
  const status = r.containment === "active" ? "Containment in progress"
    : issues.length || missing.length || !r.basis || !r.basisReason.trim() ? "Information gathering"
    : decision.intimation === "requires_legal_determination" || decision.intimation === "indeterminate" ? "Waiting for legal decision"
    : reviewed ? "Review recorded — confirm submission arrangements" : "Drafts ready for review";
  return { missing, issues, reviewQuestions, reviewed, status };
}
