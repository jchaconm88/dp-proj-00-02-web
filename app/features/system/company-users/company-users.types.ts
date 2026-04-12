export type CompanyUserRecord = {
  id: string;
  companyId: string;
  /** Denormalizado desde `companies.accountId`. */
  accountId?: string;
  /** ID de usuario (Auth UID) en la membresía. */
  userId: string;
  /** Campo denormalizado principal para mostrar usuario en UI. */
  user?: string;
  /** Denormalizado desde `users` para reducir lecturas al listar miembros. */
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  roleIds: string[];
  /** Denormalizado desde `roles.name` para evitar joins en la grilla. */
  roleNames?: string[];
  status: "active" | "inactive";
};

