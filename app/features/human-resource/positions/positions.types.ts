export interface PositionRecord {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface PositionAddInput {
  code: string;
  name: string;
  active: boolean;
}

export type PositionEditInput = Partial<Omit<PositionRecord, "id">>;
