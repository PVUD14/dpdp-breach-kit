/**
 * Ambiguity and requirement identifiers from docs/requirements.md (§4, §5).
 * Every function that resolves, or declines to resolve, one of these returns an
 * `interpretation` entry so no reading of the rule text is applied silently.
 */

export type AmbiguityId =
  | "AMB-01" | "AMB-02" | "AMB-03" | "AMB-04" | "AMB-05" | "AMB-06" | "AMB-07" | "AMB-08"
  | "AMB-09" | "AMB-10" | "AMB-11" | "AMB-12" | "AMB-13" | "AMB-14" | "AMB-15" | "AMB-16"
  | "AMB-17" | "AMB-18" | "AMB-19" | "AMB-20";

export type RequirementId =
  | "BR-DP-01" | "BR-DP-02" | "BR-DP-03" | "BR-DP-04" | "BR-DP-05" | "BR-DP-06" | "BR-DP-07"
  | "BR-DP-08" | "BR-DP-09"
  | "BR-BD-01" | "BR-BD-02" | "BR-BD-03" | "BR-BD-04" | "BR-BD-05" | "BR-BD-06" | "BR-BD-07"
  | "BR-BD-08"
  | "BR-GEN-01" | "BR-GEN-02" | "BR-GEN-03" | "BR-GEN-04";

export interface Interpretation {
  ambiguityId: AmbiguityId;
  requirementIds: RequirementId[];
  /** What this function actually did with respect to the ambiguity. */
  choice: string;
  /** Other readings that were not applied. */
  alternatives: string[];
}

export function interpretation(
  ambiguityId: Interpretation["ambiguityId"],
  requirementIds: RequirementId[],
  choice: string,
  alternatives: string[],
): Interpretation {
  return { ambiguityId, requirementIds, choice, alternatives };
}
