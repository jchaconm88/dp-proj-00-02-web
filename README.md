# dp-proj-00-02-web — Panel de Administración

Aplicación de administración tipo back-office construida con **React Router v7** (SPA), **Firebase** (Auth + Firestore) y **PrimeReact**. Incluye gestión de usuarios, roles y módulos del sistema con layout responsivo, temas claro/oscuro y barra de progreso global.

🌐 **Demo en vivo:** [https://layout-admin.web.app](https://layout-admin.web.app)

---

## Stack tecnológico

| Tecnología | Rol |
|---|---|
| [React Router v7](https://reactrouter.com/) | Framework SPA (ssr: false) |
| [Firebase Auth](https://firebase.google.com/docs/auth) | Autenticación email/password |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | Base de datos NoSQL |
| [Firebase Hosting](https://firebase.google.com/docs/hosting) | Despliegue de archivos estáticos |
| [PrimeReact](https://primereact.org/) | Componentes UI (tablas, diálogos, forms) |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilos utilitarios |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |

---

## Requisitos previos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Firebase CLI** instalado globalmente:
  ```bash
  npm install -g firebase-tools
  ```
- Proyecto en [Firebase Console](https://console.firebase.google.com/) con **Authentication** y **Firestore** habilitados

---

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd dp-proj-00-02-web
npm install
```

### 2. Variables de entorno

Copia el archivo de ejemplo y rellena con las credenciales de tu proyecto Firebase:

```bash
cp .env.example .env
```

Edita `.env`:

```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Opcional: activar emuladores locales
# VITE_USE_FIREBASE_EMULATORS=true
```

> ⚠️ **Nunca subas `.env` al repositorio.** Ya está en `.gitignore`.

### 3. Datos mínimos en Firestore

Crea manualmente en Firestore las siguientes colecciones:

| Colección | Descripción |
|---|---|
| `roles` | Roles del sistema. Cada doc: `{ name, description, permissions: {} }` |
| `modules` | Módulos del sistema. Cada doc: `{ description, permissions: [], columns: [] }` |
| `profiles` | Perfiles de usuario. Se crea automáticamente al registrarse |

### 4. Cuenta de servicio e IAM (descarga de reportes desde Storage)

La app invoca la Cloud Callable **`getReportRunDownloadUrl`**, que genera una **URL firmada** de Cloud Storage con el Admin SDK. En **Firebase Functions v2** (Cloud Run), el runtime no tiene clave privada en memoria: el SDK usa la API **IAM Credentials** (`signBlob`). Si falta permiso, verás un error del tipo:

`Permission 'iam.serviceAccounts.signBlob' denied on resource (or it may not exist).`

**Qué hacer en Google Cloud**

1. Identifica la **cuenta de servicio de ejecución** del servicio Cloud Run que corresponde a la función `getReportRunDownloadUrl` (Consola → **Cloud Run** → servicio de la función → detalle / seguridad → correo `…@…iam.gserviceaccount.com`).
2. Concede a **esa misma cuenta** el rol **Creador de tokens de cuenta de servicio** (`roles/iam.serviceAccountTokenCreator`) **sobre el recurso de esa cuenta de servicio** (principal y recurso: la misma SA).

   En consola: **IAM y administración** → **Cuentas de servicio** → selecciona esa SA → **Permisos** → **Conceder acceso**: miembro = el correo de la SA, rol = **Service Account Token Creator**.

   Equivalente con `gcloud` (sustituye proyecto y email):

   ```bash
   gcloud iam service-accounts add-iam-policy-binding NOMBRE_SA@PROYECTO.iam.gserviceaccount.com \
     --member="serviceAccount:NOMBRE_SA@PROYECTO.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountTokenCreator" \
     --project=PROYECTO
   ```

3. Comprueba que la API **IAM Service Account Credentials** esté **habilitada** en el proyecto.

> **Nota:** Es fácil asignar el rol a otra cuenta distinta (p. ej. la predeterminada de App Engine en lugar de la de Compute/Cloud Run). La SA que debe poder firmar es **la que ejecuta** esa función en Cloud Run.

Las **reglas de Firebase Storage** (`firebase.storage`) no sustituyen este permiso: las URLs firmadas las firma la cuenta de servicio del backend vía IAM.

---

## Desarrollo local

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### Con emuladores Firebase (opcional)

```bash
# Terminal 1: emuladores
firebase emulators:start --only auth,firestore

# Terminal 2: app (con VITE_USE_FIREBASE_EMULATORS=true en .env)
npm run dev
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción → `build/client/` |
| `npm run typecheck` | Genera tipos + verifica TypeScript |
| `npm run deploy` | Build + deploy a Firebase Hosting |
| `npm run predeploy` | Se ejecuta automáticamente antes de `deploy` |

---

## Despliegue en Firebase Hosting

### Primer despliegue

```bash
# 1. Login a Firebase (solo la primera vez o cuando expire la sesión)
firebase login

# 2. Desplegar (hace build automáticamente)
npm run deploy
```

### Despliegues posteriores

```bash
npm run deploy
```

### URL de producción

- **https://layout-admin.web.app**
- **https://layout-admin.firebaseapp.com**

### Configuración de Firebase Hosting (`firebase.json`)

```
build/client/   ← directorio público (SPA estática)
    ↓
Rewrite **  → index.html   ← soporta rutas client-side
    ↓
Cache-Control:
  /assets/**  → 1 año (archivos con hash, nunca cambian)
  index.html  → no-cache (siempre la versión más reciente)
```

---

## Estructura del proyecto

```
dp-proj-00-02-web/
├── app/
│   ├── components/
│   │   ├── DpContent/          # Panel + header (DpContent, DpContentHeader, DpContentHeaderAction,
│   │   │                       #   DpContentSet, DpContentInfo)
│   │   ├── DpInput/            # Control de formulario unificado
│   │   ├── DpTable/            # Tabla con filtro, selección y acciones
│   │   └── PaceLoader.tsx      # Barra de progreso global (navegación + datos)
│   ├── lib/
│   │   ├── firebase.ts         # Inicialización Firebase
│   │   ├── auth-context.tsx    # Contexto de autenticación
│   │   ├── loading-context.tsx # Contexto global de carga (PaceLoader)
│   │   ├── use-data-loader.ts  # Hook para reportar fetch al PaceLoader
│   │   ├── firestore-users.ts  # Servicio de usuarios
│   │   ├── firestore-roles.ts  # Servicio de roles
│   │   └── firestore-modules.ts # Servicio de módulos
│   ├── routes/
│   │   ├── dashboard.tsx       # Layout principal (sidebar, header, menú)
│   │   ├── users.tsx           # Lista de usuarios
│   │   ├── roles.tsx           # Lista de roles
│   │   ├── roles.$id.tsx       # Detalle de rol (permisos por módulo)
│   │   ├── modules.tsx         # Lista de módulos
│   │   ├── modules.$id.tsx     # Detalle de módulo (permisos y columnas)
│   │   ├── roles/              # Diálogos de roles
│   │   │   ├── SetRoleDialog.tsx
│   │   │   └── SetRolePermissionDialog.tsx
│   │   └── modules/            # Diálogos de módulos
│   │       ├── SetModuleDialog.tsx
│   │       ├── SetPermissionDialog.tsx
│   │       └── SetColumnDialog.tsx
│   ├── routes.ts               # Configuración de rutas
│   └── root.tsx                # Layout raíz (providers globales)
├── .env                        # Variables de entorno (no subir a git)
├── .env.example                # Plantilla de variables de entorno
├── .firebaserc                 # Proyecto Firebase activo
├── firebase.json               # Configuración de Firebase Hosting
├── react-router.config.ts      # Configuración React Router (ssr: false)
└── package.json
```

---

## Funcionalidades

### Autenticación
- Login / logout con Firebase Auth (email/password)
- Protección de rutas — redirige a `/login` si no hay sesión
- Perfil de usuario en sidebar

### Módulo de Usuarios (`/system/users`)
- Listado con filtro y selección múltiple
- Edición inline de nombre y correo

### Módulo de Roles (`/system/roles`)
- Listado de roles con filtro
- Crear / editar nombre y descripción
- Detalle del rol con:
  - Toggle de **acceso total** (`*:*`)
  - Tabla de **permisos por módulo** (agregar/editar/eliminar)

### Módulo de Módulos (`/system/modules`)
- Listado de módulos del sistema
- Crear / editar módulo
- Detalle del módulo con:
  - Tabla de **permisos** (código, etiqueta, descripción)
  - Tabla de **columnas** (orden, nombre, encabezado, filtro, formato)

### UX Global
- **PaceLoader** — barra de progreso azul/índigo en la parte superior que se activa tanto en transiciones de ruta como en cargas de datos (Firestore)
- **Tema claro/oscuro** — persiste en localStorage
- Sidebar colapsable con menú configurable por JSON

---

## `DpTable`: fila de totales (`footerTotals`)

El componente `~/components/DpTable` admite la prop opcional **`footerTotals`** para mostrar una fila inferior con la etiqueta **Totales:** y sumas en columnas indicadas.

### Campos principales

| Campo | Descripción |
|--------|-------------|
| `label` | Texto de la etiqueta (por defecto `Totales:`). |
| `sumColumns` | Claves `column` de `tableDef` donde se muestra cada total. |
| `sumValueKey` | Por cada clave de `sumColumns`, indica **qué propiedad numérica del row** sumar si no coincide con el nombre de la columna (útil cuando la columna muestra un string formateado). |
| `respectGlobalFilter` | Si es `true` (por defecto), el total usa solo las filas que pasan el filtro global de la tabla. |

### `sumValueKey` en la práctica

La tabla suele mostrar un valor **formateado** (ej. moneda con símbolo), pero la suma debe hacerse sobre un **número** en otro campo del objeto fila.

**Ejemplo** (costos de viaje, `TripCostsPage`): columna visible `amountFormatted` (string tipo `S/. 50.00`) y suma sobre `amount` (number). El formateador compartido está en **`~/constants/currency-format`** (`formatAmountWithSymbol`).

```tsx
import { formatAmountWithSymbol } from "~/constants/currency-format";
// ...
<DpTable<TripCostTableRow>
  data={tableRows}
  tableDef={TABLE_DEF}
  footerTotals={{
    label: "Totales:",
    sumColumns: ["amountFormatted"],
    sumValueKey: { amountFormatted: "amount" },
    formatSum: (sum) => formatAmountWithSymbol(sum, "PEN"), // en la app se elige moneda según los datos
  }}
/>
```

Si **no** usas `sumValueKey`, se suma la propiedad con el mismo nombre que la columna (`row[column]`).

### Paginador

Por defecto `DpTable` muestra paginación. Para **ocultarla** y ver todas las filas: **`paginator={false}`** (no se pasan `rows` ni `rowsPerPageOptions` al `DataTable`).

Convenciones y más detalle para el equipo: **`AGENTS.md`**.

---

## `DpContentHeader`: acciones personalizadas (`DpContentHeaderAction`)

Patrón análogo a **`DpTColumn`** dentro de **`DpTable`**: un componente marcador que **no pinta nada** (`return null`); el header recorre los `children`, detecta `<DpContentHeaderAction>` y coloca su contenido en la barra.

### Orden en la barra

1. Filtro (si hay `onFilter`)  
2. Actualizar (`onLoad`)  
3. **Acciones personalizadas** (una o varias `DpContentHeaderAction`)  
4. Eliminar (`onDelete`)  
5. Agregar (`onCreate`)

### Uso

```tsx
import { DpContentHeader, DpContentHeaderAction } from "~/components/DpContent";
import { Button } from "primereact/button";

<DpContentHeader
  onLoad={…}
  onCreate={…}
  onDelete={…}
  filterValue={…}
  onFilter={…}
>
  <DpContentHeaderAction>
    <Button size="small" icon="pi pi-flag" label="Mi acción" onClick={…} />
  </DpContentHeaderAction>
</DpContentHeader>
```

Dentro de cada `DpContentHeaderAction` puedes poner **cualquier `ReactNode`**: botones, grupos, `SplitButton`, etc. Puedes repetir el marcador varias veces si necesitas bloques distintos.

### Ejemplo en el proyecto

En **`TripsPage`** hay un botón **«Cambiar estado»** que abre un modal (`DpContentSet`) con un select de estados de viaje y aplica el cambio masivo a los viajes seleccionados (servicio `updateTripsStatus` en `~/features/transport/trips`).

---

## `DpContentFilter`: definición por esquema (`DpFilterDef[]`)

`DpContentFilter` ahora funciona por **definición declarativa**, similar a `DpTable` con `tableDef`.

### API principal

- `filterDefs`: arreglo de definiciones (`DpFilterDef[]`) con `name`, `label`, `type`, `options`, `summary`, `validators`, etc.
- `values` / `onValuesChange`: estado controlado del formulario de filtros.
- `onSearch`: callback al pulsar **Buscar**.
- `initialValues`: estado inicial para el formulario.
- `resetToInitialOnClear`: al limpiar, vuelve a `initialValues` (default `true`).
- `searchOnClear`: ejecuta búsqueda al limpiar (default `true`).

### Ejemplo de uso

```tsx
import {
  DpContentFilter,
  createDateRangeMaxDaysRule,
  type DpFilterDef,
} from "~/components/DpContent";

const filterDefs: DpFilterDef[] = [
  {
    name: "scheduledRange",
    label: "Inicio programado",
    type: "date-range",
    colSpan: 2,
    validators: createDateRangeMaxDaysRule(60),
    summary: (value) => {
      const v = (value as { from?: string; to?: string }) ?? {};
      const from = String(v.from ?? "").trim();
      const to = String(v.to ?? "").trim();
      return from && to ? `${from} a ${to}` : from || to;
    },
  },
  {
    name: "status",
    label: "Estado",
    type: "multiselect",
    options: statusOptions,
    filter: true,
  },
];

<DpContentFilter
  filterDefs={filterDefs}
  values={filters}
  onValuesChange={(next) => setFilters(next as TripFiltersForm)}
  onSearch={(mapped) => applySearchParams(mapped as TripFiltersForm)}
  initialValues={defaultFilters}
  defaultShow={false}
/>;
```

### Reglas predefinidas disponibles

Importables desde `~/components/DpContent`:

- `createDateRangeMaxDaysRule(maxDays, options?)`
- `createDateRangeOrderRule(options?)`
- `createRequiredIfRule(predicate, options?)`
- `createMaxLengthRule(maxLength, options?)`
- `createMinLengthRule(minLength, options?)`
- `createDateNotFutureRule(options?)`
- `createAtLeastOneSelectedRule(options?)`

> Puedes combinar varias reglas en `validators: [ruleA, ruleB, ...]`.

---

## Licencia

Privado — uso interno.
