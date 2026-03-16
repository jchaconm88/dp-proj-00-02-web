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
