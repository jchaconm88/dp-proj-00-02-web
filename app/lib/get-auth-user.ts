import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

/**
 * Retorna una Promise que resuelve con el usuario autenticado actual de Firebase.
 *
 * Usar en `clientLoader` para verificar auth ANTES de renderizar cualquier componente:
 *
 * ```tsx
 * export async function clientLoader() {
 *   const user = await getAuthUser();
 *   if (!user) throw redirect("/login");
 *   return { ... };
 * }
 * ```
 *
 * **Comportamiento:**
 * - Si Firebase ya conoce el estado (navegaciones subsecuentes), resuelve en < 1ms.
 * - Si es la primera carga, espera hasta que `onAuthStateChanged` dispare (~200-500ms).
 * - Se crea un nuevo listener por llamada, pero Firebase lo resuelve de su caché en memoria.
 *
 * @returns El usuario de Firebase, o `null` si no hay sesión activa.
 */
export function getAuthUser(): Promise<User | null> {
  return new Promise<User | null>((resolve) => {
    // `onAuthStateChanged` llama el callback con el estado actual tan pronto como Firebase
    // lo determina. Después del primer disparo nos desuscribimos inmediatamente.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
