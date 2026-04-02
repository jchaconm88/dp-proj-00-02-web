# Arranque multiempresa

## 1. Primer administrador de plataforma

En Firestore, en la colección `users`, el documento cuyo ID coincide con el **UID de Firebase Auth** del usuario debe incluir `roleIds` con el valor `admin` (o el array `role` con `"admin"`). Sin esto no se pueden crear empresas ni escribir `companyUsers` más allá de lo que permita un administrador de empresa.

Quien haga migraciones con `migrateMultiempresa` debe ser reconocido como admin por el email en los documentos `users` (ver lógica en Cloud Functions).

## 2. Empresa y datos

1. Crear una empresa desde **Sistema → Empresas** (requiere permiso de menú `view` + `company` en algún rol de la empresa activa, o un rol con `*` en permisos legacy).
2. En **Sistema → Roles**, crear roles de esa empresa con los permisos necesarios (incluidos `view`+`company` y `view`+`companyMember` para quien deba gestionar empresas y miembros).
3. En **Sistema → Miembros por empresa**, agregar usuarios por email (resolución contra Authentication). Marcar **Administrador de empresa** si deben poder gestionar miembros sin ser admin de plataforma.

## 3. Marcador `__company_admin__`

Las reglas de Firestore reconocen el literal `__company_admin__` dentro de `companyUsers.roleIds`. La app lo añade con el checkbox “Administrador de empresa”. No es un documento en la colección `roles`; solo sirve para autorización en reglas y en el callable `resolveAuthUidByEmail`.

## 4. Despliegue

Despliega las Cloud Functions incluyendo `resolveAuthUidByEmail` y las reglas actualizadas en `dp-proj-00-02-functions/firestore.rules`.
