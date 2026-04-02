/**
 * Marcador en `companyUsers.roleIds` reconocido por las reglas de Firestore
 * para permitir gestionar miembros de esa empresa sin ser admin de plataforma.
 * No es un ID de documento en `roles`; los permisos de menú siguen viniendo de roles reales.
 */
export const COMPANY_ADMIN_ROLE_MARKER = "__company_admin__";
