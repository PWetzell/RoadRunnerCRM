export interface TypeaheadSource {
  id: string;
  name: string;
  color?: string;
}

export interface TypeaheadResult {
  id: string;
  value: string;
  secondaryText?: string;
  sources: TypeaheadSource[];
  confidence: number;
  matchRanges?: [number, number][];
  metadata?: Record<string, unknown>;
}
