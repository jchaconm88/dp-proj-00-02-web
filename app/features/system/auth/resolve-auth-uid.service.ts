import { callHttpsFunction } from "~/lib/functions.service";

export type ResolveAuthUidResponse = {
  uid: string;
  email: string;
};

export async function resolveAuthUidByEmail(email: string): Promise<ResolveAuthUidResponse> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("El email es obligatorio.");
  return callHttpsFunction<{ email: string }, ResolveAuthUidResponse>(
    "resolveAuthUidByEmail",
    { email: trimmed },
    { errorFallback: "No se pudo resolver el usuario por email." }
  );
}
