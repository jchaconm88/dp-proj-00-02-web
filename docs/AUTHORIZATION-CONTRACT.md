# Contrato Unico de Autorizacion (`isGranted`)

Este documento define la semantica oficial de permisos para frontend, backend y rules.

## 1) Formato canonico

- Fuente de datos: `roles.permission` (legacy) y `roles.permissions` (mapa nuevo).
- Formato efectivo: `permissionCodes: string[]` en minúscula.
- Codigos soportados:
  - `*` -> acceso total.
  - `<module>` -> acceso total al modulo.
  - `<module>:<action>` -> permiso puntual.
  - `*:<module>` -> todas las acciones del modulo.

## 2) Semantica `isGranted`

Una operacion `{ module, action }` se concede si existe alguno de:

- `*`
- `<module>`
- `<module>:<action>`
- `*:<module>`

Implementaciones alineadas:

- Frontend: `app/lib/accessService.ts` + `app/lib/permission-codes.ts`
- Backend: `functions/src/lib/permissions/*`
- Rules: `tokenHasPermission(module, action)` en `firestore.rules`

## 3) Claims de autorizacion

`refreshTenantClaims` genera por empresa activa:

- `permissionCodes: string[]`
- `platformAdmin: boolean` (derivado de `isGranted(permissionCodes, "*", "*")`)
- `accountId: string`

Regla: el backend no debe inferir autorizacion por nombre de rol (ej. `admin`), solo por `permissionCodes`.

## 4) Orden de evaluacion recomendado

1. Sesion valida.
2. Membresia activa para `companyId`.
3. `isGranted` segun `permissionCodes`.
4. Reglas de negocio del caso de uso.

## 5) Notas de compatibilidad

- `roles.permission` se mantiene temporalmente por compatibilidad.
- Toda normalizacion de permisos debe forzar `trim().toLowerCase()`.
- Cualquier flujo nuevo debe usar este contrato, no reglas ad-hoc por nombre de rol.
