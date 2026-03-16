/** Por cada módulo (id de colección), lista de códigos de permiso asignados al rol. */
export type RolePermissions = Record<string, string[]>;

export type RoleRecord = {
  id: string;
  name: string;
  description: string;
  /** Permisos estructurados por módulo: { moduleId: string[] } */
  permissions: RolePermissions;
  /** @deprecated Usar permissions. Campo legacy para compatibilidad. */
  permission?: string[];
  createBy?: string;
  createAt?: unknown;
  updateBy?: string;
  updateAt?: unknown;
};
