# Arquitectura y Convenciones — dp-proj-00-02-web

Este proyecto es una SPA de administración construida con **React Router v7 (framework mode)**, **Firebase/Firestore**, y **PrimeReact**. Todos los AI assistants deben seguir las convenciones documentadas aquí al generar o modificar código.

---

## 1. Estructura del Proyecto

```
app/
├── features/          ← lógica de dominio (tipos + servicios)
│   ├── {module}/      ← agrupado por módulo (system, human-resource, master, logistic, transport)
│   │   ├── {feature}/
│   │   │   ├── {feature}.types.ts    ← interfaces/types SOLO
│   │   │   ├── {feature}.service.ts  ← funciones CRUD/Firestore
│   │   │   └── index.ts              ← barrel: export * from types + service
├── routes/
│   ├── dashboard.tsx             ← layout protegido (auth en clientLoader)
│   └── {module}/                 ← agrupado por módulo según menu.json (system, human-resources, etc.)
│       └── {feature}/
│           ├── {Features}Page.tsx       ← lista principal (Plural) con clientLoader + DpTable
│           ├── {Feature}Add.tsx         ← ruta hijo (Singular), solo retorna null
│           ├── {Feature}Edit.tsx        ← ruta hijo (Singular), solo retorna null
│           └── {Feature}Dialog.tsx      ← formulario modal (Singular) con DpContentSet
└── placeholder/              ← rutas futuras sin implementar
├── lib/               ← infraestructura compartida (NO lógica de dominio)
│   ├── firebase.ts
│   ├── auth-context.tsx
│   ├── theme-context.tsx
│   ├── firestore.service.ts
│   ├── accessService.ts
│   └── get-auth-user.ts
└── routes.ts          ← tabla de rutas (config-based routing)
```

---

## 2. Datos: `clientLoader` + `useRevalidator`

**SIEMPRE usar `clientLoader` para cargar datos antes del render. NUNCA usar `useEffect` para fetching inicial.**

```tsx
// ✅ CORRECTO — datos disponibles antes del primer render
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
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
// ✅ CORRECTO — usar barrel index de la feature
import { getSequences, type SequenceRecord } from "~/features/sequences";
import { getRoles, addRole, type RoleRecord } from "~/features/roles";

// ❌ INCORRECTO — los archivos firestore-*.ts ya no existen
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
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/{module}/{feature}/add");
  const editMatch = useMatch("/{module}/{feature}/edit/:id");

  // usa DpContent + DpContentHeader + DpTable con data prop
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

## 5. Autenticación (`dashboard.tsx`)

El dashboard tiene `clientLoader` que verifica auth antes de renderizar:

```typescript
// lib/get-auth-user.ts — Firebase auth como Promise
export function getAuthUser(): Promise<User | null> { ... }

// dashboard.tsx
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
| `DpContentHeader` | Barra de herramientas (filtro, crear, eliminar, recargar) |
| `DpContentInfo` | Contenedor de página de detalle (con botón back) |
| `DpContentSet` | Dialog/modal para formularios (create/edit); usar `showLoading` / `showError` + `errorMessage` en lugar de renderizar carga o error dentro de `children` |
| `DpConfirmDialog` | Modal de confirmación antes de eliminar filas desde la lista; **no usar** `confirm()` del navegador |
| `DpTable<T>` | Tabla con selección, filtro, acciones (pasar `data` + `loading`) |
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

// DpInput — tipo unificado
<DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} />
<DpInput type="select" label="Estado" name="status" value={status} onChange={setStatus} options={opts} />
<DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />

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

### Confirmar eliminación en páginas de lista

Al implementar **Eliminar** en `*Page.tsx` (selección múltiple + `DpContentHeader`):

1. **Prohibido** `confirm()` / `window.confirm()`.
2. Usar **`DpConfirmDialog`** (`~/components/DpConfirmDialog`): estado `pendingDeleteIds` (o nombre explícito si hay varias entidades en la misma pantalla), `openDeleteConfirm`, `handleConfirmDelete`, `closeDeleteConfirm`; `severity="danger"`, `loading={saving}` mientras se borra; mensaje en español incluyendo *«Esta acción no se puede deshacer.»*
3. Ver ejemplos en páginas existentes (p. ej. `TripCostsPage.tsx`, `TripsPage.tsx`).

La regla equivalente para el agente vive en `.cursor/rules/dp-confirm-dialog.mdc` (repo raíz).

---

## 7. Reglas Generales

- **Alias `~/`** apunta a `app/` — usar siempre paths con `~/` en imports
- **`useNavigation` en todos los diálogos** — `saving={saving || isNavigating}`
- **No `useDataLoader`** — es un hook legacy, usar `clientLoader` + `useRevalidator`
- **`meta()` en todas las rutas** — incluidas las rutas hijo (add/edit)
- **TypeScript estricto** — tipar todos los parámetros y retornos de servicios
- **Rutas configuradas en `routes.ts`** — NUNCA dependas del naming del archivo para el routing
- **Páginas de Detalle / Sub-módulos** — Si la ruta es una página anidada (ej. `/:id/locations`, `/:id/costs`), utiliza OBLIGATORIAMENTE `<DpContentInfo>` (con prop `onBack`) en lugar de `<DpContent>` para proveer navegación de retroceso estándar.
- **Firestore Service** — NUNCA importar `firebase/firestore` directamente en los .service.ts. Se deben usar OBLIGATORIAMENTE las funciones expuestas en `~/lib/firestore.service.ts` (`getDocument`, `addDocument`, `updateDocument`, etc.) ya que éstas inyectan campos de auditoría automáticamente de forma segura.
- **Cloud Functions (callable)** — No usar `httpsCallable` directamente en features: usar `callHttpsFunction` y `mapCallableError` desde `~/lib/functions.service.ts`. Los DTO request/response de cada callable viven en el `*.types.ts` del feature correspondiente (mantenerlos alineados con `dp-proj-00-02-functions`).
- **Diccionarios de Constantes y Opciones** — Todas las listas estáticas de selección (ej. Tipos de Vehículo, Estados de Contrato, Monedas) DEBEN ser extraídas y exportadas desde `app/constants/status-options.ts`. Luego, inyectarlas en los `<DpTable>` (como `type="status"`) y en los formularios usarlas con `statusToSelectOptions(CONSTANTE)` para evitar arrays *hardcodeados* en los componentes.
- **Nomenclatura de Colecciones en Firestore** — El nombre de las colecciones OMITIRÁ SIEMPRE el prefijo del módulo en el que se encuentran. Solo deben llevar el nombre de su entidad representativa en kebab-case pluralizado (Ej. usar `const COLLECTION = "document-types"` en vez de `master-document-types` y `const COLLECTION = "vehicles"` en vez de `transport-vehicles`). Esto asegura el desacoplamiento Front-Back.
- **Servicio Agnóstico por Feature** — Cada feature debe exponer una única superficie en `*.service.ts` (más `*.types.ts` + `index.ts`). Evitar separar infraestructura por proveedor en archivos públicos como `*.functions.ts` o `*.api.ts` consumidos por UI. Los componentes/rutas deben importar únicamente desde el servicio de la feature; cualquier cambio de backend (Firestore, Cloud Functions, REST, etc.) se resuelve internamente en el `*.service.ts` conservando las mismas firmas públicas.
- **Confirmar borrado en UI** — En listados con eliminación masiva, usar siempre `DpConfirmDialog`; nunca `confirm()` del navegador (ver sección 6 y `.cursor/rules/dp-confirm-dialog.mdc`).
