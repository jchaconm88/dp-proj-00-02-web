import { canNavigateToModule, isGranted } from "~/lib/accessService";
import type { SearchEntry, SearchRegistry, IndexedEntry, SearchIndex } from "./global-search.types";

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildSearchIndex(
  registry: SearchRegistry,
  effectivePermissions: string[]
): SearchIndex {
  const entries: IndexedEntry[] = [];

  for (const entry of registry.entries) {
    if (!entry.permission) {
      entries.push(toIndexedEntry(entry));
      continue;
    }

    if (effectivePermissions.includes("*")) {
      entries.push(toIndexedEntry(entry));
      continue;
    }

    let hasAccess = false;
    if (entry.type === "quick-action") {
      hasAccess = isGranted(
        effectivePermissions,
        entry.permission.action,
        entry.permission.module
      );
    } else {
      hasAccess = canNavigateToModule(effectivePermissions, entry.permission.module);
    }

    if (hasAccess) {
      entries.push(toIndexedEntry(entry));
    }
  }

  return { entries };
}

function toIndexedEntry(entry: SearchEntry): IndexedEntry {
  return {
    id: entry.id,
    title: entry.title,
    titleNormalized: normalizeSearchText(entry.title),
    keywords: entry.keywords,
    keywordsNormalized: entry.keywords.map(normalizeSearchText),
    path: entry.path,
    icon: entry.icon,
    category: entry.category,
    type: entry.type,
  };
}

export function filterSearchIndex(
  index: SearchIndex,
  query: string
): IndexedEntry[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const titleMatches: IndexedEntry[] = [];
  const keywordMatches: IndexedEntry[] = [];

  for (const entry of index.entries) {
    if (entry.titleNormalized.includes(q)) {
      titleMatches.push(entry);
    } else if (entry.keywordsNormalized.some((kw) => kw.includes(q))) {
      keywordMatches.push(entry);
    }
  }

  return [...titleMatches, ...keywordMatches].slice(0, 5);
}
