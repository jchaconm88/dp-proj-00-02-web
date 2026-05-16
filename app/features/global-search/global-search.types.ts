export type SearchEntryType = "navigation" | "quick-action" | "entity-config";

export interface SearchEntry {
  id: string;
  title: string;
  keywords: string[];
  path: string;
  icon: string;
  category: string;
  permission?: { action: string; module: string };
  type: SearchEntryType;
}

export interface EntitySearchConfig {
  id: string;
  entityId: string;
  fields: string[];
  detailPath: string;
  icon: string;
  permission: { action: string; module: string };
  collection: string;
}

export interface SearchRegistry {
  entries: SearchEntry[];
  entityConfigs: EntitySearchConfig[];
}

export interface IndexedEntry {
  id: string;
  title: string;
  titleNormalized: string;
  keywords: string[];
  keywordsNormalized: string[];
  path: string;
  icon: string;
  category: string;
  type: SearchEntryType;
}

export interface SearchIndex {
  entries: IndexedEntry[];
}

export interface EntitySearchRecord {
  id: string;
  entityId: string;
  fields: Record<string, string>;
  fieldsNormalized: Record<string, string>;
  icon: string;
  detailPath: string;
  permission: { action: string; module: string };
}

export interface EntitySearchSnapshot {
  entities: EntitySearchRecord[];
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  icon: string;
  path: string;
  type: SearchEntryType | "entity";
  permission?: { action: string; module: string };
}
