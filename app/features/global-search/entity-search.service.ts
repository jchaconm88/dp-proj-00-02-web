import { useEffect, useMemo, useRef, useState } from "react";
import { webFetch } from "~/lib/backend-client";
import { canNavigateToModule } from "~/lib/accessService";
import { normalizeSearchText } from "./search-index.service";
import type { EntitySearchRecord } from "./global-search.types";

interface EntitySearchIndexDoc {
  companyId: string;
  accountId: string;
  updatedAt: unknown;
  entities: Record<string, Record<string, {
    fields: Record<string, string>;
    fieldsNormalized: Record<string, string>;
  }>>;
}

interface EntitySearchConfigEntry {
  icon: string;
  detailPath: string;
  permission: { action: string; module: string };
}

import { buildSearchRegistry } from "./search-registry";

function getEntityConfigMap(): Record<string, EntitySearchConfigEntry> {
  const registry = buildSearchRegistry();
  const map: Record<string, EntitySearchConfigEntry> = {};
  for (const cfg of registry.entityConfigs) {
    map[cfg.entityId] = {
      icon: cfg.icon,
      detailPath: cfg.detailPath,
      permission: cfg.permission,
    };
  }
  return map;
}

function flattenEntityIndex(data: EntitySearchIndexDoc | null): EntitySearchRecord[] {
  if (!data?.entities) return [];

  const configMap = getEntityConfigMap();
  const records: EntitySearchRecord[] = [];

  for (const [entityId, entityRecords] of Object.entries(data.entities)) {
    const config = configMap[entityId];
    if (!config) continue;

    for (const [recordId, record] of Object.entries(entityRecords)) {
      records.push({
        id: recordId,
        entityId,
        fields: record.fields ?? {},
        fieldsNormalized: record.fieldsNormalized ?? {},
        icon: config.icon,
        detailPath: config.detailPath,
        permission: config.permission,
      });
    }
  }

  return records;
}

export function useEntitySearchIndex(companyId: string | null): {
  entities: EntitySearchRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [raw, setRaw] = useState<EntitySearchIndexDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef(0);
  const maxRetries = 3;
  const pollingMs = 30000;
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!companyId) {
      setRaw(null);
      setLoading(false);
      return;
    }

    const cid: string = companyId;
    retryRef.current = 0;
    setLoading(true);
    setError(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function fetchIndex() {
      try {
        const data = await webFetch<EntitySearchIndexDoc | null>(
          `/system/entity-search-index?companyId=${encodeURIComponent(cid)}`
        );
        if (cancelled) return;
        setRaw(data);
        setLoading(false);
        setError(null);
        retryRef.current = 0;
      } catch (err) {
        if (cancelled) return;
        console.error("[entity-search] backend fetch error:", err);
        retryRef.current++;

        if (retryRef.current < maxRetries) {
          const delay = Math.pow(2, retryRef.current) * 1000;
          timeoutId = setTimeout(() => {
            void fetchIndex();
          }, delay);
        } else {
          setError("No se pudieron cargar los registros. Reintento agotado.");
          setLoading(false);
        }
      }
    }

    void fetchIndex();
    intervalId = setInterval(() => {
      void fetchIndex();
    }, pollingMs);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [companyId, reloadTick]);

  const entities = useMemo(() => flattenEntityIndex(raw), [raw]);

  return {
    entities,
    loading,
    error,
    refetch: () => setReloadTick((v) => v + 1),
  };
}

export async function rebuildEntitySearchIndex(companyId: string): Promise<{ ok: boolean; summary?: Record<string, number> }> {
  const cid = String(companyId ?? "").trim();
  if (!cid) return { ok: false };
  return webFetch<{ ok: boolean; summary?: Record<string, number> }>(
    `/system/entity-search-index/rebuild?companyId=${encodeURIComponent(cid)}`,
    { method: "POST" }
  );
}

export function filterEntityIndex(
  entities: EntitySearchRecord[],
  query: string,
  effectivePermissions: string[]
): EntitySearchRecord[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const isWildcard = effectivePermissions.includes("*");

  const matches: EntitySearchRecord[] = [];

  for (const entity of entities) {
    if (!isWildcard) {
      const hasAccess = canNavigateToModule(
        effectivePermissions,
        entity.permission.module
      );
      if (!hasAccess) continue;
    }

    const values = Object.values(entity.fieldsNormalized);
    if (values.some((v) => v.includes(q))) {
      matches.push(entity);
    }
  }

  return matches.slice(0, 5);
}
