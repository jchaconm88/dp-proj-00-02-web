export interface CounterRecord {
  id: string;
  sequenceId: string;
  /** Descripción denormalizada de la secuencia (ej. "trip (TRIP)"). */
  sequence: string;
  period: string;
  lastNumber: number;
  active: boolean;
}

export interface CounterAddInput {
  sequenceId: string;
  sequence: string;
  period: string;
  lastNumber: number;
  active: boolean;
}

export type CounterEditInput = Partial<Omit<CounterRecord, "id">>;
