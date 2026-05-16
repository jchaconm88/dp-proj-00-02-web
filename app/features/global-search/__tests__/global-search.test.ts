import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock accessService for buildSearchIndex tests
vi.mock("~/lib/accessService", () => ({
  canNavigateToModule: vi.fn(),
  isGranted: vi.fn(),
}));

// Mock localStorage for Node test environment
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

beforeEach(() => {
  const mockStorage = createMockStorage();
  vi.stubGlobal("localStorage", mockStorage);
});

// ─── normalizeSearchText ─────────────────────────────────────────────────────

describe("normalizeSearchText", () => {
  it("should lowercase text", async () => {
    const { normalizeSearchText } = await import("../search-index.service");
    expect(normalizeSearchText("HELLO")).toBe("hello");
    expect(normalizeSearchText("Usuario")).toBe("usuario");
  });

  it("should remove diacritics", async () => {
    const { normalizeSearchText } = await import("../search-index.service");
    expect(normalizeSearchText("ó"));
    expect(normalizeSearchText("ó"));
    expect(normalizeSearchText("búsqueda")).toBe("busqueda");
    expect(normalizeSearchText("José María")).toBe("jose maria");
    expect(normalizeSearchText("día")).toBe("dia");
    expect(normalizeSearchText("acción")).toBe("accion");
  });

  it("should be idempotent", async () => {
    const { normalizeSearchText } = await import("../search-index.service");
    const input = "Búsqueda Global Ñoño";
    const once = normalizeSearchText(input);
    const twice = normalizeSearchText(once);
    expect(twice).toBe(once);
  });

  it("should handle empty string", async () => {
    const { normalizeSearchText } = await import("../search-index.service");
    expect(normalizeSearchText("")).toBe("");
  });
});

// ─── filterSearchIndex ───────────────────────────────────────────────────────

describe("filterSearchIndex", () => {
  it("should return empty for empty query", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex({ entries: [] }, "");
    expect(result).toEqual([]);
  });

  it("should match by single character query", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex(
      {
        entries: [
          {
            id: "test",
            title: "Test",
            titleNormalized: "test",
            keywords: [],
            keywordsNormalized: [],
            path: "/test",
            icon: "home",
            category: "General",
            type: "navigation",
          },
        ],
      },
      "t"
    );
    expect(result).toHaveLength(1);
  });

  it("should match by title substring", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex(
      {
        entries: [
          {
            id: "nav-home",
            title: "Inicio",
            titleNormalized: "inicio",
            keywords: ["dashboard"],
            keywordsNormalized: ["dashboard"],
            path: "/home",
            icon: "home",
            category: "General",
            type: "navigation",
          },
          {
            id: "nav-trips",
            title: "Viajes",
            titleNormalized: "viajes",
            keywords: ["transporte"],
            keywordsNormalized: ["transporte"],
            path: "/transport/trips",
            icon: "truck",
            category: "Transporte",
            type: "navigation",
          },
        ],
      },
      "via"
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-trips");
  });

  it("should match by keyword when title does not match", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex(
      {
        entries: [
          {
            id: "nav-home",
            title: "Inicio",
            titleNormalized: "inicio",
            keywords: ["dashboard", "panel"],
            keywordsNormalized: ["dashboard", "panel"],
            path: "/home",
            icon: "home",
            category: "General",
            type: "navigation",
          },
        ],
      },
      "panel"
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-home");
  });

  it("should prioritize title matches over keyword-only matches", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex(
      {
        entries: [
          {
            id: "keyword-match",
            title: "Configuración",
            titleNormalized: "configuracion",
            keywords: ["cliente"],
            keywordsNormalized: ["cliente"],
            path: "/config",
            icon: "cog",
            category: "Sistema",
            type: "navigation",
          },
          {
            id: "title-match",
            title: "Clientes",
            titleNormalized: "clientes",
            keywords: [],
            keywordsNormalized: [],
            path: "/master/clients",
            icon: "user",
            category: "Maestros",
            type: "navigation",
          },
        ],
      },
      "cliente"
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("title-match");
    expect(result[1].id).toBe("keyword-match");
  });

  it("should limit results to 5", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const entries = Array.from({ length: 10 }, (_, i) => ({
      id: `entry-${i}`,
      title: `Entry ${i}`,
      titleNormalized: `entry ${i}`,
      keywords: [],
      keywordsNormalized: [],
      path: `/entry/${i}`,
      icon: "circle",
      category: "Test",
      type: "navigation" as const,
    }));
    const result = filterSearchIndex({ entries }, "entry");
    expect(result).toHaveLength(5);
  });

  it("should match ignoring diacritics", async () => {
    const { filterSearchIndex } = await import("../search-index.service");
    const result = filterSearchIndex(
      {
        entries: [
          {
            id: "nav-trips",
            title: "Viajes",
            titleNormalized: "viajes",
            keywords: [],
            keywordsNormalized: [],
            path: "/transport/trips",
            icon: "truck",
            category: "Transporte",
            type: "navigation",
          },
        ],
      },
      "víajes"
    );
    expect(result).toHaveLength(1);
  });
});

// ─── buildSearchIndex (permission filtering) ─────────────────────────────────

describe("buildSearchIndex", () => {

  it("should include entries without permission", async () => {
    vi.mock("~/lib/accessService", () => ({
      canNavigateToModule: vi.fn(),
      isGranted: vi.fn(),
    }));
    const { buildSearchIndex } = await import("../search-index.service");
    const result = buildSearchIndex(
      {
        entries: [
          {
            id: "no-perm",
            title: "No Permission",
            keywords: [],
            path: "/no-perm",
            icon: "circle",
            category: "Test",
            type: "navigation",
          },
        ],
        entityConfigs: [],
      },
      ["trip:view"]
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("no-perm");
  });

  it("should include all entries with wildcard permission", async () => {
    vi.mock("~/lib/accessService", () => ({
      canNavigateToModule: vi.fn().mockReturnValue(false),
      isGranted: vi.fn().mockReturnValue(false),
    }));
    const { buildSearchIndex } = await import("../search-index.service");
    const result = buildSearchIndex(
      {
        entries: [
          {
            id: "entry-1",
            title: "Entry 1",
            keywords: [],
            path: "/entry-1",
            icon: "circle",
            category: "Test",
            type: "navigation",
            permission: { action: "view", module: "trip" },
          },
        ],
        entityConfigs: [],
      },
      ["*"]
    );
    expect(result.entries).toHaveLength(1);
  });

  it("should include entry when permission matches", async () => {
    vi.mock("~/lib/accessService", () => ({
      canNavigateToModule: vi.fn().mockReturnValue(true),
      isGranted: vi.fn().mockReturnValue(true),
    }));
    const { buildSearchIndex } = await import("../search-index.service");
    const result = buildSearchIndex(
      {
        entries: [
          {
            id: "nav-trips",
            title: "Viajes",
            keywords: [],
            path: "/transport/trips",
            icon: "truck",
            category: "Transporte",
            type: "navigation",
            permission: { action: "view", module: "trip" },
          },
        ],
        entityConfigs: [],
      },
      ["trip:view"]
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("nav-trips");
  });
});

// ─── Search History ──────────────────────────────────────────────────────────

describe("searchHistory", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("localStorage", createMockStorage());
  });

  it("should add and retrieve entries", async () => {
    const {
      addToSearchHistory,
      getSearchHistory,
    } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "nav-home",
      title: "Inicio",
      icon: "home",
      path: "/home",
      type: "navigation",
    });
    const result = getSearchHistory("user-1", "company-1", ["*"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-home");
    expect(result[0].title).toBe("Inicio");
    expect(result[0].path).toBe("/home");
  });

  it("should isolate history by user and company", async () => {
    const { addToSearchHistory, getSearchHistory } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "nav-home",
      title: "Inicio",
      icon: "home",
      path: "/home",
      type: "navigation",
    });
    const resultOther = getSearchHistory("user-2", "company-1", ["*"]);
    expect(resultOther).toHaveLength(0);
  });

  it("should dedup and move to front on re-add", async () => {
    const { addToSearchHistory, getSearchHistory } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "first",
      title: "First",
      icon: "home",
      path: "/first",
      type: "navigation",
    });
    addToSearchHistory("user-1", "company-1", {
      id: "second",
      title: "Second",
      icon: "home",
      path: "/second",
      type: "navigation",
    });
    addToSearchHistory("user-1", "company-1", {
      id: "first",
      title: "First",
      icon: "home",
      path: "/first",
      type: "navigation",
    });
    const result = getSearchHistory("user-1", "company-1", ["*"]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("first");
  });

  it("should cap at 10 entries", async () => {
    const { addToSearchHistory, getSearchHistory } = await import("../search-history.service");
    for (let i = 0; i < 12; i++) {
      addToSearchHistory("user-1", "company-1", {
        id: `entry-${i}`,
        title: `Entry ${i}`,
        icon: "home",
        path: `/entry/${i}`,
        type: "navigation",
      });
    }
    const result = getSearchHistory("user-1", "company-1", ["*"]);
    expect(result).toHaveLength(10);
  });

  it("should remove single entry", async () => {
    const {
      addToSearchHistory,
      getSearchHistory,
      removeFromSearchHistory,
    } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "nav-home",
      title: "Inicio",
      icon: "home",
      path: "/home",
      type: "navigation",
    });
    removeFromSearchHistory("user-1", "company-1", "nav-home");
    const result = getSearchHistory("user-1", "company-1", ["*"]);
    expect(result).toHaveLength(0);
  });

  it("should clear all entries", async () => {
    const {
      addToSearchHistory,
      getSearchHistory,
      clearSearchHistory,
    } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "nav-home",
      title: "Inicio",
      icon: "home",
      path: "/home",
      type: "navigation",
    });
    clearSearchHistory("user-1", "company-1");
    const result = getSearchHistory("user-1", "company-1", ["*"]);
    expect(result).toHaveLength(0);
  });

  it("should filter by permissions without deleting from storage", async () => {
    const { addToSearchHistory, getSearchHistory } = await import("../search-history.service");
    addToSearchHistory("user-1", "company-1", {
      id: "nav-trips",
      title: "Viajes",
      icon: "truck",
      path: "/transport/trips",
      type: "navigation",
      permission: { action: "view", module: "trip" },
    });
    const filtered = getSearchHistory("user-1", "company-1", ["client:view"]);
    expect(filtered).toHaveLength(0);
    const all = getSearchHistory("user-1", "company-1", ["*"]);
    expect(all).toHaveLength(1);
  });
});

// ─── filterEntityIndex ───────────────────────────────────────────────────────

describe("filterEntityIndex", () => {
  it("should return empty for empty query", async () => {
    const { filterEntityIndex } = await import("../entity-search.service");
    const result = filterEntityIndex([], "", ["*"]);
    expect(result).toEqual([]);
  });

  it("should match by normalized field value", async () => {
    const { filterEntityIndex } = await import("../entity-search.service");
    const entities = [
      {
        id: "trip-001",
        entityId: "trip",
        fields: { code: "VJ-001", origin: "Lima", destination: "Arequipa" },
        fieldsNormalized: { code: "vj-001", origin: "lima", destination: "arequipa" },
        icon: "truck",
        detailPath: "/transport/trips/:id",
        permission: { action: "view", module: "trip" },
      },
    ];
    const result = filterEntityIndex(entities, "lima", ["trip:view"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("trip-001");
  });

  it("should exclude entities without matching permission", async () => {
    const { filterEntityIndex } = await import("../entity-search.service");
    const entities = [
      {
        id: "trip-001",
        entityId: "trip",
        fields: { code: "VJ-001", origin: "Lima", destination: "Arequipa" },
        fieldsNormalized: { code: "vj-001", origin: "lima", destination: "arequipa" },
        icon: "truck",
        detailPath: "/transport/trips/:id",
        permission: { action: "view", module: "trip" },
      },
    ];
    const result = filterEntityIndex(entities, "lima", ["client:view"]);
    expect(result).toHaveLength(0);
  });

  it("should include all entities with wildcard permission", async () => {
    const { filterEntityIndex } = await import("../entity-search.service");
    const entities = [
      {
        id: "trip-001",
        entityId: "trip",
        fields: { code: "VJ-001", origin: "Lima", destination: "Arequipa" },
        fieldsNormalized: { code: "vj-001", origin: "lima", destination: "arequipa" },
        icon: "truck",
        detailPath: "/transport/trips/:id",
        permission: { action: "view", module: "trip" },
      },
    ];
    const result = filterEntityIndex(entities, "lima", ["*"]);
    expect(result).toHaveLength(1);
  });

  it("should limit results to 5", async () => {
    const { filterEntityIndex } = await import("../entity-search.service");
    const entities = Array.from({ length: 10 }, (_, i) => ({
      id: `entity-${i}`,
      entityId: "product",
      fields: { code: `PRO-${i}`, name: `Product ${i}`, status: "active" },
      fieldsNormalized: { code: `pro-${i}`, name: `product ${i}`, status: "active" },
      icon: "box",
      detailPath: "/inventory/products/edit/:id",
      permission: { action: "view", module: "product" },
    }));
    const result = filterEntityIndex(entities, "product", ["*"]);
    expect(result).toHaveLength(5);
  });
});
