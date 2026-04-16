# Arquitectura y Convenciones — dp-proj-00-02-web

Este proyecto es una SPA de administración construida con **React Router v7 (framework mode)**, **Firebase/Firestore**, y **PrimeReact**. Todos los AI assistants deben seguir las convenciones documentadas aquí al generar o modificar código.

---

## 1. Estructura del Proyecto

```
app/
├── components/        ← UI reutilizable (DpContent, DpTable, DpInput, …)
├── constants/         ← p. ej. status-options, currency-format
├── data/               ← menu.json y datos estáticos de navegación
├── features/           ← lógica de dominio (tipos + servicios)
│   └── {module}/       ← system, transport, master, logistic, human-resource, reports, …
│       └── {feature}/
│           ├── {feature}.types.ts
│           ├── {feature}.service.ts
│           └── index.ts
├── lib/                ← infraestructura (NO lógica de dominio de negocio)
│   ├── firebase.ts
│   ├── firestore.service.ts
│   ├── functions.service.ts
│   ├── url-search.ts       ← withUrlSearch (filtros en URL)
│   ├── get-auth-user.ts
│   ├── accessService.ts
│   ├── permission-codes.ts
│   ├── tenant.ts
│   ├── auth-context.tsx
│   ├── theme-context.tsx
│   ├── company-context.tsx
│   ├── account-context.tsx
│   ├── loading-context.tsx
│   └── use-data-loader.ts  ← legacy; en UI nueva usar clientLoader + useRevalidator (§8)
├── routes/
│   ├── Dashboard.tsx       ← layout autenticado (clientLoader auth) + shell + <Outlet />
│   ├── placeholder/       ← stubs de plantilla; no son el menú productivo
│   └── {module}/           ← alineado con app/data/menu.json
│       └── {feature}/
│           ├── {Features}Page.tsx
│           ├── {Feature}Add.tsx
│           ├── {Feature}Edit.tsx
│           └── {Feature}Dialog.tsx
├── routes.ts
└── root.tsx
```

---

## 2. Datos: `clientLoader` + `useRevalidator`

**SIEMPRE usar `clientLoader` para cargar datos antes del render. NUNCA usar `useEffect` para fetching inicial.**

```tsx
// ✅ CORRECTO — datos disponibles antes del primer render
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  // OBLIGATORIO: esperar a que Firebase Auth hidrate antes de llamar a requireActiveCompanyId().
  // Sin esto, un hard-refresh falla con "No hay empresa activa seleccionada."
  await getAuthUser();
  const items = await getItems(); // función del service
  return { items };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  return (
    <DpTable
      data={loaderData.items}
      loading={isLoading}
      ...
    />
  );
}

// ✅ CORRECTO — refrescar después de guardar/eliminar
const handleSuccess = () => revalidator.revalidate();

// ❌ INCORRECTO — no usar useEffect para fetch inicial
useEffect(() => { fetchItems(); }, []);
```

---

## 3. Importar de `features/` y usar abstracciones de Firestore

```tsx
// ✅ CORRECTO — barrel por módulo + feature (ruta real bajo app/features/)
import { getSequences, type SequenceRecord } from "~/features/system/sequences";
import { getRoles, addRole, type RoleRecord } from "~/features/system/roles";

// ❌ INCORRECTO — los archivos firestore-*.ts en lib ya no existen
import { getSequences } from "~/lib/firestore-sequences";
```

---

## 4. Agregar una Feature Nueva

### 4.1 Paso 1 — Crear `features/{module}/{feature}/`

```typescript
// features/{module}/{feature}/{feature}.types.ts
export interface {Feature}Record {
  id: string;
  // ... campos del dominio
}
export interface {Feature}AddInput { ... }
export type {Feature}EditInput = Partial<Omit<{Feature}Record, "id">>;

// features/{module}/{feature}/{feature}.service.ts
import { getCollection, addDocument, updateDocument, deleteDocument } from "~/lib/firestore.service";
import type { {Feature}Record, {Feature}AddInput } from "./{feature}.types";

export async function get{Feature}s(): Promise<{ items: {Feature}Record[] }> { ... }
export async function add{Feature}(data: {Feature}AddInput): Promise<string> { ... }
export async function update{Feature}(id: string, data: ...): Promise<void> { ... }
export async function delete{Feature}(id: string): Promise<void> { ... }

// features/{module}/{feature}/index.ts
export * from "./{feature}.types";
export * from "./{feature}.service";
```

### 4.2 Paso 2 — Crear rutas en `routes/{module}/{feature}/`

**Convención estricta de PascalCase (Singular vs Plural):**
- **Plural:** Pantallas de listados (`ClientsPage.tsx`, `EmployeesPage.tsx`).
- **Singular:** Formularios, Rutas de Acción o Modales (`ClientAdd.tsx`, `ClientEdit.tsx`, `ClientDialog.tsx`).

Nota: `{module}` debe coincidir con los grupos definidos en `app/data/menu.json` (ej: `system`, `human-resource`, `master`, `logistic`, `transport`).

**`{Features}Page.tsx`** — lista principal:
```tsx
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { get{Feature}s, delete{Feature} } from "~/features/{module}/{feature}";
import type { Route } from "./+types/{Features}Page";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import {Feature}Dialog from "./{Feature}Dialog";

export async function clientLoader() {
  const { items } = await get{Feature}s();
  return { items };
}

export default function {Features}Page({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/{module}/{feature}/add");
  const editMatch = useMatch("/{module}/{feature}/edit/:id");
  const editId = editMatch?.params.id ?? null;

  // OBLIGATORIO: nombrar la condición con dialogVisible
  const dialogVisible = isAdd || !!editId;

  // usa DpContent + DpContentHeader + DpTable con data prop

  return (
    <DpContent ...>
      {/* tabla, filtros, etc. */}

      {/* OBLIGATORIO: && externo para desmontar el dialog al cerrar (resetea estado interno) */}
      {dialogVisible && (
        <{Feature}Dialog
          visible={dialogVisible}
          {feature}Id={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
```

**`{Feature}Add.tsx`** y **`{Feature}Edit.tsx`** — rutas hijo (solo meta + null):
```tsx
export function meta() {
  return [{ title: "Agregar {Feature}" }];
}
export default function {Feature}Add() { return null; }
```

**`{Feature}Dialog.tsx`** — formulario modal:
```tsx
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";

export default function {Feature}Dialog({ visible, ... }) {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle"; // deshabilitar durante nav

  return (
    <DpContentSet
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      ...
    />
  );
}
```

### 4.3 Paso 3 — Registrar en `routes.ts`

```typescript
route("{module}/{feature}", "routes/{module}/{feature}/{Features}Page.tsx", [
  route("add",       "routes/{module}/{feature}/{Feature}Add.tsx"),
  route("edit/:id",  "routes/{module}/{feature}/{Feature}Edit.tsx"),
]),
```

---

## 5. Autenticación (`routes/Dashboard.tsx`)

El layout del dashboard tiene `clientLoader` que verifica auth antes de renderizar:

```typescript
// lib/get-auth-user.ts — Firebase auth como Promise
export function getAuthUser(): Promise<User | null> { ... }

// routes/Dashboard.tsx
export async function clientLoader() {
  const user = await getAuthUser();
  if (!user) throw redirect("/login"); // redirect ANTES de renderizar
  const roles = await getAllRoles();
  return { roles };
}
```

**NO agregar `useEffect` de redirección en componentes de dashboard.**

---

## 6. Componentes Disponibles

| Componente | Uso |
|---|---|
| `DpContent` | Contenedor de página de lista |
| `DpContentHeader` | Barra de herramientas (filtro, crear, eliminar, recargar); admite hijos `DpContentHeaderAction` para controles extra |
| `DpContentHeaderAction` | Marcador (como `DpTColumn`): envuelve botones u otros controles que se inyectan en el header entre Actualizar y Eliminar |
| `DpContentInfo` | Contenedor de página de detalle (con botón back) |
| `DpContentSet` | Dialog/modal para formularios (create/edit); usar `showLoading` / `showError` + `errorMessage` en lugar de renderizar carga o error dentro de `children` |
| `DpConfirmDialog` | Modal de confirmación antes de eliminar filas desde la lista; **no usar** `confirm()` del navegador |
| `DpTable<T>` | Tabla con selección, filtro, acciones (pasar `data` + `loading`). **Reordenar columnas** (arrastrar cabeceras) y **filas** (icono de barras) vía PrimeReact, siempre activo. Prop `paginator={false}` para listar todo sin paginador |
| `DpInput` | Campo de formulario unificado (type: input, select, check, number, date) |

```tsx
// DpTable — modo controlado (usar siempre con clientLoader)
<DpTable<MyType>
  data={loaderData.items}          // ← prop controlada
  loading={isLoading}              // ← navigation + revalidator
  tableDef={TABLE_DEF}
  onSelectionChange={(rows) => setCount(rows.length)}
  onEdit={(row) => openDialog(row.id)}
  onDelete={handleDelete}
/>
```

### moduleTableDef — fuente única de columnas

**NUNCA** definir `TABLE_DEF` manualmente en las páginas. Usar siempre `moduleTableDef` desde `~/data/system-modules`. El catálogo `SYSTEM_MODULES_CATALOG` en ese archivo es la única fuente de verdad para las columnas de cada módulo.

```ts
import { moduleTableDef } from "~/data/system-modules";

// Sin typeOptions (columnas sin status/label)
const TABLE_DEF = moduleTableDef("position");

// Con typeOptions para columnas con format: "status" o "label"
const TABLE_DEF = moduleTableDef("vehicle", { type: VEHICLE_TYPE, status: VEHICLE_STATUS });

// Con override post-map para propiedades extra no en ModuleColumn (ej. sort)
const TABLE_DEF = moduleTableDef("trip", { status: TRIP_STATUS }).map((col) => {
  if (col.column === "scheduledStart") return { ...col, sort: true };
  return col;
});
```

`moduleTableDef(moduleId, typeOptions?)` convierte `ModuleColumn[]` del catálogo a `DpTableDefColumn[]`:
- `name` → `column`, `format` → `type` (`"status"`, `"label"`, `"bool"`, `"date"`, `"datetime"`)
- `typeOptions[col.name]` → `typeOptions` de la columna (solo para columnas con `format: "status"` o `"label"`)

```tsx
<DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} />
<DpInput type="select" label="Estado" name="status" value={status} onChange={setStatus} options={opts} />
<DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />

// DpInput type="select" — onChange (TypeScript)
// El tipo de onChange es (value: string | number) => void. Los handlers deben aceptar string | number
// y usar String(value) cuando el estado sea string (p. ej. claves de status-options).
// ❌ (next: string) => …  ✅ (v: string | number) => { const s = String(v); … }

// DpContentSet — variant "dialog" es válido para tipos; el modo diálogo se activa con visible={true}.

// DpContentSet — carga y errores centralizados (no duplicar bloques en cada diálogo)
<DpContentSet
  title="…"
  visible={visible}
  onHide={onHide}
  onCancel={onHide}
  onSave={save}
  saving={saving || isNavigating}
  saveDisabled={!valid || isNavigating}
  showLoading={loading}
  showError={!!error}
  errorMessage={error ?? ""}
>
  {/* solo campos del formulario */}
</DpContentSet>
```

### Totales en `DpTable` (`footerTotals`)

`DpTable<T>` puede mostrar una fila de footer con sumas numéricas usando la prop opcional `footerTotals`.

Es especialmente útil cuando la columna visible es un valor formateado (string) pero la suma debe hacerse sobre un campo numérico real.

Campos principales:
- `label`: texto de la etiqueta (por defecto `Totales:`).
- `sumColumns`: lista de claves `DpTableDefColumn.column` donde se mostrará la suma.
- `sumValueKey`: mapeo desde cada `colKey` en `sumColumns` hacia la clave numérica en la fila que realmente se debe sumar.
- `respectGlobalFilter`: si es `true` (por defecto), la suma respeta el filtro global aplicado en la tabla.

Ejemplo (como en `TripCostsPage`):

```tsx
<DpTable<TripCostTableRow>
  data={tableRows}
  tableDef={TABLE_DEF}
  footerTotals={{
    label: "Totales:",
    // Columna visible: amountFormatted (string con símbolo)
    // Valor numérico real para sumar: amount (number)
    sumColumns: ["amountFormatted"],
    sumValueKey: { amountFormatted: "amount" },
  }}
/>
```

### Listados con montos bajo un viaje (`trip-costs`, `trip-charges`)

Alinear **`TripCostsPage`** y **`TripChargesPage`** (y futuras listas similares bajo `/transport/trips/:id/...`):

1. **Columna Monto** en `tableDef`: clave **`amountFormatted`** (texto con moneda), no el número crudo.
2. **`useMemo`**: extender cada registro con `amountFormatted: formatAmountWithSymbol(amount, currency)` importado desde **`~/constants/currency-format`** (no duplicar `CURRENCY_SYMBOL` ni el formateador).
3. **`DpTable`**: `paginator={false}`; **`footerTotals`** con `sumColumns: ["amountFormatted"]`, **`sumValueKey: { amountFormatted: "amount" }`** y `formatSum` coherente con el formato de fila.
4. **Imports y constantes**: todo lo usado en `TABLE_DEF` o en el componente debe existir (`import` o `const` en el mismo archivo). Un `ReferenceError` al evaluar el módulo puede provocar en runtime el error opaco *«No result returned from dataStrategy»* de React Router.
5. Si se usa **`CURRENCY`** en `typeOptions` de una columna, debe importarse desde **`~/constants/status-options`**. Si la moneda solo va en `amountFormatted`, no hace falta columna Moneda.

### Preservar `location.search` al navegar (filtros en URL + rutas hijas)

Si el **`clientLoader`** o la lista leen filtros desde **`request.url` / `URLSearchParams`** y el usuario puede ir a **add**, **edit** o **sub-rutas** (detalle, paradas, etc.), hay que **propagar la misma query** en esos `navigate()` para que al volver la lista siga con los mismos filtros y la URL siga siendo compartible.

1. **`useLocation()`** → `const listQuery = location.search` (o nombre equivalente).
2. **`withUrlSearch(path, listQuery)`** desde **`~/lib/url-search.ts`**: concatena `search` al `path` si no está vacío.
3. Aplicar en **todos** los saltos relevantes: `openAdd`, `openEdit`, `handleHide`, `handleSuccess` hacia la lista, botones a sub-módulos, **`onBack`** de **`DpContentInfo`** hacia la lista padre, y diálogos que hagan `navigate` a rutas hijas.

**Referencia:** `TripsPage.tsx`, `TripDialog.tsx`, `TripAssignmentsPage.tsx`, `TripStopsPage.tsx`, `TripCostsPage.tsx`, `TripChargesPage.tsx`.

**Estado del repo:** hoy solo **viajes** (`TripsPage`) persiste filtros en la query en el loader; el resto de listados no requiere este patrón hasta que sincronicen filtros con la URL.

Regla Cursor en repo raíz: **`.cursor/rules/dp-web-url-list-filters.mdc`**.

### Confirmar eliminación en páginas de lista

Al implementar **Eliminar** en `*Page.tsx` (selección múltiple + `DpContentHeader`):

1. **Prohibido** `confirm()` / `window.confirm()`.
2. Usar **`DpConfirmDialog`** (`~/components/DpConfirmDialog`): estado `pendingDeleteIds` (o nombre explícito si hay varias entidades en la misma pantalla), `openDeleteConfirm`, `handleConfirmDelete`, `closeDeleteConfirm`; `severity="danger"`, `loading={saving}` mientras se borra; mensaje en español incluyendo *«Esta acción no se puede deshacer.»*
3. Ver ejemplos en páginas existentes (p. ej. `TripCostsPage.tsx`, `TripsPage.tsx`).

La regla equivalente para el agente vive en `.cursor/rules/dp-confirm-dialog.mdc` (repo raíz).

### `DpInput` select + `DpContentSet` (detalle)

- **`DpInput` `type="select"`:** `onChange` debe ser compatible con **`(value: string | number) => void`**; normalizar con **`String(value)`** si hace falta.
- **`DpContentSet`:** `variant` puede ser **`"panel" | "inline" | "dialog"`**; con **`visible`** el formulario se muestra en diálogo (PrimeReact `Dialog`).
- **`updateDocument` + `deleteField()`:** en `~/lib/firestore.service.ts`, **`stripUndefined`** debe preservar instancias de **`FieldValue`** (no tratarlas como objeto plano).

Regla Cursor en repo raíz: **`.cursor/rules/dp-web-dpinput-select-dpcontentset.mdc`**.

### Campos `code` (código) — `DpCodeInput`

- Para campos **`code`**, usar **`DpCodeInput`** (`~/components/DpCodeInput`) en vez de `DpInput type="input"`.
- Al guardar, resolver el código final con **`generateSequenceCode(code, entity)`** (feature `~/features/system/sequences`), y persistir el **`finalCode`**.

Regla Cursor en repo raíz: **`.cursor/rules/dp-web-code-fields.mdc`**.

### `DpContentHeaderAction` (acciones en la barra de lista)

Patrón **igual en espíritu a `DpTColumn` en `DpTable`**: componente que retorna `null`; `DpContentHeader` inspecciona `children` con `React.Children` y `child.type === DpContentHeaderAction`, y renderiza `child.props.children` en la toolbar.

**Orden visual:** filtro → refrescar → **acciones custom** → eliminar → agregar.

**Import:** `DpContentHeaderAction` desde `~/components/DpContent` (también se reexporta junto a `DpContentHeader`).

```tsx
import { DpContentHeader, DpContentHeaderAction } from "~/components/DpContent";

<DpContentHeader onLoad={…} onCreate={…} onDelete={…} …>
  <DpContentHeaderAction>
    <Button size="small" label="Extra" onClick={…} disabled={selectedCount === 0} />
  </DpContentHeaderAction>
</DpContentHeader>
```

- Cada `DpContentHeaderAction` puede envolver **cualquier `ReactNode`** (no solo botones).
- Varios `<DpContentHeaderAction>` consecutivos = varios bloques en el mismo hueco de la barra.
- **Referencia:** `TripsPage.tsx` — botón «Cambiar estado», modal con `DpContentSet` + `DpInput` select (`TRIP_STATUS` / `statusToSelectOptions`), persistencia con **`updateTripsStatus`** en `trips.service.ts`. Al abrir el modal conviene **fijar los IDs** seleccionados en estado (p. ej. `bulkTripIds`) para que un cambio posterior de la selección en la tabla no altere el lote a aplicar.

---

## 7. Estados y claves: fuente única (`app/constants/status-options.ts`)

Los asistentes y el código deben tratar este archivo como **la única fuente** de verdad para:

- Catálogos de **estado** (y similares) usados en **`DpTable`** (`type: "status"`, `typeOptions: …`) y en formularios.
- **Etiqueta + severidad** (`StatusOption`: `label`, `severity`) para chips y selects coherentes en toda la app.

### Reglas para agentes

1. **No duplicar** las mismas claves o listas en otro sitio: ni uniones TypeScript paralelas (`type X = "a" | "b"`), ni `if (s === "foo" || s === "bar")` en servicios, ni literales repetidos en componentes para el mismo dominio. Si hace falta un tipo para las claves de un mapa, **derivarlo del mapa** (`export type MiEstado = keyof typeof MI_MAPA` en `status-options.ts` y reexportar/importar donde corresponda) o importar el tipo ya exportado desde `status-options.ts`.
2. **Leer valores desconocidos** (p. ej. campo `status` en documentos Firestore): usar **`parseStatus(valor, MAPA, defaultKeyOpcional?)`**, definido junto a `statusToSelectOptions` en `status-options.ts`. Normaliza a una clave existente en `MAPA` (coincidencia exacta o sin distinguir mayúsculas/minúsculas); si no aplica, usa `defaultKey` o la primera clave del objeto.
3. **Valor por defecto en formularios / reset**: usar **`statusDefaultKey(MAPA)`** en lugar de escribir a mano una clave literal que ya existe en el mapa.
4. **Opciones de select**: **`statusToSelectOptions(MAPA)`** — no armar a mano arrays `{ label, value }` que dupliquen los mismos pares.

**Ejemplo de referencia:** `TRIP_STATUS` + `TripStatus` + `TRIP_STATUS_DEFAULT` + `parseStatus(doc.status, TRIP_STATUS)` en el servicio de viajes; selects y tabla con `TRIP_STATUS` / `statusToSelectOptions(TRIP_STATUS)`.

---

## 8. Reglas Generales

- **Alias `~/`** apunta a `app/` — usar siempre paths con `~/` en imports
- **`useNavigation` en todos los diálogos** — `saving={saving || isNavigating}`
- **No `useDataLoader`** — es un hook legacy, usar `clientLoader` + `useRevalidator`
- **`meta()` en todas las rutas** — incluidas las rutas hijo (add/edit)
- **TypeScript estricto** — tipar todos los parámetros y retornos de servicios
- **Rutas configuradas en `routes.ts`** — NUNCA dependas del naming del archivo para el routing
- **Páginas de Detalle / Sub-módulos** — Si la ruta es una página anidada (ej. `/:id/locations`, `/:id/costs`), utiliza OBLIGATORIAMENTE `<DpContentInfo>` (con prop `onBack`) en lugar de `<DpContent>` para proveer navegación de retroceso estándar.
- **Firestore Service** — NUNCA importar `firebase/firestore` directamente en los .service.ts. Se deben usar OBLIGATORIAMENTE las funciones expuestas en `~/lib/firestore.service.ts` (`getDocument`, `addDocument`, `updateDocument`, etc.) ya que éstas inyectan campos de auditoría automáticamente de forma segura.
- **Cloud Functions (callable)** — No usar `httpsCallable` directamente en features: usar `callHttpsFunction` y `mapCallableError` desde `~/lib/functions.service.ts`. Los DTO request/response de cada callable viven en el `*.types.ts` del feature correspondiente (mantenerlos alineados con `dp-proj-00-02-functions`).
- **Diccionarios de constantes y opciones** — Ver **§7. Estados y claves (`status-options.ts`)**; allí vive la política de fuente única, `parseStatus` y `statusDefaultKey`. En tablas y formularios usar el mapa correspondiente con `typeOptions` / `statusToSelectOptions(MAPA)`.
- **Columnas de tabla (`TABLE_DEF`)** — **NUNCA** definir `TABLE_DEF` manualmente en páginas. Usar siempre **`moduleTableDef(moduleId, typeOptions?)`** desde `~/data/system-modules`. El catálogo `SYSTEM_MODULES_CATALOG` es la única fuente de verdad para columnas. Ver sección 6 *«moduleTableDef»*.
- **Nomenclatura de Colecciones en Firestore** — El nombre de las colecciones OMITIRÁ SIEMPRE el prefijo del módulo en el que se encuentran. Solo deben llevar el nombre de su entidad representativa en kebab-case pluralizado (Ej. usar `const COLLECTION = "document-types"` en vez de `master-document-types` y `const COLLECTION = "vehicles"` en vez de `transport-vehicles`). Esto asegura el desacoplamiento Front-Back.
- **Servicio Agnóstico por Feature** — Cada feature debe exponer una única superficie en `*.service.ts` (más `*.types.ts` + `index.ts`). Evitar separar infraestructura por proveedor en archivos públicos como `*.functions.ts` o `*.api.ts` consumidos por UI. Los componentes/rutas deben importar únicamente desde el servicio de la feature; cualquier cambio de backend (Firestore, Cloud Functions, REST, etc.) se resuelve internamente en el `*.service.ts` conservando las mismas firmas públicas.
- **Confirmar borrado en UI** — En listados con eliminación masiva, usar siempre `DpConfirmDialog`; nunca `confirm()` del navegador (ver sección 6 y `.cursor/rules/dp-confirm-dialog.mdc`).
- **Tablas de montos en viajes** — Ver sección 6 *«Listados con montos bajo un viaje»* y regla Cursor **`.cursor/rules/dp-web-trip-money-tables.mdc`** (raíz del monorepo).
- **DpInput select / DpContentSet dialog** — Ver sección 6 *«DpInput select + DpContentSet»* y **`.cursor/rules/dp-web-dpinput-select-dpcontentset.mdc`** (raíz del monorepo).
- **Barra de lista con acciones extra** — Usar **`DpContentHeaderAction`** dentro de **`DpContentHeader`** (sección 6 *«DpContentHeaderAction»*); ejemplo **`TripsPage`** (cambio masivo de estado).
- **Filtros en URL y rutas hijas** — Si la lista escribe filtros en `location.search`, propagar la query al navegar a add/edit/sub-rutas con **`withUrlSearch`** (sección 6 *«Preservar location.search»*) y regla **`.cursor/rules/dp-web-url-list-filters.mdc`**.
- **Workflows de agente** — En **`dp-proj-00-02-web/.agents/workflows/`** hay guías resumidas (p. ej. nueva feature); **`AGENTS.md`** sigue siendo la fuente normativa.
