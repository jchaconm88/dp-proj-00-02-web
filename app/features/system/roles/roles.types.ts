/** Por cada módulo (id de colección), lista de códigos de permiso asignados al rol. */
export type RolePermissions = Record<string, string[]>;

export type RoleSource = "default" | "custom";

export type RoleRecord = {
  id: string;
  /** Empresa a la que pertenece el rol (multiempresa). */
  companyId?: string;
  /** Cuenta SaaS (denormalizado; invitaciones / admin backend). */
  accountId?: string;
  name: string;
  description: string;
  /** Permisos estructurados por módulo: { moduleId: string[] } */
  permissions: RolePermissions;
  /** @deprecated Usar permissions. Campo legacy para compatibilidad. */
  permission?: string[];
  /** Catálogo TS vs documento en `roles`. */
  source?: RoleSource;
  /** Si true, no persistir ni mutar vía API (rol default del catálogo). */
  readonly?: boolean;
  createBy?: string;
  createAt?: unknown;
  updateBy?: string;
  updateAt?: unknown;
};
