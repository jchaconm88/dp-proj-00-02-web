export interface ModulePermission {
  code: string;
  label: string;
  description: string;
}

export interface ModuleColumn {
  order: number;
  name: string;
  header: string;
  filter: boolean;
  format?: string;
}

export interface ModuleRecord {
  id: string;
  description: string;
  permissions: ModulePermission[];
  columns: ModuleColumn[];
}

export type ModuleEditInput = Partial<Omit<ModuleRecord, "id">>;
