import { FirebaseError } from "firebase/app";
import { httpsCallable, type HttpsCallable } from "firebase/functions";
import { functions } from "~/lib/firebase";

const callableCache = new Map<string, HttpsCallable<unknown, unknown>>();

function getCallable<Req, Res>(name: string): HttpsCallable<Req, Res> {
  let fn = callableCache.get(name);
  if (!fn) {
    fn = httpsCallable(functions, name);
    callableCache.set(name, fn);
  }
  return fn as HttpsCallable<Req, Res>;
}

/**
 * Mensaje legible a partir del error de `httpsCallable` (FirebaseError u objeto con `message`).
 */
export function mapCallableError(err: unknown, fallback = "Error al comunicarse con el servidor."): string {
  if (err instanceof FirebaseError) {
    return err.message;
  }
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export interface CallHttpsFunctionOptions {
  /** Si el servidor falla o la red; por defecto mensaje genérico. */
  errorFallback?: string;
}

/**
 * Invoca una Cloud Function callable por nombre y devuelve `data` tipada.
 * Centraliza caché de referencias y mapeo de errores (similar a `firestore.service`).
 */
export async function callHttpsFunction<Req, Res>(
  name: string,
  data: Req,
  options?: CallHttpsFunctionOptions
): Promise<Res> {
  const fn = getCallable<Req, Res>(name);
  try {
    const result = await fn(data);
    return result.data as Res;
  } catch (err) {
    throw new Error(mapCallableError(err, options?.errorFallback));
  }
}
