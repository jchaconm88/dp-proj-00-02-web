import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { buildSearchRegistry } from "./search-registry";
import { buildSearchIndex, filterSearchIndex } from "./search-index.service";
import { useEntitySearchIndex, filterEntityIndex, rebuildEntitySearchIndex } from "./entity-search.service";
import { getSearchHistory, addToSearchHistory, removeFromSearchHistory, clearSearchHistory } from "./search-history.service";
import type { SearchIndex, IndexedEntry, EntitySearchRecord, HistoryEntry } from "./global-search.types";

interface UseGlobalSearchOptions {
  effectivePermissions: string[];
  companyId: string | null;
  userId: string | null;
}

interface GlobalSearchResult {
  open: boolean;
  query: string;
  navigationResults: IndexedEntry[];
  entityResults: EntitySearchRecord[];
  historyResults: HistoryEntry[];
  entityLoading: boolean;
  entityError: string | null;
  rebuildingIndex: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onClearQuery: () => void;
  onRebuildIndex: () => Promise<void>;
  onSelect: (item: { id: string; title: string; icon: string; path: string; type: string }) => void;
  onRemoveHistory: (entryId: string) => void;
  onClearHistory: () => void;
}

export function useGlobalSearch({
  effectivePermissions,
  companyId,
  userId,
}: UseGlobalSearchOptions): GlobalSearchResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rebuildingIndex, setRebuildingIndex] = useState(false);

  const { entities, loading: entityLoading, error: entityError, refetch } = useEntitySearchIndex(companyId);

  const searchIndex: SearchIndex = useMemo(
    () => buildSearchIndex(buildSearchRegistry(), effectivePermissions),
    [effectivePermissions]
  );

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
        setDebouncedQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navigationResults = useMemo(
    () => (debouncedQuery.length >= 2 ? filterSearchIndex(searchIndex, debouncedQuery) : []),
    [searchIndex, debouncedQuery]
  );

  const entityResults = useMemo(
    () =>
      debouncedQuery.length >= 2
        ? filterEntityIndex(entities, debouncedQuery, effectivePermissions)
        : [],
    [entities, debouncedQuery, effectivePermissions]
  );

  const historyResults = useMemo(() => {
    if (query.length > 0 || !open) return [];
    if (!userId || !companyId) return [];
    return getSearchHistory(userId, companyId, effectivePermissions);
  }, [query, open, userId, companyId, effectivePermissions]);

  const onOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, []);

  const onQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const onClearQuery = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const onRebuildIndex = useCallback(async () => {
    if (!companyId) return;
    if (rebuildingIndex) return;
    setRebuildingIndex(true);
    try {
      await rebuildEntitySearchIndex(companyId);
      refetch();
    } finally {
      setRebuildingIndex(false);
    }
  }, [companyId, rebuildingIndex, refetch]);

  const onSelect = useCallback(
    (item: { id: string; title: string; icon: string; path: string; type: string }) => {
      if (userId && companyId) {
        addToSearchHistory(userId, companyId, {
          id: item.id,
          title: item.title,
          icon: item.icon,
          path: item.path,
          type: item.type as HistoryEntry["type"],
        });
      }
      navigate(item.path);
      setOpen(false);
      setQuery("");
      setDebouncedQuery("");
    },
    [navigate, userId, companyId]
  );

  const onRemoveHistory = useCallback(
    (entryId: string) => {
      if (!userId || !companyId) return;
      removeFromSearchHistory(userId, companyId, entryId);
    },
    [userId, companyId]
  );

  const onClearHistory = useCallback(() => {
    if (!userId || !companyId) return;
    clearSearchHistory(userId, companyId);
  }, [userId, companyId]);

  return {
    open,
    query,
    navigationResults,
    entityResults,
    historyResults,
    entityLoading,
    entityError,
    rebuildingIndex,
    onOpenChange,
    onQueryChange,
    onClearQuery,
    onRebuildIndex,
    onSelect,
    onRemoveHistory,
    onClearHistory,
  };
}
