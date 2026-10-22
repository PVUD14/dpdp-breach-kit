import type { Incident } from "../src/core/types";

/** Synthetic incident: no real personal data. Awareness 2026-10-20 09:00 IST. */
export function baseIncident(): Incident {
  return {
    schemaVersion: 1,
    incidentId: "INC-TEST-0001",
    awareness: {
      fiduciaryAwareAt: "2026-10-20T09:00:00+05:30",
      processorInvolved: false,
      processorAwareAt: null,
      processorNotifiedFiduciaryAt: null,
    },
    classification: {
      involvesPersonalData: true,
      eventTypes: ["accidental_disclosure"],
      compromises: { confidentiality: true, integrity: false, availability: false },
      exemptionClaims: [],
    },
    description: {
      nature: "Misconfigured storage bucket exposed export files",
      extent: "One export batch",
      occurredAt: "2026-10-19T22:15:00+05:30",
      location: "Synthetic test environment",
      likelyImpact: "Exposure of contact fields",
      consequencesForPrincipals: "Possible unsolicited contact",
      eventsCircumstancesReasons: "Access policy changed during migration",
      findingsOnResponsiblePerson: { status: "findings_recorded", summary: "Internal configuration error" },
    },
    dataCategories: ["contact_details"],
    affectedPrincipals: {
      estimatedTotal: 100,
      identified: 100,
      reachableViaUserAccount: 80,
      reachableViaRegisteredMode: 20,
      noRegisteredChannel: 0,
      registeredChannelCompromised: 0,
    },
    mitigation: {
      implemented: ["Bucket access revoked"],
      proposed: [],
      safetyMeasuresForPrincipals: ["Be alert to unexpected messages"],
      remedialMeasuresAgainstRecurrence: ["Policy-as-code check on storage ACLs"],
    },
    queryContactAvailable: true,
    noticesSent: [],
    extension: { requestedAt: null, grantedUntil: null },
  };
}

/** Every fact unrecorded: the smallest schema-valid incident. */
export function minimalIncident(): Incident {
  return {
    schemaVersion: 1,
    incidentId: "INC-TEST-MIN",
    awareness: { fiduciaryAwareAt: null, processorInvolved: null, processorAwareAt: null, processorNotifiedFiduciaryAt: null },
    classification: {
      involvesPersonalData: null,
      eventTypes: [],
      compromises: { confidentiality: null, integrity: null, availability: null },
      exemptionClaims: [],
    },
    description: {
      nature: null,
      extent: null,
      occurredAt: null,
      location: null,
      likelyImpact: null,
      consequencesForPrincipals: null,
      eventsCircumstancesReasons: null,
      findingsOnResponsiblePerson: { status: null, summary: null },
    },
    dataCategories: [],
    affectedPrincipals: {
      estimatedTotal: null,
      identified: null,
      reachableViaUserAccount: null,
      reachableViaRegisteredMode: null,
      noRegisteredChannel: null,
      registeredChannelCompromised: null,
    },
    mitigation: { implemented: null, proposed: null, safetyMeasuresForPrincipals: null, remedialMeasuresAgainstRecurrence: null },
    queryContactAvailable: null,
    noticesSent: [],
    extension: { requestedAt: null, grantedUntil: null },
  };
}

export function withChanges(mutate: (i: Incident) => void): Incident {
  const incident = baseIncident();
  mutate(incident);
  return incident;
}
