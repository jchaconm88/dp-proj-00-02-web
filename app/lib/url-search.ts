/**
 * Anexa `location.search` (p. ej. filtros `?from=&to=`) a un path sin query,
 * para conservar contexto al navegar entre lista y rutas hijas.
 */
export function withUrlSearch(path: string, search: string): string {
  const q = search.trim();
  return q ? `${path}${q}` : path;
}
