import { useCallback } from "react";
import { useGlobalLoading } from "~/lib/loading-context";

/**
 * Hook utilitario que envuelve una función async para reportar
 * automáticamente el estado de carga al contexto global (PaceLoader).
 *
 * @example
 * const withLoader = useDataLoader();
 * const fetchUsers = useCallback(() => withLoader(async () => {
 *   const data = await getUsers();
 *   // ...
 * }), [withLoader]);
 */
export function useDataLoader() {
  const { start, stop } = useGlobalLoading();

  const withLoader = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      start();
      try {
        return await fn();
      } finally {
        stop();
      }
    },
    [start, stop]
  );

  return withLoader;
}
