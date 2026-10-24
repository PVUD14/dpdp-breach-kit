/**
 * Incident model for Rule 7 breach intimation. Mirrors src/core/incident.schema.json;
 * tests/schema.test.ts checks the two stay in step.
 *
 * Personal data is never stored here: principals are counted, not listed, and the
 * business contact for BR-DP-09 is recorded only as available or not.
 */

/** ISO-8601 date-time with an explicit offset, e.g. "2026-10-22T12:13:00+05:30" or "...Z". */
import type { ResponseState } from "./response";
export type IsoDateTime = string;

/** The event limbs of Act s.2(u). */
export type BreachEventType =
  | "unauthorised_processing"
  | "accidental_disclosure"
  | "accidental_acquisition"
  | "accidental_sharing"
  | "accidental_use"
  | "accidental_alteration"
  | "accidental_destruction"
  | "accidental_loss_of_access";

/** Act s.17(1) clauses (a)–(f). */
export type S17_1Clause = "a" | "b" | "c" | "d" | "e" | "f";

export interface ExemptionClaim {
  clause: S17_1Clause;
  basis: string;
}

export type NoticeKind = "dp_intimation" | "board_initial" | "board_detailed";

export type NoticeChannel = "user_account" | "registered_mode" | "other";

export interface NoticeRecord {
  kind: NoticeKind;
  sentAt: IsoDateTime;
  /** Data Principals reached by this notice; null for Board notices. */
  recipientCount: number | null;
  channel: NoticeChannel | null;
}

export interface Incident {
  schemaVersion: 1 | 2;
  /** Version 2 adds response preparation state; version 1 files remain readable. */
  response?: ResponseState;
  incidentId: string;
  awareness: {
    /** When the Data Fiduciary became aware (r. 7(1), 7(2)). See AMB-01. */
    fiduciaryAwareAt: IsoDateTime | null;
    processorInvolved: boolean | null;
    /** When a Data Processor acting for the DF became aware. See AMB-13. */
    processorAwareAt: IsoDateTime | null;
    processorNotifiedFiduciaryAt: IsoDateTime | null;
  };
  classification: {
    /** Act s.2(t). */
    involvesPersonalData: boolean | null;
    /** Act s.2(u) limbs; empty means not yet established. */
    eventTypes: BreachEventType[];
    compromises: {
      confidentiality: boolean | null;
      integrity: boolean | null;
      availability: boolean | null;
    };
    exemptionClaims: ExemptionClaim[];
  };
  description: {
    nature: string | null;
    extent: string | null;
    occurredAt: IsoDateTime | null;
    location: string | null;
    likelyImpact: string | null;
    consequencesForPrincipals: string | null;
    eventsCircumstancesReasons: string | null;
    findingsOnResponsiblePerson: {
      status: "none_yet" | "findings_recorded" | null;
      summary: string | null;
    };
  };
  dataCategories: string[];
  affectedPrincipals: {
    estimatedTotal: number | null;
    identified: number | null;
    reachableViaUserAccount: number | null;
    reachableViaRegisteredMode: number | null;
    noRegisteredChannel: number | null;
    registeredChannelCompromised: number | null;
  };
  /** null = not yet recorded; [] = recorded as none. */
  mitigation: {
    implemented: string[] | null;
    proposed: string[] | null;
    safetyMeasuresForPrincipals: string[] | null;
    remedialMeasuresAgainstRecurrence: string[] | null;
  };
  queryContactAvailable: boolean | null;
  noticesSent: NoticeRecord[];
  extension: {
    requestedAt: IsoDateTime | null;
    grantedUntil: IsoDateTime | null;
  };
}

/** A timestamp rendered for both machine use and Asia/Kolkata display. */
export interface InstantView {
  epochMs: number;
  /** ISO-8601 in IST, e.g. "2026-10-25T12:13:00.000+05:30". */
  iso: string;
  /** Human display, e.g. "25 Oct 2026, 12:13:00 IST". */
  display: string;
}
