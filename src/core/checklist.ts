import { interpretation, type Interpretation } from "./ambiguities";
import type { Incident } from "./types";

export type Answer = true | false | null;

export interface ChecklistItem {
  id: "s2t-personal-data" | "s2u-event-type" | "s2u-compromise" | "s17-1-exemption";
  citation: string;
  question: string;
  /** null = fact not established. */
  answer: Answer;
}

export type DefinitionOutcome = "meets_definition" | "does_not_meet_definition" | "indeterminate";

export type IntimationOutcome =
  | "required"
  | "not_required_on_facts_given"
  | "requires_legal_determination"
  | "indeterminate";

export interface BreachChecklist {
  items: ChecklistItem[];
  definition: DefinitionOutcome;
  intimation: IntimationOutcome;
  missingFacts: string[];
  interpretation: Interpretation[];
}

function anyTrue(values: Answer[]): Answer {
  if (values.some((v) => v === true)) return true;
  if (values.every((v) => v === false)) return false;
  return null;
}

/**
 * Checks the incident against the Act s.2(u) definition of "personal data breach" and the
 * s.17(1) exemptions (BR-GEN-02, BR-GEN-03). It never applies a materiality threshold and
 * never decides an exemption; both are surfaced as interpretations instead.
 */
export function evaluateBreachChecklist(incident: Incident): BreachChecklist {
  const { classification } = incident;
  const missingFacts: string[] = [];
  const notes: Interpretation[] = [];

  const personal = classification.involvesPersonalData;
  if (personal === null) missingFacts.push("classification.involvesPersonalData");

  const eventKnown: Answer = classification.eventTypes.length > 0 ? true : null;
  if (eventKnown === null) missingFacts.push("classification.eventTypes");

  const { confidentiality, integrity, availability } = classification.compromises;
  const compromise = anyTrue([confidentiality, integrity, availability]);
  if (compromise === null) missingFacts.push("classification.compromises");

  const claims = classification.exemptionClaims;

  const items: ChecklistItem[] = [
    {
      id: "s2t-personal-data",
      citation: "Act s.2(t)",
      question: "Is the data about an individual who is identifiable by or in relation to it?",
      answer: personal,
    },
    {
      id: "s2u-event-type",
      citation: "Act s.2(u)",
      question:
        "Was there unauthorised processing, or accidental disclosure, acquisition, sharing, use, " +
        "alteration, destruction or loss of access?",
      answer: eventKnown,
    },
    {
      id: "s2u-compromise",
      citation: "Act s.2(u)",
      question: "Did it compromise confidentiality, integrity or availability?",
      answer: compromise,
    },
    {
      id: "s17-1-exemption",
      citation: "Act s.17(1)",
      question: "Is an exemption under s.17(1)(a)–(f) claimed?",
      answer: claims.length > 0,
    },
  ];

  let definition: DefinitionOutcome;
  if (personal === false) {
    definition = "does_not_meet_definition";
  } else if (personal === null || eventKnown === null || compromise === null) {
    definition = "indeterminate";
  } else if (compromise === true) {
    definition = "meets_definition";
  } else if (classification.eventTypes.includes("unauthorised_processing")) {
    definition = "indeterminate";
    notes.push(
      interpretation(
        "AMB-17",
        ["BR-GEN-02"],
        "Unauthorised processing with no compromise of confidentiality, integrity or availability " +
          "is reported as indeterminate.",
        [
          "The compromise clause qualifies only the accidental limb, so unauthorised processing alone meets the definition.",
          "The compromise clause qualifies every limb, so this does not meet the definition.",
        ],
      ),
    );
  } else {
    definition = "does_not_meet_definition";
  }

  if (definition === "meets_definition") {
    notes.push(
      interpretation(
        "AMB-05",
        ["BR-GEN-02", "BR-DP-01"],
        "No risk, harm or severity threshold is applied: any breach that meets the definition is " +
          "reported as requiring intimation.",
        ["Apply a materiality filter before intimation (not supported by the text)."],
      ),
    );
  }

  let intimation: IntimationOutcome;
  if (definition === "does_not_meet_definition") {
    intimation = "not_required_on_facts_given";
  } else if (definition === "indeterminate") {
    intimation = "indeterminate";
  } else if (claims.length > 0) {
    intimation = "requires_legal_determination";
  } else {
    intimation = "required";
  }

  if (claims.length > 0) {
    notes.push(
      interpretation(
        "AMB-15",
        ["BR-GEN-03"],
        `Exemption claimed under s.17(1)(${claims.map((c) => c.clause).join("), (")}); not evaluated. ` +
          "Intimation is not reported as excused until a legal determination is recorded.",
        ["Treat the claim as valid and report intimation as not required."],
      ),
    );
  }

  return { items, definition, intimation, missingFacts, interpretation: notes };
}
