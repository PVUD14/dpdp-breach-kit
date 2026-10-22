export interface SourceRow {
  file: string;
  document: string;
  identifier: string;
  url: string;
  downloaded: string;
  pages: string;
  sha256: string;
}

export interface SourcesEvaluation {
  /** 0 match; 1 mismatch or unrecorded PDF; 2 sources not downloaded. */
  code: 0 | 1 | 2;
  lines: string[];
}

export function parseSourcesTable(markdown: string): SourceRow[];

export function evaluateSources(rows: SourceRow[], present: ReadonlyMap<string, string>): SourcesEvaluation;
