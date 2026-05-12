export interface OverrideEntry {
  definitionId: string;
  definitionType: "card" | "chart";
  visible: boolean;
  order: number;
}

export interface DashboardDefinitionsResponse {
  cards: any[];
  charts: any[];
  overrides: OverrideEntry[] | null;
}
