export type { SearchEntryType, SearchEntry, EntitySearchConfig, SearchRegistry, IndexedEntry, SearchIndex, EntitySearchRecord, EntitySearchSnapshot, HistoryEntry } from "./global-search.types";
export { buildSearchRegistry } from "./search-registry";
export { buildSearchIndex, normalizeSearchText, filterSearchIndex } from "./search-index.service";
export { getSearchHistory, addToSearchHistory, removeFromSearchHistory, clearSearchHistory } from "./search-history.service";
export { useEntitySearchIndex, filterEntityIndex } from "./entity-search.service";
export { useGlobalSearch } from "./useGlobalSearch";
export { default as SearchTrigger } from "./SearchTrigger";
export { default as SearchOverlay } from "./SearchOverlay";
