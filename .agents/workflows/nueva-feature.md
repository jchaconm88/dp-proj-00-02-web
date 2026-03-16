---
description: Crear una nueva feature completa (types + service + rutas + dialog)
---

# Workflow: Nueva Feature

Sigue estos pasos en orden para crear una feature nueva siguiendo los estándares del proyecto.

## Paso 1 — Crear el modelo y servicio en `features/`

// turbo
1. Crear las carpetas necesarias:
```powershell
New-Item -ItemType Directory -Force "app/features/{feature}"
```

2. Crear `app/features/{feature}/{feature}.types.ts` con las interfaces del dominio.

3. Crear `app/features/{feature}/{feature}.service.ts` con las funciones CRUD.
   - Importar `db` de `~/lib/firebase`
   - Importar tipos desde `./{feature}.types`
   - Nunca importar de `~/lib/firestore-*` (esos archivos ya no existen)

4. Crear `app/features/{feature}/index.ts` (barrel):
   ```typescript
   export * from "./{feature}.types";
   export * from "./{feature}.service";
   ```

## Paso 2 — Crear las rutas en `routes/{module}/{feature}/`

Nota: `{module}` debe coincidir con los grupos en `app/data/menu.json` (ej. `system`, `human-resources`, `masters`, etc.).

// turbo
5. Crear las carpetas:
```powershell
New-Item -ItemType Directory -Force "app/routes/{module}/{feature}"
```

6. Crear `app/routes/{module}/{feature}/page.tsx`:
   - Exportar `clientLoader` que llama al servicio
   - Componente recibe `{ loaderData }: Route.ComponentProps`
   - Usar `useRevalidator` para refrescar, NO `useEffect`
   - Usar `useMatch` para detectar rutas hijo (add/edit) ej: `useMatch("/{module}/{feature}/add")`
   - Si la ruta es principal usar `<DpContent>`, si es anidada o de detalle (ej. `/:id/locations`) usar `<DpContentInfo>` con prop `onBack`.
   - `DpTable` con prop `data={loaderData.items}` y `loading={isLoading}`

7. Crear `app/routes/{module}/{feature}/add.tsx` — solo `meta()` + `return null`

8. Crear `app/routes/{module}/{feature}/edit.tsx` — solo `meta()` + `return null`

9. Crear `app/routes/{module}/{feature}/{feature}-dialog.tsx`:
   - Importar `useNavigation` de `react-router`
   - `const isNavigating = navigation.state !== "idle"`
   - `<DpContentSet saving={saving || isNavigating} saveDisabled={!valid || isNavigating}>`
   - Usar `DpInput` para todos los campos (type: input, select, check, number, date)

## Paso 3 — Registrar la ruta

10. Agregar a `app/routes.ts`:
    ```typescript
    route("{module}/{feature}", "routes/{module}/{feature}/page.tsx", [
      route("add",      "routes/{module}/{feature}/add.tsx"),
      route("edit/:id", "routes/{module}/{feature}/edit.tsx"),
    ]),
    ```

## Paso 4 — Verificar

// turbo
11. Regenerar tipos y verificar TypeScript:
```powershell
npx react-router typegen; npx tsc --noEmit
```

## Notas importantes

- Los imports de servicios usan el barrel: `import { get{Feature}s } from "~/features/{feature}"`
- La autenticación está en el `clientLoader` del dashboard — no agregar guards en las páginas hijas
- Consultar `AGENTS.md` en la raíz del proyecto para la referencia completa de componentes
