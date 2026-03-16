# dp-proj-00-02 — Panel de Administración

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
cd dp-proj-00-02
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
dp-proj-00-02/
├── app/
│   ├── components/
│   │   ├── DpContent/          # Panel + header de página (DpContent, DpContentHeader,
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

## Licencia

Privado — uso interno.
