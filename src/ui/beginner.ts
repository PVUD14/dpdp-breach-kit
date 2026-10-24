import type { Incident } from "../core/types";

export const INCIDENT_CHOICES = [
  { title: "A device or file is missing", detail: "For example, a lost laptop, phone or USB drive." },
  { title: "Information went to the wrong person", detail: "For example, an email or document shared by mistake." },
  { title: "Someone may have accessed information", detail: "For example, an unfamiliar sign-in or a suspicious message." },
  { title: "Files are locked, changed or unavailable", detail: "For example, files you can no longer open." },
  { title: "Something else happened", detail: "Describe it in your own words. Technical terms are not needed." },
  { title: "I'm not sure what happened", detail: "That's okay. Start with what you noticed." },
] as const;

export const DATA_CHOICES = ["Names or contact details", "Account or payment information", "Health information", "Employee or student records", "Other information"];

/** Practical handoff prompts, not a legal determination or an inferred incident finding. */
export function beginnerSteps(incident: Incident): { title: string; body: string; role: string }[] {
  const active = incident.response?.containment;
  const noticed = incident.description.nature;
  const situationHelp: Record<string, string> = {
    "A device or file is missing": "Tell your manager or IT support what is missing and when you last had it. Ask them to check what information it held and whether connected accounts need securing.",
    "Information went to the wrong person": "Tell your manager what was shared, how it was sent and when. They can coordinate contact with the recipient and check who else may have received it.",
    "Someone may have accessed information": "Show the suspicious message or sign-in notification to the person who looks after your accounts. Ask them to check whether access was unauthorised and whether it is continuing.",
    "Files are locked, changed or unavailable": "Tell your IT support which files or services are affected and when they last worked. Ask them to investigate the cause and coordinate recovery.",
  };
  return [
    { title: active === "contained" ? "Confirm the problem has stopped" : "Get help with the immediate problem",
      body: active === "contained" ? "Ask the person handling the incident to confirm what was done and whether anything still needs attention."
        : (noticed && Object.hasOwn(situationHelp, noticed) ? situationHelp[noticed]! : "Tell your manager or the person who looks after your computers or accounts. Share what you noticed and ask them to check whether the problem is still happening."), role: "You + your manager or IT support" },
    { title: incident.awareness.fiduciaryAwareAt ? "Keep a record of what you know" : "Find out when it was first noticed",
      body: incident.awareness.fiduciaryAwareAt ? "Keep the original messages and notes in your organisation's usual secure location. Record what is confirmed and what is still uncertain. Don't put personal details into this tool."
        : "Ask when someone at your organisation first noticed the problem. If an outside company reported it, keep their message and the time it arrived. Don't guess a time.", role: "You + the person who noticed it" },
    { title: "Ask someone to review the next steps",
      body: "Share your summary with the person responsible for privacy, your manager, or a legal adviser. They can check who needs to be told and by when. You do not have to make that decision here.", role: "Your privacy lead or legal adviser" },
  ];
}

export function beginnerHandoff(incident: Incident): string {
  const lines = ["INCIDENT SUMMARY FOR INTERNAL REVIEW", "Facts recorded by the user; unknown answers need follow-up.",
    ...(incident.response?.practice ? ["FICTIONAL PRACTICE — DO NOT SEND"] : []),
    `Reference: ${incident.incidentId}`, `What was noticed: ${incident.description.nature ?? "Not known yet"}`,
    `Organisation first noticed: ${incident.awareness.fiduciaryAwareAt ?? "Not known yet"}`,
    `Outside company first noticed: ${incident.awareness.processorAwareAt ?? "Not known yet"}`,
    `Information possibly involved: ${incident.dataCategories.join(", ") || "Not known yet"}`,
    `People possibly affected: ${incident.affectedPrincipals.estimatedTotal ?? "Not known yet"}`,
    `Problem status: ${incident.response?.containment === "contained" ? "Reported as stopped; needs confirmation" : incident.response?.containment === "active" ? "Reported as still happening" : "Not known yet"}`,
    `Actions already taken: ${incident.mitigation.implemented?.join("; ") || "Not recorded yet"}`,
    "", "PEOPLE AND NEXT STEPS", ...beginnerSteps(incident).flatMap((step, i) => [`${i + 1}. ${step.title}`, step.body, `Who can help: ${step.role}`, ""]),
    "FOR THE REVIEWER: confirm the facts, whether reporting obligations apply, timing assumptions, recipients and submission arrangements. This summary does not decide those questions."];
  return lines.join("\n");
}
