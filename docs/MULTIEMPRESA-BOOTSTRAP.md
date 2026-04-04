# Arranque multiempresa y multi-tenant (Account)

## 1. Administrador de plataforma

La autorización efectiva para **roles por empresa** vive en la colección **`company-users`** (`roleIds`, marcador `__company_admin__`). El perfil **`users`** no debe usarse como fuente de verdad para permisos (puede quedar vacío tras migración).

Para **bootstrap** y migraciones administradas por Functions:

- **Legacy**: un documento en `users` (por email o por UID) puede seguir teniendo `roleIds: ["admin"]` o `role: ["admin"]` para `assertPlatformAdmin` y reglas durante la transición.
- **Tras migración**: el callable **`refreshTenantClaims`** puede fijar el claim **`platformAdmin`** leyendo el perfil `users` o el slug `"admin"` en `company-users.roleIds` de la empresa activa. Las reglas aceptan `request.auth.token.platformAdmin` o el perfil legacy.

Operaciones HTTP de migración (`migrationHttp` con `X-Migration-Key`) no usan Firebase Auth; protégelas con secreto en producción.

## 2. Empresa, cuenta (account) y datos

1. Tras **`bootstrap-accounts`** y **`backfill-account-ids`**, cada `companies/{id}` debe tener **`accountId`** (a menudo igual al id de empresa en fase inicial).
2. Crear o revisar empresas desde **Sistema → Empresas** (permisos vía roles en la empresa activa).
3. En **Sistema → Roles**, definir roles con `companyId` y permisos.
4. En **Sistema → Miembros por empresa**, asignar usuarios y **`roleIds`** (solo en **`company-users`**). Marcar **Administrador de empresa** si aplica (`__company_admin__`).

## 3. Marcador `__company_admin__`

Las reglas reconocen el literal **`__company_admin__`** dentro de **`company-users.roleIds`**. No es un documento en `roles`; sirve para autorización en reglas y callables como `resolveAuthUidByEmail`.

## 4. Migración de colecciones y roles

- Copias kebab-case vía **`migrationHttp`**: p. ej. `copy-company-users`, `copy-plans-to-trip-plans`, `copy-routes-to-trip-routes`, `copy-report-definitions`, `copy-report-runs`, `copy-resource-costs`, luego `bootstrap-accounts`, `seed-saas-defaults`, `backfill-account-ids`.
- Fusionar roles legacy del perfil **`users`** hacia **`company-users`**: operación **`merge-user-roles-to-company-users`** (por `companyId`), repetir por lotes si hace falta.
- Opcional tras validar: **`strip-legacy-user-roles`** en `users` (solo después de **`refreshTenantClaims`** para no perder `platformAdmin`).

## 5. Despliegue

Despliega Cloud Functions (incl. **`refreshTenantClaims`**, **`migrationHttp`** si aún aplica) y las reglas en [`dp-proj-00-02-web/firestore.rules`](../firestore.rules) / [`dp-proj-00-02-functions/firestore.rules`](../../dp-proj-00-02-functions/firestore.rules) según tu flujo de deploy.

Tras el backfill de **`accountId`**, despliega también los índices compuestos desde [`firestore.indexes.json`](../firestore.indexes.json) (`firebase deploy --only firestore:indexes` en el proyecto web) para que las consultas `companyId` + `accountId` (y variantes con `orderBy`) no fallen en runtime.
