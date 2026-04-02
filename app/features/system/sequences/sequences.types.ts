export type ResetPeriod = "never" | "yearly" | "monthly" | "daily";

export interface SequenceRecord {
  id: string;
  entity: string;
  prefix: string;
  digits: number;
  format: string;
  resetPeriod: ResetPeriod;
  allowManualOverride: boolean;
  preventGaps: boolean;
  active: boolean;
}

export interface SequenceAddInput {
  entity: string;
  prefix: string;
  digits: number;
  format: string;
  resetPeriod: ResetPeriod;
  allowManualOverride: boolean;
  preventGaps: boolean;
  active: boolean;
}

export type SequenceEditInput = Partial<Omit<SequenceRecord, "id">>;

/** Callable Cloud Function `generateSequenceCode` — alinear con `dp-proj-00-02-functions`. */
export interface GenerateSequenceCodeRequest {
  currentCode: string;
  entity: string;
  companyId: string;
}

export interface GenerateSequenceCodeResponse {
  code: string;
}
