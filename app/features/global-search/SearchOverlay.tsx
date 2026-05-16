import { useCallback, useEffect, useRef } from "react";
import { Command } from "cmdk";
import type { IndexedEntry, EntitySearchRecord, HistoryEntry } from "./global-search.types";

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  navigationResults: IndexedEntry[];
  entityResults: EntitySearchRecord[];
  historyResults: HistoryEntry[];
  entityLoading: boolean;
  entityError: string | null;
  rebuildingIndex: boolean;
  onRebuildIndex: () => Promise<void>;
  onClearQuery: () => void;
  onSelect: (item: { id: string; title: string; icon: string; path: string; type: string }) => void;
  onRemoveHistory: (entryId: string) => void;
  onClearHistory: () => void;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "\u2026" : text;
}

export default function SearchOverlay({
  open,
  onOpenChange,
  query,
  onQueryChange,
  navigationResults,
  entityResults,
  historyResults,
  entityLoading,
  entityError,
  rebuildingIndex,
  onRebuildIndex,
  onClearQuery,
  onSelect,
  onRemoveHistory,
  onClearHistory,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  const showHistory = query.length === 0 && historyResults.length > 0;
  const showHistoryEmpty = query.length === 0 && historyResults.length === 0 && !entityLoading;
  const showNav = navigationResults.length > 0;
  const showEntities = entityResults.length > 0;
  const showEntityLoading = entityLoading && query.length >= 2;
  const showNoResults = query.length >= 2 && !showNav && !showEntities && !entityLoading;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[15vh] transition-opacity duration-200 ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[var(--dp-surface-high)] shadow-2xl">
        <Command
          label="Busqueda global"
          shouldFilter={false}
          className="overflow-hidden rounded-2xl"
        >
          <div className="flex items-center border-b border-white/10 px-4">
            <i className="pi pi-search text-sm text-[var(--dp-on-surface-soft)]" aria-hidden />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={onQueryChange}
              placeholder="Buscar modulos, paginas, registros..."
              className="w-full border-none bg-transparent px-3 py-3.5 text-sm text-[var(--dp-on-surface)] outline-none placeholder:text-[var(--dp-on-surface-soft)]"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={onClearQuery}
                className="mr-2 rounded p-1 text-[var(--dp-on-surface-soft)] transition hover:bg-white/10 hover:text-[var(--dp-on-surface)]"
                aria-label="Limpiar busqueda"
                title="Limpiar busqueda"
              >
                <i className="pi pi-times-circle text-sm" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => void onRebuildIndex()}
              disabled={rebuildingIndex}
              className="mr-2 rounded p-1 text-[var(--dp-on-surface-soft)] transition hover:bg-white/10 hover:text-[var(--dp-on-surface)] disabled:opacity-50"
              aria-label="Regenerar indices"
              title="Regenerar indices"
            >
              <i className={`pi ${rebuildingIndex ? "pi-spin pi-spinner" : "pi-refresh"} text-sm`} aria-hidden />
            </button>
            <kbd className="hidden rounded-md border border-white/10 bg-[var(--dp-surface-low)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--dp-on-surface-soft)] md:inline-block">
              ESC
            </kbd>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            <Command.List>
              {/* History */}
              {showHistory && (
                <Command.Group heading="Recientes">
                  {historyResults.map((entry) => (
                    <Command.Item
                      key={entry.id}
                      value={entry.id}
                      onSelect={() =>
                        onSelect({
                          id: entry.id,
                          title: entry.title,
                          icon: entry.icon,
                          path: entry.path,
                          type: entry.type,
                        })
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--dp-on-surface)] aria-selected:bg-[var(--dp-surface-low)]"
                    >
                      <i
                        className={`pi pi-${entry.icon} text-sm text-[var(--dp-on-surface-soft)]`}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{truncate(entry.title, 60)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistory(entry.id);
                        }}
                        className="rounded p-1 text-[var(--dp-on-surface-soft)] transition hover:bg-white/10 hover:text-red-400"
                        aria-label="Eliminar del historial"
                      >
                        <i className="pi pi-times text-xs" aria-hidden />
                      </button>
                    </Command.Item>
                  ))}
                  <Command.Item
                    onSelect={onClearHistory}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--dp-on-surface-soft)] aria-selected:bg-[var(--dp-surface-low)]"
                  >
                    Limpiar historial
                  </Command.Item>
                </Command.Group>
              )}

              {showHistoryEmpty && (
                <div className="px-3 py-6 text-center text-sm text-[var(--dp-on-surface-soft)]">
                  Sin busquedas recientes
                </div>
              )}

              {/* Navigation results */}
              {showNav && (
                <Command.Group heading="Navegacion">
                  {navigationResults.map((entry) => (
                    <Command.Item
                      key={entry.id}
                      value={entry.id}
                      onSelect={() =>
                        onSelect({
                          id: entry.id,
                          title: entry.title,
                          icon: entry.icon,
                          path: entry.path,
                          type: entry.type,
                        })
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--dp-on-surface)] aria-selected:bg-[var(--dp-surface-low)]"
                    >
                      <i
                        className={`pi pi-${entry.icon} text-sm text-[var(--dp-on-surface-soft)]`}
                        aria-hidden
                      />
                      <div className="flex flex-1 flex-col">
                        <span className="truncate">{truncate(entry.title, 60)}</span>
                        <span className="text-[10px] text-[var(--dp-on-surface-soft)]">
                          {entry.category}
                        </span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Entity results */}
              {showEntities && (
                <Command.Group heading="Registros">
                  {entityResults.map((entry) => {
                    const displayField = entry.fields[Object.keys(entry.fields)[0]] ?? "";
                    return (
                      <Command.Item
                        key={`${entry.entityId}-${entry.id}`}
                        value={`${entry.entityId}-${entry.id}`}
                        onSelect={() =>
                          onSelect({
                            id: `${entry.entityId}-${entry.id}`,
                            title: displayField,
                            icon: entry.icon,
                            path: entry.detailPath.replace(":id", entry.id),
                            type: "entity" as const,
                          })
                        }
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--dp-on-surface)] aria-selected:bg-[var(--dp-surface-low)]"
                      >
                        <i
                          className={`pi pi-${entry.icon} text-sm text-[var(--dp-on-surface-soft)]`}
                          aria-hidden
                        />
                        <div className="flex flex-1 flex-col">
                          <span className="truncate">{truncate(displayField, 60)}</span>
                          <span className="text-[10px] text-[var(--dp-on-surface-soft)]">
                            {entry.entityId}
                          </span>
                        </div>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {/* Loading indicator for entities */}
              {showEntityLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--dp-on-surface-soft)]">
                  <i className="pi pi-spin pi-spinner text-xs" aria-hidden />
                  Cargando registros...
                </div>
              )}

              {/* Entity error */}
              {entityError && query.length >= 2 && (
                <div className="px-3 py-3 text-sm text-red-400">{entityError}</div>
              )}

              {/* No results */}
              {showNoResults && (
                <div className="px-3 py-6 text-center text-sm text-[var(--dp-on-surface-soft)]">
                  Sin resultados para &quot;{query}&quot;
                </div>
              )}
            </Command.List>
          </div>
        </Command>
      </div>
    </div>
  );
}
