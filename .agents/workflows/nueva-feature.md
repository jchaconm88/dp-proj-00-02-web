---
description: Crear una nueva feature completa (types + service + rutas + dialog)
---

# Workflow: Nueva feature

Pasos alineados con **`AGENTS.md`** (carpeta `dp-proj-00-02-web`). Sustituye `{module}`, `{feature}` y nombres en PascalCase según el dominio.

## Paso 1 — Modelo y servicio en `app/features/{module}/{feature}/`

1. Crear carpetas, por ejemplo:

```powershell
New-Item -ItemType Directory -Force "app/features/{module}/{feature}"
```

2. Crear **`{feature}.types.ts`** con interfaces del dominio.

3. Crear **`{feature}.service.ts`** con CRUD u operaciones de negocio.
   - Usar **`~/lib/firestore.service.ts`** (`getCollection`, `addDocument`, `updateDocument`, …) salvo que el feature ya use otro patrón aprobado (p. ej. callables vía **`~/lib/functions.service.ts`**).
   - Importar tipos desde **`./{feature}.types`**.
   - No importar desde rutas tipo **`~/lib/firestore-*`** obsoletas.

4. Crear **`index.ts`** (barrel):

```typescript
export * from "./{feature}.types";
export * from "./{feature}.service";
```

## Paso 2 — Rutas en `app/routes/{module}/{feature}/`

**`{module}`** debe coincidir con rutas y menú: `system`, `human-resource`, `master`, `logistic`, `transport`, etc. (ver **`app/data/menu.json`**).

5. Crear carpeta de rutas:

```powershell
New-Item -ItemType Directory -Force "app/routes/{module}/{feature}"
```

6. Crear **`{Features}Page.tsx`** (lista en plural, p. ej. `ClientsPage.tsx`):
   - Exportar **`clientLoader`** que llama al servicio de la feature.
   - Componente con **`{ loaderData }: Route.ComponentProps`**.
   - **`useRevalidator`** para refrescar tras mutaciones; no usar **`useEffect`** para carga inicial.
   - **`useMatch`** para rutas hijo (`add` / `edit/:id`), p. ej. `useMatch("/{module}/{ruta-de-lista}/add")` según cómo quede en **`routes.ts`**.
   - Lista: **`<DpContent>`** + **`DpContentHeader`** + **`DpTable`** con **`data={...}`** y **`loading={isLoading}`**.
   - Detalle o sub-módulo con botón atrás: **`<DpContentInfo onBack={...}>`** (ver `AGENTS.md` §8).

7. Crear **`{Feature}Add.tsx`** — `meta()` + `export default function …() { return null; }`.

8. Crear **`{Feature}Edit.tsx`** — igual, ruta hija solo para URL/modal.

9. Crear **`{Feature}Dialog.tsx`** (formulario modal):
   - **`useNavigation`**: `saving={saving || navigation.state !== "idle"}` en **`DpContentSet`**.
   - Campos con **`DpInput`** / **`DpCodeInput`** según reglas del proyecto.

Si la lista **persiste filtros en la URL**, al navegar a add/edit o sub-rutas usar **`withUrlSearch`** desde **`~/lib/url-search.ts`** (ver **`AGENTS.md`** §6 y **`.cursor/rules/dp-web-url-list-filters.mdc`** en la raíz del monorepo).

## Paso 3 — Registrar en `app/routes.ts`

10. Añadir la entrada `route(...)` con paths a los archivos anteriores (mismo patrón que el resto del archivo), por ejemplo:

```typescript
route("{module}/{ruta}", "routes/{module}/{feature}/{Features}Page.tsx", [
  route("add", "routes/{module}/{feature}/{Feature}Add.tsx"),
  route("edit/:id", "routes/{module}/{feature}/{Feature}Edit.tsx"),
]),
```

Los paths son relativos a **`app/`** (sin prefijo `app/` en el string).

## Paso 4 — Verificar

11. Desde la carpeta **`dp-proj-00-02-web`**:

```powershell
npm run typecheck
```

Equivale a typegen de React Router + **`tsc`**.

## Notas importantes

- Imports desde el barrel de la feature: **`import { getX } from "~/features/{module}/{feature}"`** (ajusta `module` y carpeta reales).
- La autenticación global está en el **`clientLoader`** de **`routes/Dashboard.tsx`**; no duplicar guards en cada página hija salvo casos excepcionales.
- Convenciones completas: **`AGENTS.md`** en esta carpeta.
- Reglas Cursor del monorepo: **`.cursor/rules/`** en **`dp-proj-00-02`** (raíz del repo que contiene `dp-proj-00-02-web`).
