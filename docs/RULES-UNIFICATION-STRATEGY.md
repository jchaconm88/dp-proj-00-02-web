# Estrategia de Unificacion `firestore.rules`

## Fuente única

El archivo canonico es **`dp-proj-00-02-web/firestore.rules`**. El despliegue de reglas e indices lo hace el workflow del proyecto web (`hosting,firestore:rules,firestore:indexes`). El repo de functions **no** duplica ni despliega reglas.

## Objetivo

Mantener una sola copia de verdad y cerrar acceso directo desde cliente por fases.

## Politica definida

1. La semantica de autorizacion se basa en `tokenHasPermission(module, action)`.
2. `company-users` usa control por permiso `user:edit`.
3. `users` usa control por permiso `user:view`.
4. Mantener validacion de tenant (`isMember`) y account scope (`accountId`).

## Estado actual

- Se alinearon funciones auxiliares de account scope:
  - `accountMatchesData`
  - `effectiveCompanyId`
  - `effectiveAccountMatches`
- Se alineo bloque de transporte y colecciones de soporte (`charge-types` incluido).
- Se alineo escritura de `report-definitions` para usar `accountMatchesData(request.resource.data)`.

## Cierre gradual de acceso directo (cliente)

### Fase A

- Mantener lectura directa donde aun exista fallback.
- Mover mutaciones de `users/roles/company-users` a callables.

### Fase B

- Quitar fallback frontend.
- Endurecer rules en colecciones Wave 1 (write desde cliente = false o condiciones estrictas por claims).

### Fase C

- Extender API store a dominios restantes.
- Limitar rules a lectura minima de bootstrap.

## Control operativo

- Cambios de rules: solo en `dp-proj-00-02-web/firestore.rules` y validar con el deploy web (o `firebase deploy --only firestore:rules` desde esa carpeta).
